/**
 * Backend Environment & Configuration Service
 * Centralizes all server environment variables, secrets, and URLs.
 */

export const backendConfig = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  sessionSecret: process.env.SESSION_SECRET || 'bhu-verify-cadastre-otp-hmac-secret-2024',
  
  // Firebase Services
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'd-ulpin-de274',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    databaseURL:
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
      'https://d-ulpin-de274-default-rtdb.firebaseio.com/',
  },

  // Google Apps Script Email Service
  otpService: {
    gasUrl:
      process.env.NEXT_PUBLIC_OTP_SERVICE_URL ||
      'https://script.google.com/macros/s/AKfycbxK2-eCWcKGZhDLx8_67RX-sakrifRt7xmfTFVjEbT4GPGlu5aDKepTYHPfeaXO2e6wrQ/exec',
    ttlSeconds: 300, // 5 minutes
    maxAttempts: 5,
  },
};
