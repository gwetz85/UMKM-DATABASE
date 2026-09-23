import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

interface CacheItem {
  timestamp: number;
  data: any[];
}

let cachedData: CacheItem | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

async function getUsahaCombinedDataset(): Promise<any[]> {
  const now = Date.now();
  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return cachedData.data;
  }

  await ensureAuth();

  // Fetch only Pengajuan Terbaru and Sheet Pembanding (2025, 2024, 2023)
  // Blacklist data is intentionally ignored / excluded per user instruction
  const [actorsSnap, m25Snap, m24Snap, m23Snap] = await Promise.all([
    get(ref(database, 'businessActors')).catch(() => null),
    get(ref(database, 'master_data_2025')).catch(() => null),
    get(ref(database, 'master_data_2024')).catch(() => null),
    get(ref(database, 'master_data_2023')).catch(() => null),
  ]);

  const combined: any[] = [];

  // 1. Business Actors (Pengajuan Terbaru SIMPU)
  if (actorsSnap && actorsSnap.exists()) {
    const val = actorsSnap.val();
    Object.keys(val).forEach((k) => {
      const m = val[k];
      if (!m) return;

      const businessName = m.businessName || m.usaha || m.surveyData?.namaUsaha || '-';
      const category = m.businessCategory || m.surveyData?.sektorUsaha || '';

      combined.push({
        _id: k,
        _sourceType: 'actors',
        _sourceLabel: 'Pengajuan Terbaru (SIMPU)',
        _isPengajuanTerbaru: true,
        _isPembanding: false,
        _displayName: m.fullName || m.nama || '-',
        _displayBusiness: businessName,
        _businessCategory: category,
        _displayNik: m.nik || '-',
        _displayKk: m.noKK || m.kk || '-',
        _displayPhone: m.phone || m.noHp || m.telepon || '-',
        _displayAddress: m.address || m.alamat || '-',
        _displayKelurahan: m.kelurahan || m.surveyData?.kelurahan || '-',
        _displayKecamatan: m.kecamatan || m.surveyData?.kecamatan || '-',
        _displayStatus: m.status || 'pending',
        _displayNominal: m.lpjNominal || m.nominal || 0,
        _displayYear: m.createdAt ? new Date(m.createdAt).getFullYear().toString() : '2026',
        _coordinator: m.coordinator || m.koordinator || '-',
        _surveyor: m.petugasSurvey || m.surveyData?.namaPetugas || '-',
        _hasSurveyPhoto: !!(m.photoSurveyUrl || m.photoUsahaUri || m.surveyData?.photoUsahaUrl),
        _photoUrl: m.photoSurveyUrl || m.photoUsahaUri || m.surveyData?.photoUsahaUrl || '',
        _raw: m,
      });
    });
  }

  // 2. Sheet Pembanding 2025 (Sheet 3)
  if (m25Snap && m25Snap.exists()) {
    const val = m25Snap.val();
    const list = Array.isArray(val) ? val : Object.values(val);
    list.filter(Boolean).forEach((m: any, idx) => {
      const usaha = m.usaha || m.businessName || m.USAHA || m.Usaha || '-';
      combined.push({
        _id: m.id || m.nik || `m25_${idx}`,
        _sourceType: 'master_2025',
        _sourceLabel: 'Pembanding 2025 (Sheet 3)',
        _isPengajuanTerbaru: false,
        _isPembanding: true,
        _displayName: m.nama || m.fullName || m.NAMA || m.Nama || '-',
        _displayBusiness: usaha,
        _businessCategory: m.kategori || m.sektor || '',
        _displayNik: m.nik || m.Nik || m.NIK || '-',
        _displayKk: m.noKK || m.kk || m['NO KK'] || m.no_kk || '-',
        _displayPhone: m.phone || m.noHp || m.telepon || '-',
        _displayAddress: m.alamat || m.address || m.ALAMAT || '-',
        _displayKelurahan: m.kelurahan || '-',
        _displayKecamatan: m.kecamatan || '-',
        _displayStatus: m.status || m.STATUS || 'Terdaftar',
        _displayNominal: m.nominal || m.lpjNominal || m.NOM || 0,
        _displayYear: m.tahunPengajuan || m.tahun || '2025',
        _coordinator: m.koordinator || m.coordinator || '-',
        _surveyor: '-',
        _hasSurveyPhoto: false,
        _photoUrl: '',
        _raw: m,
      });
    });
  }

  // 3. Sheet Pembanding 2024 (Sheet 1)
  if (m24Snap && m24Snap.exists()) {
    const val = m24Snap.val();
    const list = Array.isArray(val) ? val : Object.values(val);
    list.filter(Boolean).forEach((m: any, idx) => {
      const usaha = m.usaha || m.businessName || m.USAHA || m.Usaha || '-';
      combined.push({
        _id: m.id || m.nik || `m24_${idx}`,
        _sourceType: 'master_2024',
        _sourceLabel: 'Pembanding 2024 (Sheet 1)',
        _isPengajuanTerbaru: false,
        _isPembanding: true,
        _displayName: m.nama || m.fullName || m.NAMA || m.Nama || '-',
        _displayBusiness: usaha,
        _businessCategory: m.kategori || m.sektor || '',
        _displayNik: m.nik || m.Nik || m.NIK || '-',
        _displayKk: m.noKK || m.kk || m['NO KK'] || m.no_kk || '-',
        _displayPhone: m.phone || m.noHp || m.telepon || '-',
        _displayAddress: m.alamat || m.address || m.ALAMAT || '-',
        _displayKelurahan: m.kelurahan || '-',
        _displayKecamatan: m.kecamatan || '-',
        _displayStatus: m.status || m.STATUS || 'Terdaftar',
        _displayNominal: m.nominal || m.lpjNominal || m.NOM || 0,
        _displayYear: m.tahunPengajuan || m.tahun || '2024',
        _coordinator: m.koordinator || m.coordinator || '-',
        _surveyor: '-',
        _hasSurveyPhoto: false,
        _photoUrl: '',
        _raw: m,
      });
    });
  }

  // 4. Sheet Pembanding 2023 (Sheet 2)
  if (m23Snap && m23Snap.exists()) {
    const val = m23Snap.val();
    const list = Array.isArray(val) ? val : Object.values(val);
    list.filter(Boolean).forEach((m: any, idx) => {
      const usaha = m.usaha || m.businessName || m.USAHA || m.Usaha || '-';
      combined.push({
        _id: m.id || m.nik || `m23_${idx}`,
        _sourceType: 'master_2023',
        _sourceLabel: 'Pembanding 2023 (Sheet 2)',
        _isPengajuanTerbaru: false,
        _isPembanding: true,
        _displayName: m.nama || m.fullName || m.NAMA || m.Nama || '-',
        _displayBusiness: usaha,
        _businessCategory: m.kategori || m.sektor || '',
        _displayNik: m.nik || m.Nik || m.NIK || '-',
        _displayKk: m.noKK || m.kk || m['NO KK'] || m.no_kk || '-',
        _displayPhone: m.phone || m.noHp || m.telepon || '-',
        _displayAddress: m.alamat || m.address || m.ALAMAT || '-',
        _displayKelurahan: m.kelurahan || '-',
        _displayKecamatan: m.kecamatan || '-',
        _displayStatus: m.status || m.STATUS || 'Terdaftar',
        _displayNominal: m.nominal || m.lpjNominal || m.NOM || 0,
        _displayYear: m.tahunPengajuan || m.tahun || '2023',
        _coordinator: m.koordinator || m.coordinator || '-',
        _surveyor: '-',
        _hasSurveyPhoto: false,
        _photoUrl: '',
        _raw: m,
      });
    });
  }

  cachedData = {
    timestamp: now,
    data: combined,
  };

  return combined;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const source = (searchParams.get('source') || 'all').trim();
    const refresh = searchParams.get('refresh') === 'true';

    if (refresh) {
      cachedData = null; // force reload from firebase
    }

    const allData = await getUsahaCombinedDataset();
    const queryLower = query.toLowerCase();

    // 1. Filter by query Usaha (and optionally by name if query matches)
    const matchingData = allData.filter((item) => {
      // If query provided, check usaha fields
      if (query && query !== '*' && query !== 'all') {
        const usahaStr = String(item._displayBusiness || '').toLowerCase();
        const catStr = String(item._businessCategory || '').toLowerCase();
        const deskripsiStr = String(item._raw?.surveyData?.deskripsiUsaha || '').toLowerCase();
        const jenisStr = String(item._raw?.surveyData?.jenisUsaha || '').toLowerCase();

        const matchUsaha =
          usahaStr.includes(queryLower) ||
          catStr.includes(queryLower) ||
          deskripsiStr.includes(queryLower) ||
          jenisStr.includes(queryLower);

        if (!matchUsaha) return false;
      }

      // Filter by source
      if (source === 'actors') {
        return item._sourceType === 'actors';
      }
      if (source === 'pembanding') {
        return item._isPembanding === true;
      }
      if (source === 'master_2025') {
        return item._sourceType === 'master_2025';
      }
      if (source === 'master_2024') {
        return item._sourceType === 'master_2024';
      }
      if (source === 'master_2023') {
        return item._sourceType === 'master_2023';
      }

      return true;
    });

    // 2. Calculate summary statistics from the matching results
    let actorsCount = 0;
    let pembanding2025Count = 0;
    let pembanding2024Count = 0;
    let pembanding2023Count = 0;

    matchingData.forEach((item) => {
      if (item._sourceType === 'actors') actorsCount++;
      else if (item._sourceType === 'master_2025') pembanding2025Count++;
      else if (item._sourceType === 'master_2024') pembanding2024Count++;
      else if (item._sourceType === 'master_2023') pembanding2023Count++;
    });

    const pembandingTotalCount = pembanding2025Count + pembanding2024Count + pembanding2023Count;

    return NextResponse.json(
      {
        success: true,
        count: matchingData.length,
        results: matchingData,
        stats: {
          total: matchingData.length,
          actorsCount,
          pembandingTotalCount,
          pembanding2025Count,
          pembanding2024Count,
          pembanding2023Count,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in /api/cek-usaha:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
