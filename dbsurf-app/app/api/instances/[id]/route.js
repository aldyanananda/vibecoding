import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const [rows] = await pool.query(
      'SELECT id, name, environment, engine, address, external_link, license, db_user, db_password, created_at, updated_at FROM instances WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Instance GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch instance' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, environment, engine, address, external_link, db_user, db_password } = body;

    await pool.query(
      'UPDATE instances SET name=?, environment=?, engine=?, address=?, external_link=?, db_user=?, db_password=? WHERE id=?',
      [name, environment, engine, address, external_link, db_user, db_password, id]
    );

    return NextResponse.json({ message: 'Instance updated' });
  } catch (error) {
    console.error('Instance PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update instance' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await pool.query('DELETE FROM instances WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Instance deleted' });
  } catch (error) {
    console.error('Instance DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete instance' }, { status: 500 });
  }
}
