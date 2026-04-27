'use client';

import { useDashboard } from './context';
import DolphinLoader from '@/app/components/DolphinLoader';

export default function Dashboard() {
  const { user, projects, loadingUser } = useDashboard();

  if (loadingUser) return <DolphinLoader size={80} />;

  const isDeveloper = user?.role?.toLowerCase() === 'developer';

  if (isDeveloper) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <img src="/dolphin-surf.png" className="dolphin-loader" style={{ width: '120px', marginBottom: '2rem' }} alt="DBSurf Welcome" />
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', marginBottom: '1rem' }}>Welcome to DBSurf</h1>
        <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '2rem' }}>
          Select a project from the top menu to start managing your databases and issues.
        </p>
        {!projects || projects.length === 0 && (
          <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', color: '#991b1b' }}>
            <p style={{ fontWeight: 600 }}>No Projects Assigned</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Please contact your DBA to grant you access to a project.</p>
          </div>
        )}
      </div>
    );
  }

  // DBA / Global Overview
  return (
    <>
      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Active Projects</span>
          <span className="stat-value">12</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Databases</span>
          <span className="stat-value">48</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Issues</span>
          <span className="stat-value">5</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">System Health</span>
          <span className="status-badge status-online">99.9% Online</span>
        </div>
      </section>

      <section className="instances-section">
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', marginTop: '2rem' }}>Recent Database Instances</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="instance-card">
              <div className="instance-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                  <span style={{ fontWeight: '600' }}>Production-DB-{i}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>MySQL 8.0</span>
              </div>
              <div className="instance-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: '#6b7280' }}>Region</span>
                    <span>us-east-1</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: '#6b7280' }}>Storage</span>
                    <span>1.2TB / 2.0TB</span>
                  </div>
                </div>
              </div>
              <div className="instance-footer">
                <button className="btn-secondary">Configure</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
