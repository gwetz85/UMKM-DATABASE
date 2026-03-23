'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getSdks(existingApps[0]);
  }

  // Use the explicit firebaseConfig directly to avoid "app/no-options" errors
  // that occur during automated initialization attempts in non-Firebase Hosting environments.
  const firebaseApp = initializeApp(firebaseConfig);

  // Initialize Firestore with long polling to avoid connection issues in studio/restricted environments
  try {
    initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    });
  } catch (e) {
    // If Firestore was somehow already initialized, getFirestore will still work via getSdks
    if (process.env.NODE_ENV !== "production") {
      console.warn("Firestore already initialized or failed to initialize with settings:", e);
    }
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
