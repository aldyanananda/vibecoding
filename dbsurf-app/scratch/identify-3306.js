import mysql from 'mysql2/promise';

async function identifyServer() {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      // We don't know the password for Windows MySQL, 
      // but we might get some info before failure or if it's blank.
      password: 'root123' 
    });
    console.log('Connected!'); // Unlikely
  } catch (err) {
    console.log('--- Identify Server at 127.0.0.1:3306 ---');
    console.log('Error Message:', err.message);
    // If it's Windows MySQL80 service, it usually has a specific error signature or we can see it in tasklist.
  }
}

identifyServer();
