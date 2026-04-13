import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, set } from 'firebase/database';
import { firebaseConfig } from '@/firebase/config';

// Safe initialization for both Client and Server environments
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

export interface ActivityLog {
  timestamp: string;
  query: string;
  results: string;
  device: string;
  source: 'Web' | 'Telegram';
  userId?: string;
  chatId?: string;
}

/**
 * Logs an activity to the Firebase Realtime Database.
 * @param log The activity data to log (timestamp is added automatically)
 */
export async function logActivity(log: Omit<ActivityLog, 'timestamp'>) {
  try {
    const logsRef = ref(db, 'activity_logs');
    const newLogRef = push(logsRef);
    await set(newLogRef, {
      ...log,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

/**
 * Helper to detect device type from user agent
 */
export function getDeviceType(userAgent: string): string {
  if (/android/i.test(userAgent)) return "Android";
  if (/iPad|iPhone|iPod/.test(userAgent)) return "iOS";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Other";
}
