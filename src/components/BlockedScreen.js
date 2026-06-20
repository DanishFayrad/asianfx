'use client';
import { useEffect, useState } from 'react';

export default function BlockedScreen() {
    const [ip, setIp] = useState('Checking...');
    const [rayId, setRayId] = useState('');
    const [domain, setDomain] = useState('asianfx.com');

    // Generate a random-looking Cloudflare Ray ID
    const generateRayId = () => {
        const hex = '0123456789abcdef';
        let id = '';
        for (let i = 0; i < 16; i++) {
            id += hex[Math.floor(Math.random() * 16)];
        }
        return id;
    };

    useEffect(() => {
        // Fetch client IP address to make it look 100% genuine
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setIp(data.ip || 'Unavailable'))
            .catch(() => setIp('Unavailable'));

        setRayId(generateRayId());

        if (typeof window !== 'undefined') {
            setDomain(window.location.hostname);
            document.title = `Access denied | ${window.location.hostname} used Cloudflare to restrict access`;
        }
    }, []);

    return (
        <div style={{
            margin: 0,
            padding: 0,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
            color: '#313131',
            backgroundColor: '#ffffff',
            lineHeight: 1.5,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            overflowY: 'auto'
        }}>
            {/* Main Content Area */}
            <div style={{
                maxWidth: '800px',
                width: '100%',
                margin: '0 auto',
                padding: '40px 20px',
                flexGrow: 1
            }}>
                {/* Cloudflare logo/header placeholder or clean styling */}
                <div style={{
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '20px',
                    marginBottom: '30px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '14px', color: '#9e9e9e', fontWeight: 500 }}>
                        Error 1020
                    </span>
                    <span style={{ fontSize: '14px', color: '#9e9e9e' }}>
                        Ray ID: {rayId || '...'}
                    </span>
                </div>

                <h1 style={{
                    fontSize: '36px',
                    fontWeight: 400,
                    margin: '0 0 10px 0',
                    color: '#313131'
                }}>
                    Access denied
                </h1>

                <h2 style={{
                    fontSize: '20px',
                    fontWeight: 400,
                    margin: '0 0 30px 0',
                    color: '#f38020'
                }}>
                    What happened?
                </h2>
                
                <p style={{ fontSize: '16px', color: '#313131', margin: '0 0 30px 0' }}>
                    This website is using a security service to protect itself from online attacks. The action you performed triggered the security solution. There are several actions that could trigger this block including submitting a certain word or phrase, a SQL command or malformed data.
                </p>

                <h2 style={{
                    fontSize: '20px',
                    fontWeight: 400,
                    margin: '0 0 20px 0',
                    color: '#313131'
                }}>
                    What can I do?
                </h2>

                <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    margin: '0 0 10px 0',
                    color: '#313131'
                }}>
                    If you are a visitor of this website:
                </h3>
                <p style={{ fontSize: '15px', color: '#595959', margin: '0 0 30px 0' }}>
                    Please try again in a few minutes. If you continue to experience issues, you can contact the website owner and let them know you were blocked. Please provide the Ray ID (which is at the bottom of this page) and the description of what you were doing when the block page appeared.
                </p>

                <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    margin: '0 0 10px 0',
                    color: '#313131'
                }}>
                    If you are the owner of this website:
                </h3>
                <p style={{ fontSize: '15px', color: '#595959', margin: '0 0 40px 0' }}>
                    Please review your Cloudflare WAF or Firewall rules log to find details of why this request was blocked. You can look up the blocked request by search for the Ray ID.
                </p>

                {/* Ray ID and IP details section */}
                <div style={{
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '20px',
                    fontSize: '14px',
                    color: '#595959',
                    fontFamily: 'Monaco, Courier, monospace',
                    marginBottom: '40px'
                }}>
                    <div style={{ marginBottom: '10px' }}>
                        <span style={{ fontWeight: 'bold' }}>Your IP:</span> {ip}
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <span style={{ fontWeight: 'bold' }}>Performance &amp; security by:</span> Cloudflare
                    </div>
                    <div>
                        <span style={{ fontWeight: 'bold' }}>Ray ID:</span> {rayId || '...'}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{
                borderTop: '1px solid #e0e0e0',
                padding: '20px 0',
                textAlign: 'center',
                fontSize: '12px',
                color: '#9e9e9e',
                backgroundColor: '#fafafa'
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
                    Cloudflare Ray ID: <strong style={{ color: '#595959' }}>{rayId ? `${rayId}-${domain === 'localhost' ? 'LHR' : 'DEL'}` : '...'}</strong> &bull; Your IP: {ip} &bull; <span style={{ color: '#0051c3', cursor: 'pointer' }}>Help</span>
                </div>
            </div>
        </div>
    );
}
