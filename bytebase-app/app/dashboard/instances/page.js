'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Engine icon based on type
function EngineIcon({ engine }) {
  const color = {
    PostgreSQL: '#336791',
    MySQL: '#E48E00',
    MongoDB: '#4DB33D',
    Redis: '#DC382D',
  }[engine] || '#6b7280';

  const letter = (engine || 'D')[0].toUpperCase();

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '20px', height: '20px', borderRadius: '4px',
      backgroundColor: color, color: 'white',
      fontSize: '0.65rem', fontWeight: '700', flexShrink: 0
    }}>
      {letter}
    </span>
  );
}

export default function InstancesPage() {
  const router = useRouter();
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newInstance, setNewInstance] = useState({ name: '', environment: 'Staging', engine: 'MySQL', address: '', external_link: '', db_user: '', db_password: '' });

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

  useEffect(() => { fetchInstances(); }, []);

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
      setNewInstance({ name: '', environment: 'Staging', engine: 'MySQL', address: '', external_link: '', db_user: '', db_password: '' });
      fetchInstances();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
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
          onClick={() => setIsPanelOpen(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Instance
        </button>
      </div>

      {/* Batch actions bar */}
      <div className="batch-actions">
        <span style={{ fontWeight: 500 }}>{selected.size} instances selected</span>
        <button className="action-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#3b82f6' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Sync instance
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <button className="action-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#3b82f6' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          Assign License
        </button>
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
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Environment</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Address</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>External Link</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>License</th>
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
                      padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500,
                      backgroundColor: (envColor[inst.environment] || { bg: '#f3f4f6' }).bg,
                      color: (envColor[inst.environment] || { text: '#374151' }).text
                    }}>
                      {inst.environment}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.8rem' }}>{inst.address || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {inst.external_link ? (
                      <a href={inst.external_link} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>{inst.external_link}</a>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {inst.license === 'Y' ? (
                      <span style={{ color: '#059669', fontWeight: 600 }}>Y</span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Side Panel Overlay */}
      <div className={`panel-overlay ${isPanelOpen ? 'active' : ''}`} onClick={() => !creating && setIsPanelOpen(false)}></div>

      {/* Add Instance Side Panel */}
      <div className={`side-panel ${isPanelOpen ? 'active' : ''}`}>
        <div className="panel-header">
          <h2>Add Instance</h2>
          <button className="close-btn" onClick={() => !creating && setIsPanelOpen(false)}>
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
              <label className="form-label">Address</label>
              <input className="form-input" type="text" placeholder="e.g. 192.168.1.1:3306" value={newInstance.address} onChange={e => setNewInstance({ ...newInstance, address: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">External Link (optional)</label>
              <input className="form-input" type="url" placeholder="https://..." value={newInstance.external_link} onChange={e => setNewInstance({ ...newInstance, external_link: e.target.value })} />
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
          </form>
        </div>
        <div className="panel-footer">
          <button className="btn-ghost" onClick={() => !creating && setIsPanelOpen(false)} disabled={creating}>Cancel</button>
          <button type="submit" form="add-instance-form" className="submit-btn" style={{ width: 'auto', marginTop: 0 }} disabled={creating}>
            {creating ? 'Adding...' : 'Add Instance'}
          </button>
        </div>
      </div>
    </>
  );
}
