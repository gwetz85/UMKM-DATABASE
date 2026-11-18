import { Database, ref, get } from 'firebase/database';
import { BusinessActor } from '@/app/lib/types';
import {
  parsePobDob,
  calculateAge,
  extractDobFromNik,
  formatDateTimeIndo,
  resolveRtRw,
  resolveKelurahan,
  resolveKecamatan,
  resolvePob,
} from '@/lib/utils';
import { getActorCurrentMenu } from '@/lib/actor-menu-status';
import { resolveSurveyorCanonicalName } from '@/lib/surveyor-utils';
import { getSurveyPhoto, isValidPhotoString } from '@/lib/survey-photo-service';

export interface ExcelExportOptions {
  database?: Database | null;
  onProgress?: (stage: string, done?: number, total?: number) => void;
}

// Session cache of resized JPEG base64 thumbnails (keyed by actorId) so subsequent exports are instant
const excelPhotoCache = new Map<string, string | null>();

async function normalizePhotoToExcelJpeg(
  rawPhoto: string,
  targetW = 240,
  targetH = 176
): Promise<string | null> {
  if (!rawPhoto || typeof rawPhoto !== 'string') return null;
  const trimmed = rawPhoto.trim();
  if (!trimmed || trimmed === '-') return null;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.crossOrigin = 'anonymous';
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Image load failed'));
        el.src = trimmed;
      });

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Crisp white background with 6px frame padding so photo fits neatly inside Excel cell borders
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);

      const pad = 6;
      const availW = targetW - pad * 2;
      const availH = targetH - pad * 2;
      const imgW = img.naturalWidth || img.width || availW;
      const imgH = img.naturalHeight || img.height || availH;
      const scale = Math.min(availW / imgW, availH / imgH);
      const drawW = Math.round(imgW * scale);
      const drawH = Math.round(imgH * scale);
      const drawX = Math.round((targetW - drawW) / 2);
      const drawY = Math.round((targetH - drawH) / 2);

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      return dataUrl.split(',')[1] || null;
    } catch {
      const match = trimmed.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/i);
      if (match) return match[2];
      return null;
    }
  }

  const match = trimmed.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/i);
  return match ? match[2] : null;
}

async function fetchSingleActorPhotoFast(
  database: Database | null | undefined,
  actor: ReportActor
): Promise<string | null> {
  if (!actor || !actor.id) return null;
  if (excelPhotoCache.has(actor.id)) {
    return excelPhotoCache.get(actor.id) ?? null;
  }

  let rawPhoto: string | null = null;

  // 1. Check inline photo properties first
  const inline = actor.surveyData?.fotoSurveyUrl || actor.photoSurveyUrl;
  if (inline && isValidPhotoString(inline)) {
    rawPhoto = inline;
  }

  // 2. Fast 1-read leaf lookup on primary RTDB path
  if (!rawPhoto && database) {
    try {
      const snap = await get(ref(database, `businessActors/${actor.id}/surveyData/fotoSurveyUrl`));
      if (snap.exists() && isValidPhotoString(snap.val())) {
        rawPhoto = String(snap.val());
      }
    } catch {
      // ignore and fall back
    }
  }

  // 3. Fallback to multi-path getSurveyPhoto only if primary leaf was empty
  if (!rawPhoto && database) {
    rawPhoto = await getSurveyPhoto(database, actor.id, actor);
  }

  const normalized = rawPhoto ? await normalizePhotoToExcelJpeg(rawPhoto) : null;
  excelPhotoCache.set(actor.id, normalized);
  return normalized;
}

async function fetchSurveyPhotosMap(
  database: Database | null | undefined,
  actors: ReportActor[],
  onProgress?: (stage: string, done?: number, total?: number) => void
): Promise<Map<string, string>> {
  const resultMap = new Map<string, string>();
  const total = actors.length;
  if (total === 0) return resultMap;

  const BATCH_SIZE = 25;
  let completed = 0;

  onProgress?.('photos', 0, total);

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = actors.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (actor) => {
        const jpeg = await fetchSingleActorPhotoFast(database, actor);
        return { id: actor.id, jpeg };
      })
    );

    batchResults.forEach(({ id, jpeg }) => {
      if (id && jpeg) {
        resultMap.set(id, jpeg);
      }
    });

    completed = Math.min(total, i + batch.length);
    onProgress?.('photos', completed, total);
  }

  return resultMap;
}

export interface ResolvedBpjsInfo {
  hasMatch: boolean;
  statusLabel: string;
  statusCode: string;
  note: string;
  kpj: string;
  checkedAt: string;
  sourceFile: string;
}

export interface ReportActor extends BusinessActor {
  bpjsResolved?: ResolvedBpjsInfo;
  verificationLocation?: { lat: number; lon: number } | null;
}

export function buildBpjsLookupMap(rawSettingsBpjs: any, rawRootBpjs?: any): Map<string, any> {
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
  addItems(rawRootBpjs);
  addItems(rawSettingsBpjs);
  return map;
}

export function resolveBpjsForActor(
  actor: any,
  bpjsMap: Map<string, any>,
  strictRequireComparisonSheet: boolean = false
): ResolvedBpjsInfo {
  if (strictRequireComparisonSheet && bpjsMap.size === 0) {
    return {
      hasMatch: false,
      statusLabel: 'BELUM DIVERIFIKASI',
      statusCode: '-',
      note: '-',
      kpj: '-',
      checkedAt: '',
      sourceFile: '',
    };
  }
  const cleanNik = actor?.nik ? String(actor.nik).replace(/\D/g, '') : '';
  const upperName = actor?.fullName ? String(actor.fullName).trim().toUpperCase() : '';
  const bpjsItem =
    (cleanNik ? bpjsMap.get(cleanNik) : null) ||
    (upperName ? bpjsMap.get(upperName) : null) ||
    null;

  const rawKet = String(
    bpjsItem?.keterangan ||
      actor?.bpjsCheckNote ||
      actor?.bpjsKeterangan ||
      ''
  )
    .toUpperCase()
    .trim();

  const rawStatus = String(bpjsItem?.status || actor?.bpjsStatus || '')
    .toUpperCase()
    .trim();

  const kpj = String(bpjsItem?.kpj || bpjsItem?.noKpj || actor?.bpjsKpj || '').trim();
  const checkedAt = String(bpjsItem?.updatedAt || actor?.bpjsCheckedAt || '').trim();
  const sourceFile = String(bpjsItem?.sourceFile || actor?.bpjsSourceFile || '').trim();

  const hasMatch = Boolean(
    bpjsItem ||
      actor?.bpjsCheckStatus ||
      actor?.bpjsStatus ||
      actor?.bpjsKeterangan ||
      actor?.bpjsCheckNote
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
      note: bpjsItem?.keterangan || actor?.bpjsCheckNote || actor?.bpjsKeterangan || 'DUPLIKASI KEPESERTAAN BPJS',
      kpj: kpj || '-',
      checkedAt: checkedAt || '',
      sourceFile: sourceFile || '',
    };
  }

  if (
    rawKet.includes('65') ||
    (rawKet.includes('USIA') && (rawKet.includes('LEBIH') || rawKet.includes('DIATAS')))
  ) {
    return {
      hasMatch: true,
      statusLabel: 'USIA DIATAS 65 TAHUN',
      statusCode: rawStatus || 'T',
      note: bpjsItem?.keterangan || actor?.bpjsCheckNote || actor?.bpjsKeterangan || 'Usia Lebih 65 Tahun',
      kpj: kpj || '-',
      checkedAt: checkedAt || '',
      sourceFile: sourceFile || '',
    };
  }

  const isBisaDaftar =
    rawStatus === 'Y' ||
    rawKet.includes('BISA DAFTAR') ||
    rawKet.includes('TERVERIFIKASI') ||
    rawKet.includes('SESUAI') ||
    rawKet.includes('LOLOS') ||
    actor?.bpjsCheckStatus === 'sesuai' ||
    (bpjsItem && !rawKet && !rawStatus);

  if (isBisaDaftar && rawStatus !== 'T' && rawStatus !== 'N') {
    return {
      hasMatch: true,
      statusLabel: 'TERVERIFIKASI / BISA DAFTAR',
      statusCode: rawStatus || 'Y',
      note: bpjsItem?.keterangan || actor?.bpjsCheckNote || actor?.bpjsKeterangan || 'Bisa Daftar / Terverifikasi',
      kpj: kpj || '-',
      checkedAt: checkedAt || '',
      sourceFile: sourceFile || '',
    };
  }

  return {
    hasMatch: true,
    statusLabel: (bpjsItem?.keterangan || actor?.bpjsKeterangan || 'TIDAK LOLOS BPJS').toUpperCase(),
    statusCode: rawStatus || 'T',
    note: bpjsItem?.keterangan || actor?.bpjsCheckNote || actor?.bpjsKeterangan || 'Tidak Lolos Verifikasi BPJS',
    kpj: kpj || '-',
    checkedAt: checkedAt || '',
    sourceFile: sourceFile || '',
  };
}

