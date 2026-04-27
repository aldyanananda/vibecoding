import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function fixUser() {
  const config = {
    host: 'localhost',
    port: 3307,
    user: 'byteuser',
    password: 'bytebase123',
    database: 'bytebase_clone',
  };
  const conn = await mysql.createConnection(config);
  
  const password = 'tmuser123';
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  
  console.log('New hash for tmuser123:', hash);
  
  await conn.query('UPDATE users SET password = ? WHERE username = ?', [hash, 'tmuser']);
  console.log('Updated tmuser password with correct hash.');
  
  await conn.end();
}

fixUser();
