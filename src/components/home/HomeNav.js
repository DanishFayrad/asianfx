'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import styles from '@/app/home.module.css';

const LINKS = [
    ['#markets', 'Markets'],
    ['#how', 'How it works'],
    ['#performance', 'Track record'],
    ['#pricing', 'Pricing'],
    ['#faq', 'FAQ'],
];

export default function HomeNav() {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    return (
        <header className={styles.nav}>
            <div className={`${styles.container} ${styles.navInner}`}>
                <Link href="/" className={styles.brand} onClick={close}>
                    <img src="/images/logo-mark.svg" alt="" width={34} height={34} />
                    <span>Asian<b>FX</b></span>
                </Link>

                <nav className={`${styles.navLinks} ${open ? styles.navOpen : ''}`}>
                    {LINKS.map(([href, label]) => (
                        <a key={href} href={href} onClick={close}>{label}</a>
                    ))}
                    <div className={styles.navActions}>
                        <Link href="/login" className={styles.btnGhost} onClick={close}>Log in</Link>
                        <Link href="/register" className={styles.btnGold} onClick={close}>Get Signals</Link>
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
