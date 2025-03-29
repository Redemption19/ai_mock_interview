import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');

  // Auth pages (sign-in, sign-up)
  if (request.nextUrl.pathname.startsWith('/sign-in') || 
      request.nextUrl.pathname.startsWith('/sign-up')) {
    if (session?.value) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!session?.value) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/interview/:path*',
    '/settings/:path*',
    '/sign-in',
    '/sign-up',
  ],
}; 