import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, environment, engine, address, external_link, license, db_user, created_at, updated_at
      FROM instances
      ORDER BY created_at ASC
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Instances GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch instances' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, environment, engine, address, external_link, db_user, db_password } = body;

    if (!name || !environment || !engine) {
      return NextResponse.json({ error: 'Name, environment, and engine are required' }, { status: 400 });
    }

    const [result] = await pool.query(
      'INSERT INTO instances (name, environment, engine, address, external_link, db_user, db_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, environment, engine, address || '', external_link || '', db_user || '', db_password || '']
    );

    return NextResponse.json({ id: result.insertId, message: 'Instance created' }, { status: 201 });
  } catch (error) {
    console.error('Instances POST Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Instance name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create instance' }, { status: 500 });
  }
}
