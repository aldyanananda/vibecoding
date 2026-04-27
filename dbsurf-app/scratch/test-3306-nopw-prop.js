import mysql from 'mysql2/promise';

async function test() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      // No password property
    });
    console.log('SUCCESS: connected to 3306 with root (no password property)');
    await conn.end();
  } catch (err) {
    console.log('FAILED root (no password property):', err.message);
  }
}

test();
