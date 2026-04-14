import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { getAuthenticatedUser, checkDatabaseAccess } from '@/app/lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dbId = searchParams.get('dbId');

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let dbName, rows, targetPool;
    let columnRows = [];
    let indexRows = [];
    let instanceInfo = { name: 'Local Instance', engine: 'mysql' };

    if (dbId) {
      // 1. Fetch external instance details and project association
      const [dbInfo] = await pool.query(`
        SELECT d.name as db_name, d.project_id, i.name as instance_name, i.address, i.db_user, i.db_password, i.engine 
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
      dbName = db.db_name;
      instanceInfo = { name: db.instance_name, engine: engine };
      
      const host = db.address.split(':')[0];
      const port = parseInt(db.address.split(':')[1] || (engine === 'mysql' ? '3306' : '5432'), 10);

      if (engine === 'mysql') {
        const conn = await mysql.createConnection({
          host, port, user: db.db_user, password: db.db_password, database: dbName
        });

        [columnRows] = await conn.query(`
          SELECT table_name, column_name, data_type, is_nullable, column_key
          FROM information_schema.columns
          WHERE table_schema = ?
          ORDER BY table_name, ordinal_position;
        `, [dbName]);

        [indexRows] = await conn.query(`
          SELECT table_name, index_name, column_name, non_unique, index_type
          FROM information_schema.statistics
          WHERE table_schema = ?
          ORDER BY table_name, index_name, seq_in_index;
        `, [dbName]);

        await conn.end();
      } else if (engine === 'postgresql' || engine === 'postgres') {
        const client = new Client({ host, port, user: db.db_user, password: db.db_password, database: dbName });
        await client.connect();

        const colRes = await client.query(`
          SELECT table_name, column_name, data_type, is_nullable, '' as column_key
          FROM information_schema.columns
          WHERE table_schema = 'public'
          ORDER BY table_name, ordinal_position;
        `);
        columnRows = colRes.rows;

        const idxRes = await client.query(`
          SELECT 
            t.relname as table_name,
            i.relname as index_name,
            a.attname as column_name,
            CASE WHEN ix.indisunique THEN 0 ELSE 1 END as non_unique,
            'BTREE' as index_type
          FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
          WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid 
            AND a.attnum = ANY(ix.indkey) AND t.relkind = 'r'
        `);
        indexRows = idxRes.rows;

        await client.end();
      }
    } else {
      // Default to internal bytebase_clone database
      dbName = process.env.DB_NAME || 'bytebase_clone';
      [columnRows] = await pool.query(`
        SELECT table_name, column_name, data_type, is_nullable, column_key
        FROM information_schema.columns
        WHERE table_schema = ?
        ORDER BY table_name, ordinal_position;
      `, [dbName]);

      [indexRows] = await pool.query(`
        SELECT table_name, index_name, column_name, non_unique, index_type
        FROM information_schema.statistics
        WHERE table_schema = ?
        ORDER BY table_name, index_name, seq_in_index;
      `, [dbName]);
    }
    
    // Transform flat rows into a nested structure
    const schemaMap = {};

    columnRows.forEach(row => {
      const tName = row.table_name || row.TABLE_NAME;
      const cName = row.column_name || row.COLUMN_NAME;
      const dType = row.data_type || row.DATA_TYPE;

      if (!schemaMap[tName]) {
        schemaMap[tName] = { name: tName, columns: [], indexes: [] };
      }
      schemaMap[tName].columns.push({ 
        name: cName, 
        type: dType, 
        nullable: row.is_nullable === 'YES',
        key: row.column_key || row.COLUMN_KEY 
      });
    });

    indexRows.forEach(row => {
      const tName = row.table_name || row.TABLE_NAME;
      const iName = row.index_name || row.INDEX_NAME;
      const cName = row.column_name || row.COLUMN_NAME;

      if (schemaMap[tName]) {
        let idxObj = schemaMap[tName].indexes.find(i => i.name === iName);
        if (!idxObj) {
          idxObj = { name: iName, columns: [], unique: row.non_unique === 0, type: row.index_type || row.INDEX_TYPE };
          schemaMap[tName].indexes.push(idxObj);
        }
        idxObj.columns.push(cName);
      }
    });

    return NextResponse.json({
      instance: instanceInfo,
      database: dbName,
      tables: Object.values(schemaMap)
    });
  } catch (error) {
    console.error('Metadata Fetch Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch database metadata',
      code: error.code || 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}
