import { NextResponse, type NextRequest } from 'next/server';
import { validateOtpRecord } from '@/lib/auth/otpStore';

const OTP_SERVICE_URL =
  process.env.NEXT_PUBLIC_OTP_SERVICE_URL ||
  'https://script.google.com/macros/s/AKfycbxK2-eCWcKGZhDLx8_67RX-sakrifRt7xmfTFVjEbT4GPGlu5aDKepTYHPfeaXO2e6wrQ/exec';

/**
 * POST /api/auth/otp/verify
 * Validates the 6-digit OTP code against Google Apps Script verifyOTP and local fallback.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email;
    const rawOtp = body.otp;
    const challengeId = body.challengeId;
    const token = body.token;

    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json(
        { error: 'Email is required for verification.' },
        { status: 400 }
      );
    }

    if (!rawOtp || typeof rawOtp !== 'string') {
      return NextResponse.json(
        { error: '6-digit OTP code is required.' },
        { status: 400 }
      );
    }

    const email = rawEmail.trim().toLowerCase();
    const submittedOtp = rawOtp.trim();

    // 1. Try Google Apps Script verifyOTP first if challengeId is present
    if (OTP_SERVICE_URL && challengeId) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const gasRes = await fetch(OTP_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
            console.log(`[Google Apps Script] OTP verified successfully for ${email}`);
            return NextResponse.json({
              success: true,
              verified: true,
              email,
              message: gasData.message || 'OTP verified successfully.',
            });
          } else {
            // Check if it's incorrect OTP
            if (gasData.message && gasData.message.toLowerCase().includes('incorrect')) {
              return NextResponse.json(
                { error: 'Incorrect verification code. Please check your email and try again.' },
                { status: 400 }
              );
            }
          }
        }
      } catch (err) {
        console.warn(`[Google Apps Script] Verify network notice:`, err);
      }
    }

    // 2. Fallback to Local HMAC Token & persistent cache
    const localResult = await validateOtpRecord(email, submittedOtp, token);

    if (!localResult.valid) {
      return NextResponse.json(
        { error: localResult.error || 'Invalid or expired verification code. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      email,
      message: 'OTP verification successful.',
    });
  } catch (error: any) {
    console.error('[OTP Verify Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify OTP.' },
      { status: 500 }
    );
  }
}
