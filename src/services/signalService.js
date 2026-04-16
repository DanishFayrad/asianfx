import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/apiConstants';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
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

const getSignalsDashboard = async () => {
    const response = await api.get(API_ENDPOINTS.SIGNALS.DASHBOARD);
    return response.data;
};

const createSignal = async (signalData) => {
    const response = await api.post(API_ENDPOINTS.SIGNALS.CREATE, signalData);
    return response.data;
};

const takeSignal = async (payload) => {
    const response = await api.post(API_ENDPOINTS.SIGNALS.TAKE, payload);
    return response.data;
};

const getUserSignalHistory = async (userId) => {
    const response = await api.get(API_ENDPOINTS.SIGNALS.HISTORY(userId));
    return response.data;
};

const signalService = {
    getSignalsDashboard,
    createSignal,
    takeSignal,
    getUserSignalHistory,
};

export default signalService;
