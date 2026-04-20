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

// Add a response interceptor to handle 401 errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn("Token expired or unauthorized. Logging out...");
            localStorage.removeItem('token');
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

const login = async (userData) => {
    const response = await api.post(API_ENDPOINTS.LOGIN, userData);
    return response.data;
};

const register = async (userData) => {
    const response = await api.post(API_ENDPOINTS.REGISTER, userData);
    return response.data;
};

const logout = async () => {
    const response = await api.post(API_ENDPOINTS.LOGOUT);
    return response.data;
};

const getProfile = async () => {
    const response = await api.get(API_ENDPOINTS.PROFILE);
    return response.data;
};

const authService = {
    login,
    register,
    logout,
    getProfile
};

export default authService;
