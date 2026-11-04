import { createClient } from '@supabase/supabase-js';
import { MAIL_NOT_CONFIGURED, mailConfig, sendMail } from '@/lib/mailtrap';

// Admin "coming soon" alert — emails active members that a signal is about to drop.
// Sent through Mailtrap (env vars in src/lib/mailtrap.ts).

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

    const subject = symbol
        ? `Signal coming soon: ${symbol}`
        : 'Signal coming soon — get ready on AsianFX';

    const pairBlock = symbol
        ? `<div style="background:#0c1018;border:1px solid #232a38;border-radius:12px;padding:18px;margin-bottom:20px">
      <div style="font-size:22px;font-weight:800">${escapeHtml(symbol)}</div>
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
    if (!mailConfig()) return Response.json({ message: MAIL_NOT_CONFIGURED }, { status: 503 });

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ message: 'Not authenticated' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const symbol = typeof body.symbol === 'string' ? body.symbol : undefined;
    const side = typeof body.type === 'string' ? body.type : undefined;
    // Who gets the email: everyone, only members with an approved deposit, or only those without one.
    const audience = body.audience === 'deposited' || body.audience === 'not_deposited' ? body.audience : 'all';

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

    const { data: members, error: recipientsError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('is_admin', false)
        .not('email', 'is', null);
    if (recipientsError) return Response.json({ message: recipientsError.message }, { status: 500 });

    let recipients = members ?? [];
    if (audience !== 'all') {
        const { data: deposits, error: depositsError } = await supabase
            .from('transactions')
            .select('user_id')
            .eq('type', 'deposit')
            .eq('status', 'approved');
        if (depositsError) return Response.json({ message: depositsError.message }, { status: 500 });
        const depositors = new Set((deposits ?? []).map((d) => d.user_id));
        recipients = recipients.filter((m) => depositors.has(m.id) === (audience === 'deposited'));
    }
    if (!recipients.length) {
        const who = audience === 'deposited' ? 'members who deposited' : audience === 'not_deposited' ? 'members without a deposit' : 'members';
        return Response.json({ sent: 0, failed: 0, message: `No ${who} to email.` }, { status: 400 });
    }

    const siteUrl = (process.env.SITE_URL || 'https://www.asianfxsignals.com').replace(/\/$/, '');
    const { subject, html } = buildComingSoonEmail({ siteUrl, symbol, side });

    const valid = recipients.filter((r) => typeof r.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim()));
    if (!valid.length) {
        return Response.json({ sent: 0, failed: 0, message: 'No active members with a valid email.' }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;
    let lastError = '';

    const sendOne = async (r: { email: string; name: string | null }) => {
        const res = await sendMail({ to: { email: String(r.email), name: r.name }, subject, html });
        if (res.ok) sent += 1;
        else {
            failed += 1;
            lastError = res.error || '';
        }
    };

    for (let i = 0; i < valid.length; i += PARALLEL) {
        await Promise.all(valid.slice(i, i + PARALLEL).map(sendOne));
    }

    if (failed && !sent) {
        return Response.json({ sent, failed, message: `Mailtrap rejected the send: ${lastError}` }, { status: 502 });
    }

    return Response.json({ sent, failed });
}