interface ResolvedOfficerInfo {
  nama: string;
  nipppk: string;
}

const BANK_LIST = [
  'BCA',
  'BNI',
  'BRI',
  'BRK',
  'MANDIRI',
  'BSI',
  'BTN',
  'OCBC',
  'PANIN',
  'MUAMALAT',
  'MAYBANK',
  'BUKOPIN',
  'DANAMON',
  'PERMATA',
  'CIMB NIAGA',
];

export function formatCurrencyIndoSafe(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return '-';

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value === 0) return '-';
    return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
  }

  const raw = String(value).trim();
  if (!raw || raw === '-' || raw === '0') return '-';

  // Strip optional "Rp" / "Rp." prefix and trailing ",-" / ",00" / ".00"
  const withoutRp = raw.replace(/^rp\.?\s*/i, '').trim();
  const withoutTrailing = withoutRp.replace(/(?:,\s*-|[.,]00)$/, '').trim();

  // If text still contains letters (e.g. "2 juta", "500 rb/hari") or a range ("1.000.000 - 2.000.000"), keep original text cleanly
  if (/[a-zA-Z]/.test(withoutTrailing) || /\d\s*[-–/]\s*\d/.test(withoutTrailing)) {
    return raw;
  }

  // Pure Indonesian / international numeric string with thousand separators (e.g. "2.000.000" or "2,000,000")
  if (/^[\d.,\s]+$/.test(withoutTrailing)) {
    const digitsOnly = withoutTrailing.replace(/[.,\s]/g, '');
    const parsed = Number(digitsOnly);
    if (Number.isFinite(parsed) && parsed > 0) {
      return `Rp ${Math.round(parsed).toLocaleString('id-ID')}`;
    }
  }

  return raw;
}

export function normalizeBankNameReport(bankName?: string): string {
  if (!bankName || !bankName.trim()) return '-';
  const upper = bankName.trim().toUpperCase();
  if (upper === '-') return '-';
  if (upper.includes('RIAU KEPRI') || upper.includes('BRK')) return 'BRK';
  if (upper.includes('SYARIAH INDONESIA') || upper.includes('BSI')) return 'BSI';
  if (upper.includes('RAKYAT INDONESIA') || upper.includes('BRI')) return 'BRI';
  if (upper.includes('NEGARA INDONESIA') || upper.includes('BNI')) return 'BNI';
  if (upper.includes('CENTRAL ASIA') || upper.includes('BCA')) return 'BCA';
  if (upper.includes('TABUNGAN NEGARA') || upper.includes('BTN')) return 'BTN';
  if (upper.includes('CIMB') || upper.includes('NIAGA')) return 'CIMB NIAGA';
  const matched = BANK_LIST.find((b) => upper.includes(b));
  return matched || upper;
}

function buildOfficerResolver(allActors: ReportActor[], systemUsers?: any[]) {
  const userByName = new Map<string, any>();
  const userByUsername = new Map<string, any>();
  const surveyorToVerif = new Map<string, ResolvedOfficerInfo>();

  if (Array.isArray(systemUsers)) {
    systemUsers.forEach((u: any) => {
      if (!u) return;
      const fullUpper = u.fullName ? String(u.fullName).toUpperCase().trim() : '';
      const idUpper = u.id ? String(u.id).toUpperCase().trim() : '';
      const unameLower = u.username ? String(u.username).toLowerCase().trim() : '';
      if (fullUpper) userByName.set(fullUpper, u);
      if (idUpper) userByName.set(idUpper, u);
      if (unameLower) userByUsername.set(unameLower, u);

      const pdVerif = u.pejabatData?.verifikator;
      if (
        pdVerif?.nama &&
        pdVerif.nama.trim() !== '' &&
        pdVerif.nama.trim() !== '-' &&
        pdVerif.nama.trim() !== 'Belum Ditentukan'
      ) {
        const vInfo: ResolvedOfficerInfo = {
          nama: String(pdVerif.nama).trim().toUpperCase(),
          nipppk: pdVerif.nipppk ? String(pdVerif.nipppk).trim() : '',
        };
        if (fullUpper) surveyorToVerif.set(fullUpper, vInfo);
        if (idUpper) surveyorToVerif.set(idUpper, vInfo);
        if (unameLower) surveyorToVerif.set(unameLower.toUpperCase(), vInfo);
      }
    });
  }

  allActors.forEach((a) => {
    if (!a) return;
    const sd = (a as any).surveyData || {};
    const pRaw = (
      a.petugasSurvey ||
      a.pejabatData?.petugas?.nama ||
      sd.pejabatData?.petugas?.nama ||
      ''
    )
      .toUpperCase()
      .trim();

    const vRaw = (
      a.berkasDinasVerifiedBy ||
      a.pejabatData?.verifikator?.nama ||
      sd.pejabatData?.verifikator?.nama ||
      a.verifikatorDinas ||
      ''
    ).trim();

    if (
      pRaw &&
      pRaw !== '-' &&
      pRaw !== 'BELUM ADA' &&
      vRaw &&
      vRaw !== '-' &&
      vRaw !== 'Belum Ditentukan' &&
      vRaw !== 'Verifikator Dinas'
    ) {
      const vNip = a.pejabatData?.verifikator?.nipppk || sd.pejabatData?.verifikator?.nipppk || '';
      if (!surveyorToVerif.has(pRaw)) {
        surveyorToVerif.set(pRaw, {
          nama: vRaw.toUpperCase(),
          nipppk: vNip ? String(vNip).trim() : '',
        });
      }
    }
  });

  const isValidName = (val?: string | null, invalidPlaceholders: string[] = []) => {
    if (!val) return false;
    const clean = String(val).trim();
    if (!clean || clean === '-') return false;
    const upper = clean.toUpperCase();
    return !invalidPlaceholders.some((p) => p.toUpperCase() === upper);
  };

  const resolvePetugas = (actor: ReportActor): ResolvedOfficerInfo => {
    const sd = (actor as any).surveyData || {};
    const pdPetugas = actor.pejabatData?.petugas || sd.pejabatData?.petugas;

    let rawName = '';
    if (isValidName(actor.petugasSurvey, ['BELUM ADA'])) {
      rawName = String(actor.petugasSurvey).trim();
    } else if (isValidName(pdPetugas?.nama, ['BELUM ADA', 'Belum Ditentukan'])) {
      rawName = String(pdPetugas.nama).trim();
    } else if (isValidName(actor.verifiedDinasBy, ['Petugas Survey', 'Verifikator Dinas', 'BELUM ADA'])) {
      rawName = String(actor.verifiedDinasBy).trim();
    }

    let nipppk = pdPetugas?.nipppk ? String(pdPetugas.nipppk).trim() : '';

    if (rawName) {
      const canonical = resolveSurveyorCanonicalName(rawName, systemUsers);
      const upper = rawName.toUpperCase().trim();
      const lower = rawName.toLowerCase().trim();
      const found =
        userByName.get(upper) ||
        userByName.get(canonical) ||
        userByUsername.get(lower);
      if (found) {
        if (found.fullName) rawName = String(found.fullName).trim();
        if (!nipppk && (found.nipppk || found.pejabatData?.petugas?.nipppk)) {
          nipppk = String(found.nipppk || found.pejabatData?.petugas?.nipppk).trim();
        }
      } else if (canonical && canonical !== 'BELUM ADA') {
        rawName = canonical;
      }
    }

    return {
      nama: rawName ? rawName.toUpperCase() : '-',
      nipppk: nipppk || '-',
    };
  };

  const resolveVerifikator = (
    actor: ReportActor,
    petugasInfo: ResolvedOfficerInfo
  ): ResolvedOfficerInfo => {
    const sd = (actor as any).surveyData || {};
    const pdVerif = actor.pejabatData?.verifikator || sd.pejabatData?.verifikator;

    let rawName = '';
    if (isValidName(actor.berkasDinasVerifiedBy, ['Verifikator Dinas', 'Belum Ditentukan', 'BELUM ADA'])) {
      rawName = String(actor.berkasDinasVerifiedBy).trim();
    } else if (isValidName(pdVerif?.nama, ['Belum Ditentukan', 'BELUM ADA'])) {
      rawName = String(pdVerif.nama).trim();
    } else if (isValidName(actor.verifikatorDinas, ['Belum Ditentukan', 'BELUM ADA'])) {
      rawName = String(actor.verifikatorDinas).trim();
    }

    let nipppk = pdVerif?.nipppk ? String(pdVerif.nipppk).trim() : '';

    if (!rawName && petugasInfo.nama && petugasInfo.nama !== '-') {
      const mapped = surveyorToVerif.get(petugasInfo.nama.toUpperCase().trim());
      if (mapped) {
        rawName = mapped.nama;
        if (!nipppk && mapped.nipppk) nipppk = mapped.nipppk;
      }
    }

    if (rawName) {
      const upper = rawName.toUpperCase().trim();
      const lower = rawName.toLowerCase().trim();
      const found = userByName.get(upper) || userByUsername.get(lower);
      if (found) {
        if (found.fullName) rawName = String(found.fullName).trim();
        if (!nipppk && (found.nipppk || found.pejabatData?.verifikator?.nipppk)) {
          nipppk = String(found.nipppk || found.pejabatData?.verifikator?.nipppk).trim();
        }
      }
    }

    return {
      nama: rawName ? rawName.toUpperCase() : '-',
      nipppk: nipppk || '-',
    };
  };

  return { resolvePetugas, resolveVerifikator };
}

