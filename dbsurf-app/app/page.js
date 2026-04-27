'use client';

import { useState, useEffect } from 'react';
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

      setSuccess('Logged in successfully!');
      router.push('/dashboard');
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
            <img src="/dbsurf-user-upload.png" alt="DBSurf Logo" style={{ height: '96px', width: 'auto' }} />
            DBSurf
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
        {/* Deep, professional background gradient */}
        <div className="login-hero-container">
          <img 
            src="/dbsurf-hero-v2.png" 
            alt="DBSurf Mascot" 
            className="login-hero-img"
          />
        </div>
      </div>
    </div>
  );
}
