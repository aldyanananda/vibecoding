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
