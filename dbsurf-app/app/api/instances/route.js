import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { MongoClient } from 'mongodb';

async function checkConnection(inst) {
  const { engine, address, db_user, db_password } = inst;
  if (!address) return false;
  const [host, port] = address.split(':');

  try {
    if (engine.toLowerCase() === 'mysql') {
      const conn = await mysql.createConnection({
        host, port: parseInt(port) || 3306, user: db_user, password: db_password,
        connectTimeout: 2000
      });
      await conn.ping();
      await conn.end();
      return true;
    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
      const client = new Client({
        host, port: parseInt(port) || 5432, user: db_user, password: db_password,
        database: 'postgres',
        connectionTimeoutMillis: 2000
      });
      await client.connect();
      await client.end();
      return true;
    } else if (engine.toLowerCase() === 'mongodb' || engine.toLowerCase() === 'mongo') {
      const client = new MongoClient(`mongodb://${db_user}:${db_password}@${address}/?authSource=admin`, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      await client.close();
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}

export async function GET() {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, environment, engine, address, external_link, license, db_user, db_password, created_at, updated_at
      FROM instances
      ORDER BY created_at ASC
    `);
    
    // Check status in parallel with a timeout
    const instancesWithStatus = await Promise.all(rows.map(async (row) => {
      const isOnline = await checkConnection(row);
      const { db_password, ...sanitized } = row; // Hide password in response
      return { ...sanitized, status: isOnline ? 'OK' : 'NOT OK' };
    }));

    return NextResponse.json(instancesWithStatus);
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

export async function DELETE(request) {
  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs are required' }, { status: 400 });
    }

    await pool.query('DELETE FROM instances WHERE id IN (?)', [ids]);
    return NextResponse.json({ message: `${ids.length} instances deleted` });
  } catch (error) {
    console.error('Instances Bulk DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete instances' }, { status: 500 });
  }
}
