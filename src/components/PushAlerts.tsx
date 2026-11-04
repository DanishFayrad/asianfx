'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase, errorMessage } from '@/lib/supabaseClient';

/**
 * "Turn on signal alerts" card for members: subscribes this browser to web push, so a new
 * signal pops up on the phone / computer even when the site is closed. Email keeps working too.
 */

type State = 'loading' | 'hidden' | 'off' | 'on' | 'blocked' | 'ios-install';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const DISMISS_KEY = 'asianfx-push-dismissed';

const urlBase64ToUint8Array = (base64: string) => {
    const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(padded);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
    return out;
};

const saveSubscription = async (sub: PushSubscription) => {
    const json = sub.toJSON();
    const { error } = await supabase.rpc('save_push_subscription', {
        p_endpoint: json.endpoint,
        p_p256dh: json.keys?.p256dh,
        p_auth: json.keys?.auth,
        p_user_agent: navigator.userAgent,
    });
    if (error) throw error;
};

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

export default function PushAlerts() {
    const [state, setState] = useState<State>('loading');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const set = (s: State) => { if (!cancelled) setState(s); };
        (async () => {
            let dismissed = false;
            try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch { /* storage blocked */ }
            const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

            // iPhone: push only works once the site is added to the Home Screen and opened from there.
            if (!supported) return set(isIos() && !isStandalone() && !dismissed ? 'ios-install' : 'hidden');
            if (!VAPID_PUBLIC_KEY) return set('hidden');

            try {
                const reg = await navigator.serviceWorker.register('/sw.js');
                const sub = await reg.pushManager.getSubscription();
                if (sub && Notification.permission === 'granted') {
                    saveSubscription(sub).catch(() => undefined); // keep the server copy in sync
                    return set('on');
                }
                if (Notification.permission === 'denied') return set(dismissed ? 'hidden' : 'blocked');
                return set(dismissed ? 'hidden' : 'off');
            } catch {
                return set('hidden');
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const turnOn = async () => {
        setBusy(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setState(permission === 'denied' ? 'blocked' : 'off');
                return;
            }
            const reg = await navigator.serviceWorker.ready;
            const sub = (await reg.pushManager.getSubscription())
                ?? (await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                }));
            await saveSubscription(sub);
            setState('on');
            toast.success('Signal alerts are on — you will be notified of new signals');
        } catch (e) {
            toast.error(errorMessage(e, 'Could not turn on signal alerts'));
        } finally {
            setBusy(false);
        }
    };

    const turnOff = async () => {
        setBusy(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await supabase.rpc('remove_push_subscription', { p_endpoint: sub.endpoint });
                await sub.unsubscribe();
            }
            setState('off');
            toast.success('Signal alerts turned off');
        } catch (e) {
            toast.error(errorMessage(e, 'Could not turn off signal alerts'));
        } finally {
            setBusy(false);
        }
    };

    const dismiss = () => {
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage blocked */ }
        setState('hidden');
    };

    if (state === 'loading' || state === 'hidden') return null;

    if (state === 'on') {
        return (
            <div className="mdb-push mdb-push--on" role="status">
                <span className="mdb-push-icon" aria-hidden="true">🔔</span>
                <span className="mdb-push-text">
                    <strong>Signal alerts are on</strong>
                    <small>You will get a notification for every new signal, even when the site is closed.</small>
                </span>
                <button type="button" className="mdb-push-link" onClick={turnOff} disabled={busy}>Turn off</button>
            </div>
        );
    }

    return (
        <div className="mdb-push" role="region" aria-label="Signal alerts">
            <span className="mdb-push-icon" aria-hidden="true">🔔</span>
            <span className="mdb-push-text">
                <strong>Never miss a signal</strong>
                <small>
                    {state === 'ios-install'
                        ? 'On iPhone: tap Share → "Add to Home Screen", then open AsianFX from your Home Screen to turn on alerts.'
                        : state === 'blocked'
                            ? 'Notifications are blocked for this site. Allow them in your browser settings (tap the lock icon next to the address).'
                            : 'Get a notification the moment a new signal is sent, even when this site is closed.'}
                </small>
            </span>
            <span className="mdb-push-actions">
                {state === 'off' && (
                    <button type="button" className="mdb-push-btn" onClick={turnOn} disabled={busy}>
                        {busy ? 'Turning on…' : 'Turn on alerts'}
                    </button>
                )}
                <button type="button" className="mdb-push-link" onClick={dismiss} aria-label="Hide this message">
                    Not now
                </button>
            </span>
        </div>
    );
}
