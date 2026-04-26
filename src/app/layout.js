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
  title: "Asian FX Signals | Professional Trading & Wealth Management",
  description: "Get carefully analyzed Stock & Share Market signals. Join our professional trading management service with AI-driven strategies and a fair profit-sharing model.",
  keywords: "trading signals, stock market, share market, wealth management, forex signals, technical analysis",
};

import { Providers } from "@/redux/Providers";
import { Toaster } from 'react-hot-toast';
import AuthGuard from './AuthGuard';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
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
      </body>
    </html>
  );
}
