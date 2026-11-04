'use client';

import { useState, useEffect } from 'react';

import styles from '@/styles/SignalNotification.module.css';

const NOTIFICATIONS = [
    { name: 'Rahul K.', country: '🇮🇳', action: 'bought Gold (XAU/USD) signal', time: '2 mins ago', status: 'Profit Hit 🎯' },
    { name: 'Ahmed M.', country: '🇦🇪', action: 'unlocked EUR/USD signal', time: '5 mins ago', status: 'Active Signal ⚡' },
    { name: 'David S.', country: '🇬🇧', action: 'earned +85 pips on XAU/USD', time: '8 mins ago', status: 'TP2 Hit 🚀' },
    { name: 'Usman K.', country: '🇵🇰', action: 'unlocked Gold (XAU/USD) signal', time: ' Just now', status: 'Active Signal ⚡' },
    { name: 'Elena R.', country: '🇪🇸', action: 'earned +120 pips on BTC/USDT', time: '12 mins ago', status: 'Profit Hit 🎯' },
];

export default function SignalNotification() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
       
        const initialTimer = setTimeout(() => {
            setIsVisible(true);
        }, 4000);

      
        const interval = setInterval(() => {
           
            setIsVisible(false);

            
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % NOTIFICATIONS.length);
                setIsVisible(true);
            }, 6000);

        }, 12000); 

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, []);

    if (!isVisible) return null;

    const currentItem = NOTIFICATIONS[currentIndex];

    return (
        <div className={styles.toast}>
            <button 
                className={styles.closeBtn} 
                onClick={() => setIsVisible(false)}
                aria-label="Close"
            >
                &times;
            </button>
            <div className={styles.iconBox}>
                <span>✨</span>
            </div>
            <div className={styles.content}>
                <p className={styles.title}>
                    <strong>{currentItem.name}</strong> {currentItem.country}
                </p>
                <p className={styles.action}>{currentItem.action}</p>
                <div className={styles.meta}>
                    <span className={styles.status}>{currentItem.status}</span>
                    <span className={styles.time}>{currentItem.time}</span>
                </div>
            </div>
        </div>
    );
}