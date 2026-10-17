'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase, unwrap } from '@/lib/supabaseClient';
import styles from '@/app/home.module.css';

export default function ContactForm() {
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fullName = form.fullName.value.trim();
        const email = form.email.value.trim();
        const message = form.message.value.trim();

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
            toast.error(err?.response?.data?.message || 'Could not send your message. Please try again.');
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
