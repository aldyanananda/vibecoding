import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import { getAuthenticatedUser } from '@/app/lib/auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'DBA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all memberships joined with user and project info
    const [memberships] = await pool.query(`
      SELECT m.*, u.username, p.name as project_name 
      FROM project_members m
      JOIN users u ON m.user_id = u.id
      JOIN projects p ON m.project_id = p.id
    `);

    // Fetch all specific database grants
    const [dbGrants] = await pool.query(`
      SELECT g.*, d.name as db_name
      FROM project_database_members g
      JOIN list_all_db d ON g.database_id = d.id
    `);

    // Group grants by membership
    const result = memberships.map(m => ({
      ...m,
      databases: dbGrants
        .filter(g => g.user_id === m.user_id && g.project_id === m.project_id)
        .map(g => ({ id: g.database_id, name: g.db_name }))
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const adminUser = await getAuthenticatedUser();
    if (!adminUser || adminUser.role !== 'DBA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { user_id, project_id, all_databases, database_ids } = await req.json();

    if (!user_id || !project_id) {
      return NextResponse.json({ error: 'User ID and Project ID are required' }, { status: 400 });
    }

    // 1. Update/Insert project membership
    await pool.query(`
      INSERT INTO project_members (user_id, project_id, all_databases, role)
      VALUES (?, ?, ?, 'Member')
      ON DUPLICATE KEY UPDATE all_databases = ?
    `, [user_id, project_id, all_databases ? 1 : 0, all_databases ? 1 : 0]);

    // 2. Manage database-level grants
    await pool.query('DELETE FROM project_database_members WHERE user_id = ? AND project_id = ?', [user_id, project_id]);
    
    if (!all_databases && Array.isArray(database_ids) && database_ids.length > 0) {
      const values = database_ids.map(dbId => [project_id, user_id, dbId]);
      await pool.query('INSERT INTO project_database_members (project_id, user_id, database_id) VALUES ?', [values]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const adminUser = await getAuthenticatedUser();
    if (!adminUser || adminUser.role !== 'DBA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { user_id, project_id } = await req.json();

    await pool.query('DELETE FROM project_members WHERE user_id = ? AND project_id = ?', [user_id, project_id]);
    await pool.query('DELETE FROM project_database_members WHERE user_id = ? AND project_id = ?', [user_id, project_id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
