import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear the auth_token cookie
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    expires: new Date(0), // Set to past date to expire immediately
    path: '/',
  });

  return response;
}
