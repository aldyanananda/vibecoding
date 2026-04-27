import mysql from 'mysql2/promise';

async function test() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'bytebase',
    });
    console.log('SUCCESS: password="bytebase"');
    await conn.end();
  } catch (err) {
    console.log('FAILED: password="bytebase":', err.message);
  }
}

test();
