import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Inter: the whole site. JetBrains Mono: trading prices and key numbers only.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "AsianFX Signals | Gold, Forex & Crypto Trading Signals",
  description: "Real-time Gold (XAU/USD), Silver, Forex and Crypto trading signals with clear Entry, Take Profit and Stop Loss.",
  keywords: "trading signals, gold signals, xauusd, forex signals, silver signals, crypto signals",
  // Favicon is provided by the app/icon.png file convention (the AsianFX logo).
};

import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from 'react-hot-toast';
import AuthGuard from './AuthGuard';
import BlockedScreen from "@/components/BlockedScreen";
import ThemeToggle from "@/components/ThemeToggle";
import RouteProgress from "@/components/RouteProgress";
import InspectGuard from "@/components/InspectGuard";

// Runs before first paint: saved choice (or ?theme=light|dark) wins, otherwise light.
const themeInitScript = `(function(){try{var q=new URLSearchParams(location.search).get('theme');if(q==='light'||q==='dark'){localStorage.setItem('theme',q);}var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t='light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  const isBlocked = false; // Set to true to block the site

  return (
    <html lang="en" data-theme="light" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <InspectGuard />
        {isBlocked ? (
          <BlockedScreen />
        ) : (
          <>
            <QueryProvider>
              <AuthGuard>
                {children}
              </AuthGuard>
              <RouteProgress />
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
            </QueryProvider>
          </>
        )}
      </body>
    </html>
  );
}
