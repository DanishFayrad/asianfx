'use client';

import { useEffect } from 'react';

// Reloads the site every 2 hours so everyone runs the latest version with fresh data.
// It never reloads while someone is typing in a form (waits and tries again a minute later),
// and a tab in the background reloads as soon as the member comes back to it.
const RELOAD_AFTER_MS = 2 * 60 * 60 * 1000;
const RETRY_MS = 60 * 1000;

const isTyping = () => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
};

export default function AutoRefresh() {
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        const tryReload = () => {
            if (document.hidden) {
                // Background tab: reload when the member returns to it.
                const onVisible = () => {
                    if (document.hidden) return;
                    document.removeEventListener('visibilitychange', onVisible);
                    tryReload();
                };
                document.addEventListener('visibilitychange', onVisible);
                return;
            }
            if (isTyping()) {
                timer = setTimeout(tryReload, RETRY_MS);
                return;
            }
            window.location.reload();
        };

        timer = setTimeout(tryReload, RELOAD_AFTER_MS);
        return () => clearTimeout(timer);
    }, []);

    return null;
}
