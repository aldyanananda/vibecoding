'use client';

import { useState, useEffect } from 'react';
import EngineIcon from '@/app/components/EngineIcon';

export default function RolesManagementPage() {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [allDbs, setAllDbs] = useState(true);
  const [selectedDbIds, setSelectedDbIds] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, uRes, pRes] = await Promise.all([
        fetch('/api/iam/roles'),
        fetch('/api/iam/users'),
        fetch('/api/projects')
      ]);
      if (mRes.ok) setMemberships(await mRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (pRes.ok) setProjects(await pRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetch(`/api/databases?projectId=${selectedProjectId}`)
        .then(res => res.json())
        .then(setDatabases);
    } else {
      setDatabases([]);
    }
  }, [selectedProjectId]);

  const handleSaveRole = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/iam/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          project_id: selectedProjectId,
          all_databases: allDbs,
          database_ids: selectedDbIds
        })
      });
      if (res.ok) {
        setIsPanelOpen(false);
        fetchData();
        // Reset
        setSelectedUserId('');
        setSelectedProjectId('');
        setAllDbs(true);
        setSelectedDbIds([]);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save role');
      }
    } catch (err) {
      alert('Error saving role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMembership = async (userId, projectId) => {
    if (!confirm('Are you sure you want to revoke this user\'s access to the project?')) return;
    try {
      const res = await fetch('/api/iam/roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, project_id: projectId })
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert('Error removing access');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Roles & Permission Mapping</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Centralized management of user-to-project access.</p>
        </div>
        <button className="submit-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => { setIsEditing(false); setIsPanelOpen(true); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" /></svg>
          Grant New Access
        </button>
      </div>

      <div className="instance-card" style={{ background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Loading permissions...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>User</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>Project</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>Database Access</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {memberships.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No direct project assignments found.</td>
                </tr>
              ) : (
                memberships.map((m, idx) => (
                  <tr key={`${m.user_id}-${m.project_id}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '500' }}>{m.username}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--brand-color)' }}>{m.project_name}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {m.all_databases ? (
                        <span style={{ color: '#059669', fontSize: '0.8125rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          All Databases
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {m.databases?.length > 0 ? (
                            m.databases.map(db => (
                              <div key={db.id} style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <EngineIcon engine={db.engine} size={12} />
                                <span>{db.name}</span>
                              </div>
                            ))
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>No databases selected</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => {
                            setSelectedUserId(m.user_id);
                            setSelectedProjectId(m.project_id);
                            setAllDbs(!!m.all_databases);
                            setSelectedDbIds(m.databases.map(d => d.id));
                            setIsEditing(true);
                            setIsPanelOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}
                          onClick={() => handleDeleteMembership(m.user_id, m.project_id)}
                        >
                          Drop
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {isPanelOpen && (
        <>
          <div className="panel-overlay active" onClick={() => !submitting && setIsPanelOpen(false)}></div>
          <div className="side-panel active">
            <div className="panel-header">
              <h2>{isEditing ? 'Edit Access' : 'Grant Access'}</h2>
              <button className="close-btn" onClick={() => setIsPanelOpen(false)}>✕</button>
            </div>
            <div className="panel-body">
              <form id="save-role-form" onSubmit={handleSaveRole}>
                <div className="form-group">
                  <label className="form-label">Select User</label>
                  <select 
                    className="form-input" 
                    value={selectedUserId} 
                    onChange={e => setSelectedUserId(e.target.value)} 
                    disabled={isEditing}
                    required
                  >
                    <option value="">Choose a user...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Select Project</label>
                  <select 
                    className="form-input" 
                    value={selectedProjectId} 
                    onChange={e => setSelectedProjectId(e.target.value)} 
                    disabled={isEditing}
                    required
                  >
                    <option value="">Choose a project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600, marginBottom: '1rem' }}>
                    <input type="checkbox" checked={allDbs} onChange={e => setAllDbs(e.target.checked)} />
                    Grant access to all databases in this project
                  </label>
                  
                  {!allDbs && (
                    <div style={{ paddingLeft: '1.75rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>Select individual databases:</p>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {databases.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No databases found in this project.</div>
                        ) : (
                          databases.map(db => (
                            <label key={db.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px' }} className="hover-bg">
                              <input 
                                type="checkbox" 
                                checked={selectedDbIds.includes(db.id)} 
                                onChange={() => {
                                  setSelectedDbIds(prev => prev.includes(db.id) ? prev.filter(id => id !== db.id) : [...prev, db.id])
                                }}
                              />
                              <EngineIcon engine={db.engine} size={14} />
                              <span style={{ fontWeight: '500' }}>{db.name}</span>
                              <span style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'capitalize' }}>({db.engine})</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className="panel-footer">
              <button className="btn-ghost" onClick={() => setIsPanelOpen(false)} disabled={submitting}>Cancel</button>
              <button type="submit" form="save-role-form" className="submit-btn" style={{ width: 'auto', marginTop: 0 }} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
