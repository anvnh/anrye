import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Pages that don't require authentication
const publicPaths = ['/login', '/shared', '/api/shared-notes', '/privacy', '/terms'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths (exact match or startsWith for /shared and /api/shared-notes)
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }
  
  // Allow API routes for auth
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }
  
  // Allow static files
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }
  
  // Check for auth token
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // For now, we'll just check if token exists (not validating JWT in middleware)
  // JWT validation will happen in API routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
