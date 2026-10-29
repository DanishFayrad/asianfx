'use client';

import { useEffect } from 'react';

/**
 * Makes casual inspecting harder on the live site: blocks right-click, F12,
 * Ctrl+Shift+I/J/C and Ctrl+U (view source). This is only a deterrent — browsers
 * always let a determined user open DevTools — so real protection stays in Supabase RLS.
 * Disabled in development so we can still debug.
 */
export default function InspectGuard() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return;

        const onContextMenu = (e: MouseEvent) => e.preventDefault();
        const onKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey || e.metaKey;
            const blocked =
                key === 'f12' ||
                (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
                (ctrl && e.altKey && ['i', 'j', 'c'].includes(key)) || // macOS Cmd+Option+I/J/C
                (ctrl && key === 'u');
            if (blocked) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener('contextmenu', onContextMenu);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('contextmenu', onContextMenu);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, []);

    return null;
}
