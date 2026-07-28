'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getSdks(existingApps[0]);
  }

  // Use the explicit firebaseConfig directly to avoid "app/no-options" errors
  // that occur during automated initialization attempts in non-Firebase Hosting environments.
  const firebaseApp = initializeApp(firebaseConfig);

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  // Persist login session in localStorage so users stay logged in after refresh
  setPersistence(auth, browserLocalPersistence).catch(console.error);
  return {
    firebaseApp,
    auth,
    database: getDatabase(firebaseApp),
    storage: getStorage(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './database/use-list';
export * from './database/use-object';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
