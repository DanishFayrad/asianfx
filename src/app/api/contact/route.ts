import { createClient } from '@supabase/supabase-js';
import { mailConfig, sendMail } from '@/lib/mailtrap';

// Landing-page contact form: saves the message and emails it to the AsianFX inbox (via Mailtrap,
// the same account used for signal emails — env vars in src/lib/mailtrap.ts).
//   CONTACT_EMAIL  optional, where messages go — defaults to fxasians@gmail.com

const INBOX = process.env.CONTACT_EMAIL || 'fxasians@gmail.com';

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}));
    const fullName = String(body.fullName ?? '').trim().slice(0, 100);
    const email = String(body.email ?? '').trim().slice(0, 200);
    const message = String(body.message ?? '').trim().slice(0, 5000);

    // Hidden "website" field: real visitors leave it empty, spam bots fill it in.
    if (body.website) return Response.json({ ok: true });

    if (!fullName || !EMAIL_RE.test(email)) {
        return Response.json({ message: 'Please enter your name and a valid email.' }, { status: 400 });
    }

    // 1) Keep a copy in the database (contact_messages allows public inserts).
    let saved = false;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anonKey) {
        const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { error } = await supabase.from('contact_messages').insert({ full_name: fullName, email, message });
        if (error) console.error('Saving contact message failed', error.message);
        else saved = true;
    }

    // 2) Email it to the inbox, with the visitor as Reply-To so a reply goes straight to them.
    let emailed = false;
    if (mailConfig()) {
        const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.6">
  <h2 style="margin:0 0 12px;font-size:18px">New message from the AsianFX website</h2>
  <p style="margin:0"><b>Name:</b> ${escapeHtml(fullName)}</p>
  <p style="margin:0 0 12px"><b>Email:</b> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
  <div style="padding:12px 14px;border-radius:8px;background:#f5f5f5;white-space:pre-wrap">${escapeHtml(message || '(no message)')}</div>
  <p style="margin:16px 0 0;color:#666;font-size:12px">Reply to this email to answer ${escapeHtml(fullName)} directly.</p>
</div>`;
        const res = await sendMail({ to: { email: INBOX }, replyTo: email, subject: `New contact message from ${fullName}`, html });
        emailed = res.ok;
    } else {
        console.error('Contact email not sent: MAILTRAP_API_TOKEN / MAILTRAP_SENDER_EMAIL missing.');
    }

    if (!saved && !emailed) {
        return Response.json({ message: 'Could not send your message. Please try again later.' }, { status: 502 });
    }
    return Response.json({ ok: true, emailed });
}
