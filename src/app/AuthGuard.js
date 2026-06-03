'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { checkAuth } from '@/redux/slices/authSlice';

export default function AuthGuard({ children }) {
    const { user, token, isLoading } = useSelector((state) => state.auth);
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify', '/otp', '/'];
        const isPublicPath = publicPaths.includes(pathname);

        console.log(`AuthGuard: pathname=${pathname}, token=${!!token}, isPublic=${isPublicPath}`);

        // If no token and not a public path, redirect to login
        if (!token && !isPublicPath) {
            console.log("AuthGuard: No token, redirecting to login");
            router.push('/login');
            return;
        }

        // Validate token on mount if present
        if (token && !isPublicPath) {
            console.log("AuthGuard: Token present, dispatching checkAuth");
            dispatch(checkAuth());
        }
    }, [token, pathname, router, mounted, dispatch]);

    const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify', '/otp', '/'];
    const isPublicPath = publicPaths.includes(pathname);

    // To prevent hydration mismatch, ensure the first client render matches the server.
    // The server doesn't have the token, so it renders null for protected paths and children for public paths.
    if (!mounted) {
        if (!isPublicPath) return null;
        return children;
    }

    // Show loading while checking auth
    if (isLoading && token) {
        return (
            <div style={{ 
                height: '100vh', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
                color: '#fff',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999
            }}>
                <div className="loader-container">
                    <div className="premium-loader"></div>
                    <div className="loader-text">Verifying Session</div>
                </div>
            </div>
        );
    }

    // If there's no token and it's not a public path, don't render children to prevent flash of protected content
    if (!token && !isPublicPath) {
        return null;
    }

    return children;
}
