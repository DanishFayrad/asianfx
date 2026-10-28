'use client';

import { useEffect, type ReactNode } from 'react';

interface ConfirmDialogProps {
    open: boolean;
    title: ReactNode;
    message?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Disables the buttons and shows "Please wait…" while the action runs. */
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * "Are you sure?" popup for destructive actions (red confirm button).
 * Closes on Cancel, on Escape, or on a click outside the card.
 */
export default function ConfirmDialog({
    open, title, message, confirmLabel = 'Yes, delete', cancelLabel = 'Cancel', busy = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, busy, onCancel]);

    if (!open) return null;

    return (
        <div
            onClick={() => { if (!busy) onCancel(); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                role="alertdialog"
                aria-modal="true"
                style={{ background: 'var(--admin-bg-card, var(--t-surface))', border: '1px solid var(--admin-border-color, var(--tw-10))', borderRadius: '18px', padding: '1.75rem', width: '100%', maxWidth: '380px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', textAlign: 'center' }}
            >
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', margin: '0 auto 1rem', display: 'grid', placeItems: 'center', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', fontSize: '1.5rem' }}>⚠</div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: 'var(--admin-text-main, var(--t-text))' }}>{title}</h3>
                {message && (
                    <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: 'var(--admin-text-muted, var(--t-text-muted))', lineHeight: 1.5 }}>{message}</p>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid var(--admin-border-color, var(--tw-10))', background: 'var(--admin-bg-main, var(--tw-05))', color: 'var(--admin-text-main, var(--t-text))', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer' }}
                    >{cancelLabel}</button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        autoFocus
                        style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}
                    >{busy ? 'Please wait…' : confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}
