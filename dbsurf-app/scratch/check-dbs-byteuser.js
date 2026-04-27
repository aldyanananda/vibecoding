import mysql from 'mysql2/promise';

async function checkDatabases() {
  try {
    const config = {
      host: 'localhost',
      port: 3307,
      user: 'byteuser',
      password: 'bytebase123',
    };
    const connection = await mysql.createConnection(config);

    console.log('Querying all databases on localhost:3307 with byteuser...');
    const [rows] = await connection.query('SHOW DATABASES');
    console.log(rows.map(r => r.Database || r.database));

    await connection.end();
  } catch (err) {
    console.error('Failed to list databases:', err.message);
  }
}

checkDatabases();
