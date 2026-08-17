import { ref, get, set, update } from "firebase/database";
import { PejabatItem } from "@/app/lib/types";

/**
 * Generate 6-character unique uppercase code using distinct characters (avoid confusing letters/numbers like O, 0, I, 1)
 */
export function generateUniqueCode6(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Sanitize username from NIPPPK or name
 */
export function sanitizeUsername(rawNipppk?: string, rawName?: string): string {
  const cleanedNip = (rawNipppk || "").trim().replace(/[^a-zA-Z0-9]/g, "");
  if (cleanedNip && cleanedNip.length >= 4) {
    return cleanedNip.toLowerCase();
  }
  const cleanedName = (rawName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleanedName || `verifikator_${Date.now().toString().slice(-4)}`;
}

export interface EnsureVerifikatorResult {
  created: boolean;
  username: string;
  password?: string;
  fullName: string;
}

/**
 * Ensure a Verifikator Dinas user account exists in system_users
 * - Username: NIPPPK (or sanitized name if NIPPPK missing)
 * - Password: 6-character auto-generated unique code
 * - Role: 'verifikator_dinas'
 */
export async function ensureVerifikatorUser(
  database: any,
  verifikator: PejabatItem | { nama?: string; nipppk?: string; pangkat?: string; jabatan?: string }
): Promise<EnsureVerifikatorResult | null> {
  if (!database || !verifikator?.nama || verifikator.nama.trim() === "" || verifikator.nama === "Belum Ditentukan") {
    return null;
  }

  const rawName = verifikator.nama.trim();
  const rawNip = verifikator.nipppk ? verifikator.nipppk.trim() : "";
  const username = sanitizeUsername(rawNip, rawName);

  try {
    const userRef = ref(database, `system_users/${username}`);
    const snap = await get(userRef);

    if (snap.exists()) {
      const existing = snap.val();
      const updates: any = {};
      if (existing.role !== "verifikator_dinas") {
        updates.role = "verifikator_dinas";
      }
      if (rawName && existing.fullName !== rawName) {
        updates.fullName = rawName;
      }
      if (rawNip && existing.nipppk !== rawNip) {
        updates.nipppk = rawNip;
      }
      if (verifikator.pangkat && existing.pangkat !== verifikator.pangkat) {
        updates.pangkat = verifikator.pangkat;
      }
      if (verifikator.jabatan && existing.jabatan !== verifikator.jabatan) {
        updates.jabatan = verifikator.jabatan;
      }

      if (Object.keys(updates).length > 0) {
        await update(userRef, updates);
      }

      return {
        created: false,
        username,
        password: existing.password,
        fullName: existing.fullName || rawName,
      };
    } else {
      // Check if user already exists under matching nipppk or name
      const allUsersSnap = await get(ref(database, "system_users"));
      let foundExistingKey: string | null = null;
      let existingData: any = null;

      if (allUsersSnap.exists()) {
        const allUsers = allUsersSnap.val();
        for (const k of Object.keys(allUsers)) {
          const u = allUsers[k];
          const matchNip = rawNip && u?.nipppk && String(u.nipppk).trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === username;
          const matchName = u?.fullName && String(u.fullName).trim().toUpperCase() === rawName.toUpperCase();
          if (matchNip || (matchName && u?.role === "verifikator_dinas")) {
            foundExistingKey = k;
            existingData = u;
            break;
          }
        }
      }

      if (foundExistingKey && existingData) {
        return {
          created: false,
          username: foundExistingKey,
          password: existingData.password,
          fullName: existingData.fullName || rawName,
        };
      }

      // Create brand new account
      const generatedPassword = generateUniqueCode6();
      const newUserData = {
        id: username,
        username: username,
        fullName: rawName,
        nipppk: rawNip,
        pangkat: verifikator.pangkat || "",
        jabatan: verifikator.jabatan || "Verifikator Dinas",
        role: "verifikator_dinas",
        password: generatedPassword,
        uid: null,
        addedAt: new Date().toISOString(),
      };

      await set(userRef, newUserData);

      return {
        created: true,
        username,
        password: generatedPassword,
        fullName: rawName,
      };
    }
  } catch (err) {
    console.error("Error ensuring Verifikator Dinas user account:", err);
    return null;
  }
}
