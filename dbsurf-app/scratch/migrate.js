const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Mock pool config from current environment or project defaults
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER || 'byteuser',
  password: process.env.DB_PASSWORD || 'bytebase123',
  database: process.env.DB_NAME || 'bytebase_clone',
  multipleStatements: true
};

async function run() {
  console.log('Connecting to database...');
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Creating databases table...');
    const schema = fs.readFileSync(path.join(__dirname, '..', 'seed_databases.sql'), 'utf8');
    await connection.query(schema);
    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await connection.end();
  }
}

run();
