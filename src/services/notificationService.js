import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/apiConstants';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add a request interceptor to include the token in every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

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
