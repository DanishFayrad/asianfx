'use client';

import { useEffect, useState } from 'react';
import signalService, { type RecentSignal } from '@/services/signalService';
import AssetBadge from '@/components/AssetBadge';
import { assetFor } from '@/config/assets';
import { errorMessage } from '@/lib/supabaseClient';

// "Recent signals" button + popup on the member dashboard: the latest signals sent to everyone.
// Open signals show only the pair; closed ones (1 hour after closing) show their result and levels.

const resultOf = (s: RecentSignal): [string, string] => {
    if (!s.closed) return ['active', 'Active'];
    const st = s.status.toLowerCase();
    if (st.includes('hit')) return ['hit', 'Profit'];
    if (st.includes('stop')) return ['loss', 'Loss'];
    return ['close', 'Expired'];
};

const timeLabel = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} · ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
};

const ClockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
);

export default function RecentSignals() {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<RecentSignal[] | null>(null);
    const [error, setError] = useState('');

    // Load fresh every time the popup opens.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        signalService.getRecentSignals()
            .then((data) => { if (!cancelled) setRows(data); })
            .catch((e) => { if (!cancelled) setError(errorMessage(e, 'Could not load signals')); });
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => { cancelled = true; document.removeEventListener('keydown', onKey); };
    }, [open]);

    return (
        <>
            <button type="button" className="rsg-open" onClick={() => { setError(''); setOpen(true); }}>
                <ClockIcon /> Recent signals
            </button>

            {open && (
                <div className="nsa-overlay" onClick={() => setOpen(false)}>
                    <div className="nsa-card rsg-card" role="dialog" aria-modal="true" aria-labelledby="rsg-title" onClick={(e) => e.stopPropagation()}>
                        <div className="nsa-head">
                            <h2 id="rsg-title" className="rsg-title">Recent signals</h2>
                            <button type="button" className="nsa-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
                        </div>
                        <p className="rsg-sub">Latest signals sent to members. Results show 1 hour after a signal closes.</p>

                        <div className="rsg-list">
                            {error ? (
                                <p className="rsg-empty">{error}</p>
                            ) : rows === null ? (
                                <p className="rsg-empty">Loading…</p>
                            ) : rows.length === 0 ? (
                                <p className="rsg-empty">No signals yet.</p>
                            ) : rows.map((s) => {
                                const [cls, label] = resultOf(s);
                                const side = s.type?.toLowerCase();
                                return (
                                    <div key={s.id} className="rsg-row">
                                        <div className="rsg-top">
                                            <AssetBadge symbol={s.symbol} size={34} />
                                            <div className="rsg-pair">
                                                <b>{s.symbol}</b>
                                                <small>{assetFor(s.symbol).name} · {timeLabel(s.release_at || s.created_at)}</small>
                                            </div>
                                            {side && <span className={`nsa-side nsa-side--${side === 'sell' ? 'sell' : 'buy'}`}>{s.type}</span>}
                                            <span className={`db-badge status ${cls}`}><i className="sig-dot" aria-hidden="true" />{label}</span>
                                        </div>
                                        {s.closed ? (
                                            <div className="rsg-levels">
                                                <span>Entry <b>{s.entry_price ?? '—'}</b></span>
                                                <span>TP <b>{s.target_price ?? '—'}</b></span>
                                                <span>SL <b>{s.stop_loss ?? '—'}</b></span>
                                            </div>
                                        ) : (
                                            <div className="rsg-levels rsg-levels--locked">🔒 Open now: take it from the Live signals list to unlock the levels</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
