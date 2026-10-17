import { supabase, unwrap, getSessionUserId } from '@/lib/supabaseClient';

const getMyNotifications = async () => {
    const userId = await getSessionUserId();
    const rows = unwrap(await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50));
    return (rows || []).map((n) => ({ ...n, signal: n.data?.signal }));
};

const markAsRead = async (id) => {
    unwrap(await supabase.from('notifications').update({ is_read: true }).eq('id', id));
    return { message: 'Marked as read' };
};

const notificationService = {
    getMyNotifications,
    markAsRead
};

export default notificationService;
