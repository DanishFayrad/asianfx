'use client';

import type { ReactNode } from 'react';
import { createColumnHelper, useTable } from '@tanstack/react-table';
import { usePublicStats } from '@/hooks/queries';
import { basicTableFeatures, EMPTY_ROWS } from '@/lib/tables';
import Skeleton from '@/components/Skeleton';
import styles from '@/app/home.module.css';
import type { PublicStats } from '@/types';

type RecentSignal = PublicStats['recent'][number];

// TanStack Table renders the "Recently closed signals" rows.
const recentColumnHelper = createColumnHelper<typeof basicTableFeatures, RecentSignal>();
const recentColumns = recentColumnHelper.columns([
    recentColumnHelper.accessor('symbol', { id: 'symbol' }),
]);

const resultClass = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('hit')) return styles.win;
    if (s.includes('stop')) return styles.loss;
    return styles.neutral;
};

// Real numbers from the database — nothing on this section is hard-coded.
export default function LivePerformance() {
    const statsQuery = usePublicStats();
    const stats: PublicStats | null = statsQuery.data ?? null;
    const failed = statsQuery.isError;

    const recentTable = useTable({
        features: basicTableFeatures,
        columns: recentColumns,
        data: stats?.recent ?? EMPTY_ROWS,
    });
    const recentRows = recentTable.getRowModel().rows;

    const winRate = stats && stats.closed_signals > 0
        ? Math.round((stats.wins / stats.closed_signals) * 100)
        : null;

    // Shimmer while loading, a dash if the numbers could not be loaded.
    const show = (v: ReactNode) => (stats ? v : failed ? '—' : <Skeleton width={56} height={28} radius={8} />);

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
                    <span className={styles.statValue}>{show(winRate === null ? 'N/A' : `${winRate}%`)}</span>
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
                {!failed && !stats && (
                    <div className={styles.tableEmpty} style={{ display: 'grid', gap: 12 }} aria-busy="true">
                        {[0, 1, 2].map((i) => <Skeleton key={i} block height={18} />)}
                    </div>
                )}
                {stats && recentRows.length === 0 && (
                    <p className={styles.tableEmpty}>Closed signals will appear here as soon as they settle.</p>
                )}

                {stats && recentRows.length > 0 && (
                    <div className={styles.tableScroll}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Pair</th><th>Side</th><th>Entry</th><th>Target</th><th>Stop</th><th>Result</th><th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentRows.map(({ id, original: s }) => (
                                    <tr key={id}>
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
