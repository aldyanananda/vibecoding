'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import EngineIcon from '@/app/components/EngineIcon';

export default function InstancesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [newInstance, setNewInstance] = useState({ name: '', environment: 'Staging', engine: 'MySQL', address: '', db_user: '', db_password: '' });

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/instances');
      const data = await res.json();
      setInstances(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetch('/api/auth/me').then(res => res.ok && res.json()).then(user => setCurrentUser(user));
    fetchInstances(); 
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/instances/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: newInstance.engine,
          address: newInstance.address,
          db_user: newInstance.db_user,
          db_password: newInstance.db_password
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const filteredInstances = instances.filter(i =>
    i.name.toLowerCase().includes(filter.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (e) => {
    if (e.target.checked) {
      setSelected(new Set(filteredInstances.map(i => i.id)));
    } else {
      setSelected(new Set());
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInstance)
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      setIsPanelOpen(false);
      setNewInstance({ name: '', environment: 'Staging', engine: 'MySQL', address: '', db_user: '', db_password: '' });
      setTestResult(null);
      fetchInstances();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete instance "${name}"?`)) return;
    try {
      const res = await fetch(`/api/instances/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete instance');
      fetchInstances();
      setSelected(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteSelected = async () => {
    const count = selected.size;
    if (!confirm(`Are you sure you want to delete ${count} selected instances?`)) return;
    try {
      const res = await fetch('/api/instances', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) })
      });
      if (!res.ok) throw new Error('Failed to delete selected instances');
      fetchInstances();
      setSelected(new Set());
    } catch (err) {
      alert(err.message);
    }
  };

  const envColor = { Prod: { bg: '#dbeafe', text: '#1d4ed8' }, Staging: { bg: '#fef3c7', text: '#92400e' }, Dev: { bg: '#d1fae5', text: '#065f46' }, Test: { bg: '#fce7f3', text: '#9d174d' } };

  return (
    <>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
          <input
            type="text"
            className="filter-input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Filter instance name"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <button
          className="submit-btn"
          style={{ width: 'auto', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => { setIsPanelOpen(true); setTestResult(null); }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Instance
        </button>
      </div>

      {/* Batch actions bar */}
      <div className="batch-actions">
        <span style={{ fontWeight: 500 }}>{selected.size} instances selected</span>
        {currentUser?.role !== 'DBA' && selected.size > 0 && (
          <>
            <button className="action-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#3b82f6' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Sync instance
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <button className="action-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#3b82f6' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
              Assign License
            </button>
            <button 
              className="action-link" 
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ef4444' }}
              onClick={handleDeleteSelected}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              Delete
            </button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="instance-card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading instances...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '0.75rem 1rem', width: '40px' }}>
                  <input type="checkbox" onChange={toggleAll} checked={selected.size === filteredInstances.length && filteredInstances.length > 0} />
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Environment</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Address</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>License</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInstances.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No instances found.</td>
                </tr>
              ) : filteredInstances.map(inst => (
                <tr
                  key={inst.id}
                  style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.1s', cursor: 'pointer' }}
                  onClick={() => router.push(`/dashboard/instances/${inst.id}`)}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.75rem 1rem' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(inst.id)} onChange={() => toggleSelect(inst.id)} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <EngineIcon engine={inst.engine} />
                      <span style={{ color: '#4f46e5', fontWeight: 500 }}>{inst.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                      backgroundColor: inst.status === 'OK' ? '#dcfce7' : '#fee2e2',
                      color: inst.status === 'OK' ? '#166534' : '#991b1b',
                      border: `1px solid ${inst.status === 'OK' ? '#bbf7d0' : '#fecaca'}`
                    }}>
                      {inst.status || 'UNKNOWN'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500,
                      backgroundColor: (envColor[inst.environment] || { bg: '#f3f4f6' }).bg,
                      color: (envColor[inst.environment] || { text: '#374151' }).text
                    }}>
                      {inst.environment}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.8rem' }}>{inst.address || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {inst.license === 'Y' ? (
                      <span style={{ color: '#059669', fontWeight: 600 }}>Y</span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => handleDelete(inst.id, inst.name)}
                      style={{ 
                        background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', 
                        padding: '4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' 
                      }}
                      title="Delete Instance"
                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Side Panel Overlay */}
      <div className={`panel-overlay ${isPanelOpen ? 'active' : ''}`} onClick={() => !creating && !testing && setIsPanelOpen(false)}></div>

      {/* Add Instance Side Panel */}
      <div className={`side-panel ${isPanelOpen ? 'active' : ''}`}>
        <div className="panel-header">
          <h2>Add Instance</h2>
          <button className="close-btn" onClick={() => !creating && !testing && setIsPanelOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="panel-body">
          <form id="add-instance-form" onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Instance Name</label>
              <input className="form-input" type="text" placeholder="e.g. prod-mysql-01" value={newInstance.name} onChange={e => setNewInstance({ ...newInstance, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Engine</label>
              <select className="form-input" value={newInstance.engine} onChange={e => setNewInstance({ ...newInstance, engine: e.target.value })}>
                <option value="MySQL">MySQL</option>
                <option value="PostgreSQL">PostgreSQL</option>
                <option value="MongoDB">MongoDB</option>
                <option value="Redis">Redis</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Environment</label>
              <select className="form-input" value={newInstance.environment} onChange={e => setNewInstance({ ...newInstance, environment: e.target.value })}>
                <option value="Prod">Prod</option>
                <option value="Staging">Staging</option>
                <option value="Dev">Dev</option>
                <option value="Test">Test</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Address (hostname/IP:port)</label>
              <input className="form-input" type="text" placeholder="e.g. 192.168.1.1:3306" value={newInstance.address} onChange={e => setNewInstance({ ...newInstance, address: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" type="text" placeholder="e.g. root" value={newInstance.db_user} onChange={e => setNewInstance({ ...newInstance, db_user: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="e.g. secret" value={newInstance.db_password} onChange={e => setNewInstance({ ...newInstance, db_password: e.target.value })} />
              </div>
            </div>
            
            <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
              <button 
                type="button" 
                className="btn-ghost" 
                style={{ width: '100%', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                )}
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              {testResult && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: testResult.success ? '#166534' : '#991b1b', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                   {testResult.success ? (
                     <span>✅ Connection Successful</span>
                   ) : (
                     <span>❌ Connection Failed: {testResult.error}</span>
                   )}
                </div>
              )}
            </div>
          </form>
        </div>
        <div className="panel-footer">
          <button className="btn-ghost" onClick={() => !creating && !testing && setIsPanelOpen(false)} disabled={creating || testing}>Cancel</button>
          <button type="submit" form="add-instance-form" className="submit-btn" style={{ width: 'auto', marginTop: 0 }} disabled={creating || testing}>
            {creating ? 'Adding...' : 'Add Instance'}
          </button>
        </div>
      </div>
    </>
  );
}
