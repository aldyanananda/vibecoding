'use client';

import { useParams } from 'next/navigation';

export default function ProjectIssuesPage() {
  const { projectKey } = useParams();

  return (
    <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
      <div style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3 }}><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="1"></circle></svg>
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>No issues found</h2>
      <p style={{ color: '#6b7280' }}>Issues for project {projectKey} will appear here.</p>
      <button className="submit-btn" style={{ width: 'auto', marginTop: '1.5rem' }}>Create Issue</button>
    </div>
  );
}
