import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display font for headings — gives the site its own fintech character.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata = {
  title: "AsianFX Signals | Gold, Forex & Crypto Trading Signals",
  description: "Real-time Gold (XAU/USD), Silver, Forex and Crypto trading signals with clear Entry, Take Profit and Stop Loss.",
  keywords: "trading signals, gold signals, xauusd, forex signals, silver signals, crypto signals",
  // Favicon is provided by the app/icon.svg file convention (the AsianFX logo).
};

import { Providers } from "@/redux/Providers";
import { Toaster } from 'react-hot-toast';
import AuthGuard from './AuthGuard';
import BlockedScreen from "@/components/BlockedScreen";
import ThemeToggle from "@/components/ThemeToggle";

// Runs before first paint: saved choice (or ?theme=light|dark) wins, otherwise dark.
const themeInitScript = `(function(){try{var q=new URLSearchParams(location.search).get('theme');if(q==='light'||q==='dark'){localStorage.setItem('theme',q);}var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }) {
  const isBlocked = true; // Set to false to bring the site back

  return (
    <html lang="en" data-theme="dark" className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {isBlocked ? (
          <BlockedScreen />
        ) : (
          <>
            <Providers>
              <AuthGuard>
                {children}
              </AuthGuard>
              <ThemeToggle floating />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: 'var(--t-surface-2)',
                    color: 'var(--t-text)',
                    border: '1px solid rgba(var(--t-accent-rgb), 0.25)'
                  },
                }}
              />
            </Providers>
          </>
        )}
      </body>
    </html>
  );
}
