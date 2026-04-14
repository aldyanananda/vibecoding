const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function test() {
  try {
    const pool = mysql.createPool({
      host: '127.0.0.1',
      port: 3307,
      user: 'byteuser',
      password: 'bytebase123',
      database: 'bytebase_clone',
    });

    console.log('Testing DB connection...');
    const result = await pool.query('SELECT * FROM users WHERE username = ?', ['byteuser']);
    const rows = result[0];
    
    if (rows && rows.length > 0) {
      const user = rows[0];
      console.log('Found user:', user.username);
      const plainPass = 'bytebase123';
      const dbPass = user.password;
      console.log('Checking password:', plainPass, 'against', dbPass);
      
      const isMatch = (plainPass === dbPass) || await bcrypt.compare(plainPass, dbPass).catch(() => false);
      console.log('Match result:', isMatch);
    } else {
      console.log('User not found');
    }

    await pool.end();
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
