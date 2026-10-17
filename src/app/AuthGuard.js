'use client';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import authService from '@/services/authService';
import { setAuth, logout } from '@/redux/slices/authSlice';

// ---------------------------------------------------------------------
// Route access rules — the single place that decides who may see what.
// (Data itself is also protected by Supabase RLS, so this is about UX:
//  nobody sees a page they can't use, and nobody gets stuck.)
// ---------------------------------------------------------------------
const ADMIN_ROUTES = ['/admin', '/transaction'];        // admins only
const MEMBER_ROUTES = ['/dashboard', '/wallet'];         // any logged-in user (admins see their own view)
const GUEST_ONLY_ROUTES = ['/login', '/register'];       // logged-in users are sent to their home

const matches = (path, prefixes) => prefixes.some((p) => path === p || path?.startsWith(`${p}/`));

// Both roles land on /dashboard: admins get the admin overview there, users get signals.
export const homeFor = () => '/dashboard';

// Only allow internal paths in ?next= (blocks open-redirects like //evil.com).
const safeNext = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : null);

/**
 * Decide what to do on `path` for `user`.
 * `checked` = we have heard back from Supabase about the session at least once.
 * Returns { allow: true } or { redirect: '/path' } or { wait: true }.
 */
function decide(path, user, checked) {
    if (matches(path, ADMIN_ROUTES)) {
        if (user?.is_admin) return { allow: true };
        if (user) return { redirect: '/dashboard' };
        return checked ? { redirect: `/login?next=${encodeURIComponent(path)}` } : { wait: true };
    }

    if (matches(path, MEMBER_ROUTES)) {
        if (user) return { allow: true };
        return checked ? { redirect: `/login?next=${encodeURIComponent(path)}` } : { wait: true };
    }

    if (matches(path, GUEST_ONLY_ROUTES)) {
        if (user && checked) {
            const next = safeNext(new URLSearchParams(window.location.search).get('next'));
            // Don't bounce a normal user into an admin page they asked for before logging in.
            const nextAllowed = next && (!matches(next, ADMIN_ROUTES) || user.is_admin) && !matches(next, GUEST_ONLY_ROUTES);
            return { redirect: nextAllowed ? next : homeFor(user) };
        }
        return { allow: true };
    }

    return { allow: true };
}

function FullScreenLoader() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loader-container">
                <div className="premium-loader" />
                <span className="loader-text">Loading…</span>
            </div>
        </div>
    );
}

export default function AuthGuard({ children }) {
    const dispatch = useDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useSelector((state) => state.auth);
    const [checked, setChecked] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Keep Redux in sync with the real Supabase session.
    useEffect(() => {
        const sync = async (session) => {
            if (!session) {
                dispatch(logout());
                setChecked(true);
                return;
            }
            try {
                const profile = await authService.getProfile();
                dispatch(setAuth({ user: profile, token: session.access_token }));
            } catch (e) {
                console.error('Failed to load profile', e);
                // Session exists but profile can't be read — treat as logged out.
                dispatch(logout());
            } finally {
                setChecked(true);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Defer: Supabase recommends not awaiting other calls inside this callback.
            setTimeout(() => sync(session), 0);
        });

        return () => subscription.unsubscribe();
    }, [dispatch]);

    const decision = mounted ? decide(pathname, user, checked) : { wait: true };

    useEffect(() => {
        if (decision.redirect && decision.redirect !== pathname) router.replace(decision.redirect);
    }, [decision.redirect, pathname, router]);

    // Public pages render immediately (also on the server, for SEO / speed).
    const isProtected = matches(pathname, ADMIN_ROUTES) || matches(pathname, MEMBER_ROUTES);
    if (!isProtected && !decision.redirect) return children;

    // Protected page: never flash it to someone who isn't allowed.
    if (!decision.allow) return <FullScreenLoader />;
    return children;
}
