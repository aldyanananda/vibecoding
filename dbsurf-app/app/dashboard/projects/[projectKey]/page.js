'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import EngineIcon from '@/app/components/EngineIcon';

export default function ProjectDatabasesPage() {
  const { projectKey } = useParams();
  const [project, setProject] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Transfer Panel State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferSource, setTransferSource] = useState('unassigned'); // 'unassigned' or 'others'
  const [availableDatabases, setAvailableDatabases] = useState([]);
  const [selectedDbIds, setSelectedDbIds] = useState([]);
  const [transferring, setTransferring] = useState(false);

  const fetchProjectData = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      const found = data.find(p => p.project_key === projectKey);
      if (found) {
        setProject(found);
        fetchProjectDatabases(found.id);
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
    }
  };

  const fetchProjectDatabases = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/databases?projectId=${id}`);
      const data = await res.json();
      setDatabases(data);
    } catch (err) {
      console.error('Failed to fetch databases:', err);
    } finally {
      setLoading(false);
    }
  };

  const [syncing, setSyncing] = useState(false);

  const fetchAvailableDatabases = async () => {
    if (!project) return;
    setSyncing(true);
    try {
      // 1. Trigger fresh discovery sync from instances
      await fetch('/api/databases/sync', { method: 'POST' });

      // 2. Fetch the newly synced list
      const url = transferSource === 'unassigned' 
        ? '/api/databases?unassigned=true'
        : `/api/databases?projectId=${project.id}&includeOthers=true`;
      const res = await fetch(url);
      const data = await res.json();
      setAvailableDatabases(data);
    } catch (err) {
      console.error('Failed to fetch available databases:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectKey]);

  useEffect(() => {
    if (isTransferOpen) fetchAvailableDatabases();
  }, [isTransferOpen, transferSource]);

  const handleTransfer = async () => {
    if (selectedDbIds.length === 0) return;
    setTransferring(true);
    try {
      const res = await fetch('/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseIds: selectedDbIds,
          projectId: project.id
        })
      });
      if (res.ok) {
        setIsTransferOpen(false);
        setSelectedDbIds([]);
        fetchProjectDatabases(project.id);
      }
    } catch (err) {
      alert('Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const toggleDbSelection = (id) => {
    setSelectedDbIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) setUser(await res.json());
      } catch { }
    };
    fetchUser();
  }, []);

  const isDBA = user?.role === 'DBA';

  return (
    <div>
      {/* Filter and Action Bar */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1 }}>
           <input type="text" className="filter-input" placeholder="Filter database" style={{ paddingLeft: '2.5rem' }} />
           <svg style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>
        
        <select className="filter-input" style={{ width: '200px' }}>
          <option>Filter by label</option>
        </select>

        {isDBA && (
          <button className="submit-btn" style={{ width: 'auto', marginTop: 0, backgroundColor: '#4f46e5' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}><line x1="12" y1="5" x2="12" y1="19"></line><line x1="5" y1="12" x2="19" y1="12"></line></svg>
            New DB
          </button>
        )}
      </div>

      {/* Batch Action Bar */}
      <div className="batch-actions">
        <div style={{ borderRight: '1px solid #bfdbfe', paddingRight: '1rem', fontWeight: '500' }}>{databases.length} databases</div>
        <div className="action-link">Sync</div>
        {isDBA && (
          <div className="action-link" style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={() => setIsTransferOpen(true)}>
             Transfer in DB
          </div>
        )}
      </div>

      {/* Databases Table */}
      <div className="instance-card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading databases...</div>
        ) : databases.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af' }}> No databases assigned to this project yet. Use "Transfer in DB" to add them. </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '1rem', width: '40px' }}><input type="checkbox" disabled /></th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563' }}>Name</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563' }}>Engine</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563' }}>Environment</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563' }}>Instance</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563' }}>Address</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {databases.map((db) => (
                <tr key={db.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}><input type="checkbox" disabled /></td>
                  <td style={{ padding: '1rem' }}>
                    <Link 
                      href={`/dashboard/databases/${db.id}`} 
                      style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}
                      className="db-link-hover"
                    >
                      {db.name}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <EngineIcon engine={db.engine} size={16} />
                      <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{db.engine}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{db.environment}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {db.instance_name}
                  </td>
                  <td style={{ padding: '1rem', color: '#6b7280' }}>{db.address}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <Link 
                      href={`/dashboard/sqleditor?dbId=${db.id}`}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                      SQL EDITOR
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Transfer Modal (Centered Popup) */}
      <div className={`panel-overlay ${isTransferOpen ? 'active' : ''}`} onClick={() => setIsTransferOpen(false)}></div>
      <div 
        className={`side-panel ${isTransferOpen ? 'active' : ''}`} 
        style={{ 
          width: '800px', 
          height: 'auto', 
          maxHeight: '90vh', 
          top: '50%', 
          left: '50%', 
          right: 'auto',
          transform: isTransferOpen ? 'translate(-50%, -50%)' : 'translate(-50%, -60%)',
          borderRadius: '12px',
          opacity: isTransferOpen ? 1 : 0,
          visibility: isTransferOpen ? 'visible' : 'hidden'
        }}
      >
        <div className="panel-header" style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Transfer in database</h2>
            <p style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: '400', marginTop: '4px' }}>
               Newly synced databases start unassigned and must be moved to a project for use.
            </p>
          </div>
          <button className="close-btn" onClick={() => setIsTransferOpen(false)}>✕</button>
        </div>
        
        <div className="panel-body" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>
              <input type="radio" checked={transferSource === 'others'} onChange={() => setTransferSource('others')} />
              From other projects
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>
              <input type="radio" checked={transferSource === 'unassigned'} onChange={() => setTransferSource('unassigned')} />
              Unassigned databases
            </label>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
               <select className="filter-input" style={{ width: '150px', fontSize: '0.75rem' }} disabled><option>Select environment...</option></select>
               <select className="filter-input" style={{ width: '150px', fontSize: '0.75rem' }} disabled><option>Select instance...</option></select>
            </div>
          </div>

          <div className="instance-card" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 1, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' }}>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', width: '40px' }}></th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Engine</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Environment</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Instance</th>
                </tr>
              </thead>
              <tbody>
                {syncing ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '20px', height: '20px', border: '2px solid #f3f4f6', borderTop: '2px solid #818cf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        Syncing instances and discovering databases...
                      </div>
                    </td>
                  </tr>
                ) : availableDatabases.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No databases found for this source.</td>
                  </tr>
                ) : (
                  availableDatabases.map(db => (
                    <tr key={db.id} style={{ borderBottom: '1px solid #f3f4f6' }} className="hover-row">
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedDbIds.includes(db.id)} onChange={() => toggleDbSelection(db.id)} />
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <Link 
                          href={`/dashboard/databases/${db.id}`}
                          style={{ fontWeight: 600, color: '#4f46e5', fontSize: '0.875rem', textDecoration: 'none' }}
                          className="db-link-hover"
                        >
                          {db.name}
                        </Link>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <EngineIcon engine={db.engine} size={14} />
                          <span style={{ textTransform: 'capitalize' }}>{db.engine}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ backgroundColor: '#f3f4f6', color: '#4b5563', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>{db.environment}</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 500, color: '#4f46e5' }}>{db.instance_name}</span>
                          {db.project_name && <span style={{fontSize: '0.7rem', color: '#9ca3af', marginLeft: '4px'}}>(assigned to {db.project_name})</span>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel-footer" style={{ borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', backgroundColor: '#fafafa' }}>
          <span style={{ marginRight: 'auto', fontSize: '0.875rem', color: '#6b7280' }}>
            {selectedDbIds.length} databases selected
          </span>
          <button className="btn-ghost" onClick={() => setIsTransferOpen(false)} style={{ borderRadius: '6px' }}>Cancel</button>
          <button 
            className="submit-btn" 
            style={{ width: 'auto', marginTop: 0, borderRadius: '6px', backgroundColor: '#818cf8' }} 
            onClick={handleTransfer}
            disabled={transferring || selectedDbIds.length === 0}
          >
            {transferring ? 'Transferring...' : 'Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}
