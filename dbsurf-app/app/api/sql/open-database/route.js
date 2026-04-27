import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import { getAuthenticatedUser } from '@/app/lib/auth';

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { instanceId, dbName } = await request.json();

    if (!instanceId || !dbName) {
      return NextResponse.json({ error: 'Missing instanceId or dbName' }, { status: 400 });
    }

    // Fetch instance details for registration
    const [instRows] = await pool.query(
      'SELECT environment, engine, address FROM instances WHERE id = ?',
      [instanceId]
    );
    if (!instRows.length) return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    const instance = instRows[0];

    // Check if database already exists in our management table
    const [existing] = await pool.query(
      'SELECT id FROM list_all_db WHERE instance_id = ? AND name = ?',
      [instanceId, dbName]
    );

    if (existing.length > 0) {
      return NextResponse.json({ dbId: existing[0].id });
    }

    // Auto-register discovered database with full instance context
    const [result] = await pool.query(
      'INSERT INTO list_all_db (instance_id, name, environment, engine, address) VALUES (?, ?, ?, ?, ?)',
      [instanceId, dbName, instance.environment, instance.engine, instance.address]
    );

    return NextResponse.json({ dbId: result.insertId });
  } catch (error) {
    console.error('Quick Open Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
