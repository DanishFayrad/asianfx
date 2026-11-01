import { createClient } from '@supabase/supabase-js';

// Admin "coming soon" alert — emails active members that a signal is about to drop.
// Same Brevo env vars as /api/notify-signal (BREVO_API_KEY, BREVO_SENDER_EMAIL, …).

const PARALLEL = 15;

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (s: unknown = '') =>
    String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

const buildComingSoonEmail = (opts: {
    siteUrl: string;
    symbol?: string;
    side?: string;
}) => {
    const symbol = opts.symbol ? String(opts.symbol).trim().toUpperCase() : '';
    const side = opts.side ? String(opts.side).trim().toUpperCase() : '';
    const sideColor = side === 'BUY' ? '#16a34a' : side === 'SELL' ? '#dc2626' : '#d4af37';

    const subject = symbol
        ? `Signal coming soon: ${symbol}${side ? ` ${side}` : ''}`
        : 'Signal coming soon — get ready on AsianFX';

    const pairBlock = symbol
        ? `<div style="background:#0c1018;border:1px solid #232a38;border-radius:12px;padding:18px;margin-bottom:20px">
      <div style="font-size:22px;font-weight:800">${escapeHtml(symbol)}
        ${side ? `<span style="display:inline-block;margin-left:8px;padding:4px 10px;border-radius:6px;font-size:13px;color:#fff;background:${sideColor}">${escapeHtml(side)}</span>` : ''}
      </div>
      <div style="color:#d4af37;font-size:14px;margin-top:8px;font-weight:700">⏳ Coming soon</div>
    </div>`
        : `<div style="background:#0c1018;border:1px solid #232a38;border-radius:12px;padding:18px;margin-bottom:20px">
      <div style="font-size:20px;font-weight:800">New signal incoming</div>
      <div style="color:#d4af37;font-size:14px;margin-top:8px;font-weight:700">⏳ Coming soon — stay ready</div>
    </div>`;

    const html = `
<div style="background:#07090e;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#eef1f6">
  <div style="max-width:480px;margin:0 auto;background:#111620;border:1px solid #3a3115;border-radius:16px;padding:28px">
    <div style="font-size:20px;font-weight:700;margin-bottom:4px">Asian<span style="color:#d4af37">FX</span></div>
    <div style="color:#8b95a7;font-size:13px;margin-bottom:24px">Heads up — a trading signal is coming soon</div>
    ${pairBlock}
    <p style="color:#c5cbd6;font-size:14px;line-height:1.6;margin:0 0 22px">
      Open your dashboard and stay ready. Entry, Take Profit and Stop Loss will appear when the signal goes live.
    </p>
    <a href="${opts.siteUrl}/dashboard" style="display:inline-block;background:#d4af37;color:#111;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">Open dashboard</a>
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

    const body = await request.json().catch(() => ({}));
    const symbol = typeof body.symbol === 'string' ? body.symbol : undefined;
    const side = typeof body.type === 'string' ? body.type : undefined;

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

    const { data: recipients, error: recipientsError } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('is_admin', false)
        .eq('is_active', true)
        .not('email', 'is', null);
    if (recipientsError) return Response.json({ message: recipientsError.message }, { status: 500 });
    if (!recipients?.length) {
        return Response.json({
            sent: 0,
            failed: 0,
            message: 'No active members to email. Activate members first.',
        }, { status: 400 });
    }

    const siteUrl = (process.env.SITE_URL || 'https://www.asianfxsignals.com').replace(/\/$/, '');
    const { subject, html } = buildComingSoonEmail({ siteUrl, symbol, side });

    const valid = recipients.filter((r) => typeof r.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim()));
    if (!valid.length) {
        return Response.json({ sent: 0, failed: 0, message: 'No active members with a valid email.' }, { status: 400 });
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
        console.error('Brevo coming-soon send failed', res.status, errText);
    };

    for (let i = 0; i < valid.length; i += PARALLEL) {
        await Promise.all(valid.slice(i, i + PARALLEL).map(sendOne));
    }

    if (failed && !sent) {
        let detail = lastBrevoError.slice(0, 300);
        try {
            const parsed = JSON.parse(lastBrevoError);
            detail = parsed.message || parsed.error || detail;
        } catch { /* keep raw */ }
        return Response.json({ sent, failed, message: `Brevo rejected the send: ${detail}` }, { status: 502 });
    }

    return Response.json({ sent, failed });
}
