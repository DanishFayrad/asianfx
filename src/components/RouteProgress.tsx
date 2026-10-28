'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Thin progress bar at the top of the screen during page changes, so every
 * click on an internal link gets instant visual feedback.
 * Starts on clicks of same-site links to another page; finishes when the path changes.
 */
export default function RouteProgress() {
    const pathname = usePathname();
    const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Finish when the new page has rendered.
    useEffect(() => {
        if (state !== 'loading') return;
        setState('done');
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setState('idle'), 350);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // Start on internal link clicks.
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]');
            if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
            const url = new URL(a.href, window.location.href);
            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname) return; // same page / #anchor
            clearTimeout(timer.current);
            setState('loading');
            // Safety: never spin forever (e.g. navigation cancelled).
            timer.current = setTimeout(() => setState('idle'), 10000);
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, []);

    if (state === 'idle') return null;
    return <div className={`route-progress route-progress--${state}`} aria-hidden="true" />;
}
