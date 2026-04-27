import mysql from 'mysql2/promise';

async function test() {
  try {
    const config = {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'root123',
    };
    console.log('Connecting to localhost:3306 with root/root123...');
    const connection = await mysql.createConnection(config);
    console.log('Connected!');
    await connection.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
  }

  try {
    const config = {
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: 'root123',
    };
    console.log('Connecting to localhost:3307 with root/root123...');
    const connection = await mysql.createConnection(config);
    console.log('Connected!');
    await connection.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

test();
