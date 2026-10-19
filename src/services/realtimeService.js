import { supabase } from '@/lib/supabaseClient';

// ---------------------------------------------------------------------
// Presence: who is on the site right now. One shared channel for the whole app.
// AuthGuard tracks the logged-in user on every page; admin pages only listen for the count.
// ---------------------------------------------------------------------
let presenceChannel = null;
let presenceKey = null;
let lastPresenceCount = 0;
const presenceListeners = new Set();

const publishPresenceCount = () => {
    const state = presenceChannel?.presenceState() || {};
    lastPresenceCount = Object.values(state).filter((metas) => !metas[0]?.is_admin).length;
    presenceListeners.forEach((fn) => fn(lastPresenceCount));
};

/** Track the logged-in user as present. Pass null on logout to stop tracking. */
export function trackPresence(user) {
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
export function connectRealtime(user) {
    const handlers = {};
    const channels = [];
    let closed = false;

    const emit = (event, payload) => (handlers[event] || []).forEach((fn) => fn(payload));

    const onPresenceCount = (count) => emit('active_clients_count', count);
    presenceListeners.add(onPresenceCount);

    const start = () => {
        if (closed || !user?.id) return;
        emit('active_clients_count', lastPresenceCount);

        const channel = supabase
            .channel(`rt-${user.id}-${Math.random().toString(36).slice(2)}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                ({ new: row }) => emit('notification', { ...row, signal: row.data?.signal }))
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'signals' },
                ({ new: row }) => emit('signal_timer_updated', { signal_id: row.id }))
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.global_timer' },
                ({ new: row }) => emit('global_timer_update', { expires_at: row?.value?.expires_at || null }));

        if (user.is_admin) {
            channel
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'transactions' },
                    ({ new: row }) => {
                        if (row.type === 'deposit') emit('admin_notification', { type: 'NEW_DEPOSIT', transaction: row });
                    })
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'signal_requests' },
                    ({ new: row }) => emit('signal_request', row));
        }

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') emit('connect');
        });
        channels.push(channel);
    };

    // Defer so callers can register all .on() handlers first (like socket.io).
    setTimeout(start, 0);

    return {
        on(event, fn) {
            (handlers[event] ||= []).push(fn);
            return this;
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
}
