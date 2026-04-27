
import mysql from 'mysql2/promise';

async function renameDatabase() {
  const oldDb = 'bytebase_clone';
  const newDb = 'dbsurf';
  
  const config = {
    host: 'localhost',
    port: 3307,
    user: 'byteuser',
    password: 'bytebase123'
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log(`Connected to MySQL.`);

    // 1. Create new database
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${newDb}`);
    console.log(`Created database ${newDb} (if not exists).`);

    // 2. Get list of tables from old database
    const [tables] = await connection.query(`SHOW TABLES FROM ${oldDb}`);
    
    if (tables.length > 0) {
      const tableNames = tables.map(row => Object.values(row)[0]);
      console.log(`Found tables in ${oldDb}: ${tableNames.join(', ')}`);

      // 3. Rename each table to the new database
      for (const table of tableNames) {
        await connection.query(`RENAME TABLE ${oldDb}.${table} TO ${newDb}.${table}`);
        console.log(`Moved table ${table} to ${newDb}`);
      }
    } else {
      console.log(`No tables found in ${oldDb}.`);
    }

    // 4. Optionally drop the old database
    // await connection.query(`DROP DATABASE ${oldDb}`);
    // console.log(`Dropped old database ${oldDb}.`);

    await connection.end();
    console.log('Database rename completed successfully.');
  } catch (error) {
    if (error.code === 'ER_BAD_DB_ERROR') {
         console.error(`Database ${oldDb} does not exist. Skipping rename.`);
    } else {
        console.error('Error during database rename:', error);
    }
  }
}

renameDatabase();
