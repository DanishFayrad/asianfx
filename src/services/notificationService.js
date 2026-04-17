import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getMyNotifications = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

const markAsRead = async (id) => {
    const token = localStorage.getItem('token');
    const response = await axios.patch(`${API_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export default {
    getMyNotifications,
    markAsRead
};
