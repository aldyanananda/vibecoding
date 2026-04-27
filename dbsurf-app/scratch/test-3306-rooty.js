import mysql from 'mysql2/promise';

async function test() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'rooty',
      password: 'root123',
    });
    console.log(`SUCCESS: user="rooty", password="root123"`);
    await conn.end();
  } catch (err) {
    console.log(`FAILED: user="rooty", password="root123" - ${err.message}`);
  }
}

test();
