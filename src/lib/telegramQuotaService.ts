import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase (reuse existing app if already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

/**
 * Retrieves coordinator quota information from Firestore and formats it as a Markdown string.
 * The collection used throughout the project for quota checks is `koordinator_kuotas`.
 */
export async function getKuotaData(): Promise<string> {
  try {
    const snapshot = await get(ref(database, 'koordinator_kuotas'));
    if (!snapshot.exists()) {
      return '⚠️ Tidak ada data kuota koordinator di database.';
    }
    const data = snapshot.val();
    const entries = Object.values(data) as any[];
    if (entries.length === 0) {
      return '⚠️ Tidak ada kuota koordinator yang terdaftar.';
    }
    let reply = '*📊 Kuota Koordinator*\n\n';
    entries.forEach((entry) => {
      const name = entry.name || entry.nama || 'Tidak diketahui';
      const quota = entry.quota ?? 0;
      const used = entry.used ?? 0; // optional field if stored
      // If used not stored, we just show quota
      if (used !== undefined) {
        reply += `▫️ ${name}: ${used}/${quota}\n`;
      } else {
        reply += `▫️ ${name}: ${quota}\n`;
      }
    });
    return reply.trim();
  } catch (error) {
    console.error('Error fetching kuota data:', error);
    return '❌ Gagal mengambil data kuota koordinator.';
  }
}
