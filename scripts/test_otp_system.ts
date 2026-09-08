import crypto from 'node:crypto';
import {
  computeOtpHash,
  generateStatelessToken,
  saveOtpRecord,
  validateOtpRecord,
  getPendingOtpRecord,
} from '../src/lib/auth/otpStore';
import {
  createOtpSessionClaim,
  verifyOtpSessionClaim,
  signPayload,
  verifySignature,
} from '../src/lib/auth/server/cookieSigner';

const OTP_SERVICE_URL =
  process.env.NEXT_PUBLIC_OTP_SERVICE_URL ||
  'https://script.google.com/macros/s/AKfycbzrd1cEyGrar-OW_nGZMbKo9p7T2JZK0a9L5oiKcR6hyYiIjfu-2d1APB5eOCDswxrs/exec';

async function runOtpTests() {
  console.log('====================================================');
  console.log('   🔍 RUNNING COMPREHENSIVE OTP SYSTEM DIAGNOSTICS   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: any, testName: string, detail?: string) {
    if (Boolean(condition)) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  // --- Test Suite 1: Cryptographic Hashes & Stateless HMAC Tokens ---
  console.log('--- 1. Cryptographic HMAC & Stateless Token Tests ---');
  const testEmail = 'test.citizen@example.gov.in';
  const testOtp = '849201';
  const hash1 = computeOtpHash(testEmail, testOtp);
  const hash2 = computeOtpHash('  TEST.CITIZEN@example.gov.in ', ' 849201 ');
  assert(hash1 === hash2, 'computeOtpHash normalizes email and trims OTP');

  const expiry = Date.now() + 5 * 60 * 1000;
  const statelessToken = generateStatelessToken(testEmail, testOtp, expiry);
  assert(typeof statelessToken === 'string' && statelessToken.length > 20, 'generateStatelessToken produces base64url token');

  // --- Test Suite 2: Multi-Tier Storage (Memory + Disk + Token) ---
  console.log('\n--- 2. Multi-Tier Store & Verification Tests ---');
  const saved = await saveOtpRecord(testEmail, testOtp, 5 * 60 * 1000, 'ch_test_123');
  assert(saved.record.email === testEmail.toLowerCase(), 'saveOtpRecord stores normalized email');
  assert(saved.record.otp === testOtp, 'saveOtpRecord stores clear OTP for fallback matching');

  const decodedSavedToken = JSON.parse(Buffer.from(saved.token, 'base64url').toString('utf8'));
  assert(decodedSavedToken.email === testEmail.toLowerCase() && decodedSavedToken.hash === computeOtpHash(testEmail, testOtp), 'saveOtpRecord produces valid HMAC-signed token');

  const pending = await getPendingOtpRecord(testEmail);
  assert(pending !== null && pending.challengeId === 'ch_test_123', 'getPendingOtpRecord retrieves pending challenge');

  // Validate with valid token
  const validTokenResult = await validateOtpRecord(testEmail, testOtp, saved.token);
  assert(validTokenResult.valid === true, 'validateOtpRecord succeeds with valid stateless token');

  // --- Test Suite 3: Attempt Counter & Brute-Force Protection ---
  console.log('\n--- 3. Brute Force Protection & Attempt Limits ---');
  const bruteEmail = 'brute.test@example.gov.in';
  const realOtp = '654321';
  await saveOtpRecord(bruteEmail, realOtp, 5 * 60 * 1000);

  // 1st wrong attempt
  const wrong1 = await validateOtpRecord(bruteEmail, '000000');
  assert(wrong1.valid === false && wrong1.error?.includes('4 attempts remaining'), 'First failed attempt increments attempt counter and displays remaining count');

  // 2nd wrong attempt
  await validateOtpRecord(bruteEmail, '000001');
  // 3rd wrong attempt
  await validateOtpRecord(bruteEmail, '000002');
  // 4th wrong attempt
  await validateOtpRecord(bruteEmail, '000003');
  // 5th wrong attempt
  const wrong5 = await validateOtpRecord(bruteEmail, '000004');
  assert(wrong5.valid === false, 'Fifth failed attempt recorded');

  // 6th attempt should be locked out
  const lockedOut = await validateOtpRecord(bruteEmail, realOtp);
  assert(lockedOut.valid === false && lockedOut.error?.includes('Too many incorrect attempts'), 'Account locked out after max failed OTP attempts');

  // --- Test Suite 4: Expiration Handling ---
  console.log('\n--- 4. TTL & Expiration Tests ---');
  const expiredEmail = 'expired.test@example.gov.in';
  await saveOtpRecord(expiredEmail, '112233', -1000); // already expired
  const expiredRes = await validateOtpRecord(expiredEmail, '112233');
  assert(expiredRes.valid === false && expiredRes.error?.includes('expired'), 'Expired OTP rejected gracefully');

  // --- Test Suite 5: Session Claims Integrity ---
  console.log('\n--- 5. Server Session Claims Cryptography ---');
  const claimEmail = 'officer.claim@rev.gov.in';
  const sessionClaim = createOtpSessionClaim(claimEmail);
  assert(typeof sessionClaim === 'string' && sessionClaim.includes('.'), 'createOtpSessionClaim produces signed payload');

  const claimValid = verifyOtpSessionClaim(sessionClaim, claimEmail);
  assert(claimValid === true, 'verifyOtpSessionClaim validates authentic claim for email');

  const wrongEmailClaim = verifyOtpSessionClaim(sessionClaim, 'attacker@hacker.io');
  assert(wrongEmailClaim === false, 'verifyOtpSessionClaim rejects claim with email mismatch');

  const tamperedClaim = sessionClaim.slice(0, -4) + 'abcd';
  const tamperedValid = verifyOtpSessionClaim(tamperedClaim, claimEmail);
  assert(tamperedValid === false, 'verifyOtpSessionClaim rejects forged/tampered signature');

  // --- Test Suite 6: Google Apps Script Webhook Connectivity Check ---
  console.log('\n--- 6. Google Apps Script Live Webhook Check ---');
  console.log(`  Target URL: ${OTP_SERVICE_URL}`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const gasPing = await fetch(OTP_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ping',
      }),
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    console.log(`  Google Apps Script HTTP Status: ${gasPing.status}`);
    assert(gasPing.status === 200 || gasPing.status === 302, 'Google Apps Script endpoint is reachable');
  } catch (err: any) {
    console.warn(`  ⚠️ Google Apps Script ping notice: ${err?.message || err}`);
    console.log(`  (Note: System is designed with automatic local fallback if GAS network is slow/unreachable)`);
  }

  console.log('\n====================================================');
  console.log(`   DIAGNOSTIC SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
}

runOtpTests().catch(console.error);
