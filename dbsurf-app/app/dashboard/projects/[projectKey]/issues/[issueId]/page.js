'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { useDashboard } from '@/app/dashboard/context';
import DolphinLoader from '@/app/components/DolphinLoader';

export default function IssueDetailPage() {
  const { projectKey, issueId } = useParams();
  const router = useRouter();
  const { user } = useDashboard();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuery, setEditedQuery] = useState('');

  const fetchIssue = async () => {
    try {
      const res = await fetch(`/api/issues/${issueId}`);
      const data = await res.json();
      if (res.ok) {
        setIssue(data);
        setEditedQuery(data.query);
      }
    } catch (error) {
      console.error('Fetch issue error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [issueId]);

  const handleAction = async (action, reason = '') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          reason, 
          query: action === 'RESUBMIT' ? editedQuery : undefined 
        }),
      });
      if (res.ok) {
        setIsEditing(false);
        await fetchIssue();
      } else {
        const data = await res.json();
        alert('Action failed: ' + data.error);
      }
    } catch (error) {
      alert('Error performing action: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunCheck = async () => {
    setCheckLoading(true);
    setCheckResult(null);
    try {
      const res = await fetch(`/api/issues/${issueId}/dry-run`, { method: 'POST' });
      const data = await res.json();
      setCheckResult(data);
    } catch (error) {
      setCheckResult({ success: false, error: error.message });
    } finally {
      setCheckLoading(false);
    }
  };

  if (loading) return (
    <div style={{ padding: '8rem 2rem' }}>
       <DolphinLoader size={80} />
    </div>
  );
  if (!issue) return <div style={{ padding: '2rem', textAlign: 'center' }}>Issue not found.</div>;

  const isDBA = user?.role?.toUpperCase() === 'DBA';
  const isCreator = user?.id != null && issue?.creator_id != null && user.id == issue.creator_id;
  const canApprove = isDBA && (issue.status === 'OPEN' || issue.status === 'RESUB');
  const canExecute = issue.status === 'APPROVED';
  const canEdit = isCreator && !isDBA && issue.status === 'REJECTED';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{issue.issue_number}</span>
            <span style={{ 
              padding: '2px 10px', 
              borderRadius: '20px', 
              fontSize: '0.7rem', 
              fontWeight: 700,
              backgroundColor: issue.status === 'APPROVED' ? '#ecfdf5' : issue.status === 'OPEN' ? '#eef2ff' : issue.status === 'DONE' ? '#f1f5f9' : issue.status === 'RESUB' ? '#fff7ed' : '#fef2f2',
              color: issue.status === 'APPROVED' ? '#059669' : issue.status === 'OPEN' ? '#6366f1' : issue.status === 'DONE' ? '#475569' : issue.status === 'RESUB' ? '#ea580c' : '#dc2626'
            }}>
              {issue.status === 'RESUB' ? 'RESUBMITTED' : issue.status}
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{issue.name}</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!isEditing && (
            <button 
              onClick={handleRunCheck}
              disabled={checkLoading || issue.status === 'DONE'}
              style={{ padding: '0.625rem 1.25rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {checkLoading ? 'Checking...' : 'Run Check'}
            </button>
          )}

          {canApprove && !isEditing && (
            <>
              <button 
                onClick={() => {
                  const r = prompt('Enter rejection reason:');
                  if (r) handleAction('REJECT', r);
                }}
                disabled={actionLoading}
                style={{ padding: '0.625rem 1.25rem', backgroundColor: 'white', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Reject
              </button>
              <button 
                onClick={() => handleAction('APPROVE')}
                disabled={actionLoading}
                style={{ padding: '0.625rem 1.25rem', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Approve
              </button>
            </>
          )}

          {canExecute && !isEditing && (
            <button 
              onClick={() => handleAction('EXECUTE')}
              disabled={actionLoading}
              style={{ padding: '0.625rem 1.25rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Execute
            </button>
          )}

          {canEdit && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              style={{ padding: '0.625rem 1.25rem', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Edit &amp; Resubmit
            </button>
          )}

          {isEditing && (
            <>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditedQuery(issue.query);
                }}
                disabled={actionLoading}
                style={{ padding: '0.625rem 1.25rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleAction('RESUBMIT')}
                disabled={actionLoading}
                style={{ padding: '0.625rem 1.25rem', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Resubmit Request
              </button>
            </>
          )}

          {issue.status === 'DONE' && (
            <button 
              disabled
              style={{ padding: '0.625rem 1.25rem', backgroundColor: '#f1f5f9', color: '#94a3b8', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'not-allowed' }}
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Main Content (Editor) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', height: '400px', display: 'flex', flexDirection: 'column', outline: isEditing ? '2px solid #6366f1' : 'none' }}>
            <div style={{ padding: '10px 16px', backgroundColor: isEditing ? '#eff6ff' : '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isEditing ? '#1d4ed8' : '#4b5563' }}>{isEditing ? 'Editing SQL Query' : 'SQL Query Review'}</span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{issue.engine} @ {issue.db_name}</span>
            </div>
            <div style={{ flex: 1 }}>
              <Editor
                height="100%"
                defaultLanguage="sql"
                value={editedQuery}
                onChange={(val) => setEditedQuery(val)}
                options={{ 
                  readOnly: !isEditing, 
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14 
                }}
              />
            </div>
          </div>

          {checkResult && (
            <div style={{ padding: '1.25rem', borderRadius: '8px', border: checkResult.success ? '1px solid #10b981' : '1px solid #ef4444', backgroundColor: checkResult.success ? '#f0fdf4' : '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ color: checkResult.success ? '#059669' : '#dc2626', fontWeight: 700 }}>{checkResult.success ? 'Dry Run Success' : 'Dry Run Failed'}</div>
              </div>
              <pre style={{ margin: 0, fontSize: '0.8rem', color: '#374151', whiteSpace: 'pre-wrap' }}>
                {checkResult.message || checkResult.error}
              </pre>
            </div>
          )}

          {/* Activity Log */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700 }}>Activity Detail</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {(issue.activities || []).map((activity, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      width: '12px', height: '12px', borderRadius: '50%', 
                      backgroundColor: activity.action === 'CREATE' ? '#6366f1' : (activity.action === 'APPROVE' || activity.action === 'EXECUTE') ? '#10b981' : activity.action === 'RESUBMIT' ? '#f59e0b' : '#ef4444',
                      zIndex: 1
                    }}></div>
                    {idx < issue.activities.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: '#e5e7eb', margin: '4px 0' }}></div>}
                  </div>
                  <div style={{ paddingBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                      {activity.username} <span style={{ fontWeight: 400, color: '#6b7280' }}>
                        {activity.action === 'CREATE' ? (activity.details?.includes('resubmitted') ? 'resubmitted the issue' : 'created the issue') : 
                         activity.action === 'APPROVE' ? 'approved the issue' : 
                         activity.action === 'REJECT' ? 'rejected the issue' : 
                         activity.action === 'RESUB' || activity.action === 'RESUBMT' ? 'resubmitted the issue' :
                         'executed the changes'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      {new Date(activity.activity_time).toLocaleString()}
                    </div>
                    {activity.details && !['Issue created', 'Issue approved', 'Issue resubmitted with updated query'].includes(activity.details) && (
                       <div style={{ fontSize: '0.8125rem', color: '#4b5563', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                         {activity.details}
                       </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Project</label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{issue.project_name} ({issue.project_key})</div>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Database</label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{issue.db_name}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Creator</label>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{issue.creator_name}</div>
              </div>
              {issue.approver_name && (
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Approver</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{issue.approver_name}</div>
                </div>
              )}
              {issue.executor_name && (
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Executor</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{issue.executor_name}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