function getSurveyHelpers(actor: ReportActor) {
  const sd: any = actor.surveyData || {};
  const hasSurveyData = Boolean(
    sd.hasilSurvey || sd.tanggalSurvey || sd.bidangUsaha || sd.modalUsaha || sd.omset || sd.rencanaPenggunaan
  );

  let prosesSurvey = 'BELUM SURVEY';
  if (actor.dikembalikanKePetugasAt && !actor.berkasDinasVerified) {
    prosesSurvey = 'DIKEMBALIKAN KE PETUGAS SURVEY';
  } else if (
    actor.status === 'verified_dinas' ||
    actor.status === 'bank_pending' ||
    actor.status === 'finish' ||
    actor.status === 'blacklist' ||
    actor.verifiedDinasAt ||
    (hasSurveyData && sd.hasilSurvey)
  ) {
    prosesSurvey = 'SUDAH SURVEY';
  } else if (typeof actor.surveyProgress === 'number' && actor.surveyProgress > 0) {
    prosesSurvey = `DRAFT SURVEY (${actor.surveyProgress}%)`;
  } else if (hasSurveyData) {
    prosesSurvey = 'DALAM PROSES SURVEY';
  }

  let hasilSurvey = '-';
  if (sd.hasilSurvey && String(sd.hasilSurvey).trim() !== '') {
    hasilSurvey = String(sd.hasilSurvey).trim().toUpperCase();
  } else if (actor.hasilVerifikasiDinas === 'Lolos') {
    hasilSurvey = 'LAYAK';
  } else if (actor.hasilVerifikasiDinas === 'Tidak Lolos' || actor.alasanCancelDinas) {
    hasilSurvey = 'TIDAK LAYAK';
  } else {
    hasilSurvey = 'BELUM SURVEY';
  }

  const isCancelDinas =
    (actor.status === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Tidak Lolos') ||
    actor.hasilVerifikasiDinas === 'Tidak Lolos' ||
    Boolean(actor.alasanCancelDinas);

  let statusVerifBerkasDinas = 'BELUM VERIFIKASI DINAS';
  if (isCancelDinas) {
    statusVerifBerkasDinas = 'TIDAK LOLOS (CANCEL DINAS)';
  } else if (actor.berkasDinasVerified || actor.status === 'finish' || actor.status === 'blacklist') {
    statusVerifBerkasDinas = 'LOLOS VERIFIKASI DINAS';
  } else if (actor.dikembalikanKeVerifikatorAt) {
    statusVerifBerkasDinas = 'DIKEMBALIKAN KE VERIFIKATOR';
  } else if (actor.status === 'verified_dinas' || actor.status === 'bank_pending') {
    statusVerifBerkasDinas = 'MENUNGGU VERIFIKASI BERKAS';
  } else if (actor.status === 'lpj_pending') {
    statusVerifBerkasDinas = 'TAHAP SURVEY LAPANGAN';
  }

  let hasilVerifDinas = '-';
  if (isCancelDinas) {
    hasilVerifDinas = 'TIDAK LOLOS';
  } else if (actor.hasilVerifikasiDinas) {
    hasilVerifDinas = String(actor.hasilVerifikasiDinas).trim().toUpperCase();
  } else if (actor.berkasDinasVerified || actor.status === 'finish') {
    hasilVerifDinas = 'LOLOS';
  }

  let dtksStr = 'Tidak';
  if (sd.dtks && typeof sd.dtks === 'object') {
    dtksStr = sd.dtks.masuk ? `Ya (${sd.dtks.jenis || 'DTKS'})` : 'Tidak';
  } else if (typeof sd.dtks === 'string' && sd.dtks.trim()) {
    dtksStr = sd.dtks.trim();
  } else if (!hasSurveyData) {
    dtksStr = '-';
  }

  let hibahStr = 'Belum Pernah';
  if (sd.hibah && typeof sd.hibah === 'object') {
    hibahStr = sd.hibah.pernah
      ? `Pernah${sd.hibah.dariMana ? ` (${sd.hibah.dariMana}${sd.hibah.tahun ? ', ' + sd.hibah.tahun : ''})` : ''}`
      : 'Belum Pernah';
  } else if (typeof sd.hibah === 'string' && sd.hibah.trim()) {
    hibahStr = sd.hibah.trim();
  } else if (!hasSurveyData) {
    hibahStr = '-';
  }

  const izinStr = Array.isArray(sd.izin) && sd.izin.length > 0
    ? sd.izin.join(', ')
    : typeof sd.izin === 'string' && sd.izin.trim()
      ? sd.izin.trim()
      : '-';

  const loc = actor.verificationLocationDinas || actor.verificationLocation;
  const gpsStr = loc && loc.lat && loc.lon ? `${loc.lat}, ${loc.lon}` : '-';

  const catatanParts = [
    actor.keteranganDinas,
    actor.alasanCancelDinas ? `Cancel Dinas: ${actor.alasanCancelDinas}` : '',
    actor.rejectionReason ? `Alasan Tolak: ${actor.rejectionReason}` : '',
    actor.dikembalikanKePetugasReason ? `Kembali ke Petugas: ${actor.dikembalikanKePetugasReason}` : '',
    actor.dikembalikanKeVerifikatorReason ? `Kembali ke Verifikator: ${actor.dikembalikanKeVerifikatorReason}` : '',
    actor.catatanPengembalian ? `Catatan: ${actor.catatanPengembalian}` : '',
  ].filter((v) => v && String(v).trim() !== '' && String(v).trim() !== '-');

  const waktuVerifDinasRaw =
    actor.berkasDinasVerifiedAt ||
    actor.cancelDinasAt ||
    (actor.berkasDinasVerified ? actor.verifiedDinasAt : '');

  return {
    sd,
    prosesSurvey,
    hasilSurvey,
    statusVerifBerkasDinas,
    hasilVerifDinas,
    dtksStr,
    hibahStr,
    izinStr,
    gpsStr,
    catatanDinas: catatanParts.length > 0 ? catatanParts.join(' | ') : '-',
    waktuSubmitSurvey: actor.verifiedDinasAt ? formatDateTimeIndo(actor.verifiedDinasAt) : '-',
    waktuVerifDinas: waktuVerifDinasRaw ? formatDateTimeIndo(waktuVerifDinasRaw) : '-',
  };
}

function getLpjStatusLabel(actor: ReportActor): string {
  if (actor.status === 'blacklist') return 'BLACKLIST (LEWAT BATAS LPJ)';
  if (actor.lpjNominal && Number(actor.lpjNominal) > 0) return 'SELESAI LPJ';
  if (actor.readyForLPJ || actor.lpjEntryDate) return 'MENUNGGU LPJ';
  if (actor.bankNumber && String(actor.bankNumber).trim() !== '') return 'BELUM KIRIM KE LPJ';
  return '-';
}

function getBiodataFields(actor: ReportActor) {
  const parsed = parsePobDob(actor.pobDob || '');
  const pob = resolvePob(actor);
  const dob = actor.dob || parsed.dob || extractDobFromNik(actor.nik || '') || '-';
  const age = calculateAge(dob);
  const rtRw = resolveRtRw(actor);
  const kelurahan = resolveKelurahan(actor);
  const kecamatan = resolveKecamatan(actor, kelurahan);

  return {
    registrationCode: actor.registrationCode || '-',
    fullName: (actor.fullName || '-').toUpperCase(),
    nik: actor.nik ? String(actor.nik).trim() : '-',
    noKK: actor.noKK ? String(actor.noKK).trim() : '-',
    gender: actor.gender || actor.surveyData?.jenisKelamin || '-',
    pob,
    dob,
    age,
    phone: actor.phone || actor.surveyData?.noHp || '-',
    address: (actor.address || actor.surveyData?.alamatRumah || '-').toUpperCase(),
    rtRw,
    kelurahan,
    kecamatan,
    businessCategory: (actor.businessCategory || '-').toUpperCase(),
    businessName: (actor.businessName || actor.surveyData?.namaUsaha || '-').toUpperCase(),
    businessLocation: (actor.businessLocation || actor.surveyData?.alamatUsaha || actor.address || '-').toUpperCase(),
    coordinator: (actor.coordinator || 'TANPA KOORDINATOR').toUpperCase().trim(),
  };
}

function sortActorsForReport(actors: ReportActor[]): ReportActor[] {
  return [...actors].sort((a, b) => {
    const cA = String(a.coordinator || 'ZZZ').toUpperCase().trim();
    const cB = String(b.coordinator || 'ZZZ').toUpperCase().trim();
    const cCmp = cA.localeCompare(cB);
    if (cCmp !== 0) return cCmp;
    return String(a.fullName || '').toUpperCase().localeCompare(String(b.fullName || '').toUpperCase());
  });
}

interface ExcelColumnDef {
  header: string;
  key: string;
  width: number;
  headerFill?: string;
  align?: 'left' | 'center' | 'right';
  isText?: boolean;
  isCurrency?: boolean;
  isWrap?: boolean;
  isStatus?: boolean;
  isImage?: boolean;
}

function getColumnLetter(colIndex: number): string {
  let letter = '';
  let num = colIndex;
  while (num > 0) {
    const mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
}

function applyStatusCellStyle(cell: any, rawValue: unknown) {
  const val = String(rawValue || '').toUpperCase().trim();
  if (!val || val === '-') {
    cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF94A3B8' } };
    return;
  }

  const isPositive =
    val.includes('LOLOS VERIFIKASI') ||
    val === 'LOLOS' ||
    val === 'LAYAK' ||
    val.includes('TERVERIFIKASI') ||
    val.includes('BISA DAFTAR') ||
    val === 'SELESAI LPJ' ||
    val === 'SUDAH SURVEY' ||
    val === 'Y';

  const isNegative =
    val.includes('TIDAK LOLOS') ||
    val.includes('TIDAK LAYAK') ||
    val.includes('CANCEL') ||
    val.includes('DITOLAK') ||
    val.includes('BLACKLIST') ||
    val.includes('USIA DIATAS 65') ||
    val === 'T' ||
    val === 'N';

  const isWarning =
    val.includes('DUPLIKASI') ||
    val.includes('DIKEMBALIKAN') ||
    val.includes('MENUNGGU') ||
    val.includes('DRAFT') ||
    val.includes('PROSES') ||
    val.includes('HOLD') ||
    val.includes('LENGKAPI');

  if (isNegative) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
  } else if (isPositive) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF166534' } };
  } else if (isWarning) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } };
  } else if (val.includes('BELUM')) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  }
}

