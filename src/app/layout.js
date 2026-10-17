import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export default function RootLayout({ children }) {
  const isBlocked = false; // Set to true to block the site

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {isBlocked ? (
          <BlockedScreen />
        ) : (
          <>
            <Providers>
              <AuthGuard>
                {children}
              </AuthGuard>
              <Toaster 
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid rgba(212,175,55,0.2)'
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
