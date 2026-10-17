import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';

// Cached copies so pages render instantly on reload; AuthGuard reconciles them
// with the real Supabase session on mount.
const getInitialToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

const getInitialUser = () => {
    if (typeof window !== 'undefined') {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                return JSON.parse(user);
            } catch (e) {}
        }
    }
    return null;
};

export const loginUser = createAsyncThunk(
    'auth/login',
    async (userData, thunkAPI) => {
        try {
            const data = await authService.login(userData);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            return data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Login failed';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/register',
    async (userData, thunkAPI) => {
        try {
            return await authService.register(userData);
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Registration failed';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const checkAuth = createAsyncThunk(
    'auth/check',
    async (_, thunkAPI) => {
        try {
            return await authService.getProfile();
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || 'Session expired');
        }
    }
);

const initialState = {
    user: getInitialUser(),
    token: getInitialToken(),
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
    registrationEmail: null,
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        reset: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
            state.registrationEmail = null;
        },
        logout: (state) => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            state.user = null;
            state.token = null;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
        },
        setUser: (state, action) => {
            state.user = action.payload;
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(action.payload));
            }
        },
        setAuth: (state, action) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(action.payload.user));
                localStorage.setItem('token', action.payload.token);
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.message = '';
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.token = action.payload.access_token;
                state.user = action.payload.user;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.user = null;
            })
            // Register
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.message = '';
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Store registration email for verification redirection
                state.registrationEmail = action.meta.arg.email;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Check Auth
            .addCase(checkAuth.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(checkAuth.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
                state.isSuccess = true;
            })
            .addCase(checkAuth.rejected, (state) => {
                state.isLoading = false;
            });
    },
});

export const { reset, logout, setUser, setAuth } = authSlice.actions;
export default authSlice.reducer;
