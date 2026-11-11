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
//   MAIL_BATCH_CONCURRENCY  optional, Resend batch calls in flight at once (1–10, default 4)

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
    /** Resend accepted these (it returned an email id). Acceptance is not inbox delivery. */
    sent: number;
    /** Resend refused these for good (bad address, quota, …) — retrying would not help. */
    failed: number;
    /** No clear answer after every retry (timeouts / network) — Resend may or may not have them. */
    unknown: number;
    /** Resend email ids of the accepted emails. */
    ids: string[];
    /** The last error text, when something went wrong. */
    error?: string;
}

const RESEND_BATCH_SIZE = 100;     // Resend's maximum emails per batch call
const MAX_TRIES = 5;
const REQUEST_TIMEOUT_MS = 15_000;
const REQUESTS_PER_SECOND = 8;     // Resend allows 10/s per team; leave room for the contact form etc.
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const batchConcurrency = () => Math.min(Math.max(Math.floor(Number(process.env.MAIL_BATCH_CONCURRENCY)) || 4, 1), 10);

/** Exponential backoff with jitter; Resend's Retry-After wins when it sends one. */
const backoffMs = (attempt: number, retryAfterSec?: number) => {
    if (retryAfterSec && retryAfterSec > 0) return retryAfterSec * 1000 + Math.random() * 250;
    const ceiling = Math.min(500 * 2 ** (attempt - 1), 8000);
    return ceiling / 2 + Math.random() * (ceiling / 2);
};

/** Spaces out request starts so all parallel workers together stay under the per-second limit. */
const createRateGate = (perSecond: number) => {
    let nextSlot = 0;
    return async () => {
        const now = Date.now();
        const slot = Math.max(now, nextSlot);
        nextSlot = slot + 1000 / perSecond;
        if (slot > now) await wait(slot - now);
    };
};

const fromHeader = (c: NonNullable<ReturnType<typeof mailConfig>>) =>
    `"${c.from.name.replace(/["\\]/g, '')}" <${c.from.email}>`;

type BatchOutcome =
    | { kind: 'accepted'; ids: (string | null)[] } // ids line up with the payload; null = no id returned
    | { kind: 'rejected'; error: string }          // permanent — the same payload will always fail
    | { kind: 'duplicate'; error: string }         // this key was already used for a different payload
    | { kind: 'unknown'; error: string };          // gave up retrying without a clear answer

/**
 * One Resend batch call. Every retry sends the same Idempotency-Key and the same payload,
 * so Resend sends each email at most once even if an earlier try actually went through.
 */
