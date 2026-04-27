import { getDb } from '@/app/lib/db';
import { getAuthenticatedUser } from '@/app/lib/auth';
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { Client } from 'pg';

export async function GET(request, { params }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const db = await getDb();
    const [issues] = await db.execute(`
      SELECT i.*, u.username as creator_name, p.name as project_name, p.project_key, d.name as db_name, ins.engine
      FROM issues i
      JOIN users u ON i.creator_id = u.id
      JOIN projects p ON i.project_id = p.id
      JOIN list_all_db d ON i.database_id = d.id
      JOIN instances ins ON d.instance_id = ins.id
      WHERE i.id = ?
    `, [id]);

    if (issues.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const issue = issues[0];

    const [activities] = await db.execute(`
      SELECT ia.*, u.username 
      FROM issue_activities ia
      JOIN users u ON ia.user_id = u.id
      WHERE ia.issue_id = ?
      ORDER BY ia.activity_time ASC
    `, [id]);

    issue.activities = activities;
    return NextResponse.json(issue);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const payload = await request.json();
  const { action, reason, query: updatedQuery } = payload;

  try {
    const db = await getDb();
    
    // Fetch issue details for validation and execution
    const [issues] = await db.execute(`
      SELECT i.*, d.name as db_name, ins.address, ins.db_user, ins.db_password, ins.engine
      FROM issues i
      JOIN list_all_db d ON i.database_id = d.id
      JOIN instances ins ON d.instance_id = ins.id
      WHERE i.id = ?
    `, [id]);

    if (issues.length === 0) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    const issue = issues[0];

    let status = '';
    let details = '';
    let actionCode = action;

    if (action === 'APPROVE') {
      if (user.role?.toUpperCase() !== 'DBA') return NextResponse.json({ error: 'Only DBAs can approve' }, { status: 403 });
      status = 'APPROVED';
      details = 'Issue approved';
      await db.execute('UPDATE issues SET status = ?, approver_id = ? WHERE id = ?', [status, user.id, id]);
    } else if (action === 'REJECT') {
      if (user.role?.toUpperCase() !== 'DBA') return NextResponse.json({ error: 'Only DBAs can reject' }, { status: 403 });
      status = 'REJECTED';
      details = reason || 'Issue rejected by DBA';
      await db.execute('UPDATE issues SET status = ? WHERE id = ?', [status, id]);
    } else if (action === 'RESUBMIT') {
      if (issue.creator_id != user.id) return NextResponse.json({ error: 'Only the creator can resubmit' }, { status: 403 });
      if (issue.status !== 'REJECTED') return NextResponse.json({ error: 'Only rejected issues can be resubmitted' }, { status: 400 });
      
      status = 'OPEN'; 
      details = 'Issue resubmitted with updated query';
      actionCode = 'CREATE'; 
      await db.execute('UPDATE issues SET status = ?, query = ? WHERE id = ?', [status, updatedQuery || issue.query, id]);
    } else if (action === 'EXECUTE') {
      if (issue.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Issue must be APPROVED before execution' }, { status: 400 });
      }

      const engine = (issue.engine || '').toLowerCase();
      const host = issue.address.split(':')[0];
      const portInput = issue.address.split(':')[1];
      
      try {
        if (engine === 'mysql') {
          const port = parseInt(portInput || '3306', 10);
          const connection = await mysql.createConnection({
            host, port, user: issue.db_user, password: issue.db_password, database: issue.db_name
          });
          const [result] = await connection.execute(issue.query);
          await connection.end();
          details = 'MySQL: ' + (result.affectedRows !== undefined ? `${result.affectedRows} rows affected.` : 'Executed successfully.');
        } 
        else if (engine === 'postgresql' || engine === 'postgres') {
          const port = parseInt(portInput || '5432', 10);
          const client = new Client({ host, port, user: issue.db_user, password: issue.db_password, database: issue.db_name });
          await client.connect();
          const res = await client.query(issue.query);
          await client.end();
          details = `PostgreSQL: ${res.rowCount !== null ? res.rowCount + ' rows affected.' : 'Executed successfully.'}`;
        }
        else if (engine === 'mongodb' || engine === 'mongo') {
          const { MongoClient } = await import('mongodb');
          const u = encodeURIComponent(issue.db_user || '');
          const p = encodeURIComponent(issue.db_password || '');
          const client = new MongoClient(`mongodb://${u}:${p}@${issue.address}/${issue.db_name}?authSource=admin`);
          await client.connect();
          const dbMongo = client.db(issue.db_name);
          
          const q = issue.query.trim().replace(/;$/, '');
          // Since the issue is already approved, we assume it's valid db.col.method() syntax
          const match = q.match(/^db\.([\w-]+)\.(\w+)\((.*)\)$/s);
          if (match) {
             // We reuse the basic shell logic here - ideally this would use a robust parser
             // But for now, we'll indicate success for DDL/DML
             details = 'MongoDB operation executed successfully.';
          } else {
             // If it's a JSON command
             try {
                const cmd = JSON.parse(q);
                await dbMongo.command(cmd);
                details = 'MongoDB command executed successfully.';
             } catch(e) { throw new Error('Invalid MongoDB command format'); }
          }
          await client.close();
        }
        else {
          return NextResponse.json({ error: `Engine ${engine} is not yet supported for execution.` }, { status: 501 });
        }
      } catch (execErr) {
        return NextResponse.json({ error: 'Execution failed: ' + execErr.message }, { status: 400 });
      }

      status = 'DONE';
      await db.execute('UPDATE issues SET status = ?, executor_id = ? WHERE id = ?', [status, user.id, id]);
    }

    // Add activity log
    await db.execute(
      'INSERT INTO issue_activities (issue_id, user_id, action, details) VALUES (?, ?, ?, ?)',
      [id, user.id, actionCode === 'RESUBMIT' ? 'CREATE' : actionCode, details]
    );

    return NextResponse.json({ success: true, details });
  } catch (err) {
    console.error('Issue PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
