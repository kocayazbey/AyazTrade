import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('b2b_token')?.value;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));

  // API routes
  const isApiRoute = pathname.startsWith('/api');

  // If accessing protected route without token, redirect to login
  if (!isPublicRoute && !isApiRoute && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // If accessing login page with token, redirect to dashboard
  if (token && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
