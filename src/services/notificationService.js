import apiClient from './apiClient';

const api = apiClient;


const getMyNotifications = async () => {
    const response = await api.get('/api/notifications');
    return response.data;
};

const markAsRead = async (id) => {
    const response = await api.patch(`/api/notifications/${id}/read`);
    return response.data;
};

const notificationService = {
    getMyNotifications,
    markAsRead
};

export default notificationService;
