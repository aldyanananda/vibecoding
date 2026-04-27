import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function GET(request, { params }) {
  const { id } = await params;

  try {
    const [rows] = await pool.query(`
      SELECT d.*, i.name as instance_name, p.name as project_name, p.project_key 
      FROM list_all_db d
      JOIN instances i ON d.instance_id = i.id
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE d.id = ?
    `, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Database not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Database fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
