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

/** Error shaped like the old axios errors (error.response.data.message). */
export interface AppError extends Error {
    response?: { data: { message: string } };
    original?: unknown;
}

// Build an error shaped like the old axios errors (error.response.data.message),
// so existing page-level error handling keeps showing the right message.
export const toError = (message: string, original?: unknown): AppError => {
    const err: AppError = new Error(message);
    err.response = { data: { message } };
    err.original = original;
    return err;
};

/** Best-effort message from anything thrown (AppError, Error or a plain value). */
export const errorMessage = (e: unknown, fallback = 'Something went wrong'): string => {
    const err = e as AppError | undefined;
    return err?.response?.data?.message || err?.message || fallback;
};

/** Any Supabase { data, error } result. Callers name the data type: unwrap<Signal[]>(...). */
type SupabaseResult = { data?: unknown; error: { message: string } | null };

// Unwrap a Supabase { data, error } result: return data or throw.
export const unwrap = <T = any>(result: SupabaseResult): T => {
    if (result.error) throw toError(result.error.message, result.error);
    return result.data as T;
};

export const getSessionUserId = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw toError('Please log in to continue.');
    return session.user.id;
};
