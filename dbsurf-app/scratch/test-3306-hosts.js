import mysql from 'mysql2/promise';

async function test() {
  const hosts = ['127.0.0.1', 'localhost', '::1'];
  const pws = ['root123', ''];
  
  for (const host of hosts) {
    for (const pw of pws) {
      try {
        const conn = await mysql.createConnection({
          host: host,
          port: 3306,
          user: 'root',
          password: pw,
        });
        console.log(`SUCCESS: host=${host}, password="${pw}"`);
        await conn.end();
        return;
      } catch (err) {
        console.log(`FAILED: host=${host}, password="${pw}" - ${err.message}`);
      }
    }
  }
}

test();
