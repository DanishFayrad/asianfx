export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL_LIVE || 'http://localhost:5000';

export const API_ENDPOINTS = {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    VERIFY_OTP: '/api/auth/verify-otp',
    RESEND_OTP: '/api/auth/resend-otp',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    SIGNALS: {
        DASHBOARD: '/api/signals/dashboard',
        CREATE: '/api/signals/create',
        TAKE: '/api/signals/take',
        HISTORY: (userId) => `/api/signals/user/${userId}/history`,
        DELETE: (id) => `/api/signals/${id}`,
    },
    TRANSACTIONS: {
        DEPOSIT: '/api/transactions/deposit',
        PENDING: '/api/transactions/pending',
        MY: '/api/transactions/my',
        APPROVE: (id) => `/api/transactions/${id}/approve`,
        REJECT: (id) => `/api/transactions/${id}/reject`,
        DELETE: (id) => `/api/transactions/${id}`,
        ALL: '/api/transactions/all',
        ADMIN_STATS: '/api/transactions/admin-stats',
        WALLET_STATS: '/api/transactions/wallet-stats',
    }
};
