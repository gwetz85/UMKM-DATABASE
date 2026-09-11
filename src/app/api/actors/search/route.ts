import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

// In-memory cache for ultra-fast response & low network usage
interface CacheItem {
  timestamp: number;
  actors: any[];
}
let cachedActors: CacheItem | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes in-memory cache

async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

async function getLightweightActors(): Promise<any[]> {
  const now = Date.now();
  if (cachedActors && now - cachedActors.timestamp < CACHE_TTL_MS) {
    return cachedActors.actors;
  }

  await ensureAuth();

  const snap = await get(ref(database, 'businessActors')).catch(() => null);
  if (!snap || !snap.exists()) {
    return [];
  }

  const rawVal = snap.val();
  const list: any[] = [];

  for (const [id, a] of Object.entries(rawVal as Record<string, any>)) {
    if (!a) continue;

    // Filter valid status (same rules as actor-data/page.tsx)
    const s = a.status || '';
    const isCancelDinas =
      (s === 'verified_dinas' && a.hasilVerifikasiDinas === 'Tidak Lolos') ||
      Boolean(a.alasanCancelDinas);

    if (
      !['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) ||
      isCancelDinas
    ) {
      continue;
    }

    // Strip heavy base64 strings (like fotoSurveyUrl) to keep memory & network feather-light
    const { surveyData, ktpUri, kkUri, nibUri, suratPernyataanUri, ...rest } = a;

    let lightSurvey = undefined;
    if (surveyData) {
      const { fotoSurveyUrl, ...surveyRest } = surveyData;
      lightSurvey = surveyRest;
    }

    list.push({
      ...rest,
      id,
      surveyData: lightSurvey,
      // If URIs are short URLs (not base64 data URIs), preserve them
      ktpUri: typeof ktpUri === 'string' && !ktpUri.startsWith('data:') ? ktpUri : undefined,
      kkUri: typeof kkUri === 'string' && !kkUri.startsWith('data:') ? kkUri : undefined,
      nibUri: typeof nibUri === 'string' && !nibUri.startsWith('data:') ? nibUri : undefined,
    });
  }

  cachedActors = {
    timestamp: now,
    actors: list,
  };

  return list;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const coordinator = (searchParams.get('coordinator') || '').trim().toUpperCase();

    if (!query) {
      return NextResponse.json({ success: true, count: 0, results: [] });
    }

    const actors = await getLightweightActors();

    const lowerQuery = query.toLowerCase();
    const cleanDigits = query.replace(/[^0-9]/g, '');

    const filtered = actors.filter((item) => {
      // Coordinator filter if specified
      if (coordinator && String(item.coordinator || '').toUpperCase().trim() !== coordinator) {
        return false;
      }

      const fullName = String(item.fullName || '').toLowerCase();
      const businessName = String(item.businessName || '').toLowerCase();
      const address = String(item.address || '').toLowerCase();
      const coord = String(item.coordinator || '').toLowerCase();
      const nik = String(item.nik || '');
      const noKK = String(item.noKK || '');
      const phone = String(item.phone || '').replace(/[^0-9]/g, '');

      return (
        fullName.includes(lowerQuery) ||
        businessName.includes(lowerQuery) ||
        address.includes(lowerQuery) ||
        coord.includes(lowerQuery) ||
        (nik && nik.includes(query)) ||
        (noKK && noKK.includes(query)) ||
        (cleanDigits.length >= 3 && phone.includes(cleanDigits))
      );
    }).sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || '')));

    return NextResponse.json({
      success: true,
      count: filtered.length,
      results: filtered,
    });
  } catch (error: any) {
    console.error('Error in /api/actors/search:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error', results: [] },
      { status: 500 }
    );
  }
}
