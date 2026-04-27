'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '../context';

export default function ProjectsPage() {
  const router = useRouter();
  const { user, projects, loadingProjects: loading, refreshProjects: fetchProjects } = useDashboard();
  const [error, setError] = useState('');
  
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', key: '' });
  const [editingProject, setEditingProject] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project? This will unassign all databases and remove all members.')) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProjects();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete project');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProject.id,
          name: editingProject.name,
          project_key: editingProject.project_key
        })
      });
      
      if (res.ok) {
        setIsEditOpen(false);
        fetchProjects();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update project');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setCreating(false);
    }
  };

  const isDBA = user?.role === 'DBA';

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Project Management</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Manage your database projects and VCS integrations.</p>
        </div>
        {isDBA && (
          <button className="submit-btn" style={{ width: 'auto', marginTop: 0 }} onClick={() => setIsPanelOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}><line x1="12" y1="5" x2="12" y1="19"></line><line x1="5" y1="12" x2="19" y1="12"></line></svg>
            New Project
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading projects...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="instance-card">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#4b5563' }}>Name</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#4b5563' }}>Key</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#4b5563' }}>Creator</th>
                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#4b5563' }}>Updated At</th>
                {isDBA && <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem', color: '#4b5563', textAlign: 'right' }}>Actions</th>}
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
                  {isDBA && (
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(project);
                            setIsEditOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}
                          onClick={(e) => handleDeleteProject(project.id, e)}
                          disabled={deletingId === project.id}
                        >
                          {deletingId === project.id ? '...' : 'Remove'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Project Side Panel */}
      <div className={`panel-overlay ${isPanelOpen ? 'active' : ''}`} onClick={() => !creating && setIsPanelOpen(false)}></div>
      <div className={`side-panel ${isPanelOpen ? 'active' : ''}`}>
        <div className="panel-header">
          <h2>Create New Project</h2>
          <button className="close-btn" onClick={() => !creating && setIsPanelOpen(false)}>✕</button>
        </div>
        <div className="panel-body">
          <form id="new-project-form" onSubmit={handleCreateProject}>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input type="text" className="form-input" value={newProject.name} onChange={(e) => setNewProject({...newProject, name: e.target.value})} required/>
            </div>
            <div className="form-group">
              <label className="form-label">Project Key</label>
              <input type="text" className="form-input" style={{ textTransform: 'uppercase' }} value={newProject.key} onChange={(e) => setNewProject({...newProject, key: e.target.value.toUpperCase()})} required/>
            </div>
          </form>
        </div>
        <div className="panel-footer">
          <button className="btn-ghost" onClick={() => setIsPanelOpen(false)}>Cancel</button>
          <button type="submit" form="new-project-form" className="submit-btn" style={{ width: 'auto', marginTop: 0 }} disabled={creating}>
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>

      {/* Edit Project Side Panel */}
      <div className={`panel-overlay ${isEditOpen ? 'active' : ''}`} onClick={() => !creating && setIsEditOpen(false)}></div>
      <div className={`side-panel ${isEditOpen ? 'active' : ''}`}>
        <div className="panel-header">
          <h2>Edit Project</h2>
          <button className="close-btn" onClick={() => !creating && setIsEditOpen(false)}>✕</button>
        </div>
        <div className="panel-body">
          {editingProject && (
            <form id="edit-project-form" onSubmit={handleEditProject}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input type="text" className="form-input" value={editingProject.name} onChange={(e) => setEditingProject({...editingProject, name: e.target.value})} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Project Key</label>
                <input type="text" className="form-input" style={{ textTransform: 'uppercase' }} value={editingProject.project_key} onChange={(e) => setEditingProject({...editingProject, project_key: e.target.value.toUpperCase()})} required/>
              </div>
            </form>
          )}
        </div>
        <div className="panel-footer">
          <button className="btn-ghost" onClick={() => setIsEditOpen(false)}>Cancel</button>
          <button type="submit" form="edit-project-form" className="submit-btn" style={{ width: 'auto', marginTop: 0 }} disabled={creating}>
            {creating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
}