const postBatch = async (
    apiKey: string,
    payload: object[],
    idempotencyKey: string,
    gate: () => Promise<void>,
): Promise<BatchOutcome> => {
    let error = 'Send failed';
    for (let attempt = 1; attempt <= MAX_TRIES; attempt += 1) {
        let retryAfter: number | undefined;
        await gate();
        try {
            const res = await fetch('https://api.resend.com/emails/batch', {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            const body = await res.json().catch(() => null);
            if (res.ok) {
                const data: unknown[] | null = Array.isArray(body?.data) ? body.data : null;
                if (!data) return { kind: 'unknown', error: 'Resend answered without email ids' };
                return {
                    kind: 'accepted',
                    ids: payload.map((_, i) => {
                        const id = (data[i] as { id?: unknown } | undefined)?.id;
                        return typeof id === 'string' && id ? id : null;
                    }),
                };
            }
            error = body?.message || `Resend error ${res.status}`;
            const name = String(body?.name || '');
            if (res.status === 409 && name === 'invalid_idempotent_request') return { kind: 'duplicate', error };
            // Worth another try: rate limit (not a used-up quota), "same key still in progress", server errors.
            const retryable = (res.status === 429 && !name.includes('quota')) || res.status === 409 || res.status >= 500;
            if (!retryable) return { kind: 'rejected', error };
            retryAfter = Number(res.headers.get('retry-after')) || undefined;
        } catch (e) {
            // Timeout / network drop: Resend may have taken it — the same key makes the retry safe.
            error = (e as Error).message || error;
        }
        if (attempt < MAX_TRIES) await wait(backoffMs(attempt, retryAfter));
    }
    return { kind: 'unknown', error };
};

/**
 * Send the same email to many members. Never throws.
 * Resend → batch API, 100 per call, a few calls in parallel (rate-limited), each with an
 *   idempotency key `<idempotencyKey>/b<n>` so retries never double-send. A batch Resend
 *   refuses outright (usually one bad address) is split in half until the bad address is
 *   isolated, so everyone else still gets the email.
 * Other SMTP servers → one by one, 3 at a time, each retried a few times.
 *
 * `idempotencyKey` names this send attempt (e.g. `signal-42/<attempt id>`). Calling again with the
 * same key and the same recipients within 24h sends nothing new. Leave it out for a fresh attempt.
 */
export const sendBulk = async (
    recipients: BulkRecipient[],
    mail: { subject: string; html: string; replyTo?: string; idempotencyKey?: string },
): Promise<BulkResult> => {
    const result: BulkResult = { sent: 0, failed: 0, unknown: 0, ids: [] };
    const config = mailConfig();
    if (!config) return { ...result, failed: recipients.length, error: MAIL_NOT_CONFIGURED };

    const replyTo = mail.replyTo || process.env.MAIL_REPLY_TO || 'info@asianfxsignals.com';
    const text = htmlToText(mail.html);

    if (config.host.toLowerCase() === 'smtp.resend.com') {
        const keyBase = (mail.idempotencyKey || `bulk-${crypto.randomUUID()}`).slice(0, 200);
        const gate = createRateGate(REQUESTS_PER_SECOND);
        const emailFor = (r: BulkRecipient) => ({
            from: fromHeader(config),
            to: [r.email.trim()],
            reply_to: replyTo,
            subject: mail.subject,
            html: mail.html,
            text,
        });

        const sendChunk = async (chunk: BulkRecipient[], key: string): Promise<void> => {
            const outcome = await postBatch(config.pass, chunk.map(emailFor), key, gate);
            if (outcome.kind === 'accepted') {
                for (const id of outcome.ids) {
                    if (id) {
                        result.sent += 1;
                        result.ids.push(id);
                    } else result.unknown += 1;
                }
                return;
            }
            result.error = outcome.error;
            if (outcome.kind === 'rejected' && chunk.length > 1) {
                // Split and retry each half under its own key, so only the bad address(es) fail.
                const half = Math.ceil(chunk.length / 2);
                await sendChunk(chunk.slice(0, half), `${key}.0`);
                await sendChunk(chunk.slice(half), `${key}.1`);
                return;
            }
            if (outcome.kind === 'rejected') result.failed += chunk.length;
            else result.unknown += chunk.length; // 'unknown' or 'duplicate' (already handled by an earlier request)
        };

        const chunks: BulkRecipient[][] = [];
        for (let i = 0; i < recipients.length; i += RESEND_BATCH_SIZE) chunks.push(recipients.slice(i, i + RESEND_BATCH_SIZE));

        // A few workers pull batches off the list — bounded parallelism, never one Promise per batch.
        let next = 0;
        const worker = async () => {
            while (next < chunks.length) {
                const index = next++;
                await sendChunk(chunks[index], `${keyBase}/b${index}`);
            }
        };
        await Promise.all(Array.from({ length: Math.min(batchConcurrency(), chunks.length) }, worker));
        return result;
    }

    const sendOne = async (r: BulkRecipient) => {
        for (let attempt = 1; attempt <= MAX_TRIES; attempt += 1) {
            const res = await sendMail({ to: r, subject: mail.subject, html: mail.html, replyTo });
            if (res.ok) return void (result.sent += 1);
            result.error = res.error;
            if (attempt < MAX_TRIES) await wait(backoffMs(attempt));
        }
        result.failed += 1;
    };
    for (let i = 0; i < recipients.length; i += 3) {
        await Promise.all(recipients.slice(i, i + 3).map(sendOne));
    }
    return result;
};
