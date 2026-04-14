import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

// Parse "host:port" or "/socket:port" address string
function parseAddress(address) {
  if (!address) return { host: 'localhost', port: null };
  const str = address.trim();

  // e.g. "192.168.2.203:5433" or "192.168.3.68,192.168.3.174" (replica set)
  // Take only first host if comma-separated
  const firstHost = str.split(',')[0].trim();

  const lastColonIdx = firstHost.lastIndexOf(':');
  if (lastColonIdx === -1) {
    return { host: firstHost, port: null };
  }

  const host = firstHost.substring(0, lastColonIdx);
  const port = parseInt(firstHost.substring(lastColonIdx + 1), 10) || null;
  return { host, port };
}

async function listMysqlDatabases(host, port, user, password) {
  const mysql = (await import('mysql2/promise')).default;
  const connection = await mysql.createConnection({
    host,
    port: port || 3306,
    user: user || process.env.DB_USER || 'root',
    password: password || process.env.DB_PASSWORD || '',
    connectTimeout: 5000,
  });
  const [rows] = await connection.query('SHOW DATABASES');
  await connection.end();
  return rows.map(r => Object.values(r)[0]);
}

async function listPostgresDatabases(host, port, user, password) {
  const { Client } = await import('pg');
  const client = new Client({
    host,
    port: port || 5432,
    user: user || process.env.PG_USER || process.env.DB_USER || 'postgres',
    password: password || process.env.PG_PASSWORD || process.env.DB_PASSWORD || '',
    database: 'postgres',
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
  await client.end();
  return res.rows.map(r => r.datname);
}

async function listMongoDatabases(host, port, user, password) {
  const { MongoClient } = await import('mongodb');
  // Handle auth if user/pass provided
  const authPart = user && password ? `${user}:${password}@` : '';
  const uri = `mongodb://${authPart}${host}:${port || 27017}`;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const adminDb = client.db().admin();
  const { databases } = await adminDb.listDatabases();
  await client.close();
  return databases.map(d => d.name);
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Fetch the instance from our DB
    const [rows] = await pool.query(
      'SELECT id, name, environment, engine, address, db_user, db_password FROM instances WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const instance = rows[0];
    const { host, port } = parseAddress(instance.address);
    const engine = (instance.engine || '').toLowerCase();
    const { db_user, db_password } = instance;

    let databases = [];
    let connectionError = null;

    try {
      if (engine === 'mysql') {
        databases = await listMysqlDatabases(host, port, db_user, db_password);
      } else if (engine === 'postgresql' || engine === 'postgres') {
        databases = await listPostgresDatabases(host, port, db_user, db_password);
      } else if (engine === 'mongodb' || engine === 'mongo') {
        databases = await listMongoDatabases(host, port, db_user, db_password);
      } else {
        connectionError = `Unsupported engine: ${instance.engine}`;
      }
    } catch (connErr) {
      connectionError = connErr.message;
    }

    return NextResponse.json({
      instance,
      host,
      port,
      databases,
      connectionError,
    });
  } catch (error) {
    console.error('Instance databases error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
