
import pool from '../app/lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function testLoginSim() {
  const login = 'byteuser';
  const password = 'bytebase123';
  
  try {
    console.log('Querying user...');
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE username = ? OR email = ?`,
      [login, login]
    );
    console.log('Rows found:', rows.length);
    if (rows.length === 0) return;
    
    const user = rows[0];
    console.log('Comparing password...');
    const isMatch = (password === user.password) || await bcrypt.compare(password, user.password).catch((e) => {
        console.error('Bcrypt error:', e);
        return false;
    });
    console.log('Match:', isMatch);
    
    console.log('Generating token...');
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_super_secret_key_change_in_production',
      { expiresIn: '1d' }
    );
    console.log('Token generated:', token.slice(0, 20) + '...');
    process.exit(0);
  } catch (error) {
    console.error('SIM ERROR:', error);
    process.exit(1);
  }
}

testLoginSim();
