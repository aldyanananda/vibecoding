import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. If user is logged in and tries to access the login page (/), redirect to /dashboard
  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. If user is NOT logged in and tries to access /dashboard, redirect to /
  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
