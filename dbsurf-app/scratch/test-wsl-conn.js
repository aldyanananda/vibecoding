import mysql from 'mysql2/promise';

async function testWsl() {
  const wslIp = '172.27.133.125';
  try {
    const conn = await mysql.createConnection({
      host: wslIp,
      port: 3306,
      user: 'root',
      password: 'root123',
      connectTimeout: 5000,
    });
    console.log(`SUCCESS: connected to WSL MySQL at ${wslIp}:3306`);
    await conn.end();
  } catch (err) {
    console.log(`FAILED to connect to WSL MySQL at ${wslIp}:3306 - ${err.message}`);
  }
}

testWsl();