async function buildAndDownloadSingleSheetExcel(params: {
  sheetName: string;
  fileName: string;
  title: string;
  subtitle: string;
  bannerColor: string;
  defaultHeaderColor: string;
  columns: ExcelColumnDef[];
  rows: Record<string, any>[];
  imageColKey?: string;
  rowImages?: (string | null)[];
}) {
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIMPU - Yayasan Tunas Bangsa Kepri';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(params.sheetName.substring(0, 31), {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  const totalCols = params.columns.length;
  const lastColLetter = getColumnLetter(totalCols);

  // Auto-calculate comfortable column widths so no headers (with AutoFilter arrow) or text get clipped horizontally
  const computedWidths = params.columns.map((col) => {
    if (col.isImage) return col.width;
    const headerMinWidth = col.key === 'no' ? 9 : Math.min(34, col.header.length + 5);
    let bestWidth = Math.max(col.width, headerMinWidth);

    params.rows.forEach((rowData) => {
      const val = rowData[col.key];
      if (val === null || val === undefined) return;
      const str = String(val).trim();
      if (!str || str === '-') return;

      const lines = str.split(/\r?\n/);
      const longestLine = lines.reduce((m, line) => Math.max(m, line.trim().length), 0);

      if (col.isWrap) {
        bestWidth = Math.max(bestWidth, Math.min(46, longestLine + 4));
      } else {
        bestWidth = Math.max(bestWidth, Math.min(48, longestLine + 4));
      }
    });

    return bestWidth;
  });

  // Set column keys & widths (do NOT pass header here so row 1 stays free for Title Banner)
  worksheet.columns = params.columns.map((c, idx) => ({
    key: c.key,
    width: computedWidths[idx],
  }));

  // ── ROW 1: TITLE BANNER ──
  worksheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = params.title;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: params.bannerColor } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(1).height = 30;

  // ── ROW 2: SUBTITLE / METADATA ──
  worksheet.mergeCells(`A2:${lastColLetter}2`);
  const subCell = worksheet.getCell('A2');
  subCell.value = params.subtitle;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF1E293B' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(2).height = 20;

  // ── ROW 3: SPACER ──
  worksheet.getRow(3).height = 8;

  // ── ROW 4: TABLE HEADERS ──
  const headerRow = worksheet.getRow(4);
  headerRow.height = 32;
  params.columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: col.headerFill || params.defaultHeaderColor },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    };
  });

  // Enable AutoFilter on Row 4
  worksheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: totalCols },
  };
  worksheet.pageSetup.printTitlesRow = '1:4';

  const thinBorder = {
    top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
  };

  const imageColIdx = params.imageColKey
    ? params.columns.findIndex((c) => c.key === params.imageColKey)
    : -1;

  // ── DATA ROWS (START AT ROW 5) ──
  params.rows.forEach((rowData, rIdx) => {
    const row = worksheet.addRow(rowData);
    const isEven = rIdx % 2 === 1;
    const rowZeroIdx = 4 + rIdx; // Row 5 in Excel = index 4 (0-based)
    const jpegBase64 = imageColIdx >= 0 && params.rowImages ? params.rowImages[rIdx] : null;

    params.columns.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      const val = rowData[col.key];
      const strVal = val !== undefined && val !== null ? String(val).trim() : '';
      const hasNewline = strVal.includes('\n');
      const shouldWrap = Boolean(col.isWrap || hasNewline);

      if (col.isImage) {
        cell.value = jpegBase64 ? '' : '-';
      } else if (col.isText) {
        cell.value = strVal !== '' ? strVal : '-';
        cell.numFmt = '@';
      } else if (col.isCurrency) {
        const numVal = Number(val) || 0;
        cell.value = numVal;
        cell.numFmt = '#,##0';
      }

      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: col.isImage && !jpegBase64 ? 'FF94A3B8' : 'FF0F172A' },
      };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.align || 'left',
        wrapText: shouldWrap,
      };

      if (isEven && !col.isImage) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }

      if (col.isStatus) {
        applyStatusCellStyle(cell, val);
      }
    });

    row.height = 87.8;

    // Embed survey photo anchored exactly to the cell boundaries (fits exact column width & row height on all DPIs)
    if (jpegBase64 && imageColIdx >= 0) {
      try {
        const imageId = workbook.addImage({
          base64: jpegBase64,
          extension: 'jpeg',
        });
        worksheet.addImage(imageId, {
          tl: {
            nativeCol: imageColIdx,
            nativeColOff: 0,
            nativeRow: rowZeroIdx,
            nativeRowOff: 0,
          } as any,
          br: {
            nativeCol: imageColIdx + 1,
            nativeColOff: 0,
            nativeRow: rowZeroIdx + 1,
            nativeRowOff: 0,
          } as any,
          editAs: 'twoCell',
        });
      } catch (imgErr) {
        console.warn('Gagal menyematkan foto survey ke Excel:', imgErr);
      }
    }
  });

  // Trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = params.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * 1. REPORT DINAS
 * Data pelaku usaha lengkap, proses & hasil survey, petugas survey,
 * petugas verifikator sampai dengan waktu diverifikasi oleh dinas — 1 lembar Excel rapi.
 */
