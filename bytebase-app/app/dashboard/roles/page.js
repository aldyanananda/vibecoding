'use client';

import { useState, useEffect } from 'react';

export default function RolesManagementPage() {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [databases, setDatabases] = useState([]);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [allDbs, setAllDbs] = useState(true);
  const [selectedDbIds, setSelectedDbIds] = useState([]);

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
        setShowAddModal(false);
        fetchData();
      } else {
        alert('Failed to save role');
      }
    } catch (err) {
      alert('Error saving role');
    }
  };

  const handleDeleteMembership = async (userId, projectId) => {
    if (!confirm('Remove this access?')) return;
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Roles & Permission Mapping</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Map users to projects and control which databases they can access.</p>
        </div>
        <button className="submit-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => setShowAddModal(true)}>
          Assign Access
        </button>
      </div>

      <div className="instance-card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading permissions...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '0.75rem 1rem' }}>User</th>
                <th style={{ padding: '0.75rem 1rem' }}>Project</th>
                <th style={{ padding: '0.75rem 1rem' }}>Database Access</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((m, idx) => (
                <tr key={`${m.user_id}-${m.project_id}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: '600' }}>{m.username}</td>
                  <td style={{ padding: '1rem' }}>{m.project_name}</td>
                  <td style={{ padding: '1rem' }}>
                    {m.all_databases ? (
                      <span style={{ color: '#059669', fontWeight: '500' }}>All Databases</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {m.databases.map(db => (
                          <span key={db.id} style={{ backgroundColor: '#f1f5f9', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.7rem' }}>{db.name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => {
                        setSelectedUserId(m.user_id);
                        setSelectedProjectId(m.project_id);
                        setAllDbs(!!m.all_databases);
                        setSelectedDbIds(m.databases.map(d => d.id));
                        setShowAddModal(true);
                      }}
                      style={{ color: '#4f46e5', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem', marginRight: '1rem' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteMembership(m.user_id, m.project_id)}
                      style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="panel-overlay active" onClick={() => setShowAddModal(false)}>
          <div className="side-panel active" style={{ width: '500px', height: 'auto', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>Assign Project Access</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveRole} className="panel-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>Select User</label>
                <select className="filter-input" style={{ width: '100%' }} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} required>
                  <option value="">Choose a user...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>Select Project</label>
                <select className="filter-input" style={{ width: '100%' }} value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} required>
                  <option value="">Choose a project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600, marginBottom: '1rem' }}>
                  <input type="checkbox" checked={allDbs} onChange={e => setAllDbs(e.target.checked)} />
                  Grant access to all databases in this project
                </label>
                
                {!allDbs && (
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>Select individual databases:</p>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {databases.map(db => (
                        <label key={db.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedDbIds.includes(db.id)} 
                            onChange={() => {
                              setSelectedDbIds(prev => prev.includes(db.id) ? prev.filter(id => id !== db.id) : [...prev, db.id])
                            }}
                          />
                          {db.name} ({db.instance_name})
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="submit-btn" style={{ width: '100%', marginTop: '0.5rem' }}>Save Permissions</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
