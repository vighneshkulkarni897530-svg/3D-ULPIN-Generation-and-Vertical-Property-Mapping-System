'use client';

import { useEffect } from 'react';
import { initializeFirebaseAnalytics } from '@/lib/firebase';

export function FirebaseClient() {
  useEffect(() => {
    void initializeFirebaseAnalytics();
  }, []);

  return null;
}
