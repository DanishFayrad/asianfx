import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import authService, { type Credentials, type LoginResult, type RegisterInput } from '../../services/authService';
import { errorMessage } from '@/lib/supabaseClient';
import type { MessageResponse, Profile } from '@/types';

// Cached copies so pages render instantly on reload; AuthGuard reconciles them
// with the real Supabase session on mount.
const getInitialToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

const getInitialUser = (): Profile | null => {
    if (typeof window !== 'undefined') {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                return JSON.parse(user) as Profile;
            } catch (e) {}
        }
    }
    return null;
};

export const loginUser = createAsyncThunk<LoginResult, Credentials, { rejectValue: string }>(
    'auth/login',
    async (userData, thunkAPI) => {
        try {
            const data = await authService.login(userData);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            return data;
        } catch (error) {
            return thunkAPI.rejectWithValue(errorMessage(error, 'Login failed'));
        }
    }
);

export const registerUser = createAsyncThunk<MessageResponse, RegisterInput, { rejectValue: string }>(
    'auth/register',
    async (userData, thunkAPI) => {
        try {
            return await authService.register(userData);
        } catch (error) {
            return thunkAPI.rejectWithValue(errorMessage(error, 'Registration failed'));
        }
    }
);

export const checkAuth = createAsyncThunk<Profile, void, { rejectValue: string }>(
    'auth/check',
    async (_, thunkAPI) => {
        try {
            return await authService.getProfile();
        } catch (error) {
            return thunkAPI.rejectWithValue(errorMessage(error, 'Session expired'));
        }
    }
);

export interface AuthState {
    user: Profile | null;
    token: string | null;
    isError: boolean;
    isSuccess: boolean;
    isLoading: boolean;
    message: string;
    registrationEmail: string | null;
}

const initialState: AuthState = {
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
        setUser: (state, action: PayloadAction<Profile | null>) => {
            state.user = action.payload;
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(action.payload));
            }
        },
        setAuth: (state, action: PayloadAction<{ user: Profile; token: string }>) => {
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
                state.message = action.payload || '';
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
                state.message = action.payload || '';
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
