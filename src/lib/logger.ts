import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, push, set, Database } from 'firebase/database';
import { firebaseConfig } from '@/firebase/config';

// Safe initialization for both Client and Server environments
const getAppInstance = (): FirebaseApp => {
  const apps = getApps();
  return apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
};

const getDbInstance = (providedDb?: Database): Database => {
  return providedDb || getDatabase(getAppInstance());
}

export interface ActivityLog {
  timestamp: string;
  query: string;
  results: string;
  device: string;
  source: 'Web' | 'Telegram';
  method?: string;
  userId?: string;
  chatId?: string;
}

/**
 * Logs an activity to the Firebase Realtime Database.
 * @param log The activity data to log
 * @param providedDb Optional database instance to use
 */
export async function logActivity(log: Omit<ActivityLog, 'timestamp'>, providedDb?: Database) {
  try {
    const database = getDbInstance(providedDb);
    const logsRef = ref(database, 'activity_logs');
    const newLogRef = push(logsRef);
    
    const logData = {
      ...log,
      timestamp: new Date().toISOString()
    };
    
    console.log("Logging activity:", logData);
    await set(newLogRef, logData);
    return true;
  } catch (error) {
    console.error("Failed to log activity:", error);
    return false;
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
