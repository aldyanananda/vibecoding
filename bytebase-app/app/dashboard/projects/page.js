'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    key: ''
  });
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      setIsPanelOpen(false);
      setNewProject({ name: '', key: '' });
      fetchProjects();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Project Management</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Manage your database projects and VCS integrations.</p>
        </div>
        <button className="submit-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => setIsPanelOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}><line x1="12" y1="5" x2="12" y1="19"></line><line x1="5" y1="12" x2="19" y1="12"></line></svg>
          New Project
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading projects...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="instance-card">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            {/* ... table content remains same ... */}
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#4b5563' }}>Name</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#4b5563' }}>Key</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#4b5563' }}>Creator</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#4b5563' }}>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr 
                  key={project.id} 
                  onClick={() => router.push(`/dashboard/projects/${project.project_key}`)}
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.1s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{project.name}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <code style={{ background: '#f3f4f6', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{project.project_key}</code>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{project.creator_name || 'byteuser'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    {new Date(project.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Side Panel Overlay */}
      <div className={`panel-overlay ${isPanelOpen ? 'active' : ''}`} onClick={() => !creating && setIsPanelOpen(false)}></div>

      {/* New Project Side Panel */}
      <div className={`side-panel ${isPanelOpen ? 'active' : ''}`}>
        <div className="panel-header">
          <h2>Create New Project</h2>
          <button className="close-btn" onClick={() => !creating && setIsPanelOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y1="18"></line><line x1="6" y1="6" x2="18" y1="18"></line></svg>
          </button>
        </div>
        
        <div className="panel-body">
          <form id="new-project-form" onSubmit={handleCreateProject}>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Marketing Site"
                value={newProject.name}
                onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Project Key (Unique)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. MKT"
                style={{ textTransform: 'uppercase' }}
                value={newProject.key}
                onChange={(e) => setNewProject({...newProject, key: e.target.value.toUpperCase()})}
                required
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Used as a unique identifier for your project.</p>
            </div>
          </form>
        </div>

        <div className="panel-footer">
          <button className="btn-ghost" onClick={() => !creating && setIsPanelOpen(false)} disabled={creating}>Cancel</button>
          <button type="submit" form="new-project-form" className="submit-btn" style={{ width: 'auto', marginTop: 0 }} disabled={creating}>
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </>
  );
}
