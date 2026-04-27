'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EngineIcon from '@/app/components/EngineIcon';

export default function DatabaseDetailsPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [db, setDb] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [filter, setFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const dbRes = await fetch(`/api/databases/${id}`);
      const dbData = await dbRes.json();
      setDb(dbData);

      const tableRes = await fetch(`/api/databases/${id}/tables`);
      const tableData = await tableRes.json();
      setMeta(tableData.metadata);
      setTables(tableData.tables);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

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

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/databases/sync', { method: 'POST' });
      await fetchData();
    } catch (err) {
      alert('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading database details...</div>;
  if (!db) return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Database not found</div>;

  const breadcrumbs = [
    { label: 'instances', href: '/dashboard/instances' },
    { label: db.instance_name, href: '/dashboard/instances' },
    { label: 'databases', href: '#' },
    { label: db.name, href: '#' }
  ];

  const filteredTables = (tables || []).filter(t => 
    t && t.name && (
      t.name.toLowerCase().includes(filter.toLowerCase()) || 
      (t.schema && t.schema.toLowerCase().includes(filter.toLowerCase()))
    )
  );

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      {/* 1. Header Section */}
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.85rem' }}>
              {breadcrumbs.map((b, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Link href={b.href} style={{ textDecoration: 'none', color: i === breadcrumbs.length - 1 ? '#111827' : '#6b7280' }}>{b.label}</Link>
                  {i < breadcrumbs.length - 1 && <span>/</span>}
                </span>
              ))}
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>{db.name}</h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#6b7280' }}>Environment - <span style={{ color: '#4f46e5', fontWeight: 500 }}>{db.environment}</span></span>
              <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Instance - <EngineIcon engine={db.engine} size={14} /><span style={{ color: '#4f46e5', fontWeight: 500 }}>{db.instance_name}</span>
              </span>
              <span style={{ color: '#6b7280' }}>Project - <span style={{ color: '#4f46e5', fontWeight: 500 }}>{db.project_name}</span></span>
              
              <button 
                onClick={() => router.push(`/dashboard/sqleditor?dbId=${id}`)}
                style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                SQL Editor
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isDBA && (
              <>
                <button onClick={handleSync} disabled={syncing} style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: '#fff', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>
                  {syncing ? 'Syncing...' : 'Sync database'}
                </button>
                <button style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: '#fff', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>Transfer Project</button>
                <button style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: '#fff', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>Change Data</button>
                <button style={{ padding: '0.5rem 1rem', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#111827', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>Edit Schema</button>
              </>
            )}
          </div>
        </div>

        {/* 2. Tabs */}
        <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
          {['Overview', 'Changelog', 'Revision', 'Slow queries', 'Catalog', 'Settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 0',
                border: 'none',
                background: 'none',
                fontSize: '0.875rem',
                fontWeight: activeTab === tab ? '600' : '400',
                color: activeTab === tab ? '#4f46e5' : '#6b7280',
                borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
                cursor: tab === 'Overview' || tab === 'Changelog' ? 'pointer' : 'default',
                opacity: tab === 'Overview' || tab === 'Changelog' ? 1 : 0.4
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Content Area */}
      <div style={{ padding: '2rem' }}>
        {activeTab === 'Overview' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontSize: '0.875rem', marginBottom: '2rem', fontWeight: 500 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              No anomalies detected
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem 4rem', maxWidth: '800px', marginBottom: '3rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Encoding</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#111827' }}>{meta?.encoding || 'UTF8'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Collation</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#111827' }}>{meta?.collation || 'en_US.UTF-8'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Sync status</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#111827' }}>OK</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Last successful sync</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#111827' }}>Today</div>
              </div>
            </div>

            {db.engine?.toLowerCase().includes('postgres') && (
               <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.5rem' }}>Schema</div>
                  <select style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #e5e7eb', width: '200px', fontSize: '0.875rem' }}>
                    <option>public</option>
                  </select>
               </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Tables</h2>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input 
                  type="text" 
                  placeholder="Filter by name" 
                  style={{ padding: '0.5rem 1rem 0.5rem 2.25rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.875rem', width: '260px' }}
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
              </div>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563' }}>Schema</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563' }}>Name</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563' }}>Classification</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563' }}>Partitioned</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563' }}>Row count est.</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563' }}>Data size</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563' }}>Index size</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTables.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No tables found.</td></tr>
                  ) : (
                    filteredTables.map(table => (
                      <tr key={table.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '1rem', color: '#6b7280' }}>{table.schema || db.name}</td>
                        <td style={{ padding: '1rem', fontWeight: 500, color: '#111827' }}>{table.name}</td>
                        <td style={{ padding: '1rem', color: '#9ca3af' }}>N/A <span style={{fontSize: '0.75rem'}}>✎</span></td>
                        <td style={{ padding: '1rem', color: '#6b7280' }}>{table.partitioned}</td>
                        <td style={{ padding: '1rem', color: '#111827' }}>{table.rowCount.toLocaleString()}</td>
                        <td style={{ padding: '1rem', color: '#111827' }}>{table.dataSize}</td>
                        <td style={{ padding: '1rem', color: '#111827' }}>{table.indexSize}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No changelogs yet</div>
            <div style={{ fontSize: '0.875rem' }}>Database changes will appear here once tracked.</div>
          </div>
        )}
      </div>
    </div>
  );
}