export async function exportReportDinasExcel(
  actors: ReportActor[],
  systemUsers?: any[],
  filterSummary: string = 'Semua Data',
  options?: ExcelExportOptions
) {
  const sorted = sortActorsForReport(actors);
  const resolver = buildOfficerResolver(sorted, systemUsers);
  const photosMap = await fetchSurveyPhotosMap(options?.database, sorted, options?.onProgress);
  options?.onProgress?.('building', sorted.length, sorted.length);
  const nowDate = new Date();
  const dateStamp = nowDate.toISOString().split('T')[0];
  const printedAt = formatDateTimeIndo(nowDate.toISOString());

  const columns: ExcelColumnDef[] = [
    // Identitas Pelaku Usaha
    { header: 'NO', key: 'no', width: 6, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'KODE REGISTRASI', key: 'registrationCode', width: 18, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'NAMA LENGKAP', key: 'fullName', width: 28, headerFill: 'FF1E3A8A' },
    { header: 'NIK', key: 'nik', width: 20, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'NOMOR KK', key: 'noKK', width: 20, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'JENIS KELAMIN', key: 'gender', width: 15, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'TEMPAT LAHIR', key: 'pob', width: 18, headerFill: 'FF1E3A8A' },
    { header: 'TANGGAL LAHIR', key: 'dob', width: 15, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'UMUR', key: 'age', width: 12, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'NO. HP / WA', key: 'phone', width: 17, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'EMAIL', key: 'email', width: 22, headerFill: 'FF1E3A8A' },
    { header: 'SOSIAL MEDIA', key: 'sosmed', width: 20, headerFill: 'FF1E3A8A' },
    { header: 'ALAMAT DOMISILI', key: 'address', width: 36, isWrap: true, headerFill: 'FF1E3A8A' },
    { header: 'RT / RW', key: 'rtRw', width: 11, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'KELURAHAN', key: 'kelurahan', width: 20, headerFill: 'FF1E3A8A' },
    { header: 'KECAMATAN', key: 'kecamatan', width: 22, headerFill: 'FF1E3A8A' },
    { header: 'STATUS KELUARGA', key: 'statusKeluarga', width: 18, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'KOORDINATOR', key: 'coordinator', width: 24, headerFill: 'FF1E3A8A' },

    // Data Usaha & Detail Survey
    { header: 'KATEGORI USAHA', key: 'businessCategory', width: 16, align: 'center', headerFill: 'FF3730A3' },
    { header: 'NAMA USAHA', key: 'businessName', width: 28, isWrap: true, headerFill: 'FF3730A3' },
    { header: 'BIDANG USAHA (SURVEY)', key: 'bidangUsaha', width: 22, headerFill: 'FF3730A3' },
    { header: 'LOKASI / ALAMAT USAHA', key: 'businessLocation', width: 34, isWrap: true, headerFill: 'FF3730A3' },
    { header: 'TAHUN BERDIRI', key: 'tahunBerdiri', width: 14, align: 'center', isText: true, headerFill: 'FF3730A3' },
    { header: 'PERALATAN USAHA', key: 'peralatan', width: 26, isWrap: true, headerFill: 'FF3730A3' },
    { header: 'IZIN USAHA', key: 'izin', width: 22, isWrap: true, headerFill: 'FF3730A3' },
    { header: 'MODAL USAHA', key: 'modalUsaha', width: 18, align: 'right', headerFill: 'FF3730A3' },
    { header: 'OMSET / BULAN', key: 'omset', width: 18, align: 'right', headerFill: 'FF3730A3' },
    { header: 'STATUS DTKS', key: 'dtks', width: 18, align: 'center', headerFill: 'FF3730A3' },
    { header: 'RIWAYAT HIBAH', key: 'hibah', width: 24, isWrap: true, headerFill: 'FF3730A3' },
    { header: 'RENCANA PENGGUNAAN DANA', key: 'rencanaPenggunaan', width: 30, isWrap: true, headerFill: 'FF3730A3' },

    // Proses & Hasil Survey + Petugas + Verifikator + Waktu Verifikasi Dinas
    { header: 'POSISI MENU SAAT INI', key: 'posisiMenu', width: 20, align: 'center', headerFill: 'FF6B21A8' },
    { header: 'PROSES SURVEY', key: 'prosesSurvey', width: 24, align: 'center', isStatus: true, headerFill: 'FF6B21A8' },
    { header: 'TANGGAL SURVEY', key: 'tanggalSurvey', width: 16, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'HASIL SURVEY', key: 'hasilSurvey', width: 18, align: 'center', isStatus: true, headerFill: 'FF6B21A8' },
    { header: 'FHOTO SURVEY', key: 'fotoSurvey', width: 24, align: 'center', isImage: true, headerFill: 'FF6B21A8' },
    { header: 'PETUGAS SURVEY', key: 'petugasSurvey', width: 26, headerFill: 'FF6B21A8' },
    { header: 'NIP / NIPPPK PETUGAS SURVEY', key: 'petugasNip', width: 22, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'WAKTU SUBMIT SURVEY DINAS', key: 'waktuSubmitSurvey', width: 24, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'DIINPUT SURVEY OLEH', key: 'verifiedDinasBy', width: 24, headerFill: 'FF6B21A8' },
    { header: 'STATUS VERIFIKASI DINAS', key: 'statusVerifBerkasDinas', width: 26, align: 'center', isStatus: true, headerFill: 'FF6B21A8' },
    { header: 'HASIL VERIFIKASI DINAS', key: 'hasilVerifDinas', width: 18, align: 'center', isStatus: true, headerFill: 'FF6B21A8' },
    { header: 'PETUGAS VERIFIKATOR DINAS', key: 'verifikatorDinas', width: 26, headerFill: 'FF6B21A8' },
    { header: 'NIP / NIPPPK VERIFIKATOR', key: 'verifikatorNip', width: 22, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'WAKTU DIVERIFIKASI DINAS', key: 'waktuVerifDinas', width: 24, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'KOORDINAT GPS SURVEY', key: 'gps', width: 22, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'LINK GOOGLE DRIVE BERKAS', key: 'googleDriveLink', width: 28, headerFill: 'FF6B21A8' },
  ];

  const rows = sorted.map((actor, index) => {
    const bio = getBiodataFields(actor);
    const survey = getSurveyHelpers(actor);
    const petugas = resolver.resolvePetugas(actor);
    const verifikator = resolver.resolveVerifikator(actor, petugas);
    const menuInfo = getActorCurrentMenu(actor);

    return {
      no: index + 1,
      registrationCode: bio.registrationCode,
      fullName: bio.fullName,
      nik: bio.nik,
      noKK: bio.noKK,
      gender: bio.gender,
      pob: bio.pob,
      dob: bio.dob,
      age: bio.age,
      phone: bio.phone,
      email: survey.sd.email || '-',
      sosmed: survey.sd.sosmed || '-',
      address: bio.address,
      rtRw: bio.rtRw,
      kelurahan: bio.kelurahan,
      kecamatan: bio.kecamatan,
      statusKeluarga: actor.statusKeluarga || survey.sd.status || '-',
      coordinator: bio.coordinator,
      businessCategory: bio.businessCategory,
      businessName: bio.businessName,
      bidangUsaha: survey.sd.bidangUsaha || '-',
      businessLocation: bio.businessLocation,
      tahunBerdiri: survey.sd.tahunBerdiri || '-',
      peralatan: survey.sd.peralatan || '-',
      izin: survey.izinStr,
      modalUsaha: formatCurrencyIndoSafe(survey.sd.modalUsaha),
      omset: formatCurrencyIndoSafe(survey.sd.omset),
      dtks: survey.dtksStr,
      hibah: survey.hibahStr,
      rencanaPenggunaan: survey.sd.rencanaPenggunaan || '-',
      posisiMenu: menuInfo.menuName.toUpperCase(),
      prosesSurvey: survey.prosesSurvey,
      tanggalSurvey: survey.sd.tanggalSurvey || '-',
      hasilSurvey: survey.hasilSurvey,
      fotoSurvey: '',
      petugasSurvey: petugas.nama,
      petugasNip: petugas.nipppk,
      waktuSubmitSurvey: survey.waktuSubmitSurvey,
      verifiedDinasBy: actor.verifiedDinasBy ? String(actor.verifiedDinasBy).toUpperCase() : '-',
      statusVerifBerkasDinas: survey.statusVerifBerkasDinas,
      hasilVerifDinas: survey.hasilVerifDinas,
      verifikatorDinas: verifikator.nama,
      verifikatorNip: verifikator.nipppk,
      waktuVerifDinas: survey.waktuVerifDinas,
      gps: survey.gpsStr,
      googleDriveLink: actor.googleDriveLink || '-',
    };
  });

  const rowImages = sorted.map((actor) => photosMap.get(actor.id) ?? null);

  await buildAndDownloadSingleSheetExcel({
    sheetName: 'Report Dinas',
    fileName: `Report_Dinas_${dateStamp}.xlsx`,
    title: 'REPORT DINAS — DATA PELAKU USAHA, SURVEY & VERIFIKASI DINAS (SIMPU)',
    subtitle: `Dicetak pada: ${printedAt}  |  Total Data: ${rows.length.toLocaleString('id-ID')} Pelaku Usaha  |  Filter: ${filterSummary}`,
    bannerColor: 'FF4C1D95',
    defaultHeaderColor: 'FF5B21B6',
    columns,
    rows,
    imageColKey: 'fotoSurvey',
    rowImages,
  });
}

