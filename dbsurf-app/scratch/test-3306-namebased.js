import mysql from 'mysql2/promise';

const pws = ['lukal3306', 'LOKAL3306', '3306', 'root123'];

async function test() {
  for (const pw of pws) {
    try {
      const conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: pw,
      });
      console.log(`SUCCESS: password="${pw}"`);
      await conn.end();
      return;
    } catch (err) {
      console.log(`FAILED: password="${pw}" - ${err.message}`);
    }
  }
}

test();
