import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env (locally) or in Vercel → Settings → Environment Variables.');
}

// Placeholders keep the build/prerender from crashing when the vars are missing;
// requests will simply fail until the real values are configured.
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key'
);

export const PROOF_BUCKET = 'deposit-proofs';

// Build an error shaped like the old axios errors (error.response.data.message),
// so existing page-level error handling keeps showing the right message.
export const toError = (message, original) => {
    const err = new Error(message);
    err.response = { data: { message } };
    err.original = original;
    return err;
};

// Unwrap a Supabase { data, error } result: return data or throw.
export const unwrap = ({ data, error }) => {
    if (error) throw toError(error.message, error);
    return data;
};

export const getSessionUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw toError('Please log in to continue.');
    return session.user.id;
};