/**
 * 2. REPORT REKENING
 * Semua data pelaku usaha lengkap sampai dengan data rekeningnya
 * (Nama Pemilik Rekening, Nomor Rekening, Nama Bank) — 1 lembar Excel rapi.
 */
export async function exportReportRekeningExcel(
  actors: ReportActor[],
  filterSummary: string = 'Semua Data Rekening'
) {
  const sorted = sortActorsForReport(actors);
  const nowDate = new Date();
  const dateStamp = nowDate.toISOString().split('T')[0];
  const printedAt = formatDateTimeIndo(nowDate.toISOString());

  const columns: ExcelColumnDef[] = [
    { header: 'NO', key: 'no', width: 6, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'KODE REGISTRASI', key: 'registrationCode', width: 18, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'NAMA LENGKAP', key: 'fullName', width: 28, headerFill: 'FF1E3A8A' },
    { header: 'NIK', key: 'nik', width: 20, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'NOMOR KK', key: 'noKK', width: 20, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'JENIS KELAMIN', key: 'gender', width: 15, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'TEMPAT LAHIR', key: 'pob', width: 18, headerFill: 'FF1E3A8A' },
    { header: 'TANGGAL LAHIR', key: 'dob', width: 15, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'UMUR', key: 'age', width: 12, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'NO. HP / WA', key: 'phone', width: 17, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'ALAMAT DOMISILI', key: 'address', width: 36, isWrap: true, headerFill: 'FF1E3A8A' },
    { header: 'RT / RW', key: 'rtRw', width: 11, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'KELURAHAN', key: 'kelurahan', width: 20, headerFill: 'FF1E3A8A' },
    { header: 'KECAMATAN', key: 'kecamatan', width: 22, headerFill: 'FF1E3A8A' },
    { header: 'KATEGORI USAHA', key: 'businessCategory', width: 16, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'NAMA USAHA', key: 'businessName', width: 28, isWrap: true, headerFill: 'FF1E3A8A' },
    { header: 'LOKASI USAHA', key: 'businessLocation', width: 34, isWrap: true, headerFill: 'FF1E3A8A' },
    { header: 'KOORDINATOR', key: 'coordinator', width: 24, headerFill: 'FF1E3A8A' },

    // Data Rekening Bank
    { header: 'NAMA BANK', key: 'bankName', width: 18, align: 'center', headerFill: 'FF047857' },
    { header: 'NOMOR REKENING', key: 'bankNumber', width: 24, align: 'center', isText: true, headerFill: 'FF047857' },
    { header: 'NAMA PEMILIK REKENING', key: 'bankOwner', width: 28, headerFill: 'FF047857' },
    { header: 'STATUS REKENING', key: 'statusRekening', width: 18, align: 'center', isStatus: true, headerFill: 'FF047857' },
    { header: 'POSISI MENU SAAT INI', key: 'posisiMenu', width: 20, align: 'center', headerFill: 'FF047857' },
    { header: 'STATUS LPJ', key: 'statusLpj', width: 22, align: 'center', isStatus: true, headerFill: 'FF047857' },
    { header: 'NOMINAL LPJ (RP)', key: 'lpjNominal', width: 18, align: 'right', isCurrency: true, headerFill: 'FF047857' },
    { header: 'TANGGAL ENTRY LPJ', key: 'lpjEntryDate', width: 22, align: 'center', isText: true, headerFill: 'FF047857' },
  ];

  const rows = sorted.map((actor, index) => {
    const bio = getBiodataFields(actor);
    const hasBank = Boolean(
      actor.bankNumber && String(actor.bankNumber).trim() !== '' && String(actor.bankNumber).trim() !== '-'
    );
    const menuInfo = getActorCurrentMenu(actor);

    return {
      no: index + 1,
      registrationCode: bio.registrationCode,
      fullName: bio.fullName,
      nik: bio.nik,
      noKK: bio.noKK,
      gender: bio.gender,
      pob: bio.pob,
      dob: bio.dob,
      age: bio.age,
      phone: bio.phone,
      address: bio.address,
      rtRw: bio.rtRw,
      kelurahan: bio.kelurahan,
      kecamatan: bio.kecamatan,
      businessCategory: bio.businessCategory,
      businessName: bio.businessName,
      businessLocation: bio.businessLocation,
      coordinator: bio.coordinator,
      bankName: hasBank ? normalizeBankNameReport(actor.bankName) : '-',
      bankNumber: hasBank ? String(actor.bankNumber).trim() : '-',
      bankOwner: hasBank ? (actor.fullName || actor.bankOwner || '-').trim().toUpperCase() : '-',
      statusRekening: hasBank ? 'TERVERIFIKASI' : 'BELUM ADA REKENING',
      posisiMenu: menuInfo.menuName.toUpperCase(),
      statusLpj: getLpjStatusLabel(actor),
      lpjNominal: Number(actor.lpjNominal) || 0,
      lpjEntryDate: actor.lpjEntryDate ? formatDateTimeIndo(actor.lpjEntryDate) : '-',
    };
  });

  await buildAndDownloadSingleSheetExcel({
    sheetName: 'Report Rekening',
    fileName: `Report_Rekening_${dateStamp}.xlsx`,
    title: 'REPORT REKENING — DATA PELAKU USAHA & REKENING BANK PENERIMA (SIMPU)',
    subtitle: `Dicetak pada: ${printedAt}  |  Total Data: ${rows.length.toLocaleString('id-ID')} Pelaku Usaha  |  Filter: ${filterSummary}`,
    bannerColor: 'FF065F46',
    defaultHeaderColor: 'FF047857',
    columns,
    rows,
  });
}

