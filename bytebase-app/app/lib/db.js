import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER || 'byteuser',
  password: process.env.DB_PASSWORD || 'bytebase123',
  database: process.env.DB_NAME || 'bytebase_clone',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
