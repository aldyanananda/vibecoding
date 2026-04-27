import mysql from 'mysql2/promise';

async function testDeep() {
  const config = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'root123',
  };
  
  try {
    console.log('Connecting with config:', { ...config, password: '***' });
    const conn = await mysql.createConnection(config);
    console.log('SUCCESS!');
    await conn.end();
  } catch (err) {
    console.log('FAILED!');
    console.log('Error Code:', err.code);
    console.log('Error Number:', err.errno);
    console.log('SQL State:', err.sqlState);
    console.log('Message:', err.message);
    console.log('Full Error:', JSON.stringify(err, null, 2));
  }
}

testDeep();
