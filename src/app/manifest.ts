import type { MetadataRoute } from 'next';

// Lets members "Add to Home Screen" — on iPhone this is required for signal alerts (web push).
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'AsianFX Signals',
        short_name: 'AsianFX',
        description: 'Real-time trading signals for Gold, Silver, Forex and Crypto.',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#f7f3ea',
        theme_color: '#d4af37',
        icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
    };
}
