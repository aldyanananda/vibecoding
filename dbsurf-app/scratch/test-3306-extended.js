import mysql from 'mysql2/promise';

async function test() {
  const configs = [
    { user: 'root', password: 'root123' },
    { user: 'root', password: '' },
    { user: 'root', password: 'password' },
    { user: 'root', password: 'root' },
    { user: 'root', password: '123' },
    { user: 'root', password: '1234' },
    { user: 'root', password: '123456' },
  ];

  for (const config of configs) {
    try {
      const conn = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        ...config,
        connectTimeout: 2000
      });
      console.log(`SUCCESS: user=${config.user}, password=${config.password}`);
      const [rows] = await conn.query('SELECT VERSION() as v');
      console.log('Version:', rows[0].v);
      await conn.end();
      return;
    } catch (err) {
      console.log(`FAILED: user=${config.user}, password=${config.password} - ${err.message}`);
    }
  }
}

test();
