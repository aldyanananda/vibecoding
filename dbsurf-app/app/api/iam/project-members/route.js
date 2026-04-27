import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import { getAuthenticatedUser } from '@/app/lib/auth';

export async function GET(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'DBA') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectKey = searchParams.get('projectKey');

    if (!projectKey) {
      return NextResponse.json({ error: 'Project key is required' }, { status: 400 });
    }

    const [projects] = await pool.query('SELECT id FROM projects WHERE project_key = ?', [projectKey]);
    if (projects.length === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    const projectId = projects[0].id;

    // Get members
    const [members] = await pool.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.role, 
        pm.all_databases
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY u.username ASC
    `, [projectId]);

    // Attach database details for each restricted member
    for (let member of members) {
      if (!member.all_databases) {
        const [dbs] = await pool.query(`
          SELECT d.id, d.name, d.engine
          FROM project_database_members pdm
          JOIN list_all_db d ON pdm.database_id = d.id
          WHERE pdm.project_id = ? AND pdm.user_id = ?
        `, [projectId, member.id]);
        member.databases = dbs;
      } else {
        member.databases = [];
      }
    }

    return NextResponse.json(members);
  } catch (error) {
    console.error('Fetch project members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'DBA') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { projectKey, userId, allDatabases, databaseIds } = await req.json();

    const [projects] = await pool.query('SELECT id FROM projects WHERE project_key = ?', [projectKey]);
    if (projects.length === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    const projectId = projects[0].id;

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      await conn.query(
        `INSERT INTO project_members (project_id, user_id, all_databases, role) 
         VALUES (?, ?, ?, 'Member')
         ON DUPLICATE KEY UPDATE all_databases = ?`,
        [projectId, userId, allDatabases ? 1 : 0, allDatabases ? 1 : 0]
      );

      if (!allDatabases && databaseIds && databaseIds.length > 0) {
        const values = databaseIds.map(dbId => [projectId, userId, dbId]);
        await conn.query(
          'INSERT INTO project_database_members (project_id, user_id, database_id) VALUES ?',
          [values]
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return NextResponse.json({ success: true, message: 'User granted access successfully' });
  } catch (error) {
    console.error('Grant project access error:', error);
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'User is already a member of this project' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'DBA') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { projectKey, userId, allDatabases, databaseIds } = await req.json();

    const [projects] = await pool.query('SELECT id FROM projects WHERE project_key = ?', [projectKey]);
    if (projects.length === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    const projectId = projects[0].id;

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      await conn.query(
        'UPDATE project_members SET all_databases = ? WHERE project_id = ? AND user_id = ?',
        [allDatabases ? 1 : 0, projectId, userId]
      );

      // Clean old DB assignments
      await conn.query('DELETE FROM project_database_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);

      // Add new ones if not all_databases
      if (!allDatabases && databaseIds && databaseIds.length > 0) {
        const values = databaseIds.map(dbId => [projectId, userId, dbId]);
        await conn.query(
          'INSERT INTO project_database_members (project_id, user_id, database_id) VALUES ?',
          [values]
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    return NextResponse.json({ success: true, message: 'Member updated successfully' });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'DBA') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const projectKey = searchParams.get('projectKey');
    const userId = searchParams.get('userId');

    const [projects] = await pool.query('SELECT id FROM projects WHERE project_key = ?', [projectKey]);
    if (projects.length === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    const projectId = projects[0].id;

    await pool.query('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    // Also cleanup database specific members
    await pool.query('DELETE FROM project_database_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);

    return NextResponse.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
