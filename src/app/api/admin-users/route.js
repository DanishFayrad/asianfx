import { createClient } from '@supabase/supabase-js';

// Admin-only member actions: activate, deactivate or delete a member.
// Server-only — uses SUPABASE_SERVICE_ROLE_KEY (same env vars as /api/admin-login).

const ACTIONS = ['activate', 'deactivate', 'delete'];

export async function POST(request) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        return Response.json({ message: 'Server is not configured.' }, { status: 503 });
    }

    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ message: 'Not signed in.' }, { status: 401 });

    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Confirm the caller is a signed-in admin before doing anything.
    const { data: caller, error: authError } = await service.auth.getUser(token);
    if (authError || !caller?.user) return Response.json({ message: 'Not signed in.' }, { status: 401 });

    const { data: me } = await service.from('profiles').select('is_admin').eq('id', caller.user.id).single();
    if (!me?.is_admin) return Response.json({ message: 'Admin only.' }, { status: 403 });

    const { userId, action } = await request.json().catch(() => ({}));
    if (!userId || !ACTIONS.includes(action)) {
        return Response.json({ message: 'Invalid request.' }, { status: 400 });
    }
    if (userId === caller.user.id) {
        return Response.json({ message: 'You cannot change your own account here.' }, { status: 400 });
    }

    const { data: target, error: targetError } = await service
        .from('profiles')
        .select('id, is_admin')
        .eq('id', userId)
        .single();
    if (targetError || !target) return Response.json({ message: 'User not found.' }, { status: 404 });
    if (target.is_admin) return Response.json({ message: 'Admin accounts cannot be changed here.' }, { status: 400 });

    if (action === 'delete') {
        // Deleting the auth user cascades to their profile, transactions and signal history.
        const { error } = await service.auth.admin.deleteUser(userId);
        if (error) return Response.json({ message: 'Could not delete the user.' }, { status: 500 });
        return Response.json({ message: 'User deleted.' });
    }

    const isActive = action === 'activate';
    const { error } = await service.from('profiles').update({ is_active: isActive }).eq('id', userId);
    if (error) return Response.json({ message: 'Could not update the user.' }, { status: 500 });
    return Response.json({ message: isActive ? 'User activated.' : 'User deactivated.' });
}
