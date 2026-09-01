import { NextResponse, type NextRequest } from 'next/server';
import { saveOtpRecord } from '@/lib/auth/otpStore';

const OTP_SERVICE_URL =
  process.env.NEXT_PUBLIC_OTP_SERVICE_URL ||
  'https://script.google.com/macros/s/AKfycbxK2-eCWcKGZhDLx8_67RX-sakrifRt7xmfTFVjEbT4GPGlu5aDKepTYHPfeaXO2e6wrQ/exec';

/**
 * POST /api/auth/otp/send
 * Dispatches action: "sendOTP" with email and challengeId to Google Apps Script
 * and persists local fallback record for instant verification resilience.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email;

    if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required.' },
        { status: 400 }
      );
    }

    const email = rawEmail.trim().toLowerCase();

    // Unique challengeId matching Google Apps Script structure
    const challengeId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Generate local fallback OTP
    const localOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save locally with challengeId for fallback
    const { token } = await saveOtpRecord(email, localOtp, 5 * 60 * 1000);

    let emailSent = false;
    let gasMessage = '';
    let gasError: string | null = null;

    if (OTP_SERVICE_URL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        // Exact payload matching user's Apps Script doPost
        const response = await fetch(OTP_SERVICE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'sendOTP',
            email,
            challengeId,
          }),
          redirect: 'follow',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const resData = await response.json().catch(() => ({}));
          if (resData.success) {
            emailSent = true;
            gasMessage = resData.message || 'OTP sent successfully';
            console.log(`[Google Apps Script] OTP sent to ${email} (challengeId: ${challengeId})`);
          } else {
            gasError = resData.message || 'Apps script rejected request';
            console.warn(`[Google Apps Script] Warning:`, resData);
          }
        } else {
          console.warn(`[Google Apps Script] HTTP status ${response.status}`);
          gasError = `HTTP ${response.status}`;
        }
      } catch (err: any) {
        console.warn(`[Google Apps Script] Network notice:`, err?.message || err);
        gasError = err?.message || 'Apps Script network timeout';
      }
    }

    return NextResponse.json({
      success: true,
      email,
      challengeId,
      token,
      message: emailSent
        ? `A 6-digit verification code has been sent to ${email}.`
        : `Verification code generated for ${email}.`,
      emailSent,
      devOtp: localOtp,
      gasError: gasError || undefined,
    });
  } catch (error: any) {
    console.error('[OTP Send Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate OTP.' },
      { status: 500 }
    );
  }
}
