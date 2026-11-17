import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import {
  parsePobDob,
  extractDobFromNik,
  resolveRtRw,
  resolveKelurahan,
  resolveKecamatan,
  resolvePob,
} from '@/lib/utils';
import { buildBpjsLookupMap, resolveBpjsForActor } from '@/lib/report-excel-generator';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

interface ReportCachePayload {
  timestamp: number;
  generatedAt: string;
  isFullIndex: boolean;
  actors: any[];
  systemUsers: any[];
}

let reportCache: ReportCachePayload | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory cache

async function ensureAuth() {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch {
      // RTDB security rules permit public read on businessActors, system_users, settings, bpjs_comparison_data
    }
  }
}

function stripBase64(val: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed || trimmed.startsWith('data:')) return '';
  return trimmed;
}

function extractCleanSurveyData(sd: any) {
  if (!sd || typeof sd !== 'object') return undefined;
  const clean: Record<string, any> = {
    hasSurvey: true,
    namaUsaha: sd.namaUsaha || '',
    namaPemilik: sd.namaPemilik || '',
    jenisKelamin: sd.jenisKelamin || '',
    status: sd.status || '',
    alamatRumah: sd.alamatRumah || '',
    alamatUsaha: sd.alamatUsaha || '',
    noHp: sd.noHp || '',
    email: sd.email || '',
    sosmed: sd.sosmed || '',
    bidangUsaha: sd.bidangUsaha || '',
    peralatan: sd.peralatan || '',
    tahunBerdiri: sd.tahunBerdiri || '',
    izin: Array.isArray(sd.izin) ? sd.izin : sd.izin ? [String(sd.izin)] : [],
    modalUsaha: sd.modalUsaha || '',
    omset: sd.omset || '',
    rencanaPenggunaan: sd.rencanaPenggunaan || '',
    hasilSurvey: sd.hasilSurvey || '',
    tanggalSurvey: sd.tanggalSurvey || '',
    hasPhoto: Boolean(sd.hasPhoto || sd.fotoSurveyUrl),
    fotoSurveyUrl: stripBase64(sd.fotoSurveyUrl),
  };

  if (sd.dtks && typeof sd.dtks === 'object') {
    clean.dtks = {
      masuk: Boolean(sd.dtks.masuk),
      jenis: sd.dtks.jenis || '',
    };
  } else if (typeof sd.dtks === 'string' && sd.dtks.trim()) {
    clean.dtks = sd.dtks.trim();
  }

  if (sd.hibah && typeof sd.hibah === 'object') {
    clean.hibah = {
      pernah: Boolean(sd.hibah.pernah),
      dariMana: sd.hibah.dariMana || '',
      tahun: sd.hibah.tahun || '',
    };
  } else if (typeof sd.hibah === 'string' && sd.hibah.trim()) {
    clean.hibah = sd.hibah.trim();
  }

  if (sd.pejabatData && typeof sd.pejabatData === 'object') {
    clean.pejabatData = sd.pejabatData;
  }

  return clean;
}

