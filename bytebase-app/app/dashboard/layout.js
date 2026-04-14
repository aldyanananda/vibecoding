'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// Collapsible nav section
function CollapsibleNav({ label, icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        className="nav-item"
        style={{ justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {icon}
          <span>{label}</span>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      {open && <div style={{ marginLeft: '1rem', borderLeft: '1px solid #e5e7eb' }}>{children}</div>}
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const pathParts = pathname.split('/');
  const isProjectScope = pathParts.length >= 4 && pathParts[2] === 'projects' && pathParts[3] !== '';
  const projectKeyFromUrl = isProjectScope ? pathParts[3] : null;

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) setUser(await res.json());
      } catch { }
    };
    fetchUser();
    
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) setProjects(await res.json());
      } catch { }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (projectKeyFromUrl && projects.length > 0) {
      const found = projects.find(p => p.project_key === projectKeyFromUrl);
      setCurrentProject(found || { name: 'Unknown', project_key: projectKeyFromUrl });
    } else {
      setCurrentProject(null);
    }
  }, [projectKeyFromUrl, projects]);

  const isSQLEditor = pathname === '/dashboard/sqleditor';
  if (isSQLEditor) {
    return (
      <div className="dashboard-layout" style={{ height: '100vh', overflow: 'hidden' }}>
        <main style={{ flex: 1, height: '100%', overflow: 'hidden' }}>{children}</main>
      </div>
    );
  }

  const iconDb = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>;
  const iconProjects = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
  const iconInstances = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>;
  const iconHome = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
  const iconEnv = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
  const iconIAM = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  const iconCI = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /></svg>;
  const iconData = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
  const iconInteg = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
  const iconSettings = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82.33 1.65 1.65 0 0 0-1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;

  const isActive = (path) => pathname === path;

  const iconSQLEditor = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;

  const isDBA = user?.role === 'DBA';

  const globalSidebar = (
    <nav className="nav-group" style={{ flex: 1, overflowY: 'auto' }}>
      <Link href="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>{iconHome} Home</Link>
      
      {isDBA && (
        <Link href="/dashboard/sqleditor" className={`nav-item ${isActive('/dashboard/sqleditor') ? 'active' : ''}`}>{iconSQLEditor} SQL Editor</Link>
      )}
      
      <Link href="/dashboard/projects" className={`nav-item ${pathname.startsWith('/dashboard/projects') ? 'active' : ''}`}>{iconProjects} Projects</Link>
      
      {isDBA && (
        <>
          <Link href="/dashboard/instances" className={`nav-item ${pathname.startsWith('/dashboard/instances') ? 'active' : ''}`}>{iconInstances} Instances</Link>
          <Link href="/dashboard/databases" className={`nav-item ${isActive('/dashboard/databases') ? 'active' : ''}`}>{iconDb} Databases</Link>
          <Link href="/dashboard/environments" className={`nav-item ${isActive('/dashboard/environments') ? 'active' : ''}`}>{iconEnv} Environments</Link>

          <div style={{ borderTop: '1px solid #f0f0f0', margin: '0.5rem 0' }} />

          <CollapsibleNav label="IAM &amp; Admin" icon={iconIAM}>
            <Link href="/dashboard/users" className={`nav-item indent-1 ${isActive('/dashboard/users') ? 'active' : ''}`}>Users</Link>
            <Link href="/dashboard/roles" className={`nav-item indent-1 ${isActive('/dashboard/roles') ? 'active' : ''}`}>Roles</Link>
          </CollapsibleNav>
          <CollapsibleNav label="CI/CD" icon={iconCI}>
            <Link href="/dashboard/cicd/pipeline" className="nav-item indent-1">Pipeline</Link>
          </CollapsibleNav>
          <CollapsibleNav label="Data Access" icon={iconData}>
            <Link href="/dashboard/data-access/masking" className="nav-item indent-1">Masking</Link>
          </CollapsibleNav>
          <CollapsibleNav label="Integration" icon={iconInteg}>
            <Link href="/dashboard/integration/vcs" className="nav-item indent-1">VCS</Link>
          </CollapsibleNav>
          <CollapsibleNav label="Settings" icon={iconSettings}>
            <Link href="/dashboard/settings/general" className="nav-item indent-1">General</Link>
          </CollapsibleNav>
        </>
      )}
    </nav>
  );

  const projectSidebar = (
    <nav className="nav-group" style={{ flex: 1, overflowY: 'auto' }}>
      <div className="nav-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        <span>{currentProject ? `${currentProject.project_key} - ${currentProject.name}` : 'Project'}</span>
      </div>
      
      {isDBA && (
        <Link href="/dashboard/sqleditor" className="nav-item">
          {iconSQLEditor}
          SQL Editor
        </Link>
      )}

      <Link href={`/dashboard/projects/${projectKeyFromUrl}/issues`} className={`nav-item ${pathname.endsWith('/issues') ? 'active' : ''}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="1" /></svg>
        Issues
      </Link>
      <div>
        <Link href={`/dashboard/projects/${projectKeyFromUrl}`} className={`nav-item ${pathname === `/dashboard/projects/${projectKeyFromUrl}` ? 'active' : ''}`}>
          {iconDb}
          <span>Database</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto' }}><polyline points="6 9 12 15 18 9" /></svg>
        </Link>
        <div style={{ marginLeft: '1rem', borderLeft: '1px solid #e5e7eb' }}>
          {['Databases', 'Groups', 'Slow Queries', 'Anomalies'].map(sub => (
            <Link
              key={sub}
              href={`/dashboard/projects/${projectKeyFromUrl}/${sub.toLowerCase().replace(' ', '-')}`}
              className={`nav-item indent-1 ${pathname.endsWith(sub.toLowerCase().replace(' ', '-')) ? 'active' : ''}`}
            >
              {sub}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${!isSidebarVisible ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
            <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Bytebase Clone</span>
        </div>

        {isProjectScope ? projectSidebar : globalSidebar}
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Sidebar Toggle */}
            <button
              className="strip-icon"
              style={{ border: 'none', background: 'none', padding: '4px' }}
              onClick={() => setIsSidebarVisible(!isSidebarVisible)}
              title={isSidebarVisible ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>

            {/* Project Selector */}
            <div style={{ position: 'relative' }}>
              <div className="project-selector" onClick={() => setIsSelectorOpen(!isSelectorOpen)}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {currentProject ? `${currentProject.project_key} - ${currentProject.name}` : 'Select Project'}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              {isSelectorOpen && (
                <div className="instance-card" style={{ position: 'absolute', top: '100%', left: 0, width: '260px', zIndex: 200, marginTop: '0.5rem', padding: '0.25rem 0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} onClick={() => setIsSelectorOpen(false)}>
                  <div style={{ padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem', color: '#6b7280' }} onClick={() => router.push('/dashboard')}>
                    Global Overview
                  </div>
                  <div style={{ borderTop: '1px solid #f0f0f0', margin: '0.25rem 0' }} />
                  {projects.map(p => (
                    <div key={p.id} style={{ padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem', backgroundColor: projectKeyFromUrl === p.project_key ? '#f1f5f9' : 'transparent' }}
                      onClick={() => router.push(`/dashboard/projects/${p.project_key}`)}>
                      {p.project_key} - {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              Search
              <kbd style={{ fontSize: '0.7rem', background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '1px 4px', borderRadius: '3px' }}>Ctrl K</kbd>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="1" /></svg>
              My Issues
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brand-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: '700' }}>
              B
            </div>
          </div>
        </header>

        <div style={{ padding: '1.5rem', overflow: 'auto', flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
