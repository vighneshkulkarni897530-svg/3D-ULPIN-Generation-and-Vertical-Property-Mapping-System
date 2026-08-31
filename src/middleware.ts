/**
 * Edge Middleware (Phase 10)
 * ===========================
 * Server-side gate running before every request:
 *   - public paths (/auth/*, /unauthorized, /, /api/auth/*, static assets) pass through
 *   - protected paths require the Phase 10 session cookie; requests without
 *     it are redirected to /auth/login?next=<path> (pages) or rejected with
 *     401 JSON (API routes other than the auth endpoints themselves).
 *
 * ⚠ The cookie's PRESENCE is all this edge check can verify (it cannot access
 *   the in-memory session store). Full session validation + authorization
 *   happen in every API route via `requireAuth`/`requirePermission`, and in
 *   the React tree via <ProtectedRoute>. This layer exists so unauthenticated
 *   visitors never even fetch a protected page shell.
 *
 * Authorization is NOT evaluated here — that happens in ProtectedRoute and at
 * the API boundary.
 */

import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'spv_session';

/** Path prefixes reachable without a session (pages). */
const PUBLIC_PAGE_PREFIXES = ['/auth', '/unauthorized'];

/** API prefixes that handle their own authentication (login/register/session/logout/demo). */
const PUBLIC_API_PREFIXES = ['/api/auth'];

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt' ||
    pathname === '/manifest.json' ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|woff2?)$/.test(pathname)
  );
}

function isPublicPage(pathname: string): boolean {
  return pathname === '/' || PUBLIC_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticAsset(pathname) || pathname.startsWith('/api/gis-selftest')) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  // API routes: everything except /api/auth/* requires a session cookie.
  if (pathname.startsWith('/api/')) {
    if (isPublicApi(pathname) || hasSessionCookie) return NextResponse.next();
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentication required. Please sign in.' } },
      { status: 401 },
    );
  }

  // Pages: redirect signed-out visitors to login (preserving the destination).
  if (!isPublicPage(pathname) && !hasSessionCookie) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  // Signed-in users don't need the login/register pages.
  if (hasSessionCookie && (pathname === '/auth/login' || pathname === '/auth/register')) {
    const home = req.nextUrl.clone();
    home.pathname = '/dashboard';
    home.search = '';
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