function normalizeActorForReport(id: string, a: any, bpjsMap: Map<string, any>) {
  const resolvedKel = resolveKelurahan(a);
  const resolvedKec = resolveKecamatan(a, resolvedKel);
  const resolvedRt = resolveRtRw(a);
  const resolvedPob = resolvePob(a);
  const parsedPobDob = parsePobDob(a.pobDob || '');
  const resolvedDob = a.dob || a.tanggalLahir || parsedPobDob.dob || extractDobFromNik(a.nik || '') || '';
  const bpjsResolved = resolveBpjsForActor(a, bpjsMap);

  return {
    id,
    registrationCode: a.registrationCode || '',
    fullName: a.fullName || '',
    nik: a.nik || '',
    noKK: a.noKK || '',
    pobDob: a.pobDob || '',
    pob: resolvedPob !== '-' ? resolvedPob : (a.pob || ''),
    dob: resolvedDob,
    gender: a.gender || a.surveyData?.jenisKelamin || '',
    phone: a.phone || a.surveyData?.noHp || '',
    agama: a.agama || '',
    pekerjaan: a.pekerjaan || '',
    address: a.address || a.surveyData?.alamatRumah || '',
    rtRw: resolvedRt !== '-' ? resolvedRt : (a.rtRw || ''),
    kelurahan: resolvedKel !== '-' ? resolvedKel : (a.kelurahan || ''),
    kecamatan: resolvedKec !== '-' ? resolvedKec : (a.kecamatan || ''),
    tanggalCetakKtp: a.tanggalCetakKtp || '',
    statusKeluarga: a.statusKeluarga || a.surveyData?.status || '',
    namaKepalaKeluarga: a.namaKepalaKeluarga || '',
    nikKepalaKeluarga: a.nikKepalaKeluarga || '',
    tanggalCetakKk: a.tanggalCetakKk || '',
    businessCategory: a.businessCategory || '',
    businessName: a.businessName || a.surveyData?.namaUsaha || '',
    businessLocation: a.businessLocation || a.surveyData?.alamatUsaha || '',
    coordinator: a.coordinator || '',
    petugasSurvey: a.petugasSurvey || a.pejabatData?.petugas?.nama || a.surveyData?.pejabatData?.petugas?.nama || '',
    verifikatorDinas: a.verifikatorDinas || a.pejabatData?.verifikator?.nama || a.surveyData?.pejabatData?.verifikator?.nama || '',
    bankNumber: a.bankNumber || '',
    bankOwner: a.bankOwner || '',
    bankName: a.bankName || '',
    status: a.status || 'pending',
    rejectionReason: a.rejectionReason || '',
    createdAt: a.createdAt || '',
    createdBy: a.createdBy || '',
    lpjNominal: a.lpjNominal || 0,
    lpjEntryDate: a.lpjEntryDate || '',
    readyForLPJ: Boolean(a.readyForLPJ),
    hasilVerifikasiDinas: a.hasilVerifikasiDinas || '',
    keteranganDinas: a.keteranganDinas || '',
    filingNote: a.filingNote || '',
    surveyProgress: typeof a.surveyProgress === 'number' ? a.surveyProgress : undefined,
    surveyData: extractCleanSurveyData(a.surveyData),
    pejabatData: a.pejabatData || a.surveyData?.pejabatData || null,
    verificationLocationDinas: a.verificationLocationDinas || a.verificationLocation || null,
    googleDriveLink: stripBase64(a.googleDriveLink),
    hasSurveyPhoto: Boolean(a.hasSurveyPhoto || a.photoSurveyUrl || a.surveyData?.hasPhoto || a.surveyData?.fotoSurveyUrl),
    verifiedDinasAt: a.verifiedDinasAt || '',
    verifiedDinasBy: a.verifiedDinasBy || '',
    berkasDinasVerified: Boolean(a.berkasDinasVerified),
    berkasDinasVerifiedAt: a.berkasDinasVerifiedAt || '',
    berkasDinasVerifiedBy: a.berkasDinasVerifiedBy || '',
    alasanCancelDinas: a.alasanCancelDinas || '',
    cancelDinasAt: a.cancelDinasAt || '',
    cancelDinasBy: a.cancelDinasBy || '',
    dihapusDinasAt: a.dihapusDinasAt || '',
    dihapusDinasBy: a.dihapusDinasBy || '',
    dikembalikanKePetugasAt: a.dikembalikanKePetugasAt || '',
    dikembalikanKePetugasBy: a.dikembalikanKePetugasBy || '',
    dikembalikanKePetugasReason: a.dikembalikanKePetugasReason || '',
    dikembalikanKeVerifikatorAt: a.dikembalikanKeVerifikatorAt || '',
    dikembalikanKeVerifikatorBy: a.dikembalikanKeVerifikatorBy || '',
    dikembalikanKeVerifikatorReason: a.dikembalikanKeVerifikatorReason || '',
    catatanPengembalian: a.catatanPengembalian || '',
    bpjsSubmissionStatus: a.bpjsSubmissionStatus || '',
    bpjsCheckStatus: a.bpjsCheckStatus || '',
    bpjsStatus: a.bpjsStatus || '',
    bpjsKeterangan: a.bpjsKeterangan || '',
    bpjsCheckNote: a.bpjsCheckNote || '',
    bpjsCheckedAt: a.bpjsCheckedAt || '',
    bpjsKpj: a.bpjsKpj || '',
    bpjsSourceFile: a.bpjsSourceFile || '',
    bpjsResolved,
  };
}

function parseSystemUsers(rawUsers: any): any[] {
  if (!rawUsers || typeof rawUsers !== 'object') return [];
  const systemUsers: any[] = [];
  Object.entries(rawUsers).forEach(([id, u]: [string, any]) => {
    if (!u || typeof u !== 'object') return;
    systemUsers.push({
      id,
      username: u.username || id,
      fullName: u.fullName || u.name || '',
      role: u.role || '',
      nipppk: u.nipppk || '',
      pejabatData: u.pejabatData || null,
    });
  });
  return systemUsers;
}

/**
 * FAST PATH (< 300ms):
 * Reads pre-indexed `settings/report_index` (or falls back to `settings/actors_search`),
 * NEVER downloads 157MB `businessActors`.
 */
