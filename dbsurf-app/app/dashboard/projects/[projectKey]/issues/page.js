'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProjectIssuesPage() {
  const { projectKey } = useParams();
  const router = useRouter();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await fetch(`/api/issues?projectKey=${projectKey}`);
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
  }, [projectKey]);

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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Project Issues</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>Management and approval workflow for {projectKey}</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Issue</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Creator</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Approver</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading issues...</td>
              </tr>
            ) : issues.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No issues found.</td>
              </tr>
            ) : issues.map(issue => (
              <tr 
                key={issue.id} 
                className="hover-row" 
                style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                onClick={() => router.push(`/dashboard/projects/${projectKey}/issues/${issue.id}`)}
              >
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>{issue.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>{issue.issue_number}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, ...getStatusStyle(issue.status) }}>
                    {issue.status === 'RESUB' ? 'RESUBMITTED' : issue.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                  {issue.creator_name}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                  {issue.approver_name || '-'}
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
