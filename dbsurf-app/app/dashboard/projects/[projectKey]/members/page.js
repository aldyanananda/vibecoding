'use client';

import { useState, useEffect, use } from 'react';
import { useDashboard } from '../../../context';
import EngineIcon from '@/app/components/EngineIcon';

export default function ProjectMembersPage({ params }) {
  const resolvedParams = use(params);
  const { projectKey } = resolvedParams;
  const { user: currentUser } = useDashboard();
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [projectDatabases, setProjectDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [grantData, setGrantData] = useState({ userId: '', allDatabases: true, databaseIds: [] });
  const [editingMember, setEditingMember] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Resolve Project ID from Key
      const pRes = await fetch(`/api/projects`);
      if (!pRes.ok) throw new Error('Failed to fetch projects');
      const projects = await pRes.json();
      const currentProject = projects.find(p => p.project_key === projectKey);
      
      if (!currentProject) throw new Error('Project not found');
      const projectId = currentProject.id;

      // 2. Fetch Members, Users, and Project Databases
      const [membersRes, usersRes, dbRes] = await Promise.all([
        fetch(`/api/iam/project-members?projectKey=${projectKey}`),
        fetch('/api/iam/users'),
        fetch(`/api/databases?projectId=${projectId}`)
      ]);
      
      if (!membersRes.ok) throw new Error(`Members API failed: ${membersRes.statusText}`);
      if (!usersRes.ok) throw new Error(`Users API failed: ${usersRes.statusText}`);
      if (!dbRes.ok) throw new Error(`Databases API failed: ${dbRes.statusText}`);
      
      setMembers(await membersRes.json());
      setAllUsers(await usersRes.json());
      setProjectDatabases(await dbRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectKey) fetchData();
  }, [projectKey]);

  const handleGrant = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/iam/project-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectKey, 
          userId: grantData.userId, 
          allDatabases: grantData.allDatabases,
          databaseIds: grantData.databaseIds 
        })
      });
      if (res.ok) {
        setIsGrantOpen(false);
        setGrantData({ userId: '', allDatabases: true, databaseIds: [] });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to grant access');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/iam/project-members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectKey, 
          userId: editingMember.id, 
          allDatabases: editingMember.all_databases,
          databaseIds: editingMember.databaseIds 
        })
      });
      if (res.ok) {
        setIsEditOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user from the project?')) return;
    try {
      const res = await fetch(`/api/iam/project-members?projectKey=${projectKey}&userId=${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchData();
      else alert('Failed to remove member');
    } catch (err) {
      alert('Network error');
    }
  };

  if (!currentUser || currentUser.role !== 'DBA') {
    return <div style={{ padding: '2rem', color: '#ef4444' }}>Forbidden: Only DBAs can manage project members.</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Project Members</h2>
          <p style={{ color: '#6b7280' }}>Managing access for project <code style={{ background: '#f3f4f6', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{projectKey}</code></p>
        </div>
        <button className="submit-btn" style={{ width: 'auto' }} onClick={() => setIsGrantOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" /></svg>
          Grant New User
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading members...</div>
      ) : error ? (
        <div style={{ padding: '2rem', background: '#fef2f2', color: '#991b1b', borderRadius: '8px' }}>{error}</div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>User</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>Role</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>Database Access</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No members found for this project.</td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#6366f1' }}>
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '500' }}>{member.username}</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{member.email || 'No email provided'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', background: member.role === 'DBA' ? '#e0f2fe' : '#f3f4f6', color: member.role === 'DBA' ? '#0369a1' : '#374151' }}>
                        {member.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      {member.all_databases ? (
                        <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          All Databases
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {member.databases?.length > 0 ? (
                            member.databases.map(db => (
                              <div key={db.id} style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <EngineIcon engine={db.engine} size={12} />
                                <span>{db.name}</span>
                              </div>
                            ))
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>No access granted</span>
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
                            setEditingMember({
                              ...member,
                              databaseIds: member.databases?.map(d => d.id) || []
                            });
                            setIsEditOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}
                          onClick={() => handleDrop(member.id)}
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
        </div>
      )}

      {/* Grant Access Panel */}
      <div className={`panel-overlay ${isGrantOpen ? 'active' : ''}`} onClick={() => !submitting && setIsGrantOpen(false)}></div>
      <div className={`side-panel ${isGrantOpen ? 'active' : ''}`}>
        <div className="panel-header">
          <h2>Grant Project Access</h2>
          <button className="close-btn" onClick={() => setIsGrantOpen(false)}>✕</button>
        </div>
        <div className="panel-body">
          <form id="grant-form" onSubmit={handleGrant}>
            <div className="form-group">
              <label className="form-label">Select User</label>
              <select 
                className="form-input" 
                value={grantData.userId} 
                onChange={(e) => setGrantData({...grantData, userId: e.target.value})}
                required
              >
                <option value="">Choose a user...</option>
                {allUsers.filter(u => !members.find(m => m.id === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
              <input 
                type="checkbox" 
                id="all_db"
                checked={grantData.allDatabases} 
                onChange={(e) => setGrantData({...grantData, allDatabases: e.target.checked})}
              />
              <label htmlFor="all_db" className="form-label" style={{ marginBottom: 0 }}>Grant access to all databases</label>
            </div>

            {!grantData.allDatabases && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem' }}>Select Individual Databases:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {projectDatabases.map(db => (
                    <label key={db.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', transition: 'background 0.2s' }} className="hover-bg">
                      <input 
                        type="checkbox" 
                        checked={grantData.databaseIds.includes(db.id)}
                        onChange={(e) => {
                          const ids = e.target.checked 
                            ? [...grantData.databaseIds, db.id]
                            : grantData.databaseIds.filter(id => id !== db.id);
                          setGrantData({...grantData, databaseIds: ids});
                        }}
                      />
                      <EngineIcon engine={db.engine} size={16} />
                      <span style={{ fontWeight: '500' }}>{db.name}</span>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'capitalize' }}>({db.engine})</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: 'auto' }}>{db.instance_name}</span>
                    </label>
                  ))}
                  {projectDatabases.length === 0 && <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No databases found in this project.</p>}
                </div>
              </div>
            )}
          </form>
        </div>
        <div className="panel-footer">
          <button className="btn-ghost" onClick={() => setIsGrantOpen(false)}>Cancel</button>
          <button type="submit" form="grant-form" className="submit-btn" style={{ width: 'auto', marginTop: 0 }} disabled={submitting}>
            {submitting ? 'Granting...' : 'Grant Access'}
          </button>
        </div>
      </div>

      {/* Edit Access Panel */}
      <div className={`panel-overlay ${isEditOpen ? 'active' : ''}`} onClick={() => !submitting && setIsEditOpen(false)}></div>
      <div className={`side-panel ${isEditOpen ? 'active' : ''}`}>
        <div className="panel-header">
          <h2>Edit Member Access</h2>
          <button className="close-btn" onClick={() => setIsEditOpen(false)}>✕</button>
        </div>
        <div className="panel-body">
          {editingMember && (
            <form id="edit-member-form" onSubmit={handleEdit}>
              <div className="form-group">
                <label className="form-label">User</label>
                <input type="text" className="form-input" value={editingMember.username} disabled />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                <input 
                  type="checkbox" 
                  id="edit_all_db"
                  checked={editingMember.all_databases} 
                  onChange={(e) => setEditingMember({...editingMember, all_databases: e.target.checked})}
                />
                <label htmlFor="edit_all_db" className="form-label" style={{ marginBottom: 0 }}>Grant access to all databases</label>
              </div>

              {!editingMember.all_databases && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem' }}>Select Individual Databases:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {projectDatabases.map(db => (
                      <label key={db.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px' }} className="hover-bg">
                        <input 
                          type="checkbox" 
                          checked={editingMember.databaseIds?.includes(db.id)}
                          onChange={(e) => {
                            const ids = e.target.checked 
                              ? [...(editingMember.databaseIds || []), db.id]
                              : (editingMember.databaseIds || []).filter(id => id !== db.id);
                            setEditingMember({...editingMember, databaseIds: ids});
                          }}
                        />
                        <EngineIcon engine={db.engine} size={16} />
                        <span style={{ fontWeight: '500' }}>{db.name}</span>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'capitalize' }}>({db.engine})</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: 'auto' }}>{db.instance_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
        <div className="panel-footer">
          <button className="btn-ghost" onClick={() => setIsEditOpen(false)}>Cancel</button>
          <button type="submit" form="edit-member-form" className="submit-btn" style={{ width: 'auto', marginTop: 0 }} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
