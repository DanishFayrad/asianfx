import axios from 'axios';
import { API_BASE_URL } from '../constants/apiConstants';
import toast from 'react-hot-toast';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export let serverTimeOffset = 0;

export const updateServerTimeOffset = (serverTimeMs) => {
    if (!serverTimeMs) return;
    serverTimeOffset = serverTimeMs - Date.now();
};



// Add a request interceptor to include the token in every request
apiClient.interceptors.request.use(
    (config) => {
        config.metadata = { startTime: Date.now() };
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 and 403 errors globally
apiClient.interceptors.response.use(
    (response) => {
        if (response.headers && response.headers.date && response.config?.metadata?.startTime) {
            const serverTime = new Date(response.headers.date).getTime();
            const localTime = Date.now();
            const requestDuration = localTime - response.config.metadata.startTime;
            // Server date is generated during the request, usually halfway.
            // HTTP Date headers round down to the nearest second, so we add 500ms for average correction.
            const estimatedServerTime = serverTime + (requestDuration / 2) + 500;
            serverTimeOffset = estimatedServerTime - localTime;
        }
        return response;
    },
    (error) => {
        const { response } = error;

        if (response) {
            console.log(`Response status: ${response.status}`);
            if (response.status === 401) {
                // Token expired or unauthorized
                const isLoginPage = typeof window !== 'undefined' && window.location.pathname.includes('/login');

                if (!isLoginPage) {
                    console.warn("Unauthorized! Redirecting to login...");
                    
                    if (typeof window !== 'undefined') {
                        // Clear storage
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');

                        // Show notification
                        toast.error("Session expired. Please login again.");

                        // Delay redirect slightly to allow the toast to be seen
                        console.log("Redirecting to login in 1.5s...");
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 1500);
                    }
                }
            } else if (response.status === 403) {
                // Forbidden access
                console.warn("Access denied: 403");
                toast.error("Access denied. You do not have permission for this action.");
            } else if (response.status >= 500) {
                console.error("Server Error:", response.data);
                toast.error("Server error occurred. Please try again later.");
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error("Network Error:", error.request);
            if (typeof window !== 'undefined' && !navigator.onLine) {
                toast.error("You are offline. Please check your internet connection.");
            } else {
                toast.error("Network error. Unable to reach the server.");
            }
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Request Error:", error.message);
        }

        return Promise.reject(error);
    }
);

export default apiClient;
