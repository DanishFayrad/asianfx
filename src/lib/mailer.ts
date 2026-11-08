import nodemailer, { type Transporter } from 'nodemailer';

// Sends email through Amazon SES over SMTP (the same SMTP login Supabase uses for signup emails).
// Server-only env vars (set in Vercel / .env, NEVER prefixed with NEXT_PUBLIC_):
//   SMTP_HOST        e.g. email-smtp.us-east-1.amazonaws.com (SES → SMTP settings)
//   SMTP_PORT        optional, defaults to 587
//   SMTP_USER        SES SMTP username (SES → SMTP settings → Create SMTP credentials)
//   SMTP_PASS        SES SMTP password
//   MAIL_FROM_EMAIL  an address on the verified domain, e.g. no-reply@asianfxsignals.com
//   MAIL_FROM_NAME   optional, defaults to "AsianFX"
//   MAIL_REPLY_TO    optional, where member replies go — defaults to info@asianfxsignals.com

export interface MailOptions {
    to: { email: string; name?: string | null };
    subject: string;
    html: string;
    replyTo?: string;
}

export const MAIL_NOT_CONFIGURED = 'Email is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS / MAIL_FROM_EMAIL missing).';

/** Returns the settings when email is configured, otherwise null. */
export const mailConfig = () => {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const email = process.env.MAIL_FROM_EMAIL?.trim();
    if (!host || !user || !pass || !email) return null;
    return { host, user, pass, port: Number(process.env.SMTP_PORT) || 587, from: { email, name: process.env.MAIL_FROM_NAME || 'AsianFX' } };
};

// One pooled connection set per server instance, reused across sends.
let transporter: Transporter | null = null;
const getTransporter = (c: NonNullable<ReturnType<typeof mailConfig>>) => {
    transporter ??= nodemailer.createTransport({
        host: c.host,
        port: c.port,
        secure: c.port === 465,
        auth: { user: c.user, pass: c.pass },
        pool: true,
        maxConnections: 5,
    });
    return transporter;
};

/** Send one email. Never throws — returns the error text when it fails. */
export const sendMail = async (opts: MailOptions): Promise<{ ok: boolean; error?: string }> => {
    const config = mailConfig();
    if (!config) return { ok: false, error: MAIL_NOT_CONFIGURED };
    try {
        await getTransporter(config).sendMail({
            from: { address: config.from.email, name: config.from.name },
            to: opts.to.name ? { address: opts.to.email.trim(), name: opts.to.name } : opts.to.email.trim(),
            replyTo: opts.replyTo || process.env.MAIL_REPLY_TO || 'info@asianfxsignals.com',
            subject: opts.subject,
            html: opts.html,
        });
        return { ok: true };
    } catch (e) {
        const error = (e as Error).message || 'Send failed';
        console.error('Email send failed', error);
        return { ok: false, error };
    }
};
