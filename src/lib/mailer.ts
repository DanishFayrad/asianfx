import nodemailer, { type Transporter } from 'nodemailer';

// Sends email through Resend (smtp.resend.com). Bulk sends (signal / coming-soon emails) use
// Resend's batch API with the same key, so a big member list never trips the per-second limit.
// Server-only env vars (set in Vercel / .env, NEVER prefixed with NEXT_PUBLIC_):
//   SMTP_HOST        smtp.resend.com (any other SMTP server also works, sent one by one)
//   SMTP_PORT        465 for Resend, defaults to 587
//   SMTP_USER        "resend"
//   SMTP_PASS        the Resend API key
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

/** Plain-text copy of an HTML email. Gmail/Outlook trust mails that carry both versions more. */
const htmlToText = (html: string) =>
    html
        .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2: $1\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

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
            text: htmlToText(opts.html),
        });
        return { ok: true };
    } catch (e) {
        const error = (e as Error).message || 'Send failed';
        console.error('Email send failed', error);
        return { ok: false, error };
    }
};

export interface BulkRecipient {
    email: string;
    name?: string | null;
}

export interface BulkResult {
    sent: number;
    failed: number;
    /** The last error text, when something failed. */
    error?: string;
}

const RESEND_BATCH_SIZE = 100; // Resend's maximum emails per batch call
const MAX_TRIES = 4;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fromHeader = (c: NonNullable<ReturnType<typeof mailConfig>>) =>
    `"${c.from.name.replace(/["\\]/g, '')}" <${c.from.email}>`;

/** One Resend call — a batch (array, up to 100) or a single email — retried when Resend says "slow down" or has a hiccup. */
const callResend = async (apiKey: string, payload: object | object[]): Promise<{ ok: boolean; retryable?: boolean; error?: string }> => {
    let error = 'Send failed';
    for (let attempt = 1; attempt <= MAX_TRIES; attempt += 1) {
        try {
            const res = await fetch(`https://api.resend.com/emails${Array.isArray(payload) ? '/batch' : ''}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) return { ok: true };
            const body = await res.json().catch(() => ({}));
            error = body?.message || `Resend error ${res.status}`;
            // Only rate limits (429) and server errors (5xx) are worth retrying; anything else won't change.
            if (res.status !== 429 && res.status < 500) return { ok: false, retryable: false, error };
            const retryAfter = Number(res.headers.get('retry-after'));
            await wait(retryAfter > 0 ? retryAfter * 1000 : 1000 * attempt);
        } catch (e) {
            error = (e as Error).message || error;
            await wait(1000 * attempt);
        }
    }
    return { ok: false, retryable: true, error };
};

/**
 * Send the same email to many members. Never throws.
 * Resend → batch API, 100 per call (a few calls even for hundreds of members).
 * Other SMTP servers → one by one, 3 at a time, each retried a few times.
 */
export const sendBulk = async (
    recipients: BulkRecipient[],
    mail: { subject: string; html: string; replyTo?: string },
): Promise<BulkResult> => {
    const config = mailConfig();
    if (!config) return { sent: 0, failed: recipients.length, error: MAIL_NOT_CONFIGURED };

    const replyTo = mail.replyTo || process.env.MAIL_REPLY_TO || 'info@asianfxsignals.com';
    const text = htmlToText(mail.html);
    let sent = 0;
    let failed = 0;
    let error: string | undefined;

    if (config.host.toLowerCase() === 'smtp.resend.com') {
        for (let i = 0; i < recipients.length; i += RESEND_BATCH_SIZE) {
            const chunk = recipients.slice(i, i + RESEND_BATCH_SIZE);
            const emailFor = (r: BulkRecipient) => ({
                from: fromHeader(config),
                to: [r.email.trim()],
                reply_to: replyTo,
                subject: mail.subject,
                html: mail.html,
                text,
            });
            const res = await callResend(config.pass, chunk.map(emailFor));
            if (res.ok) {
                sent += chunk.length;
                continue;
            }
            error = res.error;
            if (res.retryable) {
                failed += chunk.length;
                continue;
            }
            // Resend refused the whole batch (usually one bad address) → send this chunk one by one
            // (about 5 per second, under Resend's limit) so the good addresses still get it.
            for (const r of chunk) {
                const one = await callResend(config.pass, emailFor(r));
                if (one.ok) sent += 1;
                else {
                    failed += 1;
                    error = one.error;
                }
                await wait(200);
            }
        }
        return { sent, failed, error };
    }

    const sendOne = async (r: BulkRecipient) => {
        for (let attempt = 1; attempt <= MAX_TRIES; attempt += 1) {
            const res = await sendMail({ to: r, subject: mail.subject, html: mail.html, replyTo });
            if (res.ok) return void (sent += 1);
            error = res.error;
            await wait(1000 * attempt);
        }
        failed += 1;
    };
    for (let i = 0; i < recipients.length; i += 3) {
        await Promise.all(recipients.slice(i, i + 3).map(sendOne));
    }
    return { sent, failed, error };
};
