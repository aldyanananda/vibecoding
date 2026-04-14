import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

export async function GET(req) {
  try {
    const token = req.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return NextResponse.json({ 
      id: decoded.id, 
      username: decoded.username, 
      role: decoded.role 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
  }
}
