'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';

export default function AuthGuard({ children }) {
    const { user, token } = useSelector((state) => state.auth);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify', '/otp', '/'];
        const isPublicPath = publicPaths.includes(pathname);

        if (!token && !isPublicPath) {
            router.push('/login');
        }

        // SECURITY: Disable Right Click and Developer Tools shortcuts
        const handleContextMenu = (e) => e.preventDefault();
        
        const handleKeyDown = (e) => {
            // Disable F12
            if (e.keyCode === 123) {
                e.preventDefault();
                return false;
            }
            // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Chrome/Firefox/Edge)
            if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
                e.preventDefault();
                return false;
            }
            // Disable Ctrl+U (View Source)
            if (e.ctrlKey && e.keyCode === 85) {
                e.preventDefault();
                return false;
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [token, pathname, router]);

    // If there's no token and it's not a public path, don't render children to prevent flash of protected content
    const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify', '/otp', '/'];
    const isPublicPath = publicPaths.includes(pathname);
    
    if (!token && !isPublicPath) {
        return null;
    }

    return children;
}
