import { createClient } from '@supabase/supabase-js';

// Admin-only member actions: activate, deactivate, delete (soft — can be restored), restore,
// or purge (permanently delete a member who is already in the Deleted tab).
// Server-only — uses SUPABASE_SERVICE_ROLE_KEY (same env vars as /api/admin-login).

const ACTIONS = ['activate', 'deactivate', 'delete', 'restore', 'purge'];

export async function POST(request: Request) {
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
        .select('id, is_admin, deleted_at')
        .eq('id', userId)
        .single();
    if (targetError || !target) return Response.json({ message: 'User not found.' }, { status: 404 });
    if (target.is_admin) return Response.json({ message: 'Admin accounts cannot be changed here.' }, { status: 400 });

    if (action === 'purge') {
        // Only members already soft-deleted can be wiped, so an active member is never lost by one click.
        if (!target.deleted_at) return Response.json({ message: 'Delete the user first, then delete permanently.' }, { status: 400 });
        // Deleting the auth user cascades to their profile, transactions and signal history.
        const { error } = await service.auth.admin.deleteUser(userId);
        if (error) return Response.json({ message: `Could not delete the user: ${error.message}` }, { status: 500 });
        return Response.json({ message: 'User permanently deleted.' });
    }

    if (action === 'delete' || action === 'restore') {
        // Soft delete: keep the account and its history, just block login and hide the member.
        const deleting = action === 'delete';
        const { error: banError } = await service.auth.admin.updateUserById(userId, { ban_duration: deleting ? '876000h' : 'none' });
        if (banError) return Response.json({ message: 'Could not update the user login.' }, { status: 500 });
        const { error } = await service.from('profiles')
            .update(deleting ? { deleted_at: new Date().toISOString(), is_active: false } : { deleted_at: null })
            .eq('id', userId);
        if (error) return Response.json({ message: 'Could not update the user.' }, { status: 500 });
        return Response.json({ message: deleting ? 'User deleted.' : 'User restored.' });
    }

    const isActive = action === 'activate';
    const { error } = await service.from('profiles').update({ is_active: isActive }).eq('id', userId);
    if (error) return Response.json({ message: 'Could not update the user.' }, { status: 500 });
    return Response.json({ message: isActive ? 'User activated.' : 'User deactivated.' });
}
