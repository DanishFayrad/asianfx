'use client';

import { useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import AdminSidebar from '../../../components/AdminSidebar';
import AdminUsersTable from '../../../components/AdminUsersTable';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { useAdminStats, useAdminUsers } from '@/hooks/queries';
import '../../../styles/adminSignals.css';

export default function AdminUsersPage() {
    // Access (admins only) is enforced by AuthGuard before this page renders.
    const { user } = useCurrentUser();
    const handleLogout = useLogout();
    const isAdmin = !!user?.is_admin;

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const usersQuery = useAdminUsers(isAdmin);
    const statsQuery = useAdminStats(isAdmin);
    const users = usersQuery.data ?? [];
    const pendingDeposits = statsQuery.data?.pending_deposits || 0;

    if (!user || !user.is_admin) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-bg)', color: 'var(--t-text)' }}>
                <div className="loader">Loading Admin Panel...</div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <AdminSidebar
                active="users"
                user={user}
                pendingDeposits={pendingDeposits}
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {isSidebarOpen && <div className="admin-backdrop" onClick={() => setIsSidebarOpen(false)}></div>}

            <main className="admin-main-content">
                <header className="admin-top-navbar">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="admin-btn-hamburger" onClick={() => setIsSidebarOpen(true)}>☰</button>
                        <div>
                            <h2 className="admin-page-title">Users</h2>
                            <p className="admin-subtitle">All registered members & their deposits</p>
                        </div>
                    </div>
                    <ThemeToggle />
                </header>

                <div style={{ padding: '2rem' }}>
                    <AdminUsersTable users={users} loading={usersQuery.isPending} />
                </div>
            </main>
        </div>
    );
}
