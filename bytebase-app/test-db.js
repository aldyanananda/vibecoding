import mysql from 'mysql2/promise';

async function testConnection() {
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USER || 'byteuser',
      password: process.env.DB_PASSWORD || 'bytebase123',
      database: process.env.DB_NAME || 'bytebase_clone'
    };
    console.log('Connecting with', dbConfig);
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Connection error:', error);
    process.exit(1);
  }
}

testConnection();
