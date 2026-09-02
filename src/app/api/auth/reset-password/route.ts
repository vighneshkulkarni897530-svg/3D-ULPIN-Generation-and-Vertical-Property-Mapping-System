import { NextResponse, type NextRequest } from 'next/server';
import { validateOtpRecord, getPendingOtpRecord } from '@/lib/auth/otpStore';
import { updateUserPassword, toPublicUser } from '@/lib/auth/server/userStore';
import { appendAudit } from '@/lib/auth/server/auditStore';
import { clientIp } from '@/lib/auth/server/apiAuth';

const OTP_SERVICE_URL =
  process.env.NEXT_PUBLIC_OTP_SERVICE_URL ||
  'https://script.google.com/macros/s/AKfycbxK2-eCWcKGZhDLx8_67RX-sakrifRt7xmfTFVjEbT4GPGlu5aDKepTYHPfeaXO2e6wrQ/exec';

/**
 * POST /api/auth/reset-password
 * Verifies the 6-digit OTP and commits the new password to durable storage.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email;
    const rawPassword = body.password;
    const rawOtp = body.otp;
    let challengeId = body.challengeId;
    const token = body.token;

    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json(
        { error: 'Registered email address is required.' },
        { status: 400 }
      );
    }

    if (!rawPassword || typeof rawPassword !== 'string' || rawPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (!rawOtp || typeof rawOtp !== 'string' || rawOtp.trim().length !== 6) {
      return NextResponse.json(
        { error: 'A valid 6-digit OTP is required.' },
        { status: 400 }
      );
    }

    const email = rawEmail.trim().toLowerCase();
    const submittedOtp = rawOtp.trim();

    // If challengeId was not sent in body, check our persistent pending OTP store
    if (!challengeId) {
      const pending = await getPendingOtpRecord(email);
      if (pending?.challengeId) {
        challengeId = pending.challengeId;
      }
    }

    // 1. Verify OTP with Google Apps Script if challengeId is present
    let otpValid = false;
    if (OTP_SERVICE_URL && challengeId) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const gasRes = await fetch(OTP_SERVICE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verifyOTP',
            email,
            challengeId,
            otp: submittedOtp,
          }),
          redirect: 'follow',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (gasRes.ok) {
          const gasData = await gasRes.json().catch(() => ({}));
          if (gasData.success) {
            otpValid = true;
          } else if (gasData.message && gasData.message.toLowerCase().includes('incorrect')) {
            return NextResponse.json(
              { error: 'Incorrect verification code. Please check your email and try again.' },
              { status: 400 }
            );
          }
        }
      } catch (err) {
        console.warn('[Google Apps Script] Reset password verify notice:', err);
      }
    }

    // 2. Fallback to local HMAC token validation
    if (!otpValid) {
      const localResult = await validateOtpRecord(email, submittedOtp, token);
      if (localResult.valid) {
        otpValid = true;
      }
    }

    // If neither succeeded
    if (!otpValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP code. Please request a new code.' },
        { status: 400 }
      );
    }

    // 3. Commit new password to userStore & disk
    const result = updateUserPassword(email, rawPassword);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Failed to update password.' },
        { status: 500 }
      );
    }

    appendAudit({
      actorId: result.user.id,
      actorName: result.user.name,
      actorRole: result.user.role,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: result.user.id,
      newValue: 'password-reset-via-otp',
      details: `Password was successfully reset using verified OTP.`,
      ipAddress: clientIp(req),
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: 'Password updated successfully.',
      user: toPublicUser(result.user),
    });
  } catch (error: any) {
    console.error('[Reset Password Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to reset password.' },
      { status: 500 }
    );
  }
}
