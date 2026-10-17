import { Database, ref, get, set, update } from "firebase/database";
import { BusinessActor } from "@/app/lib/types";
import { initializeFirebase } from "@/firebase";

// In-memory cache for ultra-fast repeated access during the user session
const photoMemoryCache = new Map<string, string>();

let fallbackDb: Database | null = null;
function getDb(db?: Database | null): Database | null {
  if (db) return db;
  if (!fallbackDb && typeof window !== "undefined") {
    try {
      fallbackDb = initializeFirebase().database;
    } catch {}
  }
  return fallbackDb;
}

export function isValidPhotoString(val: any): boolean {
  if (typeof val !== "string") return false;
  const s = val.trim();
  if (!s || s === "-" || s === "undefined" || s === "null") return false;
  return (
    s.startsWith("data:image/") ||
    s.startsWith("data:") ||
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("blob:") ||
    s.length > 50
  );
}

/**
 * Check whether an actor has a survey photo without needing to load the heavy base64 data
 */
export function hasSurveyPhoto(actor?: BusinessActor | null): boolean {
  if (!actor) return false;
  if (actor.hasSurveyPhoto) return true;
  if (actor.surveyData?.hasPhoto) return true;
  if (actor.surveyData?.fotoSurveyUrl && actor.surveyData.fotoSurveyUrl !== actor.comparisonPhotoUrl && isValidPhotoString(actor.surveyData.fotoSurveyUrl)) return true;
  if (actor.photoSurveyUrl && actor.photoSurveyUrl !== actor.comparisonPhotoUrl && isValidPhotoString(actor.photoSurveyUrl)) return true;
  return false;
}

/**
 * Fetch a survey photo on-demand for a single actor
 * 1. Checks memory cache (instant)
 * 2. Checks in-memory properties on the actor (instant)
 * 3. Concurrently queries primary leaf locations for ultra-fast loading without downloading full actor
 */
export async function getSurveyPhoto(
  database: Database | null | undefined,
  actorId: string,
  actorFallback?: BusinessActor | null
): Promise<string | null> {
  if (!actorId) return null;

  // 1. Check in-memory cache
  if (photoMemoryCache.has(actorId)) {
    const cached = photoMemoryCache.get(actorId);
    if (cached) return cached;
  }

  // 2. Check actor fallback object if already loaded in memory
  if (actorFallback) {
    const directPhoto =
      actorFallback.surveyData?.fotoSurveyUrl ||
      actorFallback.photoSurveyUrl ||
      (actorFallback.surveyData as any)?.photoSurvey;
    if (directPhoto && directPhoto !== actorFallback.comparisonPhotoUrl && isValidPhotoString(directPhoto)) {
      photoMemoryCache.set(actorId, directPhoto);
      return directPhoto;
    }
  }

  const db = getDb(database);
  if (!db) return null;

  try {
    // 3. Fast parallel fetch: Query known candidate locations concurrently
    // Prioritize direct leaf paths so Firebase only transfers the photo string (<300KB)
    // instead of downloading the entire businessActors node (5-10MB).
    const candidatePaths = [
      `businessActors/${actorId}/surveyData/fotoSurveyUrl`,
      `businessActors/${actorId}/photoSurveyUrl`,
      `settings/survey_photos/${actorId}/fotoSurveyUrl`,
      `settings/survey_photos/${actorId}`,
      `survey_photos/${actorId}/fotoSurveyUrl`,
    ];

    const fetchPromises = candidatePaths.map(async (path) => {
      try {
        const snap = await get(ref(db, path));
        if (!snap.exists()) return null;
        const val = snap.val();
        if (isValidPhotoString(val)) return val as string;
        if (val && typeof val === "object" && isValidPhotoString(val.fotoSurveyUrl)) {
          return val.fotoSurveyUrl as string;
        }
        return null;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    for (const photo of results) {
      if (photo) {
        photoMemoryCache.set(actorId, photo);
        return photo;
      }
    }
  } catch (err) {
    console.error(`Error fetching survey photo for actor ${actorId}:`, err);
  }

  return null;
}

/**
 * Save a survey photo to businessActors and mark 'hasSurveyPhoto: true'
 */
export async function saveSurveyPhoto(
  database: Database | null | undefined,
  actorId: string,
  base64Photo: string
): Promise<void> {
  const db = getDb(database);
  if (!db || !actorId || !base64Photo) return;

  // 1. Cache in memory
  photoMemoryCache.set(actorId, base64Photo);

  // 2. Primary storage: Save directly to businessActors/${actorId}
  const actorRef = ref(db, `businessActors/${actorId}`);
  await update(actorRef, {
    hasSurveyPhoto: true,
    photoSurveyUrl: base64Photo,
    "surveyData/hasPhoto": true,
    "surveyData/fotoSurveyUrl": base64Photo,
  });

  // 3. Best-effort cache in settings/survey_photos (safely caught)
  try {
    const photoRef = ref(db, `settings/survey_photos/${actorId}/fotoSurveyUrl`);
    await set(photoRef, base64Photo);
  } catch {}
}

/**
 * Delete a survey photo from businessActors and legacy nodes safely
 */
export async function deleteSurveyPhoto(
  database: Database | null | undefined,
  actorId: string
): Promise<void> {
  const db = getDb(database);
  if (!db || !actorId) return;

  // 1. Remove from memory cache
  photoMemoryCache.delete(actorId);

  // 2. Primary update: clear survey photo directly on the businessActors node
  const actorRef = ref(db, `businessActors/${actorId}`);
  await update(actorRef, {
    hasSurveyPhoto: false,
    photoSurveyUrl: null,
    "surveyData/hasPhoto": false,
    "surveyData/fotoSurveyUrl": null,
  });

  // Direct clear on child reference as fallback
  try {
    const directPhotoRef = ref(db, `businessActors/${actorId}/surveyData/fotoSurveyUrl`);
    await set(directPhotoRef, null);
  } catch {}

  // 3. Optional best-effort cleanup for decoupled/legacy nodes
  // Wrapped in safe try/catch so rule restrictions on these paths will never block deletion
  try {
    const settingsPhotoRef = ref(db, `settings/survey_photos/${actorId}`);
    await set(settingsPhotoRef, null);
  } catch {}

  try {
    const surveyPhotoRef = ref(db, `survey_photos/${actorId}`);
    await set(surveyPhotoRef, null);
  } catch {}
}
