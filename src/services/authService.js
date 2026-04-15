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

const login = async (userData) => {
    const response = await api.post(API_ENDPOINTS.LOGIN, userData);
    return response.data;
};

const register = async (userData) => {
    const response = await api.post(API_ENDPOINTS.REGISTER, userData);
    return response.data;
};

const authService = {
    login,
    register,
};

export default authService;
