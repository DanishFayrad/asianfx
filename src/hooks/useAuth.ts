'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import authService from '@/services/authService';
import type { Profile } from '@/types';

export const authKeys = {
    user: ['auth', 'user'] as const,
};

// A copy of the signed-in profile in localStorage, so pages render instantly on reload.
// It is always re-checked against the real Supabase session right after.
const USER_CACHE_KEY = 'user';

const readCachedUser = (): Profile | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(USER_CACHE_KEY);
        return raw ? (JSON.parse(raw) as Profile) : null;
    } catch {
        return null;
    }
};

const writeCachedUser = (user: Profile | null) => {
    if (typeof window === 'undefined') return;
    try {
        if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
        else localStorage.removeItem(USER_CACHE_KEY);
        localStorage.removeItem('token'); // left over from the old Redux store
    } catch {}
};

/** The signed-in member's profile, or null when nobody is signed in (or the profile can't be read). */
const fetchCurrentUser = async (): Promise<Profile | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        writeCachedUser(null);
        return null;
    }
    try {
        const profile = await authService.getProfile();
        writeCachedUser(profile);
        return profile;
    } catch (e) {
        console.error('Failed to load profile', e);
        // Session exists but the profile can't be read — treat as logged out.
        writeCachedUser(null);
        return null;
    }
};

/**
 * The current user.
 *  - user:      the profile, or null
 *  - isChecked: Supabase has answered at least once (before that, `user` may be the cached copy)
 *  - refresh(): reload the profile (e.g. after the wallet balance changed)
 */
export function useCurrentUser() {
    const query = useQuery({
        queryKey: authKeys.user,
        queryFn: fetchCurrentUser,
        initialData: readCachedUser,
        initialDataUpdatedAt: 0, // the cached copy is always stale → verify immediately
        staleTime: 60_000,
    });
    const { refetch } = query;
    const refresh = useCallback(() => refetch(), [refetch]);

    return { user: query.data ?? null, isChecked: query.isFetched, refresh };
}

/** Store a freshly signed-in user (e.g. right after login) without waiting for a refetch. */
export function useSetCurrentUser() {
    const queryClient = useQueryClient();
    return useCallback((user: Profile | null) => {
        writeCachedUser(user);
        queryClient.setQueryData(authKeys.user, user);
    }, [queryClient]);
}

/** Forget the signed-in user locally and drop every cached query that belonged to them. */
export function useClearSession() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        writeCachedUser(null);
        queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
        queryClient.setQueryData(authKeys.user, null);
    }, [queryClient]);
}

/** Sign out of Supabase, clear local state, and go to the login page. */
export function useLogout() {
    const router = useRouter();
    const clearSession = useClearSession();
    return useCallback(async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout API failed:', error);
        } finally {
            clearSession();
            router.push('/login');
        }
    }, [clearSession, router]);
}
