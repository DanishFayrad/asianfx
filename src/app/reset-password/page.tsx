'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase, errorMessage } from '@/lib/supabaseClient';
import { useClearSession } from '@/hooks/useAuth';
import '../../styles/forgotPassword.css';

/**
 * Opened from the "Reset password" link in the email. Supabase signs the member in for this
 * one purpose; they choose a new password here, then are signed out and sent to log in.
 */
export default function ResetPasswordPage() {
    const router = useRouter();
    const clearSession = useClearSession();
    const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);

    // The link puts a recovery session in the URL; the Supabase client picks it up on load.
    useEffect(() => {
        let done = false;
        const markReady = () => { if (!done) { done = true; setStatus('ready'); } };
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) markReady();
        });
        supabase.auth.getSession().then(({ data }) => { if (data.session) markReady(); });
        // No session after a few seconds → the link is missing, used or expired.
        const timer = setTimeout(() => { if (!done) { done = true; setStatus('invalid'); } }, 4000);
        return () => { subscription.unsubscribe(); clearTimeout(timer); };
    }, []);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            await supabase.auth.signOut();
            clearSession();
            toast.success('Password updated! Please log in with your new password.');
            router.replace('/login');
        } catch (err) {
            toast.error(errorMessage(err, 'Could not update your password. Please request a new link.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <div className="logo-section">
                    <div className="logo-circle">
                        <Link href="/" aria-label="AsianFX home" title="Home" style={{ display: 'grid', placeItems: 'center' }}>
                            <img src="/images/logo-mark.png" alt="" style={{ width: '34px' }} />
                        </Link>
                    </div>
                    <h1 className="title">Choose a new password</h1>
                </div>

                {status === 'checking' && <p className="subtitle">Checking your reset link…</p>}

                {status === 'invalid' && (
                    <>
                        <p className="subtitle">This reset link is invalid or has expired. Please request a new one.</p>
                        <Link href="/forgot-password" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                            Send a new reset link
                        </Link>
                    </>
                )}

                {status === 'ready' && (
                    <form onSubmit={handleSubmit}>
                        <p className="subtitle">Enter your new password below.</p>
                        <div className="form-group">
                            <label>New Password</label>
                            <input type="password" className="input-box" placeholder="Min 6 characters" autoComplete="new-password"
                                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input type="password" className="input-box" placeholder="Repeat your new password" autoComplete="new-password"
                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
                        </div>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Updating…' : 'Update Password'}
                        </button>
                    </form>
                )}

                <div className="back-to-login">
                    <Link href="/login">← Back to Login</Link>
                </div>
            </div>
        </div>
    );
}
