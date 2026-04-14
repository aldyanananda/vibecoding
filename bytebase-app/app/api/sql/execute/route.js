import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { getAuthenticatedUser, checkDatabaseAccess } from '@/app/lib/auth';

export async function POST(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { query, dbId } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
    }

    let rows, fields, resultData, columnNames, isResultSetHeader;
    const start = performance.now();

    if (dbId) {
      // 1. Fetch external instance details
      const [dbInfo] = await pool.query(`
        SELECT d.name, d.project_id, i.address, i.db_user, i.db_password, i.engine 
        FROM list_all_db d
        JOIN instances i ON d.instance_id = i.id
        WHERE d.id = ?
      `, [dbId]);

      if (dbInfo.length === 0) return NextResponse.json({ error: 'Database not found' }, { status: 404 });
      const db = dbInfo[0];

      // Check database access
      const hasAccess = await checkDatabaseAccess(user.id, user.role, db.project_id, dbId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this database' }, { status: 403 });
      }
      const engine = (db.engine || '').toLowerCase();
      const dbName = db.name;
      const host = db.address.split(':')[0];
      const port = parseInt(db.address.split(':')[1] || (engine === 'mysql' ? '3306' : '5432'), 10);

      if (engine === 'mysql') {
        const conn = await mysql.createConnection({
          host, port, user: db.db_user, password: db.db_password, database: dbName
        });
        [rows, fields] = await conn.query(query);
        await conn.end();

        isResultSetHeader = !Array.isArray(rows);
        resultData = isResultSetHeader ? [rows] : rows;
        if (fields) {
          columnNames = fields.map(field => field.name);
        } else if (isResultSetHeader) {
          columnNames = ['affectedRows', 'insertId', 'warningStatus', 'info'];
        }
      } else if (engine === 'postgresql' || engine === 'postgres') {
        const client = new Client({ host, port, user: db.db_user, password: db.db_password, database: dbName });
        await client.connect();
        const res = await client.query({ text: query, rowMode: 'array' });
        await client.end();

        resultData = res.rows;
        columnNames = res.fields.map(f => f.name);
        isResultSetHeader = res.command !== 'SELECT';
      }
    } else {
      // Default to internal bytebase_clone database
      const [rowsLocal, fieldsLocal] = await pool.query(query);
      isResultSetHeader = !Array.isArray(rowsLocal);
      resultData = isResultSetHeader ? [rowsLocal] : rowsLocal;
      if (fieldsLocal) {
        columnNames = fieldsLocal.map(field => field.name);
      } else if (isResultSetHeader) {
        columnNames = ['affectedRows', 'insertId', 'warningStatus', 'info'];
      }
    }
    
    const end = performance.now();
    const timeMs = end - start;

    return NextResponse.json({
      success: true,
      data: resultData,
      columns: columnNames || [],
      timeMs: Number(timeMs.toFixed(2)),
      isResultSetHeader
    });

  } catch (error) {
    console.error('SQL Execution Error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message,
      code: error.code,
      sqlState: error.sqlState
    }, { status: 400 });
  }
}