/**
 * 3. REPORT PELAKU USAHA (MASTER ALL DATA TANPA TERKECUALI)
 * Gabungan lengkap Report Dinas + Report Rekening + Hasil Verifikasi BPJS Ketenagakerjaan — 1 lembar Excel rapi.
 */
export async function exportReportPelakuUsahaExcel(
  actors: ReportActor[],
  systemUsers?: any[],
  filterSummary: string = 'Semua Data Tanpa Terkecuali',
  options?: ExcelExportOptions
) {
  const sorted = sortActorsForReport(actors);
  const resolver = buildOfficerResolver(sorted, systemUsers);
  const photosMap = await fetchSurveyPhotosMap(options?.database, sorted, options?.onProgress);
  options?.onProgress?.('building', sorted.length, sorted.length);
  const nowDate = new Date();
  const dateStamp = nowDate.toISOString().split('T')[0];
  const printedAt = formatDateTimeIndo(nowDate.toISOString());

  const columns: ExcelColumnDef[] = [
    // A. Identitas & Biodata Pelaku Usaha (Navy)
    { header: 'NO', key: 'no', width: 6, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'KODE REGISTRASI', key: 'registrationCode', width: 18, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'NAMA LENGKAP', key: 'fullName', width: 28, headerFill: 'FF1E3A8A' },
    { header: 'TANGGAL INPUT', key: 'createdAt', width: 22, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'DIINPUT OLEH', key: 'createdBy', width: 20, headerFill: 'FF1E3A8A' },
    { header: 'KOORDINATOR', key: 'coordinator', width: 24, headerFill: 'FF1E3A8A' },
    { header: 'NIK', key: 'nik', width: 20, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'NOMOR KK', key: 'noKK', width: 20, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'JENIS KELAMIN', key: 'gender', width: 15, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'TEMPAT LAHIR', key: 'pob', width: 18, headerFill: 'FF1E3A8A' },
    { header: 'TANGGAL LAHIR', key: 'dob', width: 15, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'UMUR', key: 'age', width: 12, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'AGAMA', key: 'agama', width: 15, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'PEKERJAAN', key: 'pekerjaan', width: 22, headerFill: 'FF1E3A8A' },
    { header: 'STATUS KELUARGA', key: 'statusKeluarga', width: 18, align: 'center', headerFill: 'FF1E3A8A' },
    { header: 'NAMA KEPALA KELUARGA', key: 'namaKepalaKeluarga', width: 24, headerFill: 'FF1E3A8A' },
    { header: 'NIK KEPALA KELUARGA', key: 'nikKepalaKeluarga', width: 20, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'NO. HP / WA', key: 'phone', width: 17, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'EMAIL', key: 'email', width: 22, headerFill: 'FF1E3A8A' },
    { header: 'SOSIAL MEDIA', key: 'sosmed', width: 20, headerFill: 'FF1E3A8A' },
    { header: 'ALAMAT DOMISILI', key: 'address', width: 36, isWrap: true, headerFill: 'FF1E3A8A' },
    { header: 'RT / RW', key: 'rtRw', width: 11, align: 'center', isText: true, headerFill: 'FF1E3A8A' },
    { header: 'KELURAHAN', key: 'kelurahan', width: 20, headerFill: 'FF1E3A8A' },
    { header: 'KECAMATAN', key: 'kecamatan', width: 22, headerFill: 'FF1E3A8A' },

    // B. Data Usaha (Indigo)
    { header: 'KATEGORI USAHA', key: 'businessCategory', width: 16, align: 'center', headerFill: 'FF3730A3' },
    { header: 'NAMA USAHA', key: 'businessName', width: 28, isWrap: true, headerFill: 'FF3730A3' },
    { header: 'BIDANG USAHA (SURVEY)', key: 'bidangUsaha', width: 22, headerFill: 'FF3730A3' },
    { header: 'LOKASI / ALAMAT USAHA', key: 'businessLocation', width: 34, isWrap: true, headerFill: 'FF3730A3' },
    { header: 'TAHUN BERDIRI', key: 'tahunBerdiri', width: 14, align: 'center', isText: true, headerFill: 'FF3730A3' },
    { header: 'PERALATAN USAHA', key: 'peralatan', width: 26, isWrap: true, headerFill: 'FF3730A3' },
    { header: 'IZIN USAHA', key: 'izin', width: 22, isWrap: true, headerFill: 'FF3730A3' },
    { header: 'MODAL USAHA', key: 'modalUsaha', width: 18, align: 'right', headerFill: 'FF3730A3' },
    { header: 'OMSET / BULAN', key: 'omset', width: 18, align: 'right', headerFill: 'FF3730A3' },
    { header: 'STATUS DTKS', key: 'dtks', width: 18, align: 'center', headerFill: 'FF3730A3' },
    { header: 'RIWAYAT HIBAH', key: 'hibah', width: 24, isWrap: true, headerFill: 'FF3730A3' },
    { header: 'RENCANA PENGGUNAAN DANA', key: 'rencanaPenggunaan', width: 30, isWrap: true, headerFill: 'FF3730A3' },

    // C. Proses & Hasil Survey + Verifikasi Dinas (Purple)
    { header: 'STATUS SISTEM', key: 'statusSistem', width: 18, align: 'center', headerFill: 'FF6B21A8' },
    { header: 'POSISI MENU SAAT INI', key: 'posisiMenu', width: 20, align: 'center', headerFill: 'FF6B21A8' },
    { header: 'TAHAP PROSES', key: 'tahapProses', width: 24, align: 'center', headerFill: 'FF6B21A8' },
    { header: 'PROSES SURVEY', key: 'prosesSurvey', width: 24, align: 'center', isStatus: true, headerFill: 'FF6B21A8' },
    { header: 'TANGGAL SURVEY', key: 'tanggalSurvey', width: 16, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'HASIL SURVEY', key: 'hasilSurvey', width: 18, align: 'center', isStatus: true, headerFill: 'FF6B21A8' },
    { header: 'FHOTO SURVEY', key: 'fotoSurvey', width: 24, align: 'center', isImage: true, headerFill: 'FF6B21A8' },
    { header: 'PETUGAS SURVEY', key: 'petugasSurvey', width: 26, headerFill: 'FF6B21A8' },
    { header: 'NIP / NIPPPK PETUGAS SURVEY', key: 'petugasNip', width: 22, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'WAKTU SUBMIT SURVEY DINAS', key: 'waktuSubmitSurvey', width: 24, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'DIINPUT SURVEY OLEH', key: 'verifiedDinasBy', width: 24, headerFill: 'FF6B21A8' },
    { header: 'STATUS VERIFIKASI DINAS', key: 'statusVerifBerkasDinas', width: 26, align: 'center', isStatus: true, headerFill: 'FF6B21A8' },
    { header: 'HASIL VERIFIKASI DINAS', key: 'hasilVerifDinas', width: 18, align: 'center', isStatus: true, headerFill: 'FF6B21A8' },
    { header: 'PETUGAS VERIFIKATOR DINAS', key: 'verifikatorDinas', width: 26, headerFill: 'FF6B21A8' },
    { header: 'NIP / NIPPPK VERIFIKATOR', key: 'verifikatorNip', width: 22, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'WAKTU DIVERIFIKASI DINAS', key: 'waktuVerifDinas', width: 24, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'KOORDINAT GPS SURVEY', key: 'gps', width: 22, align: 'center', isText: true, headerFill: 'FF6B21A8' },
    { header: 'LINK GOOGLE DRIVE BERKAS', key: 'googleDriveLink', width: 28, headerFill: 'FF6B21A8' },

    // D. Hasil Verifikasi BPJS Ketenagakerjaan (Teal)
    { header: 'STATUS VERIFIKASI BPJS KETENAGAKERJAAN', key: 'bpjsStatusLabel', width: 32, align: 'center', isStatus: true, headerFill: 'FF0F766E' },
    { header: 'KODE STATUS BPJS', key: 'bpjsStatusCode', width: 16, align: 'center', isStatus: true, headerFill: 'FF0F766E' },
    { header: 'KETERANGAN / CATATAN BPJS', key: 'bpjsNote', width: 30, isWrap: true, headerFill: 'FF0F766E' },
    { header: 'NO. KPJ BPJS', key: 'bpjsKpj', width: 20, align: 'center', isText: true, headerFill: 'FF0F766E' },
    { header: 'WAKTU VERIFIKASI BPJS', key: 'bpjsCheckedAt', width: 22, align: 'center', isText: true, headerFill: 'FF0F766E' },

    // E. Data Rekening Bank & LPJ (Emerald)
    { header: 'NAMA BANK', key: 'bankName', width: 18, align: 'center', headerFill: 'FF047857' },
    { header: 'NOMOR REKENING', key: 'bankNumber', width: 24, align: 'center', isText: true, headerFill: 'FF047857' },
    { header: 'NAMA PEMILIK REKENING', key: 'bankOwner', width: 28, headerFill: 'FF047857' },
    { header: 'STATUS LPJ', key: 'statusLpj', width: 22, align: 'center', isStatus: true, headerFill: 'FF047857' },
    { header: 'NOMINAL LPJ (RP)', key: 'lpjNominal', width: 18, align: 'right', isCurrency: true, headerFill: 'FF047857' },
    { header: 'TANGGAL ENTRY LPJ', key: 'lpjEntryDate', width: 22, align: 'center', isText: true, headerFill: 'FF047857' },
  ];

  const rows = sorted.map((actor, index) => {
    const bio = getBiodataFields(actor);
    const survey = getSurveyHelpers(actor);
    const petugas = resolver.resolvePetugas(actor);
    const verifikator = resolver.resolveVerifikator(actor, petugas);
    const menuInfo = getActorCurrentMenu(actor);
    const hasBank = Boolean(
      actor.bankNumber && String(actor.bankNumber).trim() !== '' && String(actor.bankNumber).trim() !== '-'
    );
    const bpjs = actor.bpjsResolved || {
      hasMatch: false,
      statusLabel: 'BELUM DIVERIFIKASI',
      statusCode: '-',
      note: '-',
      kpj: actor.bpjsKpj || '-',
      checkedAt: actor.bpjsCheckedAt || '',
      sourceFile: '',
    };

    return {
      no: index + 1,
      registrationCode: bio.registrationCode,
      fullName: bio.fullName,
      createdAt: actor.createdAt ? formatDateTimeIndo(actor.createdAt) : '-',
      createdBy: actor.createdBy ? String(actor.createdBy).toUpperCase() : '-',
      coordinator: bio.coordinator,
      nik: bio.nik,
      noKK: bio.noKK,
      gender: bio.gender,
      pob: bio.pob,
      dob: bio.dob,
      age: bio.age,
      agama: actor.agama || '-',
      pekerjaan: actor.pekerjaan || '-',
      statusKeluarga: actor.statusKeluarga || survey.sd.status || '-',
      namaKepalaKeluarga: actor.namaKepalaKeluarga ? String(actor.namaKepalaKeluarga).toUpperCase() : '-',
      nikKepalaKeluarga: actor.nikKepalaKeluarga || '-',
      phone: bio.phone,
      email: survey.sd.email || '-',
      sosmed: survey.sd.sosmed || '-',
      address: bio.address,
      rtRw: bio.rtRw,
      kelurahan: bio.kelurahan,
      kecamatan: bio.kecamatan,

      businessCategory: bio.businessCategory,
      businessName: bio.businessName,
      bidangUsaha: survey.sd.bidangUsaha || '-',
      businessLocation: bio.businessLocation,
      tahunBerdiri: survey.sd.tahunBerdiri || '-',
      peralatan: survey.sd.peralatan || '-',
      izin: survey.izinStr,
      modalUsaha: formatCurrencyIndoSafe(survey.sd.modalUsaha),
      omset: formatCurrencyIndoSafe(survey.sd.omset),
      dtks: survey.dtksStr,
      hibah: survey.hibahStr,
      rencanaPenggunaan: survey.sd.rencanaPenggunaan || '-',

      statusSistem: String(actor.status || 'pending').toUpperCase(),
      posisiMenu: menuInfo.menuName.toUpperCase(),
      tahapProses: menuInfo.stageLabel.toUpperCase(),
      prosesSurvey: survey.prosesSurvey,
      tanggalSurvey: survey.sd.tanggalSurvey || '-',
      hasilSurvey: survey.hasilSurvey,
      fotoSurvey: '',
      petugasSurvey: petugas.nama,
      petugasNip: petugas.nipppk,
      waktuSubmitSurvey: survey.waktuSubmitSurvey,
      verifiedDinasBy: actor.verifiedDinasBy ? String(actor.verifiedDinasBy).toUpperCase() : '-',
      statusVerifBerkasDinas: survey.statusVerifBerkasDinas,
      hasilVerifDinas: survey.hasilVerifDinas,
      verifikatorDinas: verifikator.nama,
      verifikatorNip: verifikator.nipppk,
      waktuVerifDinas: survey.waktuVerifDinas,
      gps: survey.gpsStr,
      googleDriveLink: actor.googleDriveLink || '-',

      bpjsStatusLabel: bpjs.statusLabel,
      bpjsStatusCode: bpjs.statusCode || '-',
      bpjsNote: bpjs.note || '-',
      bpjsKpj: bpjs.kpj || '-',
      bpjsCheckedAt: bpjs.checkedAt ? formatDateTimeIndo(bpjs.checkedAt) : '-',

      bankName: hasBank ? normalizeBankNameReport(actor.bankName) : '-',
      bankNumber: hasBank ? String(actor.bankNumber).trim() : '-',
      bankOwner: hasBank ? (actor.fullName || actor.bankOwner || '-').trim().toUpperCase() : '-',
      statusLpj: getLpjStatusLabel(actor),
      lpjNominal: Number(actor.lpjNominal) || 0,
      lpjEntryDate: actor.lpjEntryDate ? formatDateTimeIndo(actor.lpjEntryDate) : '-',
    };
  });

  const rowImages = sorted.map((actor) => photosMap.get(actor.id) ?? null);

  await buildAndDownloadSingleSheetExcel({
    sheetName: 'Report Pelaku Usaha',
    fileName: `Report_Pelaku_Usaha_Lengkap_${dateStamp}.xlsx`,
    title: 'REPORT PELAKU USAHA LENGKAP — DATA UTAMA, SURVEY DINAS, BPJS KETENAGAKERJAAN & REKENING (SIMPU)',
    subtitle: `Dicetak pada: ${printedAt}  |  Total Data: ${rows.length.toLocaleString('id-ID')} Pelaku Usaha  |  Filter: ${filterSummary}`,
    bannerColor: 'FF0F172A',
    defaultHeaderColor: 'FF1E3A8A',
    columns,
    rows,
    imageColKey: 'fotoSurvey',
    rowImages,
  });
}
