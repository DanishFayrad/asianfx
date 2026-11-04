import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { getSignalRecipients } from '@/lib/signalRecipients';

// web-push needs Node's crypto.
export const runtime = 'nodejs';

const PARALLEL = 20;
const ID_CHUNK = 200; // keep the "user_id in (...)" query URL short

/**
 * Admin-only: send a browser push notification about a new signal to the same members
 * who get the email. Never includes prices — members unlock those on the dashboard.
 */
export async function POST(request: Request) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
        return Response.json({ message: 'Web push is not configured (VAPID keys missing).' }, { status: 503 });
    }
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@asianfxsignals.com', publicKey, privateKey);

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ message: 'Not authenticated' }, { status: 401 });

    const { signal_id: signalId } = await request.json().catch(() => ({}));
    if (!signalId) return Response.json({ message: 'signal_id is required' }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return Response.json({ message: 'Supabase is not configured on the server.' }, { status: 503 });

    // Act as the calling admin, so RLS decides what we can read — no service-role key needed.
    const supabase = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ message: 'Not authenticated' }, { status: 401 });
    const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!me?.is_admin) return Response.json({ message: 'Admin only' }, { status: 403 });

    const { data: signal, error: signalError } = await supabase.from('signals').select('*').eq('id', signalId).single();
    if (signalError || !signal) return Response.json({ message: 'Signal not found' }, { status: 404 });

    const { recipients, error } = await getSignalRecipients(supabase, signal);
    if (error) return Response.json({ message: error }, { status: 500 });
    const ids = recipients.map((r) => r.id);

    const subs: { endpoint: string; p256dh: string; auth: string }[] = [];
    for (let i = 0; i < ids.length; i += ID_CHUNK) {
        const { data, error: subsError } = await supabase
            .from('push_subscriptions').select('endpoint, p256dh, auth').in('user_id', ids.slice(i, i + ID_CHUNK));
        if (subsError) return Response.json({ message: subsError.message }, { status: 500 });
        subs.push(...(data ?? []));
    }
    if (!subs.length) return Response.json({ sent: 0, failed: 0, message: 'No members have signal alerts turned on.' });

    const side = String(signal.type || '').toUpperCase();
    const releaseMs = signal.release_at ? new Date(signal.release_at).getTime() - Date.now() : 0;
    const unlockIn = releaseMs > 30_000 ? ` — unlocks in ${Math.ceil(releaseMs / 60_000)} min` : '';
    const payload = JSON.stringify({
        title: `${signal.target_user_id ? 'Private signal' : 'New signal'}: ${signal.symbol} ${side}`,
        body: `Open your dashboard to unlock Entry, TP and SL${unlockIn}.`,
        url: '/dashboard',
        tag: `signal-${signal.id}`,
    });

    let sent = 0;
    let failed = 0;
    const dead: string[] = [];
    const sendOne = async (s: { endpoint: string; p256dh: string; auth: string }) => {
        try {
            await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
                { TTL: 60 * 30, urgency: 'high' }, // drop it if the phone stays offline for 30 minutes
            );
            sent += 1;
        } catch (e) {
            failed += 1;
            const status = (e as { statusCode?: number }).statusCode;
            // 404 / 410: the browser unsubscribed or the subscription expired — forget it.
            if (status === 404 || status === 410) dead.push(s.endpoint);
            else console.error('Web push failed', status, (e as Error).message);
        }
    };
    for (let i = 0; i < subs.length; i += PARALLEL) {
        await Promise.all(subs.slice(i, i + PARALLEL).map(sendOne));
    }
    if (dead.length) await supabase.from('push_subscriptions').delete().in('endpoint', dead);

    return Response.json({ sent, failed, removed: dead.length });
}
