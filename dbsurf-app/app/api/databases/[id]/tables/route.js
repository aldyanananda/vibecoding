import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import mysql from 'mysql2/promise';
import { Client } from 'pg';

export async function GET(request, { params }) {
  const { id } = await params;

  try {
    // 1. Get Instance Details
    const [dbRows] = await pool.query(`
      SELECT d.*, i.address, i.db_user, i.db_password, i.engine 
      FROM list_all_db d
      JOIN instances i ON d.instance_id = i.id
      WHERE d.id = ?
    `, [id]);

    if (dbRows.length === 0) return NextResponse.json({ error: 'DB not found' }, { status: 404 });
    const db = dbRows[0];
    const engine = (db.engine || '').toLowerCase();
    const host = db.address.split(':')[0];
    const port = parseInt(db.address.split(':')[1] || (engine === 'mysql' ? '3306' : '5432'), 10);

    let metadata = { encoding: 'N/A', collation: 'N/A' };
    let tables = [];

    if (engine === 'mysql') {
      const conn = await mysql.createConnection({
        host, port, user: db.db_user, password: db.db_password, database: db.name
      });

      // Get Metadata
      const [metaRows] = await conn.query(`
        SELECT DEFAULT_CHARACTER_SET_NAME as encoding, DEFAULT_COLLATION_NAME as collation 
        FROM information_schema.SCHEMATA 
        WHERE SCHEMA_NAME = ?
      `, [db.name]);
      if (metaRows.length > 0) metadata = metaRows[0];

      // Get Tables
      const [tableRows] = await conn.query('SHOW TABLE STATUS');
      tables = tableRows.map(t => ({
        schema: db.name,
        name: t.Name,
        classification: 'N/A',
        partitioned: t.Create_options?.includes('partitioned') ? 'Yes' : 'No',
        rowCount: t.Rows || 0,
        dataSize: (t.Data_length / 1024).toFixed(2) + ' KB',
        indexSize: (t.Index_length / 1024).toFixed(2) + ' KB',
        comment: t.Comment || ''
      }));

      await conn.end();
    } 
    else if (engine === 'postgresql' || engine === 'postgres') {
      const client = new Client({
        host, port, user: db.db_user, password: db.db_password, database: db.name
      });
      await client.connect();

      // Get Metadata
      const metaRes = await client.query(`
        SELECT pg_encoding_to_char(encoding) as encoding, datcollate as collation 
        FROM pg_database 
        WHERE datname = $1
      `, [db.name]);
      if (metaRes.rows.length > 0) metadata = metaRes.rows[0];

      // Get Tables
      const tableRes = await client.query(`
        SELECT 
          schemaname as schema, 
          relname as name, 
          n_live_tup as row_count_est,
          pg_total_relation_size(relid) as total_size,
          pg_relation_size(relid) as data_size,
          pg_indexes_size(relid) as index_size
        FROM pg_stat_user_tables
      `);
      tables = tableRes.rows.map(t => ({
        schema: t.schema,
        name: t.name,
        classification: 'N/A',
        partitioned: 'No',
        rowCount: t.row_count_est || 0,
        totalSize: (t.total_size / 1024).toFixed(2) + ' KB',
        dataSize: (t.data_size / 1024).toFixed(2) + ' KB',
        indexSize: (t.index_size / 1024).toFixed(2) + ' KB',
        comment: ''
      }));

      await client.end();
    }

    return NextResponse.json({ metadata, tables });
  } catch (error) {
    console.error('Table fetch error:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error occurred while fetching tables',
      details: error.code || undefined
    }, { status: 500 });
  }
}
