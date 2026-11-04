// Sends email through Mailtrap's Email API (transactional stream). Server-only env vars
// (set in Vercel / .env, NEVER prefixed with NEXT_PUBLIC_):
//   MAILTRAP_API_TOKEN     Mailtrap → Sending Domains → asianfxsignals.com → Integration → API token
//   MAILTRAP_SENDER_EMAIL  any address on the verified domain, e.g. no-reply@asianfxsignals.com
//   MAILTRAP_SENDER_NAME   optional, defaults to "AsianFX"
//   MAILTRAP_REPLY_TO      optional, where member replies go — defaults to fxasians@gmail.com
//   MAILTRAP_SANDBOX_INBOX_ID  local testing only: when set, every email lands in that Mailtrap
//                              Sandbox inbox instead of reaching anyone. Never set it on Vercel.

export interface MailOptions {
    to: { email: string; name?: string | null };
    subject: string;
    html: string;
    replyTo?: string;
}

/** Returns the sender when Mailtrap is configured, otherwise null. */
export const mailConfig = () => {
    const token = process.env.MAILTRAP_API_TOKEN?.trim();
    const email = process.env.MAILTRAP_SENDER_EMAIL?.trim();
    if (!token || !email) return null;
    return { token, from: { email, name: process.env.MAILTRAP_SENDER_NAME || 'AsianFX' } };
};

export const MAIL_NOT_CONFIGURED = 'Email is not configured (MAILTRAP_API_TOKEN / MAILTRAP_SENDER_EMAIL missing).';

/** Send one email. Never throws — returns the Mailtrap error text when it fails. */
export const sendMail = async (opts: MailOptions): Promise<{ ok: boolean; error?: string }> => {
    const config = mailConfig();
    if (!config) return { ok: false, error: MAIL_NOT_CONFIGURED };
    try {
        const sandboxInbox = process.env.MAILTRAP_SANDBOX_INBOX_ID?.trim();
        const endpoint = sandboxInbox
            ? `https://sandbox.api.mailtrap.io/api/send/${encodeURIComponent(sandboxInbox)}`
            : 'https://send.api.mailtrap.io/api/send';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { authorization: `Bearer ${config.token}`, 'content-type': 'application/json' },
            body: JSON.stringify({
                from: config.from,
                to: [{ email: opts.to.email.trim(), ...(opts.to.name ? { name: opts.to.name } : {}) }],
                subject: opts.subject,
                html: opts.html,
                headers: { 'Reply-To': opts.replyTo || process.env.MAILTRAP_REPLY_TO || 'fxasians@gmail.com' },
            }),
        });
        if (res.ok) return { ok: true };
        const text = await res.text().catch(() => '');
        let error = text.slice(0, 300) || `HTTP ${res.status}`;
        try {
            const parsed = JSON.parse(text);
            error = (Array.isArray(parsed.errors) ? parsed.errors.join(', ') : parsed.error || parsed.message) || error;
        } catch { /* keep raw text */ }
        console.error('Mailtrap send failed', res.status, error);
        return { ok: false, error };
    } catch (e) {
        console.error('Mailtrap send failed', e);
        return { ok: false, error: (e as Error).message };
    }
};
