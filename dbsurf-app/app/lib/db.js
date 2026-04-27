import mysql from 'mysql2/promise';

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3307,
  user: process.env.DB_USER || 'byteuser',
  password: process.env.DB_PASSWORD || 'bytebase123',
  database: process.env.DB_NAME || 'dbsurf',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  idleTimeout: 120000, 
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

let pool;

if (process.env.NODE_ENV === 'production') {
  pool = mysql.createPool(poolConfig);
} else {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mysqlPool) {
    global._mysqlPool = mysql.createPool(poolConfig);
  }
  pool = global._mysqlPool;
}

export async function getDb() {
  return pool;
}

export default pool;
