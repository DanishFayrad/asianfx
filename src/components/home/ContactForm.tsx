'use client';

import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import styles from '@/app/home.module.css';

export default function ContactForm() {
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fields = new FormData(form);
        const fullName = String(fields.get('fullName') || '').trim();
        const email = String(fields.get('email') || '').trim();
        const message = String(fields.get('message') || '').trim();

        if (!fullName || !email) {
            toast.error('Please enter your name and email.');
            return;
        }

        try {
            setSubmitting(true);
            // The server saves the message and emails it to the AsianFX inbox.
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ fullName, email, message, website: fields.get('website') || '' }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.message || 'Could not send your message. Please try again.');
            toast.success('Thank you! We will get back to you shortly.');
            form.reset();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not send your message. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <label>
                <span>Full name <em>*</em></span>
                <input name="fullName" type="text" placeholder="Your name" autoComplete="name" maxLength={100} required />
            </label>
            <label>
                <span>Email <em>*</em></span>
                <input name="email" type="email" placeholder="you@example.com" autoComplete="email" maxLength={200} required />
            </label>
            <label>
                <span>Message</span>
                <textarea name="message" rows={4} placeholder="Ask us anything about our signals…" maxLength={5000} />
            </label>
            {/* Hidden from people; spam bots fill it in and get ignored. */}
            <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
            <button type="submit" className={styles.btnGold} disabled={submitting}>
                {submitting ? 'Sending…' : 'Send message'}
            </button>
        </form>
    );
}
