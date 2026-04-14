import mysql from 'mysql2/promise';

async function test() {
  try {
    const config = {
      host: 'localhost',
      port: 3307,
      user: 'byteuser',
      password: 'bytebase123',
      database: 'bytebase_clone',
    };
    const connection = await mysql.createConnection(config);

    console.log('--- list_all_db ---');
    const [dbs] = await connection.query('SELECT * FROM list_all_db');
    console.log(JSON.stringify(dbs, null, 2));

    console.log('--- instances ---');
    const [instances] = await connection.query('SELECT * FROM instances');
    console.log(JSON.stringify(instances, null, 2));

    await connection.end();
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
