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

function isUsahaMatch(item: any, q: string): boolean {
  if (!q || q === '*' || q === 'all') return true;
  const qLower = q.toLowerCase().trim();

  const usahaStr = String(item._displayBusiness || '').toLowerCase();
  const rawCat = String(item._businessCategory || '').trim();
  const catLower = rawCat.toLowerCase();
  const deskripsi = String(item._raw?.surveyData?.deskripsiUsaha || '').toLowerCase();
  const jenis = String(item._raw?.surveyData?.jenisUsaha || '').toLowerCase();

  // 1. KULINER / MAKANAN
  if (qLower === 'kuliner' || qLower === 'makanan' || qLower === 'kuliner / makanan') {
    // If it's a SIMPU actor with explicit category:
    if (item._sourceType === 'actors') {
      return rawCat === 'Kuliner';
    }

    // For Sheet Pembanding (2025, 2024, 2023):
    // Match only if the usaha text is actually culinary/food related
    const isFood = /\b(kuliner|makan|makanan|minum|minuman|kue|roti|kedai makan|warung makan|katering|catering|gorengan|keripik|kerupuk|peyek|snack|mie|bakso|jajan|jajanan|kopi|cafe|kafe|resto|restoran|soto|sate|pempek|seafood|otak|tahu|tempe|nasi|es\b|jus\b|bolu|donat)\b/i.test(usahaStr);
    
    // Explicitly exclude non-food grocery/services
    const isExcluded = /\b(kelontong|runcit|sembako|bengkel|jahit|boat|penambang|elektronik|laundry|salon|pangkas|toko pakaian|teralis|bangunan)\b/i.test(usahaStr);

    return isFood && !isExcluded;
  }

  // 2. WARUNG / SEMBAKO
  if (qLower === 'warung' || qLower === 'sembako' || qLower === 'kelontong' || qLower === 'warung / sembako') {
    return /\b(warung|sembako|kelontong|runcit|kios|toko)\b/i.test(usahaStr) ||
           /\b(warung|sembako|kelontong|runcit)\b/i.test(deskripsi) ||
           /\b(warung|sembako|kelontong|runcit)\b/i.test(jenis);
  }

  // 3. KUE & ROTI
  if (qLower === 'kue' || qLower === 'roti' || qLower === 'kue & roti') {
    return /\b(kue|roti|bakery|cake|pastry|bolu|donat|kering|basah|keripik|kerupuk|peyek)\b/i.test(usahaStr) ||
           /\b(kue|roti)\b/i.test(deskripsi);
  }

  // 4. JAHIT / PAKAIAN
  if (qLower === 'jahit' || qLower === 'pakaian' || qLower === 'konveksi' || qLower === 'jahit / pakaian') {
    return /\b(jahit|pakaian|konveksi|tailor|taylor|busana|bordir|baju|tekstil|kain)\b/i.test(usahaStr) ||
           /\b(jahit|pakaian|konveksi)\b/i.test(deskripsi) ||
           /\b(jahit|pakaian|konveksi)\b/i.test(jenis);
  }

  // 5. BENGKEL / OTOMOTIF
  if (qLower === 'bengkel' || qLower === 'otomotif' || qLower === 'bengkel / otomotif') {
    return /\b(bengkel|motor|mobil|otomotif|las|tambal ban|servis|service|sparepart|onderdil)\b/i.test(usahaStr) ||
           /\b(bengkel|motor|mobil)\b/i.test(deskripsi);
  }

  // 6. LAUNDRY
  if (qLower === 'laundry' || qLower === 'cuci') {
    return /\b(laundry|cuci|binatu)\b/i.test(usahaStr);
  }

  // 7. SALON & PANGKAS
  if (qLower === 'salon' || qLower === 'pangkas' || qLower === 'salon & pangkas') {
    return /\b(salon|pangkas|cukur|barber|rambut|rias|make up)\b/i.test(usahaStr);
  }

  // 8. PERTANIAN & IKAN
  if (qLower === 'ikan' || qLower === 'pertanian' || qLower === 'pertanian & ikan') {
    return /\b(ikan|perikanan|nelayan|tani|pertanian|ternak|kebun|sayur|bibit|tambak|kolam|hidroponik)\b/i.test(usahaStr);
  }

  // 9. MINUMAN & KOPI
  if (qLower === 'kopi' || qLower === 'minuman' || qLower === 'minuman & kopi') {
    return /\b(kopi|minuman|kedai kopi|cafe|kafe|jus|teh|boba|es\b)\b/i.test(usahaStr);
  }

  // 10. BOAT & PENAMBANG
  if (qLower === 'boat' || qLower === 'penambang' || qLower === 'boat / penambang') {
    return /\b(boat|penambang|pompong|sampan|speedboat|perahu)\b/i.test(usahaStr);
  }

  // 11. General / Custom search:
  // If category is 'Bukan Kuliner', do NOT match 'kuliner'
  let catMatch = false;
  if (catLower !== 'bukan kuliner' && catLower.includes(qLower)) {
    catMatch = true;
  }

  return (
    usahaStr.includes(qLower) ||
    catMatch ||
    deskripsi.includes(qLower) ||
    jenis.includes(qLower)
  );
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

    // 1. Filter by query Usaha
    const matchingData = allData.filter((item) => {
      if (!isUsahaMatch(item, query)) {
        return false;
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
