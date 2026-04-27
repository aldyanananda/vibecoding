'use client';

import { useState, useEffect } from 'react';

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Developer');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/iam/users');
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/iam/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: newUserName, 
          email: newUserEmail, 
          password: newUserPassword, 
          role: newUserRole 
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to add user');
      }
    } catch (err) {
      alert('Error adding user');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch('/api/iam/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchUsers();
      else alert('Failed to delete user');
    } catch (err) {
      alert('Error deleting user');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Users</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Add or remove users and manage their high-level roles.</p>
        </div>
        <button className="submit-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => setShowAddModal(true)}>
          Add User
        </button>
      </div>

      <div className="instance-card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Username</th>
                <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                <th style={{ padding: '0.75rem 1rem' }}>Created At</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontWeight: '600' }}>{u.username}</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem',
                      backgroundColor: u.role === 'DBA' ? '#fee2e2' : '#f1f5f9',
                      color: u.role === 'DBA' ? '#991b1b' : '#334155'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#94a3b8' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Remove
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
          <div className="side-panel active" style={{ width: '400px', height: 'auto', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>Add New User</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser} className="panel-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>Username</label>
                <input className="filter-input" style={{ width: '100%' }} value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>Email</label>
                <input type="email" className="filter-input" style={{ width: '100%' }} value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>Password</label>
                <input type="password" className="filter-input" style={{ width: '100%' }} value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>Role</label>
                <select className="filter-input" style={{ width: '100%' }} value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                  <option value="Developer">Developer</option>
                  <option value="DBA">DBA</option>
                </select>
              </div>
              <button type="submit" className="submit-btn" style={{ width: '100%', marginTop: '1rem' }}>Create User</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
