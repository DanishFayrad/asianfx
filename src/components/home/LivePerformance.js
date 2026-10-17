'use client';

import { useEffect, useState } from 'react';
import signalService from '@/services/signalService';
import styles from '@/app/home.module.css';

const resultClass = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('hit')) return styles.win;
    if (s.includes('stop')) return styles.loss;
    return styles.neutral;
};

// Real numbers from the database — nothing on this section is hard-coded.
export default function LivePerformance() {
    const [stats, setStats] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        signalService.getPublicStats()
            .then(setStats)
            .catch(() => setFailed(true));
    }, []);

    const winRate = stats?.closed_signals > 0
        ? Math.round((stats.wins / stats.closed_signals) * 100)
        : null;

    const show = (v) => (stats ? v : '—');

    return (
        <>
            <div className={styles.statGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{show(stats?.total_signals ?? 0)}</span>
                    <span className={styles.statLabel}>Signals published</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{show(stats?.closed_signals ?? 0)}</span>
                    <span className={styles.statLabel}>Signals closed</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{stats ? (winRate === null ? 'N/A' : `${winRate}%`) : '—'}</span>
                    <span className={styles.statLabel}>Hit target (of closed)</span>
                </div>
                <div className={styles.statCard}>
                    <span className={`${styles.statValue} ${styles.liveValue}`}>
                        <i className={styles.liveDot} aria-hidden="true" />
                        {show(stats?.active_signals ?? 0)}
                    </span>
                    <span className={styles.statLabel}>Active right now</span>
                </div>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableHead}>
                    <h3>Recently closed signals</h3>
                    <span>Updated live from our signal desk</span>
                </div>

                {failed && <p className={styles.tableEmpty}>Track record is temporarily unavailable.</p>}
                {!failed && !stats && <p className={styles.tableEmpty}>Loading…</p>}
                {stats && stats.recent?.length === 0 && (
                    <p className={styles.tableEmpty}>Closed signals will appear here as soon as they settle.</p>
                )}

                {stats?.recent?.length > 0 && (
                    <div className={styles.tableScroll}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Pair</th><th>Side</th><th>Entry</th><th>Target</th><th>Stop</th><th>Result</th><th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recent.map((s, i) => (
                                    <tr key={i}>
                                        <td className={styles.pair}>{s.symbol}</td>
                                        <td className={s.type?.toLowerCase() === 'buy' ? styles.buy : styles.sell}>{s.type?.toUpperCase()}</td>
                                        <td>{s.entry_price ?? '—'}</td>
                                        <td>{s.target_price ?? '—'}</td>
                                        <td>{s.stop_loss ?? '—'}</td>
                                        <td><span className={`${styles.pill} ${resultClass(s.status)}`}>{s.status}</span></td>
                                        <td className={styles.muted}>{new Date(s.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
