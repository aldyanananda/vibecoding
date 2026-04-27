'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const ENGINE_COLORS = {
  PostgreSQL: '#336791', MySQL: '#E48E00', MongoDB: '#4DB33D', Redis: '#DC382D',
};

const ENV_STYLES = {
  Prod:    { bg: '#dbeafe', text: '#1d4ed8' },
  Staging: { bg: '#fef3c7', text: '#92400e' },
  Dev:     { bg: '#d1fae5', text: '#065f46' },
  Test:    { bg: '#fce7f3', text: '#9d174d' },
};

import EngineIcon from '@/app/components/EngineIcon';

function Toggle({ checked }) {
  return (
    <div style={{
      width: '42px', height: '24px', borderRadius: '12px',
      backgroundColor: checked ? '#4f46e5' : '#d1d5db',
      position: 'relative', cursor: 'default', transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: '3px',
        left: checked ? '21px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        backgroundColor: 'white', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

export default function InstanceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbLoading, setDbLoading] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');

  useEffect(() => {
    const fetchInstance = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/instances/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setInstance(data);

        // Parse host:port from address
        const addr = data.address || '';
        const firstHost = addr.split(',')[0].trim();
        const lastColon = firstHost.lastIndexOf(':');
        if (lastColon !== -1) {
          setHost(firstHost.substring(0, lastColon));
          setPort(firstHost.substring(lastColon + 1));
        } else {
          setHost(firstHost);
          setPort('');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchInstance();
  }, [id]);

  const loadDatabases = async () => {
    setDbLoading(true);
    setConnectionError(null);
    try {
      const res = await fetch(`/api/instances/${id}/databases`);
      const data = await res.json();
      if (data.connectionError) {
        setConnectionError(data.connectionError);
        setDatabases([]);
      } else {
        setDatabases(data.databases || []);
      }
    } catch (err) {
      setConnectionError(err.message);
    } finally {
      setDbLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'databases' && databases.length === 0 && !connectionError) {
      loadDatabases();
    }
  };

  const [openingDb, setOpeningDb] = useState(null);
  const handleOpenSqlEditor = async (dbName) => {
    setOpeningDb(dbName);
    try {
      const res = await fetch('/api/sql/open-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: id, dbName })
      });
      const data = await res.json();
      if (data.dbId) {
        router.push(`/dashboard/sqleditor?dbId=${data.dbId}`);
      } else {
        alert(data.error || 'Failed to open SQL Editor');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setOpeningDb(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete instance "${instance.name}"?`)) return;
    try {
      const res = await fetch(`/api/instances/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete instance');
      alert('Instance deleted successfully');
      router.push('/dashboard/instances');
    } catch (err) {
      alert(err.message);
    }
  };

  // Slug for display
  const instanceSlug = instance?.name?.toLowerCase().replace(/\s+/g, '-') || '';

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading instance...</div>;
  }
  if (!instance) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>Instance not found.</div>;
  }

  const envStyle = ENV_STYLES[instance.environment] || { bg: '#f3f4f6', text: '#374151' };

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push('/dashboard/instances')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Instances
        </button>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <EngineIcon engine={instance.engine} size={28} />
          <h1 style={{ fontSize: '1.375rem', fontWeight: '700', margin: 0 }}>{instance.name}</h1>
        </div>
      </div>

      {/* Tab nav + action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {['overview', 'databases', 'users'].map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? '#4f46e5' : '#6b7280',
                borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
                fontSize: '0.9rem', textTransform: 'capitalize',
                transition: 'all 0.15s',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', paddingBottom: '0.5rem' }}>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Sync instance
          </button>
          <button className="submit-btn" style={{ width: 'auto', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Database
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ maxWidth: '760px' }}>
          {/* Row 1: Instance Name + License */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                Instance Name *
                <EngineIcon engine={instance.engine} size={16} />
                <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '0.8rem' }}>{instance.engine === 'MySQL' ? '8.0+' : instance.engine}</span>
              </label>
              <input
                type="text"
                className="form-input"
                defaultValue={instance.name}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem' }}>
                Instance ID: <strong>{instanceSlug}</strong>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                Assign License
                <span style={{ color: '#4f46e5', fontWeight: 400, fontSize: '0.8rem' }}>(remain 0)</span>
              </label>
              <Toggle checked={instance.license === 'Y'} />
            </div>
          </div>

          {/* Row 2: Environment */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Environment *
            </label>
            <select className="form-input" style={{ maxWidth: '360px' }} defaultValue={instance.environment}>
              {['Prod','Staging','Dev','Test'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Row 3: Host + Port */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Host or Socket *
              </label>
              <input type="text" className="form-input" defaultValue={host} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Port</label>
              <input type="text" className="form-input" defaultValue={port} style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Database Username
              </label>
              <input
                type="text"
                className="form-input"
                defaultValue={instance.db_user}
                id="db_user_input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Database Password
              </label>
              <input
                type="password"
                className="form-input"
                defaultValue={instance.db_password}
                id="db_password_input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Scan Interval */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              Scan Interval
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#9ca3af"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem' }}>
              DBSurf periodically syncs instance schema and detects anomalies.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input type="radio" name="scan" defaultChecked /> Default (never)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: '#9ca3af' }}>
                <input type="radio" name="scan" disabled /> Custom
                <input type="number" className="form-input" defaultValue={30} min={30} disabled style={{ width: '70px', padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginLeft: '0.25rem' }} />
                Minutes
              </label>
            </div>
          </div>

          {/* Sync Databases */}
          <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              Sync Databases
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#9ca3af"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Only sync selected databases.</div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button
              className="submit-btn"
              style={{ width: 'auto' }}
              onClick={async () => {
                const name = document.querySelector('input[defaultValue="' + instance.name + '"]').value;
                const env = document.querySelector('select').value;
                const addr = document.querySelector('input[defaultValue="' + host + '"]').value + ':' + document.querySelector('input[defaultValue="' + port + '"]').value;
                const db_user = document.getElementById('db_user_input').value;
                const db_password = document.getElementById('db_password_input').value;

                try {
                  const res = await fetch(`/api/instances/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, environment: env, engine: instance.engine, address: addr, external_link: instance.external_link, db_user, db_password })
                  });
                  if (res.ok) alert('Instance updated successfully');
                  else alert('Failed to update instance');
                } catch (err) {
                  alert(err.message);
                }
              }}
            >
              Update Instance
            </button>
            <button
              className="btn-danger"
              style={{ 
                width: 'auto', marginLeft: '1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', 
                padding: '0.6rem 1.2rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' 
              }}
              onClick={handleDelete}
            >
              Delete Instance
            </button>
          </div>
        </div>
      )}

      {/* Databases Tab */}
      {activeTab === 'databases' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Connecting to <code style={{ background: '#f3f4f6', padding: '0.15rem 0.4rem', borderRadius: '3px' }}>{instance.engine}</code> at <code style={{ background: '#f3f4f6', padding: '0.15rem 0.4rem', borderRadius: '3px' }}>{instance.address}</code>
            </div>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={loadDatabases} disabled={dbLoading}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              {dbLoading ? 'Connecting...' : 'Refresh'}
            </button>
          </div>

          {dbLoading && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ marginBottom: '1rem' }}>Connecting to database instance...</div>
              <div style={{ width: '24px', height: '24px', border: '3px solid #e5e7eb', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
              <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {connectionError && !dbLoading && (
            <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, color: '#b91c1c', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Connection Failed
              </div>
              <code style={{ fontSize: '0.8rem', color: '#dc2626' }}>{connectionError}</code>
            </div>
          )}

          {!dbLoading && !connectionError && databases.length > 0 && (
            <div className="instance-card">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>#</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Database Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Engine</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {databases.map((db, idx) => (
                    <tr key={db} style={{ borderBottom: '1px solid #f3f4f6' }}
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>{idx + 1}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <EngineIcon engine={instance.engine} size={16} />
                          <span style={{ fontWeight: 500, color: '#4f46e5' }}>{db}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.8rem' }}>{instance.engine}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button 
                          onClick={() => handleOpenSqlEditor(db)}
                          disabled={openingDb === db}
                          style={{ 
                            background: 'none', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '4px', 
                            padding: '0.25rem 0.75rem', 
                            fontSize: '0.75rem', 
                            cursor: openingDb === db ? 'not-allowed' : 'pointer', 
                            color: '#4f46e5',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          {openingDb === db && <div style={{ width: '10px', height: '10px', border: '2px solid #e5e7eb', borderTop: '2px solid #4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
                          {openingDb === db ? 'Opening...' : 'Open SQL Editor'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!dbLoading && !connectionError && databases.length === 0 && (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af' }}>
              No databases found. Click Refresh to connect.
            </div>
          )}
        </div>
      )}

      {/* Users Tab (placeholder) */}
      {activeTab === 'users' && (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af' }}>
          User management will appear here.
        </div>
      )}
    </div>
  );
}
