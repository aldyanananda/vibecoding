'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginId, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSuccess('Logged in successfully! Redirecting...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-glass-panel">
          <div className="login-logo">
            {/* SVG Logo approximating Bytebase */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Bytebase Clone
          </div>
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Please enter your details to sign in.</p>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your email or username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
      <div className="login-right">
        {/* Decorative background elements */}
        <div className="shape" style={{ width: '300px', height: '300px', top: '10%', left: '20%' }}></div>
        <div className="shape" style={{ width: '500px', height: '500px', bottom: '-10%', right: '-10%', animationDelay: '2s' }}></div>
        <div className="shape" style={{ width: '150px', height: '150px', top: '40%', right: '20%', animationDelay: '4s' }}></div>
        
        <div style={{ color: 'white', textAlign: 'center', zIndex: 1, padding: '0 4rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>Database Schema Changes and Version Control</h2>
          <p style={{ fontSize: '1.2rem', opacity: 0.9, lineHeight: 1.6 }}>
            Reliable, secure, and compliant database CI/CD for developers and DBAs.
          </p>
        </div>
      </div>
    </div>
  );
}
