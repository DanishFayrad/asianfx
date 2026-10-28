'use client';

import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { supabase, unwrap, errorMessage } from '@/lib/supabaseClient';
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
            unwrap(await supabase.from('contact_messages').insert({ full_name: fullName, email, message }));
            toast.success('Thank you! We will get back to you shortly.');
            form.reset();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not send your message. Please try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <label>
                Full name <em>*</em>
                <input name="fullName" type="text" placeholder="Your name" autoComplete="name" required />
            </label>
            <label>
                Email <em>*</em>
                <input name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            </label>
            <label>
                Message
                <textarea name="message" rows={4} placeholder="Ask us anything about our signals…" />
            </label>
            <button type="submit" className={styles.btnGold} disabled={submitting}>
                {submitting ? 'Sending…' : 'Send message'}
            </button>
        </form>
    );
}
