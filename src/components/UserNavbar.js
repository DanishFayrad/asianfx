'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { displayUserId } from '@/lib/memberId';
import '../styles/dashboard.css';

const LINKS = [
    { key: 'signals', href: '/dashboard', label: 'Signals' },
    { key: 'wallet', href: '/wallet', label: 'Wallet' },
];

/**
 * Top navigation shared by every member page (Signals, Wallet) so the
 * user area looks and behaves the same everywhere.
 *
 * Props:
 *  - active: 'signals' | 'wallet'
 *  - user: current user (for the profile dropdown)
 *  - onLogout: logout handler
 */
export default function UserNavbar({ active, user, onLogout }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);

    // Close the profile dropdown when the user taps or clicks anywhere outside it.
    useEffect(() => {
        if (!isProfileOpen) return;
        const handleOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false);
        };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('touchstart', handleOutside);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
        };
    }, [isProfileOpen]);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
        setIsProfileOpen(false);
    };

    const toggleProfile = () => {
        setIsProfileOpen(!isProfileOpen);
        setIsMenuOpen(false);
    };

    const navLinks = (onClick) => LINKS.map((l) => (
        <Link key={l.key} href={l.href} className={active === l.key ? 'active' : ''} onClick={onClick}>
            {l.label}
        </Link>
    ));

    return (
        <header className="db-navbar">
            <div className="db-nav-left">
                <Link href="/dashboard" className="db-logo">
                    <div className="logo-box">
                        <img src="/images/logo-mark.svg" alt="AsianFX Signals" />
                    </div>
                    <span>AsianFX</span>
                </Link>

                <nav>{navLinks()}</nav>
            </div>

            <div className="hamburger" onClick={toggleMenu}>
                {isMenuOpen ? '✕' : '☰'}
            </div>

            <div className={`db-nav-right ${isMenuOpen ? 'show' : ''}`}>
                <nav className="mobile-only-nav">{navLinks(() => setIsMenuOpen(false))}</nav>

                <div className="db-nav-actions">
                    <ThemeToggle />
                    <div className="db-nav-icons" ref={profileRef}>
                        {user?.profile_image ? (
                            <img
                                src={user.profile_image}
                                alt="User"
                                onClick={toggleProfile}
                                style={{ cursor: 'pointer', borderRadius: '50%', border: isProfileOpen ? '2px solid var(--primary)' : '2px solid transparent', width: '40px', height: '40px', objectFit: 'cover' }}
                            />
                        ) : (
                            <div
                                onClick={toggleProfile}
                                style={{
                                    width: '40px', height: '40px', borderRadius: '50%',
                                    background: 'rgba(var(--t-accent-rgb), 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                    border: isProfileOpen ? '2px solid var(--primary)' : '1px solid var(--tw-10)'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                        )}

                        <div className={`profile-dropdown ${isProfileOpen ? 'show' : ''}`}>
                            <div className="dropdown-user-info">
                                <span className="user-name">{user?.name || 'Trader'}</span>
                                <span className="user-email">{user?.email || ''}</span>
                                <span className="user-id">ID: #{displayUserId(user?.user_id) ?? '---'}</span>
                            </div>

                            <div className="dropdown-balance">
                                <span>Wallet Balance</span>
                                <strong>${Number(user?.wallet_balance || 0).toFixed(2)}</strong>
                            </div>

                            <button className="logout-btn" onClick={onLogout}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <path d="M16 17l5-5-5-5" />
                                    <path d="M21 12H9" />
                                </svg>
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
