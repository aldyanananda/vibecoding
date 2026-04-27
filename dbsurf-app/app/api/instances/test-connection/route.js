import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { MongoClient } from 'mongodb';

export async function POST(request) {
  try {
    const { engine, address, db_user, db_password } = await request.json();

    if (!address || !engine) {
      return NextResponse.json({ success: false, error: 'Address and engine are required' });
    }

    const [host, port] = address.split(':');

    if (engine.toLowerCase() === 'mysql') {
      try {
        const conn = await mysql.createConnection({
          host,
          port: parseInt(port) || 3306,
          user: db_user,
          password: db_password,
          connectTimeout: 5000
        });
        await conn.ping();
        await conn.end();
        return NextResponse.json({ success: true });
      } catch (err) {
        return NextResponse.json({ success: false, error: err.message });
      }
    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
      try {
        const client = new Client({
          host,
          port: parseInt(port) || 5432,
          user: db_user,
          password: db_password,
          database: 'postgres',
          connectionTimeoutMillis: 5000
        });
        await client.connect();
        await client.end();
        return NextResponse.json({ success: true });
      } catch (err) {
        return NextResponse.json({ success: false, error: err.message });
      }
    } else if (engine.toLowerCase() === 'mongodb' || engine.toLowerCase() === 'mongo') {
      try {
        const client = new MongoClient(`mongodb://${db_user}:${db_password}@${address}/?authSource=admin`, { serverSelectionTimeoutMS: 5000 });
        await client.connect();
        await client.db('admin').command({ ping: 1 });
        await client.close();
        return NextResponse.json({ success: true });
      } catch (err) {
        return NextResponse.json({ success: false, error: err.message });
      }
    }

    return NextResponse.json({ success: false, error: 'Unsupported engine for connection test' });
  } catch (error) {
    console.error('Test Connection Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
