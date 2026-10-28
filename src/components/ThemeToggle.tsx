'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const SunIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
);

const MoonIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

// Pages without a navbar get the floating button instead.
const NO_NAVBAR_ROUTES = ['/login', '/register', '/otp', '/verify', '/verify-email', '/forgot-password', '/bossjutt'];

/**
 * Light/dark switch.
 *  <ThemeToggle />           → inline button for navbars
 *  <ThemeToggle floating />  → fixed corner button, only on pages that have no navbar
 * The initial theme is applied before paint by the inline script in layout.js.
 */
export default function ThemeToggle({ floating = false }: { floating?: boolean }) {
    const pathname = usePathname();
    const [theme, setTheme] = useState<string | null>(null);

    useEffect(() => {
        setTheme(document.documentElement.getAttribute('data-theme') || 'light');
        // Keep every toggle on the page in sync.
        const observer = new MutationObserver(() =>
            setTheme(document.documentElement.getAttribute('data-theme') || 'light'));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    if (!theme) return null;
    if (floating && !NO_NAVBAR_ROUTES.some((p) => pathname === p || pathname?.startsWith(`${p}/`))) return null;

    const toggle = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        const root = document.documentElement;
        root.classList.add('theme-switching');
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch {}
        setTimeout(() => root.classList.remove('theme-switching'), 300);
    };

    const label = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    return (
        <button
            type="button"
            className={`theme-toggle ${floating ? 'theme-toggle--floating' : ''}`}
            onClick={toggle}
            aria-label={label}
            title={label}
        >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
    );
}
