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

      // ENFORCE GLOBAL APPROVAL RULE
      const engine = (db.engine || '').toLowerCase();
      const isMongo = engine.startsWith('mongo');
      const isDeveloper = user.role?.toLowerCase() === 'developer';

      if (isDeveloper) {
        let isModifying = false;
        const trimmedQuery = query.trim();
        
        if (isMongo) {
          const match = trimmedQuery.match(/^db\.[\w-]+\.(\w+)\(/s);
          if (match) {
            const method = match[1];
            const safeMethods = ['find', 'findOne', 'aggregate', 'count', 'countDocuments', 'distinct'];
            if (!safeMethods.includes(method)) isModifying = true;
          } else {
            isModifying = true;
          }
        } else {
          const safePrefixes = /^\s*(SELECT|SHOW|DESCRIBE|EXPLAIN)\b/i;
          isModifying = !safePrefixes.test(trimmedQuery);
        }

        if (isModifying) {
          return NextResponse.json({ 
            error: 'Approval Required: DDL/DML queries require DBA approval. Please create an issue instead of direct execution.' 
          }, { status: 403 });
        }
      }

      // Check database access
      const hasAccess = await checkDatabaseAccess(user.id, user.role, db.project_id, dbId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this database' }, { status: 403 });
      }
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
        const res = await client.query(query);
        await client.end();

        resultData = res.rows;
        columnNames = res.fields.map(f => f.name);
        isResultSetHeader = res.command !== 'SELECT';
      } else if (engine === 'mongodb' || engine === 'mongo') {
        const { MongoClient } = await import('mongodb');
        const user = encodeURIComponent(db.db_user || '');
        const pass = encodeURIComponent(db.db_password || '');
        const client = new MongoClient(`mongodb://${user}:${pass}@${db.address}/${dbName}?authSource=admin`, { serverSelectionTimeoutMS: 5000 });
        await client.connect();
        const mongoDb = client.db(dbName);
        
        let docs = [];
        const q = query.trim().replace(/;$/, '');
        
        try {
          if (q.startsWith('{')) {
            // Standard Mongo Command (JSON)
            const command = JSON.parse(q);
            const res = await mongoDb.command(command);
            docs = Array.isArray(res) ? res : [res];
          } else if (q.startsWith('db.')) {
            // Smart Shell Command Parser
            const match = q.match(/^db\.([\w-]+)\.(\w+)\((.*)\)$/s);
            if (match) {
              const [, collectionName, method, argsStr] = match;
              const collection = mongoDb.collection(collectionName);
              
              // Attempt to parse arguments (flexible JSON)
              let args = [];
              if (argsStr.trim()) {
                try {
                  // Try to make valid JSON by quoting keys
                  const jsonStr = argsStr.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":').replace(/'/g, '"');
                  // Wrap in array to parse multiple arguments like `{}, {}`
                  args = JSON.parse(`[${jsonStr}]`);
                } catch (e) {
                  // If it's something like _id: 1 without braces, or complex syntax, we might fail here
                  console.error('Failed to parse MongoDB args:', e);
                }
              }

              if (method === 'find') {
                docs = await collection.find(args[0] || {}).limit(100).toArray();
              } else if (method === 'findOne') {
                const doc = await collection.findOne(args[0] || {});
                docs = doc ? [doc] : [];
              } else if (method === 'aggregate') {
                docs = await collection.aggregate(Array.isArray(args[0]) ? args[0] : [args[0]]).toArray();
              } else if (method === 'countDocuments' || method === 'count') {
                const count = await collection.countDocuments(args[0] || {});
                docs = [{ count }];
              } else if (method === 'insertOne') {
                const result = await collection.insertOne(args[0] || {});
                docs = [{ acknowledged: result.acknowledged, insertedId: result.insertedId }];
              } else if (method === 'insertMany') {
                const result = await collection.insertMany(args[0] || []);
                docs = [{ acknowledged: result.acknowledged, insertedCount: result.insertedCount }];
              } else if (method === 'updateOne') {
                let updateDoc = args[1] || {};
                if (Object.keys(updateDoc).length > 0 && !Object.keys(updateDoc).some(key => key.startsWith('$'))) {
                  updateDoc = { $set: updateDoc };
                }
                const result = await collection.updateOne(args[0] || {}, updateDoc);
                docs = [{ acknowledged: result.acknowledged, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }];
              } else if (method === 'updateMany') {
                let updateDoc = args[1] || {};
                if (Object.keys(updateDoc).length > 0 && !Object.keys(updateDoc).some(key => key.startsWith('$'))) {
                  updateDoc = { $set: updateDoc };
                }
                const result = await collection.updateMany(args[0] || {}, updateDoc);
                docs = [{ acknowledged: result.acknowledged, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }];
              } else if (method === 'deleteOne') {
                const result = await collection.deleteOne(args[0] || {});
                docs = [{ acknowledged: result.acknowledged, deletedCount: result.deletedCount }];
              } else if (method === 'deleteMany') {
                const result = await collection.deleteMany(args[0] || {});
                docs = [{ acknowledged: result.acknowledged, deletedCount: result.deletedCount }];
              } else {
                throw new Error(`Method '${method}' is not supported yet in this editor.`);
              }
            } else {
              throw new Error("Invalid MongoDB query format. Use db.collection.find({...}) or a JSON command.");
            }
          } else {
            // Fallback: collection name only
            const collection = mongoDb.collection(q);
            docs = await collection.find({}).limit(100).toArray();
          }
        } catch (err) {
          throw new Error(`MongoDB: ${err.message}`);
        }
        
        await client.close();
        resultData = docs;
        columnNames = docs.length > 0 ? Object.keys(docs[0]) : ['_id'];
        isResultSetHeader = false;
      }
    } else {
      // Default to internal dbsurf database
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
