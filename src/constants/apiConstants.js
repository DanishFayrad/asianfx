export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    SIGNALS: {
        DASHBOARD: '/api/signals/dashboard',
        CREATE: '/api/signals/create',
        TAKE: '/api/signals/take',
        HISTORY: (userId) => `/api/signals/user/${userId}/history`,
    }
};
