import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        return Response.json({ message: 'Server configuration error.' }, { status: 503 });
    }

    try {
        const { email } = await request.json().catch(() => ({}));
        if (!email || typeof email !== 'string') {
            return Response.json({ message: 'Email is required.' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();
        const service = createClient(url, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        // 1. Look up user ID from profiles table first
        const { data: profile } = await service
            .from('profiles')
            .select('id')
            .ilike('email', cleanEmail)
            .maybeSingle();

        let userId = profile?.id;

        // 2. If not found in profiles, search directly in auth.users
        if (!userId) {
            const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
            const user = data?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
            userId = user?.id;
        }

        if (!userId) {
            return Response.json({ message: 'User not found.' }, { status: 404 });
        }

        // 3. Auto-confirm the user email in Supabase Auth
        const { data: updated, error } = await service.auth.admin.updateUserById(userId, {
            email_confirm: true,
        });

        if (error) {
            return Response.json({ message: error.message }, { status: 500 });
        }

        return Response.json({
            success: true,
            message: 'Email confirmed successfully.',
            user: { id: updated.user.id, email: updated.user.email },
        });
    } catch (err: any) {
        return Response.json({ message: err?.message || 'Internal server error.' }, { status: 500 });
    }
}

