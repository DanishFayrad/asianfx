import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants/apiConstants';

const api = apiClient;


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

const verifyOTP = async (data) => {
    const response = await api.post(API_ENDPOINTS.VERIFY_OTP, data);
    return response.data;
};

const resendOTP = async (data) => {
    const response = await api.post(API_ENDPOINTS.RESEND_OTP, data);
    return response.data;
};

const forgotPassword = async (data) => {
    const response = await api.post(API_ENDPOINTS.FORGOT_PASSWORD, data);
    return response.data;
};

const resetPassword = async (data) => {
    const response = await api.post(API_ENDPOINTS.RESET_PASSWORD, data);
    return response.data;
};

const authService = {
    login,
    register,
    logout,
    getProfile,
    verifyOTP,
    resendOTP,
    forgotPassword,
    resetPassword
};

export default authService;
