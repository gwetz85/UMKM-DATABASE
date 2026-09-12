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
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes in-memory cache

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

  // 1. First priority: Read from pre-indexed settings/actors_search (takes ~60-100ms)
  let snap = await get(ref(database, 'settings/actors_search')).catch(() => null);
  if (snap && snap.exists()) {
    const rawVal = snap.val() || {};
    const list = Object.values(rawVal) as any[];
    cachedActors = {
      timestamp: now,
      actors: list,
    };
    return list;
  }

  // 2. Fallback: If settings/actors_search not populated yet, build from raw businessActors
  snap = await get(ref(database, 'businessActors')).catch(() => null);
  if (!snap || !snap.exists()) {
    return [];
  }

  const rawVal = snap.val();
  const list: any[] = [];
  const searchIndexMap: Record<string, any> = {};

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

    const item = {
      id,
      fullName: a.fullName || '',
      businessName: a.businessName || '',
      address: a.address || '',
      businessLocation: a.businessLocation || '',
      coordinator: a.coordinator || '',
      nik: a.nik || '',
      noKK: a.noKK || '',
      phone: a.phone || '',
      status: a.status || '',
      businessCategory: a.businessCategory || '',
      petugasSurvey: a.petugasSurvey || (a.surveyData?.pejabatData?.petugas?.nama) || '',
      verifikatorDinas: a.verifikatorDinas || '',
      hasilVerifikasiDinas: a.hasilVerifikasiDinas || '',
      alasanCancelDinas: a.alasanCancelDinas || '',
      registrationCode: a.registrationCode || '',
      gender: a.gender || '',
      pobDob: a.pobDob || '',
      dob: a.dob || '',
      bankNumber: a.bankNumber || '',
      bankOwner: a.bankOwner || '',
      bankName: a.bankName || '',
      berkasDinasVerified: Boolean(a.berkasDinasVerified),
      readyForLPJ: Boolean(a.readyForLPJ),
      lpjNominal: a.lpjNominal || '',
      createdAt: a.createdAt || '',
      ...(a.surveyData ? { surveyData: { hasSurvey: true, tanggalSurvey: a.surveyData.tanggalSurvey || '' } } : {}),
      ktpUri: typeof a.ktpUri === 'string' && !a.ktpUri.startsWith('data:') ? a.ktpUri : undefined,
      kkUri: typeof a.kkUri === 'string' && !a.kkUri.startsWith('data:') ? a.kkUri : undefined,
      nibUri: typeof a.nibUri === 'string' && !a.nibUri.startsWith('data:') ? a.nibUri : undefined,
    };

    list.push(item);
    searchIndexMap[id] = item;
  }

  // Self-heal settings/actors_search asynchronously
  import('firebase/database').then(({ set }) => {
    set(ref(database, 'settings/actors_search'), JSON.parse(JSON.stringify(searchIndexMap))).catch(() => {});
  });

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
    const isAll = searchParams.get('all') === 'true';

    const actors = await getLightweightActors();

    // If client requested full lightweight index for instant local searching
    if (isAll) {
      const results = coordinator
        ? actors.filter(item => String(item.coordinator || '').toUpperCase().trim() === coordinator)
        : actors;
      return NextResponse.json({
        success: true,
        count: results.length,
        results,
      });
    }

    if (!query) {
      return NextResponse.json({ success: true, count: 0, results: [] });
    }

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
