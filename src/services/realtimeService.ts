import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { Notification, SignalRequest, Transaction } from '@/types';

/** The fields of a user the realtime layer needs. */
interface RealtimeUser {
    id: string;
    is_admin?: boolean;
}

/** Payload of each realtime event (see connectRealtime below). */
export interface RealtimeEvents {
    connect: undefined;
    notification: Notification;
    signal_timer_updated: { signal_id: number };
    global_timer_update: { expires_at: string | null; server_time?: number };
    admin_notification: { type: 'NEW_DEPOSIT'; transaction: Transaction };
    signal_request: SignalRequest;
    active_clients_count: number;
}

type EventName = keyof RealtimeEvents;
type Handler<E extends EventName> = (payload: RealtimeEvents[E]) => void;

export interface RealtimeConnection {
    on<E extends EventName>(event: E, fn: Handler<E>): RealtimeConnection;
    emit(...args: unknown[]): void;
    disconnect(): void;
}

// ---------------------------------------------------------------------
// Presence: who is on the site right now. One shared channel for the whole app.
// AuthGuard tracks the logged-in user on every page; admin pages only listen for the count.
// ---------------------------------------------------------------------
let presenceChannel: RealtimeChannel | null = null;
let presenceKey: string | null = null;
let lastPresenceCount = 0;
const presenceListeners = new Set<(count: number) => void>();

const publishPresenceCount = () => {
    const state = (presenceChannel?.presenceState() || {}) as Record<string, Array<{ is_admin?: boolean }>>;
    lastPresenceCount = Object.values(state).filter((metas) => !metas[0]?.is_admin).length;
    presenceListeners.forEach((fn) => fn(lastPresenceCount));
};

/** Track the logged-in user as present. Pass null on logout to stop tracking. */
export function trackPresence(user: RealtimeUser | null | undefined): void {
    if (!user?.id) {
        if (presenceChannel) supabase.removeChannel(presenceChannel);
        presenceChannel = null;
        presenceKey = null;
        return;
    }
    if (presenceChannel && presenceKey === user.id) return;

    if (presenceChannel) supabase.removeChannel(presenceChannel);
    presenceKey = user.id;

    const channel = supabase.channel('online-users', { config: { presence: { key: user.id } } });
    presenceChannel = channel;
    channel
        .on('presence', { event: 'sync' }, publishPresenceCount)
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ is_admin: !!user.is_admin, online_at: new Date().toISOString() });
            }
        });
}

/**
 * Supabase Realtime connection with a socket.io-like API (on / emit / disconnect),
 * so pages that used socket.io keep the same event names:
 *
 *  - connect               channel subscribed
 *  - notification          new row in notifications for this user  ({ ...row, signal })
 *  - signal_timer_updated  a signal row changed                    ({ signal_id })
 *  - global_timer_update   global countdown changed                ({ expires_at })
 *  - admin_notification    (admins) new deposit request            ({ type: 'NEW_DEPOSIT', transaction })
 *  - signal_request        (admins) new signal access request      (row)
 *  - active_clients_count  number of non-admin users online        (number)
 */
export function connectRealtime(user: RealtimeUser | null | undefined): RealtimeConnection {
    const handlers: { [E in EventName]?: Array<Handler<E>> } = {};
    const channels: RealtimeChannel[] = [];
    let closed = false;

    const emit = <E extends EventName>(event: E, payload?: RealtimeEvents[E]) =>
        (handlers[event] || []).forEach((fn) => (fn as Handler<E>)(payload as RealtimeEvents[E]));

    const onPresenceCount = (count: number) => emit('active_clients_count', count);
    presenceListeners.add(onPresenceCount);

    const start = () => {
        if (closed || !user?.id) return;
        emit('active_clients_count', lastPresenceCount);

        const channel = supabase
            .channel(`rt-${user.id}-${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                ({ new: row }) => {
                    const n = row as Notification;
                    emit('notification', { ...n, signal: n.data?.signal });
                })
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'signals' },
                ({ new: row }) => emit('signal_timer_updated', { signal_id: (row as { id: number }).id }))
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.global_timer' },
                ({ new: row }) => emit('global_timer_update', {
                    expires_at: (row as { value?: { expires_at?: string | null } })?.value?.expires_at || null,
                }));

        if (user.is_admin) {
            channel
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'transactions' },
                    ({ new: row }) => {
                        const tx = row as Transaction;
                        if (tx.type === 'deposit') emit('admin_notification', { type: 'NEW_DEPOSIT', transaction: tx });
                    })
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'signal_requests' },
                    ({ new: row }) => emit('signal_request', row as SignalRequest));
        }

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') emit('connect');
        });
        channels.push(channel);
    };

    // Defer so callers can register all .on() handlers first (like socket.io).
    setTimeout(start, 0);

    const connection: RealtimeConnection = {
        on(event, fn) {
            ((handlers[event] ||= []) as Array<typeof fn>).push(fn);
            return connection;
        },
        emit() {
            // Rooms are handled by RLS + filters; nothing to send.
        },
        disconnect() {
            closed = true;
            presenceListeners.delete(onPresenceCount);
            channels.forEach((c) => supabase.removeChannel(c));
        },
    };
    return connection;
}
