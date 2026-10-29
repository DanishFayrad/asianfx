'use client';

import { useEffect, useState } from 'react';

/**
 * Makes inspecting the site hard:
 *  - blocks right-click, F12, Ctrl+Shift+I/J/C and Ctrl+U (view source);
 *  - if DevTools is opened anyway (e.g. from the browser menu), the page is hidden and
 *    execution keeps pausing until DevTools is closed and the page reloaded.
 * This is a strong deterrent, not a guarantee — the browser owner can always bypass it —
 * so real data protection stays in Supabase RLS.
 * Set NEXT_PUBLIC_ALLOW_INSPECT=true in .env.local to turn it off while debugging.
 */
const pauseIfInspecting = new Function('debugger') as () => void;

export default function InspectGuard() {
    const [devtoolsOpen, setDevtoolsOpen] = useState(false);

    useEffect(() => {
        if (process.env.NEXT_PUBLIC_ALLOW_INSPECT === 'true') return;

        const onContextMenu = (e: MouseEvent) => e.preventDefault();
        const onKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const ctrl = e.ctrlKey || e.metaKey;
            const blocked =
                key === 'f12' ||
                (ctrl && e.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) ||
                (ctrl && e.altKey && ['i', 'j', 'c'].includes(key)) || // macOS Cmd+Option+I/J/C
                (ctrl && ['u', 's'].includes(key));                    // view source / save page
            if (blocked) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        // A `debugger` statement does nothing for normal visitors, but pauses when DevTools
        // is open — so a long pause means someone is inspecting.
        const check = setInterval(() => {
            const start = performance.now();
            // Built at runtime so the production minifier (which strips `debugger`) keeps it.
            pauseIfInspecting();
            if (performance.now() - start > 100) setDevtoolsOpen(true);
        }, 1000);

        document.addEventListener('contextmenu', onContextMenu);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            clearInterval(check);
            document.removeEventListener('contextmenu', onContextMenu);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, []);

    if (!devtoolsOpen) return null;

    return (
        <>
            {/* Hide every part of the page except this notice. */}
            <style>{'body > *:not(#inspect-guard){display:none !important}'}</style>
            <div
                id="inspect-guard"
                style={{
                    position: 'fixed', inset: 0, zIndex: 2147483647, display: 'grid', placeItems: 'center',
                    background: 'var(--t-bg, #faf7f0)', color: 'var(--t-text, #111)', padding: 24, textAlign: 'center',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
            >
                <div>
                    <h2 style={{ margin: '0 0 8px' }}>Developer tools are not allowed</h2>
                    <p style={{ margin: '0 0 16px', opacity: 0.75 }}>Please close developer tools and reload the page.</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--btn-primary, #fcd34d)', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Reload
                    </button>
                </div>
            </div>
        </>
    );
}
