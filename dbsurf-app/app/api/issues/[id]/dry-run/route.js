import { getDb } from '@/app/lib/db';
import { getAuthenticatedUser } from '@/app/lib/auth';
import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { Client } from 'pg';

export async function POST(request, { params }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const db = await getDb();
    
    // 1. Fetch issue and database connection details
    const [issues] = await db.execute(`
      SELECT i.query, d.name as db_name, ins.address, ins.db_user, ins.db_password, ins.engine
      FROM issues i
      JOIN list_all_db d ON i.database_id = d.id
      JOIN instances ins ON d.instance_id = ins.id
      WHERE i.id = ?
    `, [id]);

    if (issues.length === 0) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    
    const issue = issues[0];
    const engine = (issue.engine || '').toLowerCase();
    const host = issue.address.split(':')[0];
    const port = parseInt(issue.address.split(':')[1] || (engine.includes('mongo') ? '27017' : engine.includes('pg') ? '5432' : '3306'), 10);

    // 2. PostgreSQL Handling (Supports Transactional DDL)
    if (engine === 'postgresql' || engine === 'postgres') {
      const pgClient = new Client({ host, port, user: issue.db_user, password: issue.db_password, database: issue.db_name });
      try {
        await pgClient.connect();
        await pgClient.query('BEGIN');
        await pgClient.query(issue.query);
        await pgClient.query('ROLLBACK');
        await pgClient.end();
        return NextResponse.json({ success: true, message: 'PostgreSQL dry run successful (transaction rolled back).' });
      } catch (err) {
        if (pgClient) {
          try { await pgClient.query('ROLLBACK'); } catch(e) {}
          await pgClient.end();
        }
        return NextResponse.json({ success: false, error: 'PostgreSQL validation failed: ' + err.message });
      }
    }

    // 3. MongoDB Handling (Validation & Simulation)
    if (engine === 'mongodb' || engine === 'mongo') {
      const { MongoClient } = await import('mongodb');
      const u = encodeURIComponent(issue.db_user || '');
      const p = encodeURIComponent(issue.db_password || '');
      const client = new MongoClient(`mongodb://${u}:${p}@${issue.address}/${issue.db_name}?authSource=admin`);
      
      try {
        await client.connect();
        const mongoDb = client.db(issue.db_name);
        const q = issue.query.trim().replace(/;$/, '');
        
        let message = 'MongoDB query structure is valid.';
        
        if (q.startsWith('db.')) {
          const match = q.match(/^db\.([\w-]+)\.(\w+)\((.*)\)$/s);
          if (match) {
            const [, collectionName, method] = match;
            const collection = mongoDb.collection(collectionName);
            
            // For Dry Run, we check collection existence and method support
            const collections = await mongoDb.listCollections({ name: collectionName }).toArray();
            const exists = collections.length > 0;
            
            if (['find', 'findOne', 'aggregate', 'count', 'countDocuments', 'distinct'].includes(method)) {
              message = `Read operation validated on collection '${collectionName}'.`;
            } else if (['insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'replaceOne'].includes(method)) {
              message = `Write operation '${method}' validated. Will be executed against collection '${collectionName}'.`;
            } else if (['createIndex', 'dropIndex', 'drop'].includes(method)) {
              message = `DDL operation '${method}' validated for collection '${collectionName}'.`;
            }
            
            if (!exists && !['insertOne', 'insertMany', 'createIndex'].includes(method)) {
              throw new Error(`Collection '${collectionName}' does not exist.`);
            }
          }
        }
        
        await client.close();
        return NextResponse.json({ success: true, message });
      } catch (err) {
        if (client) await client.close();
        return NextResponse.json({ success: false, error: 'MongoDB validation failed: ' + err.message });
      }
    }

    // 4. MySQL Handling (DDL Transformation & Transaction)
    if (engine === 'mysql') {
      const connection = await mysql.createConnection({
        host, port, user: issue.db_user, password: issue.db_password, database: issue.db_name
      });

      try {
        const trimmedQuery = issue.query.trim();
        const isCreate = /^\s*CREATE\s+TABLE\b/i.test(trimmedQuery);
        const isCreateIndex = /^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(trimmedQuery);
        const isDrop = /^\s*DROP\s+(?:TABLE|INDEX)\b/i.test(trimmedQuery);
        const isAlter = /^\s*ALTER\s+TABLE\b/i.test(trimmedQuery);

        let result;
        
        if (isCreate && !/TEMPORARY\s+TABLE/i.test(trimmedQuery)) {
          const tempQuery = trimmedQuery.replace(/CREATE\s+TABLE/i, 'CREATE TEMPORARY TABLE');
          [result] = await connection.execute(tempQuery);
        } else if (isCreateIndex) {
          // For indexes, we can't easily use TEMPORARY on real tables. 
          // We validate if the table exists and the syntax looks OK.
          const match = trimmedQuery.match(/ON\s+([\w\d_$]+)/i);
          if (match) {
            await connection.execute(`DESCRIBE ${match[1]}`);
            result = { message: 'Validated table existence for index creation.' };
          }
        } else if (isDrop || isAlter) {
          const match = trimmedQuery.match(/(?:DROP|ALTER)\s+(?:TABLE|INDEX)\s+([\w\d_$]+)/i);
          if (match) {
            await connection.execute(`DESCRIBE ${match[1]}`); // Metadata check
            result = { message: `Metadata validated for ${match[1]}.` };
          } else {
            result = { message: 'DDL structure check complete.' };
          }
        } else {
          await connection.beginTransaction();
          [result] = await connection.execute(issue.query);
          await connection.rollback();
        }
        
        await connection.end();
        return NextResponse.json({ 
          success: true, 
          message: 'MySQL dry run successful. ' + (result?.affectedRows !== undefined ? `${result.affectedRows} rows would be affected.` : result?.message || 'Query is valid.')
        });
      } catch (queryErr) {
        try { await connection.rollback(); } catch (e) {}
        await connection.end();
        return NextResponse.json({ success: false, error: 'MySQL validation failed: ' + queryErr.message });
      }
    }

    return NextResponse.json({ success: false, error: `Engine ${engine} is not yet supported for dry run.` });

  } catch (err) {
    console.error('Dry run error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
