import { createClient } from '@supabase/supabase-js';
import { getSignalRecipients } from '@/lib/signalRecipients';
import { MAIL_NOT_CONFIGURED, mailConfig, sendBulk } from '@/lib/mailer';
import type { Signal } from '@/types';

// Emails members when an admin publishes a signal (sent through Amazon SES — env vars in src/lib/mailer.ts).
//   SITE_URL  optional, defaults to https://www.asianfxsignals.com


const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (s: unknown = '') =>
    String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

// Only the pair is emailed — direction, entry/TP/SL stay behind the $1 unlock on the dashboard.
const buildEmail = (signal: Signal, siteUrl: string) => {
    const isPrivate = !!signal.target_user_id;
    const releaseAt = signal.release_at ? new Date(signal.release_at) : null;
    const locked = releaseAt && releaseAt.getTime() > Date.now();
    const minutes = locked ? Math.max(1, Math.ceil((releaseAt.getTime() - Date.now()) / 60000)) : 0;

    const subject = `${isPrivate ? 'Private signal' : 'New signal'}: ${signal.symbol}${locked ? ` — unlocks in ${minutes} min` : ' is live'}`;

    const html = `
<div style="background:#07090e;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#eef1f6">
  <div style="max-width:480px;margin:0 auto;background:#111620;border:1px solid #3a3115;border-radius:16px;padding:28px">
    <div style="font-size:20px;font-weight:700;margin-bottom:4px">Asian<span style="color:#d4af37">FX</span></div>
    <div style="color:#8b95a7;font-size:13px;margin-bottom:24px">${isPrivate ? 'A private signal was sent to you' : 'A new trading signal was just published'}</div>
    <div style="background:#0c1018;border:1px solid #232a38;border-radius:12px;padding:18px;margin-bottom:20px">
      <div style="font-size:22px;font-weight:800">${escapeHtml(signal.symbol)}</div>
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
    if (!mailConfig()) return Response.json({ message: MAIL_NOT_CONFIGURED }, { status: 503 });

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

    const { recipients: members, error: recipientsError } = await getSignalRecipients(supabase, signal);
    if (recipientsError) return Response.json({ message: recipientsError }, { status: 500 });
    const recipients = members.filter((m) => m.email);
    if (!recipients?.length) {
        return Response.json({
            sent: 0,
            failed: 0,
            message: 'No members in the chosen audience to email.',
        }, { status: 400 });
    }

    const siteUrl = (process.env.SITE_URL || 'https://www.asianfxsignals.com').replace(/\/$/, '');
    const { subject, html } = buildEmail(signal as Signal, siteUrl);

    // Drop blank / obviously invalid addresses so one bad row doesn't kill the whole run.
    const valid = recipients.filter((r) => typeof r.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim()));
    if (!valid.length) {
        return Response.json({ sent: 0, failed: 0, message: 'No active members with a valid email to notify.' }, { status: 400 });
    }

    const { sent, failed, error: lastError } = await sendBulk(
        valid.map((r) => ({ email: String(r.email), name: r.name })),
        { subject, html },
    );

    if (failed && !sent) {
        return Response.json({ sent, failed, message: `Email provider rejected the send: ${lastError}` }, { status: 502 });
    }

    if (failed) console.error(`Could not email ${failed} member(s): ${lastError}`);
    return Response.json({ sent, failed });
}
