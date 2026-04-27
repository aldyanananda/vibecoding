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

    let views = [];
    let routines = [];
    let tableStats = [];
    let foreignKeys = [];
    let sequences = [];
    let dbName = '';
    let instanceInfo = null;
    let columnRows = [];
    let indexRows = [];

    if (dbId) {
      // (Keep existing dbId logic as is, it already checks access)
      const [dbInfo] = await pool.query(`
        SELECT d.name as db_name, d.project_id, i.name as instance_name, i.address, i.db_user, i.db_password, i.engine 
        FROM list_all_db d
        JOIN instances i ON d.instance_id = i.id
        WHERE d.id = ?
      `, [dbId]);

      if (dbInfo.length === 0) return NextResponse.json({ error: 'Database not found' }, { status: 404 });
      const db = dbInfo[0];

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

        // Foreign Keys
        const [fkRows] = await conn.query(`
          SELECT 
            TABLE_NAME as \`table\`, COLUMN_NAME as \`column\`, 
            REFERENCED_TABLE_NAME as refTable, REFERENCED_COLUMN_NAME as refColumn
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [dbName]);
        foreignKeys = fkRows;

        // Detailed Stats
        const [stats] = await conn.query(`
          SELECT 
            TABLE_NAME as name, ENGINE as engine, TABLE_COLLATION as collation, 
            TABLE_ROWS as rowCount, DATA_LENGTH as dataSize, INDEX_LENGTH as indexSize, 
            TABLE_COMMENT as comment, TABLE_TYPE as type
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = ?
        `, [dbName]);
        tableStats = stats.filter(s => (s.type || '').toUpperCase() === 'BASE TABLE');
        views = stats.filter(s => (s.type || '').toUpperCase() === 'VIEW').map(v => ({ name: v.name }));

        const [r] = await conn.query(`
          SELECT ROUTINE_NAME as name, ROUTINE_TYPE as type 
          FROM information_schema.ROUTINES 
          WHERE ROUTINE_SCHEMA = ?
        `, [dbName]);
        routines = r;

        await conn.end();
      } else if (engine === 'postgresql' || engine === 'postgres') {
        const client = new Client({ host, port, user: db.db_user, password: db.db_password, database: dbName });
        await client.connect();

        const colRes = await client.query(`
          SELECT table_name, column_name, data_type, is_nullable, '' as column_key
          FROM information_schema.columns
          WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
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

        // Foreign Keys for PG
        const fkRes = await client.query(`
          SELECT
            tc.table_name as "table", kcu.column_name as "column", 
            ccu.table_name AS "refTable", ccu.column_name AS "refColumn"
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
          WHERE constraint_type = 'FOREIGN KEY';
        `);
        foreignKeys = fkRes.rows;

        const statRes = await client.query(`
          SELECT 
            relname as name, 
            n_live_tup as "rowCount", 
            pg_relation_size(relid) as "dataSize",
            pg_indexes_size(relid) as "indexSize"
          FROM pg_stat_user_tables
        `);
        tableStats = statRes.rows.map(s => ({ ...s, engine: 'PostgreSQL', collation: 'default' }));

        const viewRes = await client.query(`SELECT table_name as name FROM information_schema.views WHERE table_schema = 'public'`);
        views = viewRes.rows;

        const routineRes = await client.query(`
          SELECT proname as name, CASE WHEN prokind = 'f' THEN 'FUNCTION' ELSE 'PROCEDURE' END as type
          FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
          WHERE nspname = 'public'
        `);
        routines = routineRes.rows;

        const seqRes = await client.query(`
          SELECT 
            sequencename as name, 
            data_type,
            start_value, 
            min_value as minimum_value, 
            max_value as maximum_value, 
            increment_by, 
            cache_size, 
            cycle as is_cycled,
            last_value
          FROM pg_sequences
          WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        `);
        sequences = seqRes.rows;

        await client.end();
      } else if (engine === 'mongodb' || engine === 'mongo') {
        const { MongoClient } = await import('mongodb');
        const user = encodeURIComponent(db.db_user || '');
        const pass = encodeURIComponent(db.db_password || '');
        const client = new MongoClient(`mongodb://${user}:${pass}@${db.address}/${dbName}?authSource=admin`, { serverSelectionTimeoutMS: 2000 });
        await client.connect();
        const mongoDb = client.db(dbName);
        const collections = await mongoDb.collections();
        
        tableStats = await Promise.all(collections.map(async col => {
          try {
            const stats = await mongoDb.command({ collStats: col.collectionName });
            return {
              name: col.collectionName,
              engine: 'MongoDB',
              rowCount: stats.count,
              dataSize: stats.size,
              indexSize: stats.totalIndexSize,
              type: 'BASE TABLE'
            };
          } catch (e) {
            console.warn(`Could not fetch stats for ${col.collectionName}:`, e.message);
            return {
              name: col.collectionName,
              engine: 'MongoDB',
              rowCount: 0,
              dataSize: 0,
              indexSize: 0,
              type: 'BASE TABLE'
            };
          }
        }));
        
        // Mock columns for tree view based on a sample document
        columnRows = [];
        for (const col of collections) {
          const sample = await col.findOne();
          if (sample) {
            Object.keys(sample).forEach(key => {
              columnRows.push({ table_name: col.collectionName, column_name: key, data_type: typeof sample[key], is_nullable: 'YES' });
            });
          }
        }
        await client.close();
      }
    } else if (user.role === 'DBA') {
      dbName = process.env.DB_NAME || 'dbsurf';
      [columnRows] = await pool.query(`SELECT table_name, column_name, data_type, is_nullable, column_key FROM information_schema.columns WHERE table_schema = ?`, [dbName]);
      [indexRows] = await pool.query(`SELECT table_name, index_name, column_name, non_unique, index_type FROM information_schema.statistics WHERE table_schema = ?`, [dbName]);
      
      const [stats] = await pool.query(`
        SELECT TABLE_NAME as name, ENGINE as engine, TABLE_ROWS as rowCount, DATA_LENGTH as dataSize, INDEX_LENGTH as indexSize, TABLE_TYPE as type
        FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?
      `, [dbName]);
      tableStats = stats.filter(s => (s.type || '').toUpperCase() === 'BASE TABLE');
    } else {
      return NextResponse.json({ instance: null, database: null, tables: [] });
    }
    
    const schemaMap = {};
    columnRows.forEach(row => {
      const tName = row.table_name || row.TABLE_NAME;
      if (!schemaMap[tName]) schemaMap[tName] = { name: tName, columns: [], indexes: [] };
      schemaMap[tName].columns.push({ name: row.column_name || row.COLUMN_NAME, type: row.data_type || row.DATA_TYPE, nullable: row.is_nullable === 'YES', key: row.column_key || row.COLUMN_KEY });
    });

    indexRows.forEach(row => {
      const tName = row.table_name || row.TABLE_NAME;
      if (schemaMap[tName]) {
        let idxObj = schemaMap[tName].indexes.find(i => i.name === (row.index_name || row.INDEX_NAME));
        if (!idxObj) {
          idxObj = { name: row.index_name || row.INDEX_NAME, columns: [], unique: row.non_unique === 0, type: row.index_type || row.INDEX_TYPE };
          schemaMap[tName].indexes.push(idxObj);
        }
        idxObj.columns.push(row.column_name || row.COLUMN_NAME);
      }
    });

    return NextResponse.json({
      instance: instanceInfo,
      database: dbName,
      projectId: dbId ? (await pool.query('SELECT project_id FROM list_all_db WHERE id = ?', [dbId]))[0][0]?.project_id : null,
      tables: Object.values(schemaMap),
      tableStats,
      views,
      foreignKeys,
      sequences,
      functions: routines.filter(r => r.type === 'FUNCTION'),
      procedures: routines.filter(r => r.type === 'PROCEDURE' || r.type === 'PROC' || r.type === 'PROCEDURE')
    });
  } catch (error) {
    console.error('Metadata Fetch Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch database metadata',
      code: error.code || 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}
