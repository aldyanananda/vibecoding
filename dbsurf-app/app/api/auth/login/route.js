import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'your_super_secret_key_change_in_production',
    { expiresIn: '1d' }
  );
}

export async function POST(req) {
  try {
    const { login, password } = await req.json();

    if (!login || !password) {
      return NextResponse.json({ error: 'Please provide both username/email and password.' }, { status: 400 });
    }

    const [rows] = await pool.query(
      `SELECT * FROM users WHERE username = ? OR email = ?`,
      [login, login]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const user = rows[0];

    // Check if the password matches. Note: you should handle hashing/plaintext dynamically based on your testing setup.
    // Assuming the user might be testing with plaintext right now as per the script:
    const isMatch = (password === user.password) || await bcrypt.compare(password, user.password).catch(() => false);

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const token = generateToken(user);
    
    const response = NextResponse.json({ success: true, message: 'Logged in successfully', user: { id: user.id, username: user.username, role: user.role } }, { status: 200 });
    
    // Set cookie
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      code: error.code || 'UNKNOWN'
    }, { status: 500 });
  }
}
