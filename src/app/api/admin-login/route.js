import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'crypto';

// Admin login whose credentials live in environment variables (Vercel → Settings →
// Environment Variables). Server-only — never prefix these with NEXT_PUBLIC_:
//   ADMIN_USERNAME             e.g. asiansfx@admin786
//   ADMIN_PASSWORD             a strong password of your choice
//   SUPABASE_SERVICE_ROLE_KEY  Supabase → Settings → API → service_role (secret)
//   ADMIN_EMAIL                optional, the Supabase account behind the admin (default admin@asianfxsignals.com)
//
// On a correct username/password this makes sure a Supabase user exists for the admin,
// keeps its password in sync with ADMIN_PASSWORD, marks it is_admin, and returns a session.

const sha = (v) => createHash('sha256').update(String(v ?? '')).digest();
const same = (a, b) => timingSafeEqual(sha(a), sha(b));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function POST(request) {
    const { ADMIN_USERNAME, ADMIN_PASSWORD, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !SUPABASE_SERVICE_ROLE_KEY || !url || !anonKey) {
        return Response.json({ message: 'Admin login is not configured on the server.' }, { status: 503 });
    }

    const { username, password } = await request.json().catch(() => ({}));

    // Compare both fields every time (constant-time) so timing reveals nothing.
    const userOk = same(String(username || '').trim().toLowerCase(), ADMIN_USERNAME.trim().toLowerCase());
    const passOk = same(password, ADMIN_PASSWORD);
    if (!(userOk && passOk)) {
        await sleep(800); // slow down guessing
        return Response.json({ message: 'Invalid login credentials' }, { status: 401 });
    }

    const email = (process.env.ADMIN_EMAIL || 'admin@asianfxsignals.com').trim().toLowerCase();
    const opts = { auth: { persistSession: false, autoRefreshToken: false } };
    const service = createClient(url, SUPABASE_SERVICE_ROLE_KEY, opts);
    const publicClient = createClient(url, anonKey, opts);

    let { data, error } = await publicClient.auth.signInWithPassword({ email, password: ADMIN_PASSWORD });

    if (error) {
        // First login, or ADMIN_PASSWORD was changed in Vercel → create / sync the account.
        const created = await service.auth.admin.createUser({
            email,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { name: 'Administrator' },
        });

        if (created.error) {
            const { data: list, error: listError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);
            if (listError || !existing) {
                return Response.json({ message: 'Could not prepare the admin account.' }, { status: 500 });
            }
            const updated = await service.auth.admin.updateUserById(existing.id, { password: ADMIN_PASSWORD, email_confirm: true });
            if (updated.error) {
                return Response.json({ message: 'Could not update the admin account.' }, { status: 500 });
            }
        }

        ({ data, error } = await publicClient.auth.signInWithPassword({ email, password: ADMIN_PASSWORD }));
        if (error || !data?.session) {
            return Response.json({ message: 'Admin sign-in failed.' }, { status: 500 });
        }
    }

    // Make sure this account is an admin (service role bypasses RLS).
    const { error: profileError } = await service
        .from('profiles')
        .update({ is_admin: true, is_active: true, name: ADMIN_USERNAME.trim() })
        .eq('id', data.user.id);
    if (profileError) {
        return Response.json({ message: 'Could not grant admin access. Has schema.sql been run?' }, { status: 500 });
    }

    return Response.json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
    });
}
