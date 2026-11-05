import { supabase, unwrap, toError, getSessionUserId } from '@/lib/supabaseClient';
import type { MessageResponse, Profile } from '@/types';

export interface Credentials {
    email: string;
    password: string;
}

export interface LoginResult {
    access_token: string;
    user: Profile;
}

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    phone?: string;
    country?: string;
    referral_code?: string | null;
}

const getProfile = async (): Promise<Profile> => {
    const userId = await getSessionUserId();
    return unwrap<Profile>(await supabase.from('profiles').select('*').eq('id', userId).single());
};

const login = async ({ email, password }: Credentials): Promise<LoginResult> => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (isAdminUsername(cleanEmail)) return adminLogin({ email: cleanEmail, password });

    const { session } = unwrap(await supabase.auth.signInWithPassword({ email: cleanEmail, password }));
    const user = await getProfile();
    return { access_token: session.access_token, user };
};

// The admin signs in with a username (e.g. "asiansfx@admin786"), not a real email address.
// Real emails always have a dot in the domain part; the admin username doesn't.
export const isAdminUsername = (value = ''): boolean => {
    const v = String(value).trim();
    const domain = v.includes('@') ? v.split('@').pop() || '' : '';
    return !v.includes('@') || !domain.includes('.');
};

// Admin credentials are checked on the server against the Vercel env vars.
const adminLogin = async ({ email: username, password }: Credentials): Promise<LoginResult> => {
    const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw toError(body.message || 'Admin login failed');

    unwrap(await supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token }));
    const user = await getProfile();
    return { access_token: body.access_token, user };
};

const register = async ({ name, email, password, phone, country, referral_code }: RegisterInput): Promise<MessageResponse & { signedIn: boolean }> => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const data = unwrap(await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
            data: { name, phone, country, referral_code: referral_code?.trim() || null },
        },
    }));
    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && data.user.identities?.length === 0) {
        throw toError('An account with this email already exists.');
    }
    // With "Confirm email" off in Supabase the member is signed in straight away (no OTP step).
    if (data.session) return { message: 'Account created!', signedIn: true };
    return { message: 'Registration successful! Verification code sent to your email.', signedIn: false };
};

const logout = async (): Promise<MessageResponse> => {
    unwrap(await supabase.auth.signOut());
    return { message: 'Logged out' };
};

const verifyOTP = async ({ email, otp }: { email: string; otp: string }): Promise<MessageResponse> => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
        throw toError('Please enter the complete 6-digit verification code.');
    }

    // 1. Try signup token verification
    let res = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanOtp, type: 'signup' });

    // 2. Fallback to email token verification
    if (res.error) {
        res = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanOtp, type: 'email' });
    }

    if (res.error) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            return { message: 'Email already verified' };
        }
        throw toError(res.error.message || 'Invalid or expired verification code');
    }

    return { message: 'Email verified successfully!' };
};

const resendOTP = async ({ email }: { email: string }): Promise<MessageResponse> => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const res = await supabase.auth.resend({ email: cleanEmail, type: 'signup' });
    if (res.error) {
        if (/rate_limit/i.test(res.error.code || '') || /security purposes/i.test(res.error.message)) {
            throw toError('Please wait a moment before requesting another code.');
        }
        throw toError(res.error.message || 'Failed to resend code');
    }
    return { message: 'Verification code resent. Check your inbox.' };
};

const forgotPassword = async (arg: string | { email: string }): Promise<MessageResponse> => {
    const email = typeof arg === 'string' ? arg : arg.email;
    unwrap(await supabase.auth.resetPasswordForEmail(String(email || '').trim().toLowerCase()));
    return { message: 'Password reset email sent. Please check your inbox.' };
};

const resetPassword = async ({ email, otp, newPassword }: { email: string; otp: string; newPassword: string }): Promise<MessageResponse> => {
    unwrap(await supabase.auth.verifyOtp({ email: String(email || '').trim().toLowerCase(), token: otp.trim(), type: 'recovery' }));
    unwrap(await supabase.auth.updateUser({ password: newPassword }));
    return { message: 'Password has been reset successfully. Please log in with your new password.' };
};

const authService = {
    login,
    adminLogin,
    register,
    logout,
    getProfile,
    verifyOTP,
    resendOTP,
    forgotPassword,
    resetPassword,
};

export default authService;
