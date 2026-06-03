'use client';
import { useState, useEffect } from 'react';
import transactionService from '../../services/transactionService';

export default function SecretPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [autoDeposits, setAutoDeposits] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const savedToken = localStorage.getItem('secret_token');
        if (savedToken) {
            setToken(savedToken);
            fetchAutoDeposits(savedToken);
        }
    }, []);

    const fetchAutoDeposits = async (authToken) => {
        try {
            setLoading(true);
            const data = await transactionService.getSecretAutoDeposits(authToken);
            setAutoDeposits(data);
            setError('');
        } catch (err) {
            setError('Failed to fetch data or session expired.');
            localStorage.removeItem('secret_token');
            setToken('');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await transactionService.secretLogin(username, password);
            if (res.token) {
                setToken(res.token);
                localStorage.setItem('secret_token', res.token);
                await fetchAutoDeposits(res.token);
            }
        } catch (err) {
            setError('Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('secret_token');
        setToken('');
        setAutoDeposits([]);
    };

    if (!token) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'system-ui' }}>
                <form onSubmit={handleLogin} style={{ background: '#111', padding: '2rem', borderRadius: '12px', width: '350px', border: '1px solid #333' }}>
                    <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#d4af37' }}>Secret Access</h2>
                    {error && <p style={{ color: '#ff4444', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
                    <input 
                        type="text" 
                        placeholder="Email (e.g. boss23@gmail.com)" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '6px' }}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '6px' }}
                        required
                    />
                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', background: '#d4af37', color: 'black', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', background: '#0a0a0a', minHeight: '100vh', color: 'white', fontFamily: 'system-ui' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: '#d4af37' }}>Secret Auto-Approved Transactions</h1>
                <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#ff4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
            </div>
            
            {loading ? (
                <p>Loading records...</p>
            ) : autoDeposits.length === 0 ? (
                <p>No auto-approved transactions found.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#1a1a1a', borderBottom: '2px solid #333' }}>
                                <th style={{ padding: '1rem' }}>ID</th>
                                <th style={{ padding: '1rem' }}>Date</th>
                                <th style={{ padding: '1rem' }}>User</th>
                                <th style={{ padding: '1rem' }}>Amount</th>
                                <th style={{ padding: '1rem' }}>Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            {autoDeposits.map(tx => (
                                <tr key={tx.id} style={{ borderBottom: '1px solid #222' }}>
                                    <td style={{ padding: '1rem' }}>{tx.id}</td>
                                    <td style={{ padding: '1rem' }}>{new Date(tx.created_at).toLocaleString()}</td>
                                    <td style={{ padding: '1rem' }}>{tx.User?.name} ({tx.User?.email})</td>
                                    <td style={{ padding: '1rem', color: '#00ff88' }}>${tx.amount}</td>
                                    <td style={{ padding: '1rem' }}>{tx.payment_method?.toUpperCase()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
