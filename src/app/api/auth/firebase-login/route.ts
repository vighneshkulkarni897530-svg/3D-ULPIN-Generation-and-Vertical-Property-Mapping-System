import { NextResponse, type NextRequest } from 'next/server';
import { setSessionCookie, SESSION_COOKIE } from '@/lib/auth/server/sessionStore';

/**
 * POST /api/auth/firebase-login
 * Sets the session cookie after Firebase authentication succeeds on the client.
 * Receives the Firebase ID token and stores it in the httpOnly session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, expiresIn } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: missing or invalid idToken' },
        { status: 400 }
      );
    }

    // Firebase ID tokens typically expire in 1 hour (3600 seconds)
    const expiresInSeconds = expiresIn || 3600;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    // Create a session object compatible with the middleware cookie format
    // We store the Firebase ID token as the "access_token" and use a placeholder refresh token
    const sessionData = {
      access_token: idToken,
      refresh_token: 'firebase-session', // Placeholder - Firebase doesn't use refresh tokens like Supabase
      expires_at: expiresAt,
    };

    const res = NextResponse.json({ success: true });
    setSessionCookie(res, sessionData);

    return res;
  } catch (error) {
    console.error('Firebase login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
