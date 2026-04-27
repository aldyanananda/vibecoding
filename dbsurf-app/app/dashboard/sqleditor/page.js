'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Editor from '@monaco-editor/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import EngineIcon from '@/app/components/EngineIcon';

function SQLEditorContent() {
  const searchParams = useSearchParams();
  const initialDbId = searchParams.get('dbId');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const processedInitialDbId = useRef(null);
  const [metadata, setMetadata] = useState(null); 
  const [expandedNodes, setExpandedNodes] = useState({ 'root': true, 'db': true });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLimit, setSelectedLimit] = useState(1000);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState('schema'); 
  const [queryHistory, setQueryHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [editorHeightPercent, setEditorHeightPercent] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizingH, setIsResizingH] = useState(false);
  const [isIssueSidebarOpen, setIsIssueSidebarOpen] = useState(false);
  const [issueName, setIssueName] = useState('');
  const containerRef = useRef(null);
  const resizableAreaRef = useRef(null);
  const metadataRef = useRef(null);

  // Sync metadata to ref for completion provider
  useEffect(() => {
    metadataRef.current = metadata;
  }, [metadata]);

  // Initialize User
  useEffect(() => {
    fetch('/api/auth/me').then(res => res.ok && res.json()).then(user => {
      if (user) setCurrentUser(user);
    });
  }, []);

  // Initialize Tabs from cache or defaults
  useEffect(() => {
    if (!currentUser) return;
    const cacheKey = `sqleditor_tabs_${currentUser.id}`;
    const cached = localStorage.getItem(cacheKey);
    let initialTabs = [];
    let initialActiveId = null;

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.tabs && parsed.tabs.length > 0) {
          initialTabs = parsed.tabs;
          initialActiveId = parsed.activeTabId || parsed.tabs[0].id;
        }
      } catch (e) { console.error('Failed to parse cached tabs'); }
    }

    // Default first tab if no cache
    if (initialTabs.length === 0) {
      initialTabs = [{
        id: 'default',
        name: 'Default Worksheet',
        dbId: initialDbId || null,
        query: '-- New query\nSELECT * FROM users LIMIT 10;',
        viewMode: 'query',
        results: null,
        columns: [],
        executionStats: null,
        error: null
      }];
      initialActiveId = 'default';
    }

    // Handle deep link dbId from URL - ONLY ONCE PER dbId change
    if (initialDbId && processedInitialDbId.current !== initialDbId) {
      processedInitialDbId.current = initialDbId;
      
      // Enforce 10 tab limit
      if (initialTabs.length >= 10) {
        initialTabs.shift(); // Remove oldest
      }
      
      const newId = `db-${initialDbId}-${Date.now()}`;
      initialTabs.push({
        id: newId,
        name: 'Connecting...',
        dbId: initialDbId,
        query: '-- New query\n',
        viewMode: 'query',
        results: null,
        columns: [],
        executionStats: null,
        error: null
      });
      initialActiveId = newId;
    }

    setTabs(initialTabs);
    setActiveTabId(initialActiveId);
  }, [currentUser, initialDbId]);

  // Save tabs to cache
  useEffect(() => {
    if (!currentUser || tabs.length === 0) return;
    const cacheKey = `sqleditor_tabs_${currentUser.id}`;
    localStorage.setItem(cacheKey, JSON.stringify({ tabs, activeTabId }));
  }, [tabs, activeTabId, currentUser]);

  const activeTab = tabs.find(t => t.id === activeTabId) || {};
  const selectedDbId = activeTab.dbId;

  // Sync active tab state back to main editor variables (short-circuit for existing logic)
  const setTabState = (updates) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };

  const [lines, setLines] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (activeTab.viewMode !== 'diagram' || !metadata?.foreignKeys) return;

    const calculateLines = () => {
      const newLines = [];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();

      metadata.foreignKeys.forEach(fk => {
        const sourceEl = document.getElementById(`col-${fk.table}-${fk.column}`);
        const targetEl = document.getElementById(`table-${fk.refTable}`);
        
        if (sourceEl && targetEl) {
          const sRect = sourceEl.getBoundingClientRect();
          const tRect = targetEl.getBoundingClientRect();

          // Determine which side of the table to attach to
          const startOnRight = sRect.left < tRect.left;
          
          const x1 = (startOnRight ? sRect.right : sRect.left) - canvasRect.left;
          const y1 = sRect.top + (sRect.height / 2) - canvasRect.top;
          
          const x2 = (startOnRight ? tRect.left : tRect.right) - canvasRect.left;
          const y2 = tRect.top + (tRect.height / 2) - canvasRect.top;

          // Multi-forked Crow's foot effect: curved path with specific control points
          const dist = Math.abs(x2 - x1);
          const cpX = x1 + (startOnRight ? 1 : -1) * Math.min(dist * 0.4, 100);
          const cp2X = x2 + (startOnRight ? -1 : 1) * Math.min(dist * 0.4, 100);
          
          newLines.push({
            id: `${fk.table}-${fk.column}-${fk.refTable}`,
            path: `M ${x1} ${y1} C ${cpX} ${y1}, ${cp2X} ${y2}, ${x2} ${y2}`,
            startSide: startOnRight ? 'right' : 'left'
          });
        }
      });
      setLines(newLines);
    };

    // Delay calculation to ensure DOM is rendered
    const timer = setTimeout(calculateLines, 100);
    window.addEventListener('resize', calculateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateLines);
    };
  }, [activeTab.viewMode, metadata, tabs]);

  useEffect(() => {
    if (!activeTabId || tabs.length === 0) return;
    
    const fetchMetadata = async () => {
      try {
        setMetadata(null); // Clear previous to avoid confusion
        const url = selectedDbId ? `/api/sql/metadata?dbId=${selectedDbId}` : '/api/sql/metadata';
        const res = await fetch(url);
        const contentType = res.headers.get('content-type');
        
        if (!res.ok || !contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          console.error('Metadata response not JSON:', text);
          throw new Error(`Server returned ${res.status} ${res.statusText}. Please check server logs.`);
        }
        
        const data = await res.json();
        setMetadata(data);

        // Update tab name if DB info is available
        if (data.instance && data.database) {
          const newName = `${data.instance.name} : ${data.instance.engine}-${data.database}`;
          const isMongo = data.instance.engine === 'mongodb' || data.instance.engine === 'mongo';
          
          let updates = {};
          if (activeTab.name !== newName) {
            updates.name = newName;
          }
          
          // Set logic for first-time Mongoload
          if (isMongo && (activeTab.query?.trim() === '-- New query' || activeTab.query?.trim() === '')) {
            const firstCol = data.tables && data.tables.length > 0 ? data.tables[0].name : 'collection';
            updates.query = `db.${firstCol}.findOne()`;
          }
          
          if (Object.keys(updates).length > 0) {
            setTabState(updates);
          }
        }
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
      }
    };
    fetchMetadata();
  }, [selectedDbId, activeTabId]);

  const formatSize = (bytes) => {
    if (!bytes || bytes === '0' || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const addNewTab = () => {
    const newId = Date.now().toString();
    const newTab = {
      id: newId,
      name: 'New Worksheet',
      dbId: selectedDbId || null,
      query: '-- New query\n',
      viewMode: 'query',
      results: null,
      columns: [],
      executionStats: null,
      error: null
    };
    setTabs(prev => {
      let nextTabs = [...prev];
      if (nextTabs.length >= 10) {
        nextTabs.shift(); // Remove oldest
      }
      return [...nextTabs, newTab];
    });
    setActiveTabId(newId);
  };

  const closeTab = (id, e) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Keep at least one tab
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !resizableAreaRef.current) return;
      const rect = resizableAreaRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const newHeightPercent = (relativeY / rect.height) * 100;
      if (newHeightPercent > 5 && newHeightPercent < 95) {
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

  // Horizontal Resizing logic
  useEffect(() => {
    const handleMouseMoveH = (e) => {
      if (!isResizingH) return;
      // 48px is the width of the left icon-strip
      const newWidth = e.clientX - 48;
      if (newWidth > 150 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUpH = () => {
      setIsResizingH(false);
      document.body.style.cursor = 'default';
    };
    if (isResizingH) {
      document.addEventListener('mousemove', handleMouseMoveH);
      document.addEventListener('mouseup', handleMouseUpH);
      document.body.style.cursor = 'col-resize';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveH);
      document.removeEventListener('mouseup', handleMouseUpH);
    };
  }, [isResizingH]);

  const [loading, setLoading] = useState(false);

  const handleRunQuery = async () => {
    const query = activeTab.query;
    if (!query || !query.trim()) return;
    setLoading(true);
    setTabState({ error: null, results: null, executionStats: null });
    
    let finalQuery = query;
    const trimmedQuery = query.trim();
    const engine = (metadata?.instance?.engine || 'mysql').toLowerCase();
    const isMongo = engine.startsWith('mongo');

    let isModifying = false;
    if (isMongo) {
      // MongoDB check: identify non-safe methods
      const mongoMethodMatch = trimmedQuery.match(/db\.\w+\.(\w+)\(/);
      if (mongoMethodMatch) {
        const method = mongoMethodMatch[1];
        const safeMethods = ['find', 'findOne', 'aggregate', 'count', 'countDocuments', 'distinct'];
        if (!safeMethods.includes(method)) {
          isModifying = true;
        }
      } else {
        // If it doesn't match db.col.method(), we assume it's a raw command or potential modification
        isModifying = true;
      }
    } else {
      // SQL check: identify if it doesn't start with a safe read prefix
      const safePrefixes = /^\s*(SELECT|SHOW|DESCRIBE|EXPLAIN)\b/i;
      isModifying = !safePrefixes.test(trimmedQuery);
    }

    const isDeveloper = currentUser?.role?.toLowerCase() === 'developer';

    if (isDeveloper && isModifying) {
      setIssueName(`${isMongo ? 'MongoDB' : 'SQL'} Issue - ${new Date().toLocaleDateString()}`);
      setIsIssueSidebarOpen(true);
      setLoading(false);
      return;
    }

    if (!isMongo && query.toLowerCase().trim().startsWith('select') && !query.toLowerCase().includes('limit')) {
      finalQuery = `${query.trim().replace(/;$/, '')} LIMIT ${selectedLimit};`;
    }
    try {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: finalQuery, dbId: selectedDbId }),
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Invalid response from server: ${text.slice(0, 100)}...`);
      }
      
      const data = await res.json();
      if (!data.success) {
        setTabState({ error: data });
      } else {
        const stats = {
          isSelect: !data.isResultSetHeader,
          count: Array.isArray(data.data) ? data.data.length : (data.data.affectedRows || 0),
          timeMs: data.timeMs
        };
        setTabState({ results: data.data, columns: data.columns || [], executionStats: stats });

        setQueryHistory(prev => [{
          query: finalQuery,
          time: new Date().toLocaleString(),
          user: currentUser?.username || 'user', 
          duration: data.timeMs,
          success: true,
          rows: Array.isArray(data.data) ? data.data.length : data.data.affectedRows
        }, ...prev.slice(0, 49)]);
      }
    } catch (err) {
      setTabState({ error: { error: err.message || 'Network error occurred' } });
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

  const handleEditorBeforeMount = (monaco) => {
    // Register completion provider for SQL
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const resultMetadata = metadataRef.current;
        const engine = (resultMetadata?.instance?.engine || 'postgresql').toLowerCase();
        const isMongo = engine.startsWith('mongo');
        const isMysql = engine.startsWith('mysql');
        
        let keywords = [];
        let functions = [];
        let operators = [];

        if (isMongo) {
          // MongoDB specific suggestions
          keywords = ['db', 'aggregate', 'find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'countDocuments', 'distinct'];
          operators = [
            '$match', '$group', '$sort', '$project', '$lookup', '$unwind', '$limit', '$skip',
            '$set', '$unset', '$inc', '$push', '$pull', '$addToSet', '$each',
            '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$or', '$and', '$exists'
          ];
        } else {
          // SQL (Postgres / MySQL) keywords
          keywords = [
            'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE',
            'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'ILIKE', 'JOIN', 
            'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'UNION', 'ALL',
            'EXCEPT', 'INTERSECT', 'WITH', 'RETURNING', 'VALUES', 'SET', 'AS', 'DISTINCT',
            'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS'
          ];
          
          if (isMysql) {
            keywords.push('DESCRIBE', 'SHOW', 'TABLES', 'DATABASES', 'ENGINE', 'EXPLAIN', 'USE');
          }

          functions = [
            'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'NOW', 'COALESCE', 'CONCAT', 'SUBSTR', 'REPLACE'
          ];
        }

        const suggestions = [
          ...keywords.map(k => ({
            label: k,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: k,
            range
          })),
          ...functions.map(f => ({
            label: `${f}()`,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${f}($1)`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          })),
          ...operators.map(o => ({
            label: o,
            kind: monaco.languages.CompletionItemKind.Operator,
            insertText: o,
            range
          }))
        ];

        // Add dynamic schema suggestions
        if (resultMetadata?.tables) {
          resultMetadata.tables.forEach(table => {
            // suggest table/collection
            suggestions.push({
              label: isMongo ? `db.${table.name}` : table.name,
              kind: isMongo ? monaco.languages.CompletionItemKind.Folder : monaco.languages.CompletionItemKind.Struct,
              insertText: isMongo ? `db.${table.name}` : table.name,
              detail: isMongo ? 'Collection' : 'Table',
              range
            });
            
            // suggest columns
            if (!isMongo) {
              table.columns.forEach(col => {
                suggestions.push({
                  label: col.name,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: col.name,
                  detail: `Column of ${table.name} (${col.type})`,
                  range
                });
              });
            }
          });
        }

        return { suggestions };
      }
    });

    // Custom theme for better SQL readability
    monaco.editor.defineTheme('dbsurf-sql-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '6366f1', fontStyle: 'bold' },
        { token: 'string', foreground: '059669' },
        { token: 'comment', foreground: '94a3b8' },
        { token: 'number', foreground: 'f59e0b' }
      ],
      colors: { 'editor.lineHighlightBackground': '#f8fafc' }
    });
  };

  const handleCreateIssue = async () => {
    if (!issueName.trim()) return alert('Please enter an issue name');
    
    setLoading(true);
    try {
      const dbInfo = metadata?.instance;
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: issueName,
          projectId: metadata?.projectId || 1, // Fallback if not in metadata
          databaseId: selectedDbId,
          query: activeTab.query
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsIssueSidebarOpen(false);
        alert(`Issue ${data.issue_number} created successfully and sent for approval.`);
      } else {
        alert('Failed to create issue: ' + data.error);
      }
    } catch (err) {
      alert('Error creating issue: ' + err.message);
    } finally {
      setLoading(false);
    }
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
        <aside className="schema-explorer" style={{ height: '100%', width: `${sidebarWidth}px`, borderRight: '1px solid #e5e7eb' }}>
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
                                  onDoubleClick={() => {
                                    const engine = (metadata?.instance?.engine || '').toLowerCase();
                                    const isMongo = engine === 'mongodb' || engine === 'mongo';
                                    const query = isMongo ? `db.${table.name}.findOne()` : `SELECT * FROM ${table.name} LIMIT 1000;`;
                                    setTabState({ query, viewMode: 'query' });
                                  }}
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
                      onClick={() => setTabState({ query: h.query })}
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
      {/* 3. The New Small Vertical Menu Bar (Resource Navigator) */}
      <div 
        onMouseDown={() => setIsResizingH(true)}
        style={{ 
          width: '48px', 
          borderRight: '1px solid #e2e8f0', 
          backgroundColor: '#fff', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          padding: '12px 0',
          gap: '16px',
          zIndex: 10,
          cursor: 'col-resize',
          userSelect: 'none'
        }}
      >
        {[
          { id: 'query', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>, title: 'SQL Editor' },
          { id: 'info', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>, title: 'Database Info' },
          { id: 'tables', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>, title: 'Tables' },
          { id: 'sequences', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h10M4 18h6"/><text x="14" y="19" fontSize="10" fontWeight="900" style={{ fontStyle: 'normal' }}>123</text></svg>, title: 'Sequences' },
          { id: 'views', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>, title: 'Views' },
          { id: 'functions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, title: 'Functions' },
          { id: 'procedures', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, title: 'Procedures' },
        ].filter(item => {
          if (item.id === 'sequences') {
            return metadata?.instance?.engine === 'postgresql' || metadata?.instance?.engine === 'postgres';
          }
          return true;
        }).map(item => (
          <button 
            key={item.id}
            title={item.title}
            onClick={() => setTabState({ viewMode: item.id })}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: activeTab.viewMode === item.id ? '#6366f1' : '#94a3b8', 
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: activeTab.viewMode === item.id ? '#eef2ff' : 'transparent',
              display: 'flex',
              transition: 'all 0.2s'
            }}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <main className="sql-main-workspace" ref={containerRef} style={{ height: '100%', overflow: 'hidden', flex: 1 }}>
        <div className="editor-tabs" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 0 }}>
          <button className="editor-tab" onClick={() => setIsSidebarVisible(!isSidebarVisible)} title="Toggle Sidebar" style={{ borderBottom: 'none', height: '36px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
          </button>
          
          <div 
            style={{ 
              display: 'flex', 
              overflowX: 'auto', 
              gap: '2px', 
              flex: 1,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }} 
            className="tab-container-scroll"
          >
            {tabs.map(tab => (
              <div 
                key={tab.id} 
                className={`editor-tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
                title={tab.name}
                style={{ 
                  minWidth: '140px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '4px 10px',
                  height: '32px',
                  backgroundColor: activeTabId === tab.id ? 'white' : '#f1f5f9',
                  borderTop: '1px solid #e2e8f0',
                  borderLeft: '1px solid #e2e8f0',
                  borderRight: '1px solid #e2e8f0',
                  borderRadius: '5px 5px 0 0',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.name}</span>
                </div>
                {tabs.length > 1 && (
                  <button 
                    onClick={(e) => closeTab(tab.id, e)} 
                    style={{ border: 'none', background: 'none', padding: '1px', cursor: 'pointer', borderRadius: '4px', display: 'flex' }}
                    className="close-tab-btn"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}
              </div>
            ))}
            
            {tabs.length < 10 && (
              <button 
                className="editor-tab" 
                onClick={addNewTab} 
                title="New Tab"
                style={{ border: 'none', background: 'none', padding: '0 10px', cursor: 'pointer', height: '32px', alignSelf: 'center' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            )}
          </div>

          <Link href="/dashboard" className="editor-tab" style={{ borderBottom: 'none', height: '32px', textDecoration: 'none', display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', fontSize: '0.75rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            <span style={{ marginLeft: '4px' }}>Dashboard</span>
          </Link>
        </div>

        {/* 4. Body Content - Switches based on viewMode */}
        {activeTab.viewMode === 'query' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ backgroundColor: 'white' }}>
              <div className="context-bar">
                {metadata && metadata.instance ? (
                  <>
                    <div className="breadcrumb-item">{metadata.instance.environment}</div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    <div className="breadcrumb-item">
                      <EngineIcon engine={metadata.instance.engine} />
                      {metadata.instance.name}
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    <div className="breadcrumb-item">
                      <EngineIcon engine={metadata.instance.engine} size={14} />
                      {metadata.database}
                      <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.5, marginLeft: '4px' }}>
                        ({metadata.instance.engine})
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ opacity: 0.5, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    Select a database from the sidebar to start querying
                  </div>
                )}
              </div>

              <div className="sql-action-header">
                <div className="run-btn-group">
                  <button 
                    className="run-btn" 
                    style={{ backgroundColor: '#6366f1', color: 'white', borderRadius: '4px' }} 
                    onClick={handleRunQuery} 
                    disabled={loading}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    {loading ? 'Running...' : 'Run Query'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <select 
                      className="filter-input" 
                      style={{ width: '120px', padding: '2px 8px', fontSize: '0.75rem' }}
                      value={selectedLimit}
                      onChange={(e) => setSelectedLimit(parseInt(e.target.value))}
                    >
                      <option value={100}>Limit 100</option>
                      <option value={1000}>Limit 1000</option>
                      <option value={5000}>Limit 5000</option>
                    </select>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: metadata ? '#10b981' : '#f59e0b' }}></div>
                </div>
              </div>
            </div>
            <div ref={resizableAreaRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ height: `${editorHeightPercent}%`, minHeight: '100px', borderTop: '1px solid #e5e7eb' }}>
                <Editor
                  height="100%"
                  defaultLanguage="sql"
                  theme="dbsurf-sql-theme"
                  beforeMount={handleEditorBeforeMount}
                  value={activeTab.query}
                  onChange={(val) => setTabState({ query: val || '' })}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineHeight: 24,
                    fontFamily: 'monospace',
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true
                  }}
                />
              </div>

              <div className="query-result-resizer" onMouseDown={() => setIsResizing(true)}>
                <div className="resizer-handle">
                  <div className="resizer-line"></div>
                  <div className="resizer-line"></div>
                </div>
              </div>

              <div style={{ height: `${100 - editorHeightPercent}%`, minHeight: '100px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {!activeTab.results && !activeTab.error && !loading && (
                <div className="result-empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="1"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  <p style={{ marginTop: '1rem' }}>Click Run to execute the query.</p>
                </div>
              )}
              {loading && (
                <div className="result-empty-state">
                  <div style={{ width: '24px', height: '24px', border: '3px solid #f3f4f6', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                </div>
              )}
              {activeTab.error && (
                <div style={{ padding: '1rem', overflow: 'auto' }}>
                  <div style={{ color: '#b91c1c', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '4px', backgroundColor: '#fef2f2' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>{activeTab.error.error}</pre>
                  </div>
                </div>
              )}
              {activeTab.results && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.75rem', color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span>{activeTab.executionStats?.isSelect ? `${activeTab.executionStats.count} rows` : `${activeTab.executionStats?.count} rows affected`}</span>
                      <span>{activeTab.executionStats?.timeMs}ms</span>
                    </div>
                    
                    {metadata?.instance?.engine?.startsWith('mongo') && (
                      <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '6px', gap: '2px' }}>
                        {[
                          { id: 'table', label: 'Table', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> },
                          { id: 'json', label: 'JSON', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
                          { id: 'option', label: 'Option', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="16" x2="22" y2="16"/></svg> }
                        ].map(mode => (
                          <button
                            key={mode.id}
                            onClick={() => setTabState({ resultViewMode: mode.id })}
                            style={{
                              border: 'none',
                              padding: '4px 10px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: (activeTab.resultViewMode || 'table') === mode.id ? 'white' : 'transparent',
                              color: (activeTab.resultViewMode || 'table') === mode.id ? '#6366f1' : '#64748b',
                              boxShadow: (activeTab.resultViewMode || 'table') === mode.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                              transition: 'all 0.2s'
                            }}
                          >
                            {mode.icon}
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    {(activeTab.resultViewMode || 'table') === 'table' && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 1, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' }}>
                          <tr>
                            {activeTab.columns?.map((col, idx) => (
                              <th key={idx} style={{ textAlign: 'left', padding: '0.5rem 1rem', color: '#4b5563', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(Array.isArray(activeTab.results) ? activeTab.results : []).map((row, rIdx) => (
                            <tr key={rIdx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              {activeTab.columns?.map((col, cIdx) => (
                                <td key={cIdx} style={{ padding: '0.5rem 1rem', color: '#111827', whiteSpace: 'nowrap' }}>{String(row[col])}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {activeTab.resultViewMode === 'json' && (
                      <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', height: '100%', overflow: 'auto' }}>
                        <pre style={{ margin: 0, fontSize: '0.8rem', color: '#1e293b', fontFamily: 'monospace', lineHeight: '1.5' }}>
                          {JSON.stringify(activeTab.results, null, 2)}
                        </pre>
                      </div>
                    )}

                    {activeTab.resultViewMode === 'option' && (
                      <div style={{ padding: '1.5rem', overflow: 'auto', backgroundColor: '#fff' }}>
                        {(Array.isArray(activeTab.results) ? activeTab.results : []).map((row, rIdx) => (
                          <div key={rIdx} style={{ marginBottom: '2rem', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                            <div style={{ padding: '10px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                               <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1' }}></div>
                               Document #{rIdx + 1}
                            </div>
                            <div style={{ padding: '8px 16px' }}>
                              {Object.entries(row).map(([key, val]) => (
                                <div key={key} style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '12px 0', fontSize: '0.8rem', alignItems: 'flex-start' }}>
                                  <div style={{ width: '180px', flexShrink: 0, fontWeight: 600, color: '#64748b' }}>{key}</div>
                                  <div style={{ flex: 1, color: '#1e293b', wordBreak: 'break-all', fontFamily: typeof val === 'object' ? 'monospace' : 'inherit' }}>
                                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
          <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#fff' }}>
             <div style={{ padding: '1.5rem 2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, textTransform: 'capitalize', color: '#1e293b' }}>{activeTab.viewMode} List</h2>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {metadata?.database} <span style={{ opacity: 0.3 }}>/</span> {metadata?.instance?.name}
                  </div>
                </div>
                
                {activeTab.viewMode === 'tables' && (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Name</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Engine</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Rows (est.)</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Data Size</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Index Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(metadata?.tableStats || []).map(stat => (
                          <tr key={stat.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>{stat.name}</td>
                            <td style={{ padding: '12px 16px', color: '#64748b' }}>
                               <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>{stat.engine || 'InnoDB'}</span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>{stat.rowCount?.toLocaleString() || 0}</td>
                            <td style={{ padding: '12px 16px' }}>{formatSize(stat.dataSize)}</td>
                            <td style={{ padding: '12px 16px' }}>{formatSize(stat.indexSize)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab.viewMode === 'sequences' && (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Sequence Name</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Data Type</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Start</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Min</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Max</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Increment</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Cache</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Cycled</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Last Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(metadata?.sequences || []).map(seq => (
                          <tr key={seq.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <div style={{ fontSize: '0.6rem', backgroundColor: '#eef2ff', color: '#6366f1', padding: '2px 4px', borderRadius: '3px', fontWeight: 900 }}>123</div>
                               {seq.name}
                            </td>
                            <td style={{ padding: '12px 16px', textTransform: 'uppercase', color: '#64748b', fontSize: '0.75rem' }}>{seq.data_type}</td>
                            <td style={{ padding: '12px 16px' }}>{seq.start_value}</td>
                            <td style={{ padding: '12px 16px' }}>{seq.minimum_value}</td>
                            <td style={{ padding: '12px 16px' }}>{seq.maximum_value}</td>
                            <td style={{ padding: '12px 16px' }}>{seq.increment_by}</td>
                            <td style={{ padding: '12px 16px' }}>{seq.cache_size}</td>
                            <td style={{ padding: '12px 16px' }}>
                               <span style={{ 
                                 padding: '2px 6px', 
                                 borderRadius: '4px', 
                                 fontSize: '0.7rem',
                                 backgroundColor: seq.is_cycled ? '#ecfdf5' : '#fef2f2',
                                 color: seq.is_cycled ? '#059669' : '#dc2626'
                               }}>
                                 {seq.is_cycled ? 'YES' : 'NO'}
                               </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#6366f1' }}>{seq.last_value || 'N/A'}</td>
                          </tr>
                        ))}
                        {(metadata?.sequences || []).length === 0 && (
                          <tr>
                            <td colSpan="9" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No sequences found in this database.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {(activeTab.viewMode === 'views' || activeTab.viewMode === 'functions' || activeTab.viewMode === 'procedures') && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {(metadata?.[activeTab.viewMode] || []).map(item => (
                      <div key={item.name} style={{ padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fdfdfd' }}>
                        <div style={{ backgroundColor: '#eef2ff', padding: '10px', borderRadius: '8px' }}>
                           {activeTab.viewMode === 'views' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                           {activeTab.viewMode === 'functions' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
                           {activeTab.viewMode === 'procedures' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{activeTab.viewMode.slice(0, -1).toUpperCase()}</div>
                        </div>
                      </div>
                    ))}
                    {(metadata?.[activeTab.viewMode] || []).length === 0 && (
                      <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1', border: '2px dashed #f1f5f9', borderRadius: '12px' }}>
                         No {activeTab.viewMode} found in this database schema.
                      </div>
                    )}
                  </div>
                )}

                {activeTab.viewMode === 'diagram' && (
                  <div ref={canvasRef} style={{ padding: '2rem', backgroundColor: '#fdfdfd', borderRadius: '16px', border: '1px solid #e2e8f0', minHeight: '800px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', position: 'relative', zIndex: 10 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>Entity Relation Map</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                           Relationship Diagram for <strong>{metadata?.database}</strong>
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end', maxWidth: '400px' }}>
                         {[
                           { label: 'Primary Key', color: '#d97706', bg: '#fffbeb' },
                           { label: 'Foreign Key', color: '#6366f1', bg: '#eef2ff' }
                         ].map(item => (
                           <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: item.color, backgroundColor: item.bg, padding: '6px 14px', borderRadius: '20px' }}>
                              <div style={{ width: '8px', height: '8px', backgroundColor: item.color, borderRadius: '50%' }}></div>
                              {item.label}
                           </div>
                         ))}
                      </div>
                    </div>
                    
                    <div className="erd-canvas-inner" style={{ flex: 1, position: 'relative' }}>
                      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, minWidth: '2000px', minHeight: '1500px' }}>
                        <defs>
                          <marker id="crow-left" markerWidth="20" markerHeight="20" refX="0" refY="10" orient="auto">
                             <circle cx="10" cy="10" r="3" fill="#94a3b8" />
                             <path d="M 0 10 L 12 10 M 12 10 L 20 5 M 12 10 L 20 15" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
                          </marker>
                          <marker id="crow-right" markerWidth="20" markerHeight="20" refX="20" refY="10" orient="auto">
                             <circle cx="10" cy="10" r="3" fill="#94a3b8" />
                             <path d="M 20 10 L 8 10 M 8 10 L 0 5 M 8 10 L 0 15" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
                          </marker>
                        </defs>
                        {lines.map(line => (
                          <path 
                            key={line.id} 
                            d={line.path} 
                            fill="none" 
                            stroke="#94a3b8" 
                            strokeWidth="1.5" 
                            markerEnd={line.startSide === 'right' ? "url(#crow-left)" : "url(#crow-right)"}
                          />
                        ))}
                      </svg>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '60px', position: 'relative', zIndex: 2 }}>
                        {metadata?.tables.map((table) => {
                          const engineColor = metadata?.instance?.engine === 'mysql' ? '#3b82f6' : metadata?.instance?.engine === 'mongodb' ? '#10b981' : '#6366f1';
                          return (
                            <div 
                              key={table.name} 
                              id={`table-${table.name}`}
                              className="erd-node"
                              style={{ 
                                backgroundColor: 'white', 
                                border: '1.5px solid #d1d5db', 
                                borderRadius: '4px', 
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                width: '260px'
                              }}
                            >
                              <div style={{ 
                                padding: '10px 14px', 
                                borderBottom: '1px solid #d1d5db', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                backgroundColor: '#f3f4f6'
                              }}>
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                                 <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151' }}>{table.name}</span>
                              </div>
                              
                              <div style={{ padding: '6px 0' }}>
                                {table.columns.map(col => {
                                  const isFK = metadata?.foreignKeys?.find(fk => fk.table === table.name && fk.column === col.name);
                                  return (
                                    <div 
                                      key={col.name} 
                                      id={`col-${table.name}-${col.name}`}
                                      style={{ 
                                        padding: '4px 14px', 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        gap: '8px'
                                      }}
                                    >
                                      <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
                                        {col.key === 'PRI' ? (
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#d97706"><path d="M21 2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2V21h18V2z" /></svg>
                                        ) : isFK ? (
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3"><polyline points="15 3 21 3 21 9"/><path d="M9 21H3v-6"/><path d="M21 3L3 21"/></svg>
                                        ) : null}
                                      </div>
                                      <span style={{ fontSize: '0.8125rem', color: '#4b5563', fontWeight: col.key === 'PRI' || isFK ? 600 : 400 }}>{col.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}


                {activeTab.viewMode === 'info' && (
                   <div style={{ maxWidth: '900px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                         <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#fff' }}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Database Engine</div>
                            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1e293b' }}>{metadata?.instance?.engine?.toUpperCase()}</div>
                         </div>
                         <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#fff' }}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Database Name</div>
                            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1e293b' }}>{metadata?.database}</div>
                         </div>
                         <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#fff' }}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instance</div>
                            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1e293b' }}>{metadata?.instance?.name}</div>
                         </div>

                      </div>
                   </div>
                )}
             </div>
          </div>
        )}
      </main>

      {/* Right Sidebar for Issue Creation */}
      {isIssueSidebarOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh', backgroundColor: 'white', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Confirm SQL Issue</h3>
            <button onClick={() => setIsIssueSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div style={{ padding: '1.5rem', flex: 1, overflow: 'auto' }}>
            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '1.5rem' }}>
              You are trying to execute a DML/DDL query. This requires DBA approval in DBSurf.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Issue Name</label>
              <input 
                type="text" 
                value={issueName} 
                onChange={(e) => setIssueName(e.target.value)} 
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }} 
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>SQL Query</label>
              <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.75rem', color: '#1e293b', maxHeight: '300px', overflow: 'auto', fontFamily: 'monospace' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{activeTab.query}</pre>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e40af' }}>Project Linkage</div>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', opacity: 0.8 }}>This issue will be linked to project <strong>{metadata?.project_key || 'Default'}</strong></div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setIsIssueSidebarOpen(false)} 
              style={{ flex: 1, padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', backgroundColor: 'white' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateIssue}
              disabled={loading}
              style={{ flex: 1, padding: '0.625rem', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              {loading ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </div>
      )}

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
        .erd-node:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          border-color: #6366f140;
        }
        .erd-col {
          transition: background-color 0.15s ease;
        }
        .erd-col:hover {
          background-color: #f8fafc;
        }
        .erd-rel-link {
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .erd-rel-link:hover {
          border-color: #6366f1;
          background-color: #f5f7ff;
          transform: translateX(2px);
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
