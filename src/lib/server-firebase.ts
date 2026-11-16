import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

let cachedDb: Database | null = null;
let cachedAuth: Auth | null = null;

export async function getServerFirebase(): Promise<{ database: Database; auth: Auth }> {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  if (!cachedDb) cachedDb = getDatabase(app);
  if (!cachedAuth) cachedAuth = getAuth(app);

  if (!cachedAuth.currentUser) {
    try {
      await signInAnonymously(cachedAuth);
    } catch (e) {
      console.warn('[ServerFirebase] Anonymous sign-in warning:', e);
    }
  }

  return { database: cachedDb, auth: cachedAuth };
}
