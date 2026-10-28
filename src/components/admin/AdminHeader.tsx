'use client';

import ThemeToggle from '@/components/ThemeToggle';
import type { ReactNode } from 'react';
import { IconMenu } from './AdminIcons';

interface AdminHeaderProps {
    title: ReactNode;
    subtitle?: ReactNode;
    onMenu?: () => void;
    children?: ReactNode;
}

/** Page header used by admin screens: menu button (mobile), title, subtitle, actions. */
export default function AdminHeader({ title, subtitle, onMenu, children }: AdminHeaderProps) {
    return (
        <header className="ahd">
            <div className="ahd-left">
                <button type="button" className="ahd-menu" onClick={onMenu} aria-label="Open menu">
                    <IconMenu size={20} />
                </button>
                <div>
                    <h1 className="ahd-title">{title}</h1>
                    {subtitle && <p className="ahd-subtitle">{subtitle}</p>}
                </div>
            </div>
            <div className="ahd-actions">
                {children}
                <ThemeToggle />
            </div>
        </header>
    );
}
