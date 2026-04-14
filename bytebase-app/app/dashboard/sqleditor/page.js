'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Editor from '@monaco-editor/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import EngineIcon from '@/app/components/EngineIcon';

function SQLEditorContent() {
  const searchParams = useSearchParams();
  const dbId = searchParams.get('dbId');
  
  const [metadata, setMetadata] = useState(null); // Changed to object: { instance, database, tables }
  const [selectedDbId, setSelectedDbId] = useState(dbId || null);
  const [currentDbInfo, setCurrentDbInfo] = useState(null);
  
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');
  const [results, setResults] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executionStats, setExecutionStats] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({ 'root': true, 'db': true }); // Multi-level toggle
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLimit, setSelectedLimit] = useState(1000);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState('schema'); 
  const [currentUser, setCurrentUser] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState('');

  const [editorHeightPercent, setEditorHeightPercent] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const url = selectedDbId ? `/api/sql/metadata?dbId=${selectedDbId}` : '/api/sql/metadata';
        const res = await fetch(url);
        const data = await res.json();
        setMetadata(data);
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
      }
    };

    const fetchCurrentDb = async () => {
      if (!selectedDbId) return;
      try {
        const res = await fetch(`/api/databases/${selectedDbId}`);
        const data = await res.json();
        setCurrentDbInfo(data);
        setQuery(`-- Connected to ${data.name} on ${data.instance_name}\nSELECT * FROM ... LIMIT 10;`);
      } catch {}
    };

    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) setCurrentUser(await res.json());
      } catch {}
    };

    fetchMetadata();
    fetchCurrentDb();
    fetchUser();
  }, [selectedDbId]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const relativeY = e.clientY - containerRect.top;
      const newHeightPercent = (relativeY / containerRect.height) * 100;
      if (newHeightPercent > 20 && newHeightPercent < 80) {
        setEditorHeightPercent(newHeightPercent);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
    };
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleRunQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setExecutionStats(null);
    let finalQuery = query;
    if (query.toLowerCase().includes('select') && !query.toLowerCase().includes('limit')) {
      finalQuery = `${query.trim().replace(/;$/, '')} LIMIT ${selectedLimit};`;
    }
    try {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalQuery, dbId: selectedDbId }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data);
      } else {
        setResults(data.data);
        setColumns(data.columns || []);
        setExecutionStats({
          isSelect: !data.isResultSetHeader,
          count: Array.isArray(data.data) ? data.data.length : (data.data.affectedRows || 0),
          timeMs: data.timeMs
        });
        setQueryHistory(prev => [{
          query: finalQuery,
          time: new Date().toLocaleString(),
          user: currentUser?.username || 'aldyan', 
          duration: data.timeMs,
          success: true,
          rows: Array.isArray(data.data) ? data.data.length : data.data.affectedRows
        }, ...prev.slice(0, 49)]);
      }
    } catch (err) {
      setError({ error: err.message || 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const tables = metadata?.tables || [];
  const filteredTables = (Array.isArray(tables) ? tables : []).filter(t => t && t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="sql-editor-layout" style={{ height: '100%', display: 'flex' }}>
        <div className="icon-strip" 
          style={{ 
            height: '100%', 
            backgroundColor: '#f9fafb', 
            borderRight: '1px solid #e5e7eb',
            zIndex: 10,
            display: isSidebarVisible ? 'flex' : 'none'
          }}
        >
          <Link href="/dashboard" className="strip-icon" title="Go to Dashboard" style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '0.5rem', color: '#6366f1' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </Link>

          <div className={`strip-icon ${activeSidebarTab === 'worksheet' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('worksheet')} title="Worksheet">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
        </div>
        <div className={`strip-icon ${activeSidebarTab === 'schema' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('schema')} title="Schema Explorer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
        </div>
        <div className={`strip-icon ${activeSidebarTab === 'history' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('history')} title="Query History">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        </div>
        <div style={{ marginTop: 'auto', marginBottom: '1rem' }} className="strip-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82.33 1.65 1.65 0 0 0-1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
        </div>
        </div>

      {isSidebarVisible && (
        <aside className="schema-explorer" style={{ height: '100%', width: '320px', borderRight: '1px solid #e5e7eb' }}>
          {activeSidebarTab === 'schema' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="schema-header" style={{ padding: '1rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Schema Explorer</span>
                <div className="search-bar" style={{ marginTop: '0.75rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input type="text" placeholder="Filter tables..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="tree-view" style={{ overflowY: 'auto', flex: 1, padding: '0 0.5rem' }}>
                {metadata && metadata.instance ? (
                  <>
                    {/* Level 1: Instance */}
                    <div className="tree-node" onClick={() => toggleNode('root')} style={{ fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedNodes['root'] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="9 18 15 12 9 6" /></svg>
                      <EngineIcon engine={metadata.instance.engine} />
                      {metadata.instance.name}
                    </div>
                  </>
                ) : metadata?.error ? (
                  <div style={{ padding: '1rem', color: '#ef4444', fontSize: '0.875rem' }}>
                    Error: {metadata.error}
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading schema...</div>
                )}

                {metadata && metadata.instance && expandedNodes['root'] && (
                      <div style={{ marginLeft: '1.25rem', borderLeft: '1px solid #e5e7eb', paddingLeft: '0.75rem' }}>
                        {/* Level 2: Database */}
                        <div className="tree-node" onClick={() => toggleNode('db')} style={{ color: '#374151', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedNodes['db'] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="9 18 15 12 9 6" /></svg>
                          <EngineIcon engine={metadata.instance.engine} size={14} />
                          {metadata.database}
                          <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.5, marginLeft: '4px' }}>({metadata.instance.engine})</span>
                        </div>

                        {expandedNodes['db'] && (
                          <div style={{ marginLeft: '1.25rem', borderLeft: '1px solid #e5e7eb', paddingLeft: '0.75rem' }}>
                            {filteredTables.map(table => (
                              <div key={table.name} style={{ marginBottom: '2px' }}>
                                {/* Level 3: Table */}
                                <div 
                                  className="tree-node" 
                                  onClick={() => toggleNode(table.name)}
                                  onDoubleClick={() => setQuery(`SELECT * FROM ${table.name} LIMIT 1000;`)}
                                  style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedNodes[table.name] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="9 18 15 12 9 6" /></svg>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y1="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                                  <span style={{ fontWeight: 500 }}>{table.name}</span>
                                </div>

                                {expandedNodes[table.name] && (
                                  <div style={{ marginLeft: '1.25rem', borderLeft: '1px solid #e5e7eb', paddingLeft: '0.75rem', paddingBottom: '0.5rem' }}>
                                    {/* Level 4: Folders (Columns/Indexes) */}
                                    
                                    {/* Columns Sub-folder */}
                                    <div className="tree-node" onClick={() => toggleNode(`cols-${table.name}`)} style={{ opacity: 0.7, fontSize: '0.75rem' }}>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedNodes[`cols-${table.name}`] ? 'rotate(90deg)' : 'none' }}><polyline points="9 18 15 12 9 6" /></svg>
                                      Columns ({table.columns.length})
                                    </div>
                                    {expandedNodes[`cols-${table.name}`] && (
                                      <div style={{ marginLeft: '1rem' }}>
                                        {table.columns.map(col => (
                                          <div key={col.name} className="tree-node detail-node" style={{ fontSize: '0.75rem', gap: '6px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                                            <span style={{ color: '#1e293b' }}>{col.name}</span>
                                            <span style={{ color: '#6366f1', fontSize: '0.65rem', backgroundColor: '#eef2ff', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>{col.type}</span>
                                            {col.key === 'PRI' && <span style={{ color: '#d97706', fontSize: '0.65rem', backgroundColor: '#fff7ed', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>PK</span>}
                                            {col.nullable && <span style={{ color: '#94a3b8', fontSize: '0.6rem' }}>NULL</span>}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Indexes Sub-folder */}
                                    <div className="tree-node" onClick={() => toggleNode(`idxs-${table.name}`)} style={{ opacity: 0.7, fontSize: '0.75rem', marginTop: '4px' }}>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedNodes[`idxs-${table.name}`] ? 'rotate(90deg)' : 'none' }}><polyline points="9 18 15 12 9 6" /></svg>
                                      Indexes ({table.indexes.length})
                                    </div>
                                    {expandedNodes[`idxs-${table.name}`] && (
                                      <div style={{ marginLeft: '1rem' }}>
                                        {table.indexes.map(idx => (
                                          <div key={idx.name} className="tree-node detail-node" style={{ fontSize: '0.75rem', gap: '6px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                            <span style={{ color: '#1e293b' }}>{idx.name}</span>
                                            <span style={{ color: '#059669', fontSize: '0.6rem', backgroundColor: '#ecfdf5', padding: '1px 4px', borderRadius: '3px' }}>{idx.type}</span>
                                            {idx.unique && <span style={{ color: '#4f46e5', fontSize: '0.65rem', fontWeight: 600 }}>UQ</span>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
            </div>
          )}

          {activeSidebarTab === 'history' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="schema-header" style={{ padding: '1rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Query History</span>
                <div className="search-bar" style={{ marginTop: '0.75rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input type="text" placeholder="Search history..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} />
                </div>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '0 0.5rem' }}>
                {queryHistory.filter(h => h.query.toLowerCase().includes(historySearch.toLowerCase())).length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.875rem' }}>No history found</div>
                ) : (
                  queryHistory.filter(h => h.query.toLowerCase().includes(historySearch.toLowerCase())).map((h, i) => (
                    <div 
                      key={i} 
                      className="history-item" 
                      onClick={() => setQuery(h.query)}
                      style={{ 
                        padding: '0.75rem', 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{h.time}</span>
                        <span style={{ fontSize: '0.7rem', color: h.success ? '#059669' : '#ef4444' }}>{h.duration}ms</span>
                      </div>
                      <code style={{ fontSize: '0.75rem', color: '#334155', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {h.query}
                      </code>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      )}

      <main className="sql-main-workspace" ref={containerRef} style={{ height: '100%', overflow: 'hidden', flex: 1 }}>
        <div className="editor-tabs">
          <button className="editor-tab" onClick={() => setIsSidebarVisible(!isSidebarVisible)} title="Toggle Sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
          </button>
          
          {dbId && currentDbInfo ? (
            <Link href={`/dashboard/projects/${currentDbInfo.project_key}`} className="editor-tab" style={{ color: '#4f46e5', fontWeight: 600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              Back to Project
            </Link>
          ) : (
            <Link href="/dashboard" className="editor-tab">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              Home
            </Link>
          )}

          <div className="editor-tab active">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            {currentDbInfo ? `${currentDbInfo.project_key || 'DB'}: ${currentDbInfo.name}` : 'Default Worksheet'}
          </div>
        </div>

        <div style={{ backgroundColor: 'white' }}>
          <div className="context-bar">
            <div className="breadcrumb-item">{currentDbInfo?.environment || 'Staging'}</div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            <div className="breadcrumb-item">
              <EngineIcon engine={metadata?.instance?.engine} />
              {currentDbInfo?.instance_name || 'mysql-staging-01'}
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            <div className="breadcrumb-item">
              <EngineIcon engine={metadata?.instance?.engine} size={14} />
              {currentDbInfo?.name || 'bytebase_clone'}
              {metadata?.instance?.engine && (
                <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.5, marginLeft: '4px' }}>
                  ({metadata.instance.engine})
                </span>
              )}
            </div>
          </div>

          <div className="sql-action-header">
            <div className="run-btn-group">
              <button className="run-btn" style={{ backgroundColor: '#818cf8', color: 'white' }} onClick={handleRunQuery} disabled={loading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                {loading ? 'Running...' : '(limit 1000)'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Connected</span>
            </div>
          </div>
        </div>

        <div style={{ height: `${editorHeightPercent}%`, minHeight: '100px', borderTop: '1px solid #e5e7eb' }}>
          <Editor
            height="100%"
            defaultLanguage="mysql"
            value={query}
            onChange={(val) => setQuery(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineHeight: 24,
              fontFamily: '"Geist Mono", monospace',
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        </div>

        <div className="query-result-resizer" onMouseDown={() => setIsResizing(true)} style={{ cursor: 'row-resize', userSelect: 'none' }}></div>

        <div style={{ height: `${100 - editorHeightPercent}%`, minHeight: '100px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!results && !error && !loading && (
            <div className="result-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="1"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              <p style={{ marginTop: '1rem' }}>Click Run to execute the query.</p>
            </div>
          )}
          {loading && (
            <div className="result-empty-state">
              <div style={{ width: '24px', height: '24px', border: '3px solid #f3f4f6', borderTop: '3px solid var(--brand-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
          )}
          {error && (
            <div style={{ padding: '1rem', overflow: 'auto' }}>
              <div style={{ color: '#b91c1c', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '4px', backgroundColor: '#fef2f2' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>{error.error}</pre>
              </div>
            </div>
          )}
          {results && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.75rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between', backgroundColor: '#fafafa' }}>
                <span>{executionStats.isSelect ? `${executionStats.count} rows` : `${executionStats.count} rows affected`}</span>
                <span>{executionStats.timeMs}ms</span>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 1, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' }}>
                    <tr>
                      {columns.map((col, idx) => (
                        <th key={idx} style={{ textAlign: 'left', padding: '0.5rem 1rem', color: '#4b5563', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        {columns.map((col, cIdx) => (
                          <td key={cIdx} style={{ padding: '0.5rem 1rem', color: '#111827', whiteSpace: 'nowrap' }}>{String(row[col])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <style>{`
        .tree-node {
          padding: 6px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #475569;
          cursor: pointer;
        }
        .tree-node:hover {
          background-color: #f1f5f9;
          color: #1e293b;
        }
        .detail-node {
          margin-left: 12px;
          cursor: default;
        }
        .detail-node:hover {
          background-color: transparent;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function SQLEditorProfessional() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Initializing SQL Editor...</div>}>
      <SQLEditorContent />
    </Suspense>
  );
}
