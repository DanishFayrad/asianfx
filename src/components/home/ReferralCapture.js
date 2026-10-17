'use client';

import { useEffect } from 'react';

// Remember ?ref=CODE so the register page can pre-fill it.
export default function ReferralCapture() {
    useEffect(() => {
        const ref = new URLSearchParams(window.location.search).get('ref');
        if (ref) {
            try { localStorage.setItem('referral_code', ref); } catch {}
        }
    }, []);
    return null;
}
