import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import mysql from 'mysql2/promise';

const SYSTEM_DBS = ['mysql', 'information_schema', 'performance_schema', 'sys', 'postgres', 'admin', 'config', 'local', 'temp'];

export async function POST() {
  try {
    // 1. Fetch all instances
    const [instances] = await pool.query('SELECT * FROM instances');
    let totalSynced = 0;

    for (const instance of instances) {
      const engine = (instance.engine || '').toLowerCase();
      
      try {
        if (engine === 'mysql') {
          // MySQL Discovery
          const conn = await mysql.createConnection({
            host: instance.address.split(':')[0],
            port: parseInt(instance.address.split(':')[1] || '3306', 10),
            user: instance.db_user,
            password: instance.db_password,
            connectTimeout: 5000 // 5s timeout
          });

          const [dbs] = await conn.query('SHOW DATABASES');
          await conn.end();

          const currentDbNames = [];
          for (const dbRow of dbs) {
            const dbName = dbRow.Database;
            if (SYSTEM_DBS.includes(dbName.toLowerCase())) continue;
            currentDbNames.push(dbName);

            await pool.query(
              `INSERT INTO list_all_db (name, instance_id, environment, engine, address) 
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
              [dbName, instance.id, instance.environment, instance.engine, instance.address]
            );
            totalSynced++;
          }

          // 5. Dynamic Cleanup: Remove databases from our system that were dropped from the backend
          if (currentDbNames.length > 0) {
            await pool.query(
              'DELETE FROM list_all_db WHERE instance_id = ? AND name NOT IN (?)',
              [instance.id, currentDbNames]
            );
          } else {
            // If the server has NO valid databases left, clear all for this instance
            await pool.query('DELETE FROM list_all_db WHERE instance_id = ?', [instance.id]);
          }
        } 
        else if (engine === 'postgresql' || engine === 'postgres') {
          // For Postgres, we would normally use a pg client. 
          // Since it's a demo/lite app, we'll implement a mock discovery 
          // or assume common SQL patterns if a pg library was added.
          // For now, I'll add the logic structure for Postgres.
          console.log(`Discovered Postgres instance: ${instance.name}`);
        }
      } catch (err) {
        console.warn(`[Sync Partition] Skipping instance "${instance.name}": ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, count: totalSynced });
  } catch (error) {
    console.error('Core Sync Error:', error);
    return NextResponse.json({ error: 'Failed to sync databases' }, { status: 500 });
  }
}
