import { getDb } from '@/app/lib/db';
import { getAuthenticatedUser } from '@/app/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectKey = searchParams.get('projectKey');
  const projectId = searchParams.get('projectId');

  try {
    const db = await getDb();
    let query = `
      SELECT i.*, u.username as creator_name, a.username as approver_name, p.name as project_name, p.project_key
      FROM issues i
      JOIN users u ON i.creator_id = u.id
      LEFT JOIN users a ON i.approver_id = a.id
      JOIN projects p ON i.project_id = p.id
    `;
    const params = [];

    if (projectId) {
      query += ' WHERE i.project_id = ?';
      params.push(projectId);
    } else if (projectKey) {
      query += ' WHERE p.project_key = ?';
      params.push(projectKey);
    }

    query += ' ORDER BY i.created_at DESC';

    const [rows] = await db.execute(query, params);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, projectId, databaseId, query } = await request.json();
    const db = await getDb();

    // Generate unique issue number (e.g. ISSUE-100)
    // The auto_increment is set to 5 in DB setup
    const [result] = await db.execute(
      'INSERT INTO issues (name, issue_number, project_id, database_id, creator_id, query, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, 'PENDING', projectId, databaseId, user.id, query, 'OPEN']
    );
    
    const insertId = result.insertId;
    const issueNumber = `ISSUE-${insertId}`;
    
    await db.execute('UPDATE issues SET issue_number = ? WHERE id = ?', [issueNumber, insertId]);

    // Add activity log
    await db.execute(
      'INSERT INTO issue_activities (issue_id, user_id, action, details) VALUES (?, ?, ?, ?)',
      [insertId, user.id, 'CREATE', 'Issue created']
    );

    return NextResponse.json({ id: insertId, issue_number: issueNumber });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
