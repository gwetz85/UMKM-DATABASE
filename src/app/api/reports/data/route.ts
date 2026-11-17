import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

interface ReportCachePayload {
  timestamp: number;
  generatedAt: string;
  actors: any[];
  systemUsers: any[];
}

let reportCache: ReportCachePayload | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes in-memory cache

async function ensureAuth() {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch {
      // RTDB security rules permit read on businessActors, system_users, settings, bpjs_comparison_data
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

function buildBpjsLookupMap(rawSettingsBpjs: any, rawRootBpjs: any): Map<string, any> {
  const map = new Map<string, any>();
  const addItems = (raw: any) => {
    if (!raw) return;
    const list = Array.isArray(raw) ? raw : Object.values(raw);
    list.forEach((item: any) => {
      if (!item || typeof item !== 'object') return;
      if (item.nik) {
        const clean = String(item.nik).replace(/\D/g, '');
        if (clean) map.set(clean, item);
      }
      if (item.nama) {
        const upperName = String(item.nama).trim().toUpperCase();
        if (upperName && !map.has(upperName)) {
          map.set(upperName, item);
        }
      }
    });
  };
  // Root node first, then settings/bpjs_comparison_data takes priority
  addItems(rawRootBpjs);
  addItems(rawSettingsBpjs);
  return map;
}

function resolveBpjsForActor(actor: any, bpjsMap: Map<string, any>) {
  const cleanNik = actor.nik ? String(actor.nik).replace(/\D/g, '') : '';
  const upperName = actor.fullName ? String(actor.fullName).trim().toUpperCase() : '';
  const bpjsItem =
    (cleanNik ? bpjsMap.get(cleanNik) : null) ||
    (upperName ? bpjsMap.get(upperName) : null) ||
    null;

  const rawKet = String(
    bpjsItem?.keterangan ||
      actor.bpjsCheckNote ||
      actor.bpjsKeterangan ||
      ''
  )
    .toUpperCase()
    .trim();

  const rawStatus = String(bpjsItem?.status || actor.bpjsStatus || '')
    .toUpperCase()
    .trim();

  const kpj = String(bpjsItem?.kpj || bpjsItem?.noKpj || actor.bpjsKpj || '').trim();
  const checkedAt = String(bpjsItem?.updatedAt || actor.bpjsCheckedAt || '').trim();
  const sourceFile = String(bpjsItem?.sourceFile || actor.bpjsSourceFile || '').trim();

  const hasMatch = Boolean(
    bpjsItem ||
      actor.bpjsCheckStatus ||
      actor.bpjsStatus ||
      actor.bpjsKeterangan ||
      actor.bpjsCheckNote
  );

  if (!hasMatch) {
    return {
      hasMatch: false,
      statusLabel: 'BELUM DIVERIFIKASI',
      statusCode: '-',
      note: '-',
      kpj: kpj || '-',
      checkedAt: checkedAt || '',
      sourceFile: sourceFile || '',
    };
  }

  // 1. Duplikasi kepesertaan
  if (
    rawKet.includes('DUPLIKASI') ||
    rawKet.includes('DUPLIKAT') ||
    rawKet.includes('GANDA') ||
    rawKet.includes('SUDAH MENJADI PESERTA')
  ) {
    return {
      hasMatch: true,
      statusLabel: 'TIDAK BISA DIDAFTARKAN (DUPLIKASI)',
      statusCode: rawStatus || 'T',
      note: bpjsItem?.keterangan || actor.bpjsCheckNote || actor.bpjsKeterangan || 'DUPLIKASI KEPESERTAAN BPJS',
      kpj: kpj || '-',
      checkedAt: checkedAt || '',
      sourceFile: sourceFile || '',
    };
  }

  // 2. Usia diatas 65 tahun
  if (
    rawKet.includes('65') ||
    (rawKet.includes('USIA') && (rawKet.includes('LEBIH') || rawKet.includes('DIATAS')))
  ) {
    return {
      hasMatch: true,
      statusLabel: 'USIA DIATAS 65 TAHUN',
      statusCode: rawStatus || 'T',
      note: bpjsItem?.keterangan || actor.bpjsCheckNote || actor.bpjsKeterangan || 'Usia Lebih 65 Tahun',
      kpj: kpj || '-',
      checkedAt: checkedAt || '',
      sourceFile: sourceFile || '',
    };
  }

  // 3. Bisa daftar / Terverifikasi
  const isBisaDaftar =
    rawStatus === 'Y' ||
    rawKet.includes('BISA DAFTAR') ||
    rawKet.includes('TERVERIFIKASI') ||
    rawKet.includes('SESUAI') ||
    rawKet.includes('LOLOS') ||
    actor.bpjsCheckStatus === 'sesuai' ||
    (bpjsItem && !rawKet && !rawStatus);

  if (isBisaDaftar && rawStatus !== 'T' && rawStatus !== 'N') {
    return {
      hasMatch: true,
      statusLabel: 'TERVERIFIKASI / BISA DAFTAR',
      statusCode: rawStatus || 'Y',
      note: bpjsItem?.keterangan || actor.bpjsCheckNote || actor.bpjsKeterangan || 'Bisa Daftar / Terverifikasi',
      kpj: kpj || '-',
      checkedAt: checkedAt || '',
      sourceFile: sourceFile || '',
    };
  }

  // 4. Ditolak / Tidak lolos lainnya
  return {
    hasMatch: true,
    statusLabel: (bpjsItem?.keterangan || actor.bpjsKeterangan || 'TIDAK LOLOS BPJS').toUpperCase(),
    statusCode: rawStatus || 'T',
    note: bpjsItem?.keterangan || actor.bpjsCheckNote || actor.bpjsKeterangan || 'Tidak Lolos Verifikasi BPJS',
    kpj: kpj || '-',
    checkedAt: checkedAt || '',
    sourceFile: sourceFile || '',
  };
}

async function loadReportDataset(forceRefresh = false): Promise<ReportCachePayload> {
  const now = Date.now();
  if (!forceRefresh && reportCache && now - reportCache.timestamp < CACHE_TTL_MS) {
    return reportCache;
  }

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

  const systemUsers: any[] = [];
  if (usersSnap && usersSnap.exists()) {
    const rawUsers = usersSnap.val() || {};
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
  }

  const actors: any[] = [];
  if (actorsSnap && actorsSnap.exists()) {
    const rawActors = actorsSnap.val() || {};
    for (const [id, a] of Object.entries(rawActors as Record<string, any>)) {
      if (!a || typeof a !== 'object') continue;
      if ((!a.fullName && !a.nik) || a.isGhost || String(a.status || '').toLowerCase().includes('ghost')) {
        continue;
      }

      const resolvedKel = resolveKelurahan(a);
      const resolvedKec = resolveKecamatan(a, resolvedKel);
      const resolvedRt = resolveRtRw(a);
      const resolvedPob = resolvePob(a);
      const parsedPobDob = parsePobDob(a.pobDob || '');
      const resolvedDob = a.dob || a.tanggalLahir || parsedPobDob.dob || extractDobFromNik(a.nik || '') || '';
      const bpjsResolved = resolveBpjsForActor(a, bpjsMap);

      actors.push({
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
      });
    }
  }

  reportCache = {
    timestamp: now,
    generatedAt: new Date(now).toISOString(),
    actors,
    systemUsers,
  };

  return reportCache;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const payload = await loadReportDataset(forceRefresh);

    return NextResponse.json(
      {
        success: true,
        generatedAt: payload.generatedAt,
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
