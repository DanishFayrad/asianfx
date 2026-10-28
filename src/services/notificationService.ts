import { supabase, unwrap, getSessionUserId } from '@/lib/supabaseClient';
import type { MessageResponse, Notification } from '@/types';

const getMyNotifications = async (): Promise<Notification[]> => {
    const userId = await getSessionUserId();
    const rows = unwrap<Notification[]>(await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50));
    return (rows || []).map((n) => ({ ...n, signal: n.data?.signal }));
};

const markAsRead = async (id: number): Promise<MessageResponse> => {
    unwrap(await supabase.from('notifications').update({ is_read: true }).eq('id', id));
    return { message: 'Marked as read' };
};

const notificationService = {
    getMyNotifications,
    markAsRead
};

export default notificationService;
