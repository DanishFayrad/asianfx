import { createClient } from '@supabase/supabase-js';

// Emails members when an admin publishes a signal (sent through Brevo's API).
// Server-only env vars (set in Vercel / .env.local, NEVER prefixed with NEXT_PUBLIC_):
//   BREVO_API_KEY       Brevo → Settings → SMTP & API → API keys
//   BREVO_SENDER_EMAIL  verified sender, e.g. no-reply@asianfxsignals.com
//   BREVO_SENDER_NAME   optional, defaults to "AsianFX"
//   SITE_URL            optional, defaults to https://www.asianfxsignals.com

const BATCH_SIZE = 500;

const escapeHtml = (s = '') =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Only the pair and direction are emailed — entry/TP/SL stay behind the $1 unlock on the dashboard.
const buildEmail = (signal, siteUrl) => {
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
        ${locked ? `⏳ Unlocks in about <b style="color:#f3d27a">${minutes} minute${minutes > 1 ? 's' : ''}</b>` : '🟢 Live now'}
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

export async function POST(request) {
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
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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
    // Private signal → that member. Broadcast → only ACTIVE members (approved deposit): they are the
    // ones who can take signals, and it keeps unverified sign-ups from eating the daily email quota.
    query = signal.target_user_id ? query.eq('id', signal.target_user_id) : query.eq('is_active', true);
    const { data: recipients, error: recipientsError } = await query;
    if (recipientsError) return Response.json({ message: recipientsError.message }, { status: 500 });
    if (!recipients?.length) return Response.json({ sent: 0, failed: 0 });

    const siteUrl = (process.env.SITE_URL || 'https://www.asianfxsignals.com').replace(/\/$/, '');
    const { subject, html } = buildEmail(signal, siteUrl);

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({
                sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME || 'AsianFX' },
                subject,
                htmlContent: html,
                // One separate email per member — nobody sees anyone else's address.
                messageVersions: batch.map((r) => ({ to: [{ email: r.email, name: r.name || undefined }] })),
            }),
        });
        if (res.ok) {
            sent += batch.length;
        } else {
            failed += batch.length;
            console.error('Brevo send failed', res.status, await res.text().catch(() => ''));
        }
    }

    return Response.json({ sent, failed }, { status: failed && !sent ? 502 : 200 });
}
