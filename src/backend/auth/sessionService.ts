/**
 * Backend Session & Token Management Service
 * Validates edge cookies, sets session cookies, and handles user authentication boundaries.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { backendConfig } from '../config/env';

export const SESSION_COOKIE_NAME = 'spv_session';

export interface BackendSessionPayload {
  userId: string;
  email: string;
  role: 'CITIZEN' | 'OFFICER' | 'ADMIN';
  name?: string;
  expiresAt: number;
}

export class BackendSessionService {
  /**
   * Sets the HTTP-only secure session cookie on a NextResponse
   */
  static setSession(
    res: NextResponse,
    payload: { idToken: string; expiresInSeconds?: number }
  ): void {
    const maxAge = payload.expiresInSeconds || 3600 * 24 * 7; // 7 days
    res.cookies.set(SESSION_COOKIE_NAME, payload.idToken, {
      httpOnly: true,
      secure: backendConfig.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }

  /**
   * Clears the session cookie on logout
   */
  static clearSession(res: NextResponse): void {
    res.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: backendConfig.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }

  /**
   * Extracts and checks the session token from an incoming NextRequest
   */
  static getSessionToken(req: NextRequest): string | null {
    return req.cookies.get(SESSION_COOKIE_NAME)?.value || null;
  }

  /**
   * Verifies if a request has an active session cookie
   */
  static isAuthenticated(req: NextRequest): boolean {
    const token = this.getSessionToken(req);
    return Boolean(token && token.length > 5);
  }
}
