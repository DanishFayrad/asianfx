import { createClient } from '@supabase/supabase-js';
import type { Signal } from '@/types';

// Emails members when an admin publishes a signal (sent through Brevo's API).
// Server-only env vars (set in Vercel / .env.local, NEVER prefixed with NEXT_PUBLIC_):
//   BREVO_API_KEY       Brevo → Settings → SMTP & API → API keys
//   BREVO_SENDER_EMAIL  verified sender — must match Brevo exactly (e.g. fxasians@gmail.com)
//   BREVO_SENDER_NAME   optional, defaults to "AsianFX"
//   SITE_URL            optional, defaults to https://www.asianfxsignals.com

// Parallel sends per wave. Same simple `to` shape as /api/contact (proven working on live).
// messageVersions batching was rejecting on this Brevo/Gmail setup even though single sends work.
const PARALLEL = 15;

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (s: unknown = '') =>
    String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

// Only the pair and direction are emailed — entry/TP/SL stay behind the $1 unlock on the dashboard.
const buildEmail = (signal: Signal, siteUrl: string) => {
    const side = String(signal.type || '').toUpperCase();
    const sideColor = side === 'BUY' ? '#16a34a' : '#dc2626';
    const isPrivate = !!signal.target_user_id;
    const releaseAt = signal.release_at ? new Date(signal.release_at) : null;
    const locked = releaseAt && releaseAt.getTime() > Date.now();
    const minutes = locked ? Math.max(1, Math.ceil((releaseAt.getTime() - Date.now()) / 60000)) : 0;

    const subject = `${isPrivate ? 'Private signal' : 'New signal'}: ${signal.symbol} ${side}${locked ? ` — unlocks in ${minutes} min` : ' is live'}`;

    const html = `
<div style="background:#07090e;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#eef1f6">
  <div style="max-width:480px;margin:0 auto;background:#111620;border:1px solid #3a3115;border-radius:16px;padding:28px">
    <div style="font-size:20px;font-weight:700;margin-bottom:4px">Asian<span style="color:#d4af37">FX</span></div>
    <div style="color:#8b95a7;font-size:13px;margin-bottom:24px">${isPrivate ? 'A private signal was sent to you' : 'A new trading signal was just published'}</div>
    <div style="background:#0c1018;border:1px solid #232a38;border-radius:12px;padding:18px;margin-bottom:20px">
      <div style="font-size:22px;font-weight:800">${escapeHtml(signal.symbol)}
        <span style="display:inline-block;margin-left:8px;padding:4px 10px;border-radius:6px;font-size:13px;color:#fff;background:${sideColor}">${escapeHtml(side)}</span>
      </div>
      <div style="color:#8b95a7;font-size:14px;margin-top:8px">
        ${locked ? `⏳ Unlocks in about <b style="color:#ffffff">${minutes} minute${minutes > 1 ? 's' : ''}</b>` : '🟢 Live now'}
      </div>
    </div>
    <p style="color:#c5cbd6;font-size:14px;line-height:1.6;margin:0 0 22px">
      Open your dashboard to see the Entry, Take Profit and Stop Loss and take the signal.
    </p>
    <a href="${siteUrl}/dashboard" style="display:inline-block;background:#d4af37;color:#111;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">Open dashboard</a>
    <p style="color:#5f6878;font-size:11px;line-height:1.5;margin:28px 0 0">
      Trading involves substantial risk. Signals are not financial advice. You receive this email because you have an AsianFX account.
    </p>
  </div>
</div>`;

    return { subject, html };
};

export async function POST(request: Request) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    if (!apiKey || !senderEmail) {
        return Response.json({ message: 'Email is not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL missing).' }, { status: 503 });
    }

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ message: 'Not authenticated' }, { status: 401 });

    const { signal_id: signalId } = await request.json().catch(() => ({}));
    if (!signalId) return Response.json({ message: 'signal_id is required' }, { status: 400 });

    // Act as the calling admin, so RLS decides what we can read — no service-role key needed.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return Response.json({ message: 'Supabase is not configured on the server.' }, { status: 503 });

    const supabase = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ message: 'Not authenticated' }, { status: 401 });

    const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!me?.is_admin) return Response.json({ message: 'Admin only' }, { status: 403 });

    const { data: signal, error: signalError } = await supabase.from('signals').select('*').eq('id', signalId).single();
    if (signalError || !signal) return Response.json({ message: 'Signal not found' }, { status: 404 });

    let query = supabase.from('profiles').select('email, name').eq('is_admin', false).not('email', 'is', null);
    // Private signal → that member. Broadcast → only active members with money in their account
    // (wallet ≥ $1 signal fee) or a free credit — the same rule the database uses (can_receive_signals).
    query = signal.target_user_id
        ? query.eq('id', signal.target_user_id)
        : query.eq('is_active', true);
    const { data: recipients, error: recipientsError } = await query;
    if (recipientsError) return Response.json({ message: recipientsError.message }, { status: 500 });
    if (!recipients?.length) {
        return Response.json({
            sent: 0,
            failed: 0,
            message: 'No active members to email. Activate members (is_active) first.',
        }, { status: 400 });
    }

    const siteUrl = (process.env.SITE_URL || 'https://www.asianfxsignals.com').replace(/\/$/, '');
    const { subject, html } = buildEmail(signal as Signal, siteUrl);

    // Drop blank / obviously invalid addresses so one bad row doesn't kill the whole run.
    const valid = recipients.filter((r) => typeof r.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim()));
    if (!valid.length) {
        return Response.json({ sent: 0, failed: 0, message: 'No active members with a valid email to notify.' }, { status: 400 });
    }

    const sender = { email: senderEmail.trim(), name: process.env.BREVO_SENDER_NAME || 'AsianFX' };
    let sent = 0;
    let failed = 0;
    let lastBrevoError = '';

    const sendOne = async (r: { email: string; name: string | null }) => {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({
                sender,
                to: [{ email: String(r.email).trim(), name: r.name || undefined }],
                subject,
                htmlContent: html,
            }),
        });
        if (res.ok) {
            sent += 1;
            return;
        }
        failed += 1;
        const errText = await res.text().catch(() => '');
        lastBrevoError = errText;
        console.error('Brevo send failed', res.status, errText);
    };

    for (let i = 0; i < valid.length; i += PARALLEL) {
        await Promise.all(valid.slice(i, i + PARALLEL).map(sendOne));
    }

    if (failed && !sent) {
        let detail = lastBrevoError.slice(0, 300);
        try {
            const parsed = JSON.parse(lastBrevoError);
            detail = parsed.message || parsed.error || detail;
        } catch { /* keep raw text */ }
        return Response.json({
            sent,
            failed,
            message: `Brevo rejected the send: ${detail}`,
        }, { status: 502 });
    }

    return Response.json({ sent, failed });
}
