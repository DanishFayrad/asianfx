'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { checkAuth } from '@/redux/slices/authSlice';

export default function AuthGuard({ children }) {
    const { user, token, isLoading } = useSelector((state) => state.auth);
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();

    useEffect(() => {
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

        // // SECURITY: Disable Right Click and Developer Tools shortcuts
        // const handleContextMenu = (e) => e.preventDefault();
        
        // const handleKeyDown = (e) => {
        //     // Disable F12
        //     if (e.keyCode === 123) {
        //         e.preventDefault();
        //         return false;
        //     }
        //     // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Chrome/Firefox/Edge)
        //     if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
        //         e.preventDefault();
        //         return false;
        //     }
        //     // Disable Ctrl+U (View Source)
        //     if (e.ctrlKey && e.keyCode === 85) {
        //         e.preventDefault();
        //         return false;
        //     }
        // };

        // document.addEventListener('contextmenu', handleContextMenu);
        // document.addEventListener('keydown', handleKeyDown);

        // return () => {
        //     document.removeEventListener('contextmenu', handleContextMenu);
        //     document.removeEventListener('keydown', handleKeyDown);
        // };
    }, [token, pathname, router]);

    // Show loading while checking auth
    if (isLoading && token) {
        return (
            <div style={{ 
                height: '100vh', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                background: '#0f172a',
                color: '#fff'
            }}>
                <div className="loader">Verifying session...</div>
            </div>
        );
    }

    // If there's no token and it's not a public path, don't render children to prevent flash of protected content
    const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify', '/otp', '/'];
    const isPublicPath = publicPaths.includes(pathname);
    
    if (!token && !isPublicPath) {
        return null;
    }

    return children;
}
