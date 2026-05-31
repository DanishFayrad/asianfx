'use client';

/**
 * Admin KPI cards + quick-nav grid shown on the admin dashboard.
 * Kept as a component so it can be rendered inside the shared admin shell.
 *
 * Props:
 *  - adminStats: { platform_balance, total_deposit, pending_deposits, total_profit, total_users }
 *  - onNav: (path) => void  navigation handler
 */
export default function AdminDashboardStats({ adminStats, onNav = () => {} }) {
    const card = {
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '20px', padding: '1.5rem', display: 'flex', gap: '20px',
        alignItems: 'center', cursor: 'pointer', transition: '0.3s'
    };

    return (
        <div className="admin-business-suite" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="db-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                <div className="db-card admin-kpi" style={{ borderLeft: '4px solid #a78bfa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span className="db-card-label" style={{ color: '#a78bfa' }}>GLOBAL BALANCE</span>
                        <div style={{ background: 'rgba(167, 139, 250, 0.1)', padding: '4px', borderRadius: '6px' }}>💰</div>
                    </div>
                    <h3>${adminStats?.platform_balance || '0.00'}</h3>
                    <p style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>Users Wallet Total</span>
                        <span style={{ color: '#22c55e' }}>ONLINE</span>
                    </p>
                </div>

                <div className="db-card admin-kpi" style={{ borderLeft: '4px solid #22c55e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span className="db-card-label" style={{ color: '#22c55e' }}>TOTAL REVENUE</span>
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '4px', borderRadius: '6px' }}>📈</div>
                    </div>
                    <h3>${adminStats?.total_deposit || '0.00'}</h3>
                    <p>Accumulated Deposits</p>
                </div>

                <div className="db-card admin-kpi" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span className="db-card-label" style={{ color: '#f59e0b' }}>PENDING ACTION</span>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '4px', borderRadius: '6px' }}>⏳</div>
                    </div>
                    <h3>{adminStats?.pending_deposits || 0}</h3>
                    <p>Awaiting Verification</p>
                </div>

                <div className="db-card admin-kpi" style={{ borderLeft: '4px solid #60a5fa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <span className="db-card-label" style={{ color: '#60a5fa' }}>PLATFORM PROFIT</span>
                        <div style={{ background: 'rgba(96, 165, 250, 0.1)', padding: '4px', borderRadius: '6px' }}>💎</div>
                    </div>
                    <h3>${adminStats?.total_profit || '0.00'}</h3>
                    <p>Net Earnings</p>
                </div>
            </div>

            {/* QUICK NAV GRID FOR ADMIN */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={card} onClick={() => onNav('/transaction')}>
                    <div style={{ background: '#ef4444', color: 'white', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>💵</div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Transaction Desk</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Approve deposits & send signals</p>
                    </div>
                    <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem' }}>{adminStats?.pending_deposits || 0} Alert</div>
                </div>

                <div style={card} onClick={() => onNav('/admin/signals')}>
                    <div style={{ background: '#d4af37', color: 'black', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📢</div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Global Center</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Manage signals & market trends</p>
                    </div>
                </div>

                <div style={card} onClick={() => onNav('/admin/users')}>
                    <div style={{ background: '#3b82f6', color: 'white', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👥</div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Users Matrix</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>{adminStats?.total_users || 0} Registered Members</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
