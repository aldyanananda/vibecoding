import mysql from 'mysql2/promise';

async function testInsecure() {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'root123',
    });
    console.log('SUCCESS: connected with root/root123');
    await conn.end();
  } catch (err) {
    console.log('FAILED root/root123:', err.message);
  }

  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'root123',
    });
    console.log('SUCCESS: connected with root/root123 (localhost)');
    await conn.end();
  } catch (err) {
    console.log('FAILED root/root123 (localhost):', err.message);
  }
}

testInsecure();
