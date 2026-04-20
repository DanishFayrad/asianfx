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

const requestDeposit = async (formData) => {
    const response = await api.post(API_ENDPOINTS.TRANSACTIONS.DEPOSIT, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

const getPendingTransactions = async () => {
    const response = await api.get(API_ENDPOINTS.TRANSACTIONS.PENDING);
    return response.data;
};

const getUserTransactions = async () => {
    const response = await api.get(API_ENDPOINTS.TRANSACTIONS.MY);
    return response.data;
};

const approveTransaction = async (id, amount) => {
    const response = await api.post(API_ENDPOINTS.TRANSACTIONS.APPROVE(id), { amount });
    return response.data;
};

const rejectTransaction = async (id) => {
    const response = await api.post(API_ENDPOINTS.TRANSACTIONS.REJECT(id), {});
    return response.data;
};

const getAllTransactions = async () => {
    const response = await api.get(API_ENDPOINTS.TRANSACTIONS.ALL);
    return response.data;
};

const getAdminStats = async () => {
    const response = await api.get(API_ENDPOINTS.TRANSACTIONS.ADMIN_STATS);
    return response.data;
};

const getWalletStats = async () => {
    const response = await api.get(API_ENDPOINTS.TRANSACTIONS.WALLET_STATS);
    return response.data;
};

const transactionService = {
    requestDeposit,
    getPendingTransactions,
    getUserTransactions,
    approveTransaction,
    rejectTransaction,
    getAllTransactions,
    getAdminStats,
    getWalletStats
};

export default transactionService;
