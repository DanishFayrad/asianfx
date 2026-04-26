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

export const syncClockWithHeuristic = (serverTimestampString) => {
    if (!serverTimestampString) return;
    const actualRemaining = new Date(serverTimestampString).getTime() - Date.now();
    if (actualRemaining > 0) {
        const snappedRemaining = Math.round(actualRemaining / 60000) * 60000;
        const drift = actualRemaining - snappedRemaining;
        // If drift is less than 15 seconds, assume it's clock skew and update the offset
        if (Math.abs(drift) < 15000) {
            serverTimeOffset = drift;
        }
    }
};

// Add a request interceptor to include the token in every request
apiClient.interceptors.request.use(
    (config) => {
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
        if (response.headers && response.headers.date) {
            const serverTime = new Date(response.headers.date).getTime();
            const localTime = Date.now();
            serverTimeOffset = serverTime - localTime;
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
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
