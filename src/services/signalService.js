import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants/apiConstants';

const api = apiClient;


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

const deleteSignal = async (id) => {
    const response = await api.delete(API_ENDPOINTS.SIGNALS.DELETE(id));
    return response.data;
};

const setGlobalTimer = async (minutes) => {
    const response = await api.post(API_ENDPOINTS.SIGNALS.GLOBAL_TIMER, { minutes });
    return response.data;
};

const getGlobalTimer = async () => {
    const response = await api.get(API_ENDPOINTS.SIGNALS.GLOBAL_TIMER);
    return response.data;
};

const clearGlobalTimer = async () => {
    const response = await api.delete(API_ENDPOINTS.SIGNALS.GLOBAL_TIMER);
    return response.data;
};

const requestSignalAccess = async () => {
    const response = await api.post(API_ENDPOINTS.SIGNALS.REQUEST_ACCESS);
    return response.data;
};

const getSignalRequests = async () => {
    const response = await api.get(API_ENDPOINTS.SIGNALS.REQUESTS);
    return response.data;
};

const approveSignalRequest = async (id) => {
    const response = await api.post(API_ENDPOINTS.SIGNALS.APPROVE_REQUEST(id));
    return response.data;
};

const signalService = {
    getSignalsDashboard,
    createSignal,
    takeSignal,
    getUserSignalHistory,
    deleteSignal,
    setGlobalTimer,
    getGlobalTimer,
    clearGlobalTimer,
    requestSignalAccess,
    getSignalRequests,
    approveSignalRequest
};

export default signalService;
