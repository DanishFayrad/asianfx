'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useAuth';
import ThemeToggle from '@/components/ThemeToggle';
import styles from '@/app/home.module.css';

const LINKS = [
    ['#markets', 'Markets'],
    ['#how', 'How it works'],
    ['#performance', 'Track record'],
    ['#pricing', 'Pricing'],
    ['#faq', 'FAQ'],
];

const initials = (name = '') =>
    name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'U';

export default function HomeNav() {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { user } = useCurrentUser();
    const close = () => setOpen(false);

    // The cached user only exists in the browser — wait for mount to avoid a hydration mismatch.
    useEffect(() => setMounted(true), []);
    const signedIn = mounted && !!user;
    const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'Trader';

    return (
        <header className={styles.nav}>
            <div className={`${styles.container} ${styles.navInner}`}>
                <Link href="/" className={styles.brand} onClick={close}>
                    <img src="/images/logo-mark.png" alt="" width={34} height={34} />
                    <span>Asian<b>FX</b></span>
                </Link>

                <nav className={`${styles.navLinks} ${open ? styles.navOpen : ''}`}>
                    {LINKS.map(([href, label]) => (
                        <a key={href} href={href} onClick={close}>{label}</a>
                    ))}
                    <div className={styles.navActions}>
                        {signedIn ? (
                            <>
                                <span className={styles.navUser} title={user.email || ''}>
                                    <span className={styles.navAvatar} aria-hidden="true">{initials(user.name || "")}</span>
                                    <span className={styles.navUserText}>
                                        <small>Signed in as</small>
                                        <strong>{firstName}</strong>
                                    </span>
                                </span>
                                <Link href="/dashboard" className={styles.btnGold} onClick={close}>
                                    {user.is_admin ? 'Admin panel' : 'Go to dashboard'}
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className={styles.btnGhost} onClick={close}>Log in</Link>
                                <Link href="/register" className={styles.btnGold} onClick={close}>Get Signals</Link>
                            </>
                        )}
                    </div>
                </nav>

                {/* Always visible, also on mobile next to the menu button */}
                <div className={styles.navTools}>
                    <ThemeToggle />
                    <button
                        type="button"
                        className={styles.menuBtn}
                        aria-label={open ? 'Close menu' : 'Open menu'}
                        aria-expanded={open}
                        onClick={() => setOpen(!open)}
                    >
                        {open ? '✕' : '☰'}
                    </button>
                </div>
            </div>
        </header>
    );
}
