import { supabase, unwrap, toError, getSessionUserId } from '@/lib/supabaseClient';

const getProfile = async () => {
    const userId = await getSessionUserId();
    return unwrap(await supabase.from('profiles').select('*').eq('id', userId).single());
};

const login = async ({ email, password }) => {
    if (isAdminUsername(email)) return adminLogin({ email, password });
    const { session } = unwrap(await supabase.auth.signInWithPassword({ email, password }));
    const user = await getProfile();
    return { access_token: session.access_token, user };
};

// The admin signs in with a username (e.g. "asiansfx@admin786"), not a real email address.
// Real emails always have a dot in the domain part; the admin username doesn't.
export const isAdminUsername = (value = '') => {
    const v = String(value).trim();
    const domain = v.includes('@') ? v.split('@').pop() : '';
    return !v.includes('@') || !domain.includes('.');
};

// Admin credentials are checked on the server against the Vercel env vars.
const adminLogin = async ({ email: username, password }) => {
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

const register = async ({ name, email, password, phone, country, referral_code }) => {
    const data = unwrap(await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name, phone, country, referral_code: referral_code?.trim() || null },
        },
    }));
    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && data.user.identities?.length === 0) {
        throw toError('An account with this email already exists.');
    }
    return { message: 'Registration successful. Check your email for the verification code.' };
};

const logout = async () => {
    unwrap(await supabase.auth.signOut());
    return { message: 'Logged out' };
};

const verifyOTP = async ({ email, otp }) => {
    unwrap(await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' }));
    return { message: 'Email verified' };
};

const resendOTP = async ({ email }) => {
    unwrap(await supabase.auth.resend({ type: 'signup', email }));
    return { message: 'Code sent' };
};

const forgotPassword = async ({ email }) => {
    unwrap(await supabase.auth.resetPasswordForEmail(email));
    return { message: 'Reset code sent' };
};

const resetPassword = async ({ email, otp, newPassword }) => {
    unwrap(await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' }));
    unwrap(await supabase.auth.updateUser({ password: newPassword }));
    await supabase.auth.signOut();
    return { message: 'Password updated' };
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
    resetPassword
};

export default authService;
