'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { setUser, logout } from '../../../redux/slices/authSlice';
import authService from '../../../services/authService';
import transactionService from '../../../services/transactionService';
import AdminSidebar from '../../../components/AdminSidebar';
import AdminUsersTable from '../../../components/AdminUsersTable';
import '../../../styles/adminSignals.css';

export default function AdminUsersPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user, token } = useSelector((state) => state.auth);

    const [mounted, setMounted] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingDeposits, setPendingDeposits] = useState(0);

    useEffect(() => { setMounted(true); }, []);

    // Auth guard — admins only.
    useEffect(() => {
        const checkAuth = async () => {
            if (user) {
                if (!user.is_admin) router.push('/dashboard');
            } else if (token) {
                try {
                    const profile = await authService.getProfile();
                    dispatch(setUser(profile));
                } catch (e) {
                    console.error('Session expired', e);
                    router.push('/login');
                }
            } else {
                router.push('/login');
            }
        };
        checkAuth();
    }, [user, token, router, dispatch]);

    // Load users + pending count.
    useEffect(() => {
        if (!user?.is_admin) return;
        const load = async () => {
            try {
                setLoading(true);
                const [usersList, stats] = await Promise.all([
                    transactionService.getAllUsers(),
                    transactionService.getAdminStats().catch(() => null)
                ]);
                setUsers(Array.isArray(usersList) ? usersList : []);
                if (stats) setPendingDeposits(stats.pending_deposits || 0);
            } catch (e) {
                console.error('Failed to load users', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (e) {
            console.error('Logout API failed:', e);
        } finally {
            dispatch(logout());
            router.push('/login');
        }
    };

    if (!mounted || !user || !user.is_admin) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0b10', color: 'white' }}>
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
                </header>

                <div style={{ padding: '2rem' }}>
                    <AdminUsersTable users={users} loading={loading} />
                </div>
            </main>
        </div>
    );
}