async function loadFastReportDataset(forceRefresh = false): Promise<ReportCachePayload> {
  const now = Date.now();
  if (!forceRefresh && reportCache && now - reportCache.timestamp < CACHE_TTL_MS) {
    return reportCache;
  }

  await ensureAuth();

  const [reportIndexSnap, searchIndexSnap, usersSnap, settingsBpjsSnap, rootBpjsSnap] = await Promise.all([
    get(ref(database, 'settings/report_index')).catch(() => null),
    get(ref(database, 'settings/actors_search')).catch(() => null),
    get(ref(database, 'system_users')).catch(() => null),
    get(ref(database, 'settings/bpjs_comparison_data')).catch(() => null),
    get(ref(database, 'bpjs_comparison_data')).catch(() => null),
  ]);

  const bpjsMap = buildBpjsLookupMap(
    settingsBpjsSnap?.exists() ? settingsBpjsSnap.val() : null,
    rootBpjsSnap?.exists() ? rootBpjsSnap.val() : null
  );
  const systemUsers = parseSystemUsers(usersSnap?.exists() ? usersSnap.val() : null);

  // Priority 1: Use pre-built lightweight full report index if available
  if (reportIndexSnap && reportIndexSnap.exists()) {
    const idxVal = reportIndexSnap.val() || {};
    const rawMap = idxVal.actors || idxVal;
    if (rawMap && typeof rawMap === 'object') {
      const actors: any[] = [];
      for (const [id, a] of Object.entries(rawMap as Record<string, any>)) {
        if (!a || typeof a !== 'object' || (!a.fullName && !a.nik)) continue;
        actors.push({
          ...a,
          id,
          bpjsResolved: resolveBpjsForActor(a, bpjsMap),
        });
      }
      if (actors.length > 0) {
        reportCache = {
          timestamp: now,
          generatedAt: idxVal.updatedAt || new Date(now).toISOString(),
          isFullIndex: true,
          actors,
          systemUsers,
        };
        return reportCache;
      }
    }
  }

  // Priority 2: Use lightweight `settings/actors_search` (< 200ms)
  const actors: any[] = [];
  if (searchIndexSnap && searchIndexSnap.exists()) {
    const rawSearch = searchIndexSnap.val() || {};
    for (const [id, a] of Object.entries(rawSearch as Record<string, any>)) {
      if (!a || typeof a !== 'object' || (!a.fullName && !a.nik)) continue;
      actors.push(normalizeActorForReport(id, a, bpjsMap));
    }
  }

  reportCache = {
    timestamp: now,
    generatedAt: new Date(now).toISOString(),
    isFullIndex: false,
    actors,
    systemUsers,
  };
  return reportCache;
}

/**
 * FULL SYNC PATH (Background / On-demand):
 * Builds complete lightweight index from `businessActors` (ALL statuses + ALL timestamps + ZERO base64)
 * and persists it into `settings/report_index` so every future load takes < 250ms.
 */
async function loadFullReportDataset(): Promise<ReportCachePayload> {
  const now = Date.now();
  await ensureAuth();

  const [actorsSnap, usersSnap, settingsBpjsSnap, rootBpjsSnap] = await Promise.all([
    get(ref(database, 'businessActors')).catch(() => null),
    get(ref(database, 'system_users')).catch(() => null),
    get(ref(database, 'settings/bpjs_comparison_data')).catch(() => null),
    get(ref(database, 'bpjs_comparison_data')).catch(() => null),
  ]);

  const bpjsMap = buildBpjsLookupMap(
    settingsBpjsSnap?.exists() ? settingsBpjsSnap.val() : null,
    rootBpjsSnap?.exists() ? rootBpjsSnap.val() : null
  );
  const systemUsers = parseSystemUsers(usersSnap?.exists() ? usersSnap.val() : null);

  const actors: any[] = [];
  const indexMap: Record<string, any> = {};

  if (actorsSnap && actorsSnap.exists()) {
    const rawActors = actorsSnap.val() || {};
    for (const [id, a] of Object.entries(rawActors as Record<string, any>)) {
      if (!a || typeof a !== 'object') continue;
      if ((!a.fullName && !a.nik) || a.isGhost || String(a.status || '').toLowerCase().includes('ghost')) {
        continue;
      }
      const normalized = normalizeActorForReport(id, a, bpjsMap);
      actors.push(normalized);
      // Store compact version without redundant bpjsResolved (recomputed live on read)
      const { bpjsResolved: _omit, ...compactForIndex } = normalized;
      indexMap[id] = compactForIndex;
    }
  }

  const updatedAt = new Date(now).toISOString();

  // Best-effort persist to settings/report_index for sub-second future loads
  if (Object.keys(indexMap).length > 0) {
    set(
      ref(database, 'settings/report_index'),
      JSON.parse(JSON.stringify({ updatedAt, count: actors.length, actors: indexMap }))
    ).catch(() => {});
  }

  reportCache = {
    timestamp: now,
    generatedAt: updatedAt,
    isFullIndex: true,
    actors,
    systemUsers,
  };

  return reportCache;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'fast';
    const forceRefresh = searchParams.get('refresh') === 'true';

    const payload =
      mode === 'full'
        ? await loadFullReportDataset()
        : await loadFastReportDataset(forceRefresh);

    return NextResponse.json(
      {
        success: true,
        generatedAt: payload.generatedAt,
        isFullIndex: payload.isFullIndex,
        count: payload.actors.length,
        actors: payload.actors,
        systemUsers: payload.systemUsers,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in /api/reports/data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Gagal memuat data laporan.',
        actors: [],
        systemUsers: [],
      },
      { status: 500 }
    );
  }
}
