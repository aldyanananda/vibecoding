import mysql from 'mysql2/promise';

async function testInstance1() {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
    });
    console.log('SUCCESS: connected to instance 1 (3306) with root/no-password');
    await conn.end();
  } catch (err) {
    console.log('FAILED: instance 1 (3306) with root/no-password:', err.message);
  }
}

testInstance1();
