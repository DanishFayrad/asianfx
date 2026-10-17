'use client';
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import authService from '@/services/authService';
import { setAuth, logout } from '@/redux/slices/authSlice';

const PROTECTED_PREFIXES = ['/dashboard', '/wallet', '/transaction', '/admin'];

// Keeps Redux in sync with the Supabase session and sends logged-out
// visitors away from protected pages.
export default function AuthGuard({ children }) {
    const dispatch = useDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const pathRef = useRef(pathname);
    pathRef.current = pathname;
    // undefined = not checked yet, null = logged out
    const sessionRef = useRef(undefined);

    useEffect(() => {
        if (sessionRef.current === null && PROTECTED_PREFIXES.some((p) => pathname?.startsWith(p))) {
            router.replace('/login');
        }
    }, [pathname, router]);

    useEffect(() => {
        const sync = async (session) => {
            sessionRef.current = session;
            if (!session) {
                dispatch(logout());
                if (PROTECTED_PREFIXES.some((p) => pathRef.current?.startsWith(p))) {
                    router.replace('/login');
                }
                return;
            }
            try {
                const profile = await authService.getProfile();
                dispatch(setAuth({ user: profile, token: session.access_token }));
            } catch (e) {
                console.error('Failed to load profile', e);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Defer: Supabase recommends not awaiting other calls inside this callback.
            setTimeout(() => sync(session), 0);
        });

        return () => subscription.unsubscribe();
    }, [dispatch, router]);

    return children;
}
