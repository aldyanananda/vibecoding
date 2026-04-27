'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDashboard } from '../context';

export default function GlobalIssuesPage() {
  const router = useRouter();
  const { user } = useDashboard();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, CREATED_BY_ME, PENDING_MY_APPROVAL

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await fetch('/api/issues');
        const data = await res.json();
        if (Array.isArray(data)) {
          setIssues(data);
        }
      } catch (error) {
        console.error('Fetch issues error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'OPEN': return { backgroundColor: '#eef2ff', color: '#6366f1' };
      case 'RESUB': return { backgroundColor: '#fff7ed', color: '#ea580c' };
      case 'APPROVED': return { backgroundColor: '#ecfdf5', color: '#059669' };
      case 'REJECTED': return { backgroundColor: '#fef2f2', color: '#dc2626' };
      case 'DONE': return { backgroundColor: '#f1f5f9', color: '#475569' };
      default: return {};
    }
  };

  const filteredIssues = issues.filter(issue => {
    if (filter === 'CREATED_BY_ME') return issue.creator_id == user?.id;
    if (filter === 'PENDING_MY_APPROVAL') return (issue.status === 'OPEN' || issue.status === 'RESUB') && user?.role?.toUpperCase() === 'DBA';
    return true;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>System Issues</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>Global overview of SQL approval requests</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f3f4f6', padding: '0.25rem', borderRadius: '8px' }}>
          <button 
            onClick={() => setFilter('ALL')}
            style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer', backgroundColor: filter === 'ALL' ? 'white' : 'transparent', boxShadow: filter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: filter === 'ALL' ? 600 : 400 }}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('CREATED_BY_ME')}
            style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer', backgroundColor: filter === 'CREATED_BY_ME' ? 'white' : 'transparent', boxShadow: filter === 'CREATED_BY_ME' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: filter === 'CREATED_BY_ME' ? 600 : 400 }}
          >
            Created by me
          </button>
          {user?.role === 'DBA' && (
            <button 
              onClick={() => setFilter('PENDING_MY_APPROVAL')}
              style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer', backgroundColor: filter === 'PENDING_MY_APPROVAL' ? 'white' : 'transparent', boxShadow: filter === 'PENDING_MY_APPROVAL' ? '0 1px 3px rgba(0,0,0,1)' : 'none', fontWeight: filter === 'PENDING_MY_APPROVAL' ? 600 : 400 }}
            >
              Pending Approval
            </button>
          )}
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Issue</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Project</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Creator</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading issues...</td>
              </tr>
            ) : filteredIssues.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3 }}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="1" /></svg>
                  </div>
                  No issues found matching your filter.
                </td>
              </tr>
            ) : filteredIssues.map(issue => (
              <tr 
                key={issue.id} 
                className="hover-row" 
                style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                onClick={() => router.push(`/dashboard/projects/${issue.project_key}/issues/${issue.id}`)}
              >
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>{issue.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>{issue.issue_number}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                   <span style={{ fontSize: '0.8125rem', color: '#4f46e5', fontWeight: 500 }}>{issue.project_name}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, ...getStatusStyle(issue.status) }}>
                    {issue.status === 'RESUB' ? 'RESUBMITTED' : issue.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                  {issue.creator_name}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  {new Date(issue.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .hover-row:hover {
          background-color: #f9fafb;
        }
      `}</style>
    </div>
  );
}
