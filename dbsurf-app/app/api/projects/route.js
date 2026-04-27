import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import { getAuthenticatedUser, getUserProjects } from '@/app/lib/auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const projectIds = await getUserProjects(user.id, user.role);
    
    if (projectIds.length === 0) {
      return NextResponse.json([]);
    }

    const [rows] = await pool.query(`
      SELECT p.*, u.username as creator_name 
      FROM projects p 
      LEFT JOIN users u ON p.creator_id = u.id 
      WHERE p.id IN (?)
      ORDER BY p.created_at DESC
    `, [projectIds]);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Fetch projects error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, key, creator_id } = await req.json();

    if (!name || !key) {
      return NextResponse.json({ error: 'Name and Key are required' }, { status: 400 });
    }

    const [result] = await pool.query(
      `INSERT INTO projects (name, project_key, creator_id) 
       VALUES (?, ?, ?)`,
      [name, key, creator_id || 1]
    );

    return NextResponse.json({ 
      success: true, 
      id: result.insertId, 
      message: 'Project created successfully' 
    });

  } catch (error) {
    console.error('Create project error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Project key already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'DBA') {
      return NextResponse.json({ error: 'Forbidden: Only DBAs can edit projects' }, { status: 403 });
    }

    const { id, name, project_key } = await req.json();
    if (!id || !name || !project_key) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await pool.query(
      'UPDATE projects SET name = ?, project_key = ? WHERE id = ?',
      [name, project_key, id]
    );

    return NextResponse.json({ success: true, message: 'Project updated successfully' });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'DBA') {
      return NextResponse.json({ error: 'Forbidden: Only DBAs can delete projects' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    // 1. Unassign databases from this project
    await pool.query('UPDATE list_all_db SET project_id = NULL WHERE project_id = ?', [id]);
    
    // 2. Clear project members and database specific members
    await pool.query('DELETE FROM project_members WHERE project_id = ?', [id]);
    await pool.query('DELETE FROM project_database_members WHERE project_id = ?', [id]);

    // 3. Delete the project
    await pool.query('DELETE FROM projects WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
