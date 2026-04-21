import { Suspense } from 'react';
import VerifyEmailClient from './VerifyEmailClient';

export const dynamic = 'force-dynamic';

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="forgot-password-container">
                <div className="forgot-password-card" style={{ textAlign: 'center', padding: '50px' }}>
                    <div className="loading-spinner"></div>
                    <p style={{ color: 'white', marginTop: '20px' }}>Loading verification page...</p>
                </div>
            </div>
        }>
            <VerifyEmailClient />
        </Suspense>
    );
}
