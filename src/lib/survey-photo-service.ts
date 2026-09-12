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

/**
 * Check whether an actor has a survey photo without needing to load the heavy base64 data
 */
export function hasSurveyPhoto(actor?: BusinessActor | null): boolean {
  if (!actor) return false;
  if (actor.hasSurveyPhoto) return true;
  if (actor.surveyData?.hasPhoto) return true;
  if (actor.surveyData?.fotoSurveyUrl && actor.surveyData.fotoSurveyUrl !== actor.comparisonPhotoUrl) return true;
  if (actor.photoSurveyUrl && actor.photoSurveyUrl !== actor.comparisonPhotoUrl) return true;
  return false;
}

/**
 * Fetch a survey photo on-demand for a single actor
 * 1. Checks memory cache
 * 2. Checks in-memory properties on the actor (fallback)
 * 3. Fetches from 'survey_photos/${actorId}/fotoSurveyUrl'
 * 4. Fetches from 'businessActors/${actorId}/surveyData/fotoSurveyUrl' as legacy fallback
 */
export async function getSurveyPhoto(
  database: Database | null | undefined,
  actorId: string,
  actorFallback?: BusinessActor | null
): Promise<string | null> {
  if (!actorId) return null;

  // 1. Check in-memory cache
  if (photoMemoryCache.has(actorId)) {
    return photoMemoryCache.get(actorId) || null;
  }

  // 2. Check actor fallback object if already loaded in memory
  if (actorFallback) {
    const directPhoto = actorFallback.surveyData?.fotoSurveyUrl || actorFallback.photoSurveyUrl;
    if (directPhoto && directPhoto !== actorFallback.comparisonPhotoUrl && directPhoto.startsWith("data:")) {
      photoMemoryCache.set(actorId, directPhoto);
      return directPhoto;
    }
  }

  const db = getDb(database);
  if (!db) return null;

  try {
    // 3. Try settings/survey_photos node (primary decoupled location)
    const settingsPhotoSnap = await get(ref(db, `settings/survey_photos/${actorId}/fotoSurveyUrl`));
    if (settingsPhotoSnap.exists()) {
      const val = settingsPhotoSnap.val();
      if (typeof val === "string" && val.startsWith("data:")) {
        photoMemoryCache.set(actorId, val);
        return val;
      }
    }

    const settingsRootSnap = await get(ref(db, `settings/survey_photos/${actorId}`));
    if (settingsRootSnap.exists()) {
      const rVal = settingsRootSnap.val();
      if (typeof rVal === "string" && rVal.startsWith("data:")) {
        photoMemoryCache.set(actorId, rVal);
        return rVal;
      } else if (rVal && typeof rVal.fotoSurveyUrl === "string" && rVal.fotoSurveyUrl.startsWith("data:")) {
        photoMemoryCache.set(actorId, rVal.fotoSurveyUrl);
        return rVal.fotoSurveyUrl;
      }
    }

    // 3b. Try legacy survey_photos node
    const photoSnap = await get(ref(db, `survey_photos/${actorId}/fotoSurveyUrl`));
    if (photoSnap.exists()) {
      const val = photoSnap.val();
      if (typeof val === "string" && val.startsWith("data:")) {
        photoMemoryCache.set(actorId, val);
        return val;
      }
    }

    // 4. Fallback to legacy businessActors node
    const legacySnap = await get(ref(db, `businessActors/${actorId}/surveyData/fotoSurveyUrl`));
    if (legacySnap.exists()) {
      const lVal = legacySnap.val();
      if (typeof lVal === "string" && lVal.startsWith("data:")) {
        photoMemoryCache.set(actorId, lVal);
        return lVal;
      }
    }

    const legacyPhotoRef = await get(ref(db, `businessActors/${actorId}/photoSurveyUrl`));
    if (legacyPhotoRef.exists()) {
      const pVal = legacyPhotoRef.val();
      if (typeof pVal === "string" && pVal.startsWith("data:")) {
        photoMemoryCache.set(actorId, pVal);
        return pVal;
      }
    }
  } catch (err) {
    console.error(`Error fetching survey photo for actor ${actorId}:`, err);
  }

  return null;
}

/**
 * Save a survey photo to the decoupled 'settings/survey_photos' node and mark 'hasSurveyPhoto: true'
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

  // 2. Save to settings/survey_photos node
  const photoRef = ref(db, `settings/survey_photos/${actorId}/fotoSurveyUrl`);
  await set(photoRef, base64Photo);

  // 3. Mark hasSurveyPhoto on businessActors node
  const actorRef = ref(db, `businessActors/${actorId}`);
  await update(actorRef, {
    hasSurveyPhoto: true,
    "surveyData/hasPhoto": true,
  });
}
