import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function test() {
  try {
    const config = {
      host: 'localhost',
      port: 3307,
      user: 'byteuser',
      password: 'bytebase123',
      database: 'bytebase_clone',
    };
    console.log('Connecting to DB with config:', config);
    const connection = await mysql.createConnection(config);

    console.log('Checking users table...');
    const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['byteuser']);
    
    if (rows && rows.length > 0) {
      const user = rows[0];
      console.log('Found user:', user.username);
      const plainPass = 'bytebase123';
      const dbPass = user.password;
      console.log('Plain password:', plainPass);
      console.log('DB password:', dbPass);
      
      const isPlainMatch = plainPass === dbPass;
      console.log('Plain match:', isPlainMatch);
      
      const isBcryptMatch = await bcrypt.compare(plainPass, dbPass).catch(() => false);
      console.log('Bcrypt match:', isBcryptMatch);
    } else {
      console.log('User not found');
    }

    await connection.end();
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
