import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { fetchAll } from '@/lib/fetchAll';

// Shared server-side helpers for the web-push routes (signal alerts, deposit updates…).

const PARALLEL = 20;
const ID_CHUNK = 200; // keep the "user_id in (...)" query URL short

export interface PushMessage {
    title: string;
    body: string;
    url?: string;
    tag?: string;
}

/** Load the VAPID keys; returns false when web push is not configured. */
export const configureWebPush = (): boolean => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return false;
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@asianfxsignals.com', publicKey, privateKey);
    return true;
};

/**
 * Check the caller is a signed-in admin. Returns a Supabase client acting as that admin
 * (so RLS decides what can be read — no service-role key needed), or an error Response.
 */
export const adminClientFromRequest = async (
    request: Request,
): Promise<{ supabase: SupabaseClient } | { error: Response }> => {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return { error: Response.json({ message: 'Not authenticated' }, { status: 401 }) };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
        return { error: Response.json({ message: 'Supabase is not configured on the server.' }, { status: 503 }) };
    }
    const supabase = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return { error: Response.json({ message: 'Not authenticated' }, { status: 401 }) };
    const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!me?.is_admin) return { error: Response.json({ message: 'Admin only' }, { status: 403 }) };
    return { supabase };
};

/**
 * Send one notification to every browser these members turned alerts on in.
 * Subscriptions the push service reports as gone (404 / 410) are deleted.
 */
export const pushToMembers = async (
    supabase: SupabaseClient,
    userIds: string[],
    message: PushMessage,
): Promise<{ sent: number; failed: number; removed: number; error?: string }> => {
    const subs: { endpoint: string; p256dh: string; auth: string }[] = [];
    for (let i = 0; i < userIds.length; i += ID_CHUNK) {
        const ids = userIds.slice(i, i + ID_CHUNK);
        const { data, error } = await fetchAll<{ endpoint: string; p256dh: string; auth: string }>((from, to) => supabase
            .from('push_subscriptions').select('endpoint, p256dh, auth').in('user_id', ids)
            .order('id').range(from, to));
        if (error) return { sent: 0, failed: 0, removed: 0, error };
        subs.push(...data);
    }

    const payload = JSON.stringify({ url: '/dashboard', ...message });
    let sent = 0;
    let failed = 0;
    const dead: string[] = [];
    const sendOne = async (s: { endpoint: string; p256dh: string; auth: string }) => {
        try {
            await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
                { TTL: 60 * 30, urgency: 'high' }, // drop it if the device stays offline for 30 minutes
            );
            sent += 1;
        } catch (e) {
            failed += 1;
            const status = (e as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) dead.push(s.endpoint);
            else console.error('Web push failed', status, (e as Error).message);
        }
    };
    for (let i = 0; i < subs.length; i += PARALLEL) {
        await Promise.all(subs.slice(i, i + PARALLEL).map(sendOne));
    }
    if (dead.length) await supabase.from('push_subscriptions').delete().in('endpoint', dead);
    return { sent, failed, removed: dead.length };
};
