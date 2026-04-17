import axios from 'axios';

const API_URL = 'http://localhost:5000/api/transactions'; // Adjust base URL as needed

const requestDeposit = async (formData) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/deposit`, formData, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

const getPendingTransactions = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/pending`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

const getUserTransactions = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/my`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

const approveTransaction = async (id, amount) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/${id}/approve`, { amount }, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

const rejectTransaction = async (id) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/${id}/reject`, {}, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

const getAllTransactions = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/all`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

const getAdminStats = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/admin-stats`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.data;
};

const getWalletStats = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/wallet-stats`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
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
