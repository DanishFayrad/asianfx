import { getSignalRecipients } from '@/lib/signalRecipients';
import { adminClientFromRequest, configureWebPush, pushToMembers } from '@/lib/webPush';

// web-push needs Node's crypto.
export const runtime = 'nodejs';

/**
 * Admin-only: send a browser push notification about a new signal to the same members
 * who get the email. Never includes prices — members unlock those on the dashboard.
 */
export async function POST(request: Request) {
    if (!configureWebPush()) {
        return Response.json({ message: 'Web push is not configured (VAPID keys missing).' }, { status: 503 });
    }
    const auth = await adminClientFromRequest(request);
    if ('error' in auth) return auth.error;
    const { supabase } = auth;

    const { signal_id: signalId } = await request.json().catch(() => ({}));
    if (!signalId) return Response.json({ message: 'signal_id is required' }, { status: 400 });

    const { data: signal, error: signalError } = await supabase.from('signals').select('*').eq('id', signalId).single();
    if (signalError || !signal) return Response.json({ message: 'Signal not found' }, { status: 404 });

    const { recipients, error } = await getSignalRecipients(supabase, signal);
    if (error) return Response.json({ message: error }, { status: 500 });

    const side = String(signal.type || '').toUpperCase();
    const releaseMs = signal.release_at ? new Date(signal.release_at).getTime() - Date.now() : 0;
    const unlockIn = releaseMs > 30_000 ? ` — unlocks in ${Math.ceil(releaseMs / 60_000)} min` : '';
    const result = await pushToMembers(supabase, recipients.map((r) => r.id), {
        title: `${signal.target_user_id ? 'Private signal' : 'New signal'}: ${signal.symbol} ${side}`,
        body: `Open your dashboard to unlock Entry, TP and SL${unlockIn}.`,
        tag: `signal-${signal.id}`,
    });
    if (result.error) return Response.json({ message: result.error }, { status: 500 });
    return Response.json(result);
}
