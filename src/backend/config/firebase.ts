/**
 * Backend Firebase Infrastructure
 * Exports typed Firestore, RTDB, and Auth instances for server execution.
 */

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { backendConfig } from './env';

export const backendFirebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: backendConfig.firebase.apiKey,
      authDomain: backendConfig.firebase.authDomain,
      projectId: backendConfig.firebase.projectId,
      storageBucket: backendConfig.firebase.storageBucket,
      messagingSenderId: backendConfig.firebase.messagingSenderId,
      appId: backendConfig.firebase.appId,
      measurementId: backendConfig.firebase.measurementId,
      databaseURL: backendConfig.firebase.databaseURL,
    });

export const backendAuth = getAuth(backendFirebaseApp);
export const backendFirestore = getFirestore(backendFirebaseApp);
export const backendRtdb = getDatabase(backendFirebaseApp);
