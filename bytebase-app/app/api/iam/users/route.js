import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import { getAuthenticatedUser } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'DBA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [rows] = await pool.query('SELECT id, username, email, role, created_at FROM users');
    return NextResponse.json(rows);
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

    const { username, email, password, role } = await req.json();

    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const hash = bcrypt.hashSync(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email || '', hash, role]
    );

    return NextResponse.json({ success: true, id: result.insertId });
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

    const { id } = await req.json();

    if (id === adminUser.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
