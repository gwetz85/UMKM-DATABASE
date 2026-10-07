import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, push, set, query, orderByChild, equalTo, limitToFirst } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { normalizeCoordinator } from '@/lib/coordinator-utils';
import { extractGenderFromNik } from '@/lib/utils';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureAuth();

    const body = await req.json();
    const {
      fullName,
      gender,
      nik,
      noKK,
      pob,
      dob,
      phone,
      agama,
      pekerjaan,
      address,
      rtRw,
      kelurahan,
      kecamatan,
      tanggalCetakKtp,
      statusKeluarga,
      namaKepalaKeluarga,
      nikKepalaKeluarga,
      pobKepalaKeluarga,
      dobKepalaKeluarga,
      agamaKepalaKeluarga,
      pekerjaanKepalaKeluarga,
      tanggalCetakKk,
      businessCategory,
      businessName,
      businessLocation,
      coordinator,
      comparisonPhotoUrl,
    } = body;

    // 1. Validasi Kolom Wajib (25 Kolom Tahapan 1-4)
    if (
      !fullName ||
      !nik ||
      !noKK ||
      !pob ||
      !dob ||
      !phone ||
      !agama ||
      !pekerjaan ||
      !address ||
      !rtRw ||
      !kelurahan ||
      !kecamatan ||
      !tanggalCetakKtp ||
      !statusKeluarga ||
      !namaKepalaKeluarga ||
      !nikKepalaKeluarga ||
      !pobKepalaKeluarga ||
      !dobKepalaKeluarga ||
      !agamaKepalaKeluarga ||
      !pekerjaanKepalaKeluarga ||
      !tanggalCetakKk ||
      !businessCategory ||
      !businessName ||
      !businessLocation ||
      !coordinator
    ) {
      return NextResponse.json(
        { success: false, message: "Semua kolom formulir pendaftaran (Tahapan 1 s/d Tahapan 4) wajib diisi lengkap." },
        { status: 400 }
      );
    }

    const cleanNik = String(nik).replace(/[^0-9]/g, "").trim();
    const cleanKk = String(noKK).replace(/[^0-9]/g, "").trim();
    const cleanNikKk = String(nikKepalaKeluarga).replace(/[^0-9]/g, "").trim();

    if (cleanNik.length !== 16) {
      return NextResponse.json(
        { success: false, message: "NIK Pelaku Usaha harus berjumlah 16 digit angka." },
        { status: 400 }
      );
    }

    if (cleanKk.length !== 16) {
      return NextResponse.json(
        { success: false, message: "Nomor KK harus berjumlah 16 digit angka." },
        { status: 400 }
      );
    }

    if (cleanNikKk.length !== 16) {
      return NextResponse.json(
        { success: false, message: "NIK Kepala Keluarga harus berjumlah 16 digit angka." },
        { status: 400 }
      );
    }

    const actorsRef = ref(database, 'businessActors');

    // 2. Pengecekan Duplikasi NIK & KK di businessActors
    const checkDuplicateByField = async (field: 'nik' | 'noKK', value: string) => {
      if (!value) return null;
      try {
        const q = query(actorsRef, orderByChild(field), equalTo(value), limitToFirst(1));
        const snap = await get(q);
        if (snap.exists()) {
          const found = Object.values(snap.val())[0] as any;
          return found;
        }
        return null;
      } catch (err) {
        console.warn(`Query index on ${field} failed, fallback search:`, err);
        try {
          const snap = await get(actorsRef);
          if (snap.exists()) {
            const allActors = Object.values(snap.val()) as any[];
            return allActors.find((a: any) => a && a[field] === value) || null;
          }
        } catch (fallbackErr) {
          console.error("Fallback search failed:", fallbackErr);
        }
        return null;
      }
    };

    // Pengecekan Nomor KK di Blacklist (Sheet 4) & Pembanding 2025 (Sheet 3)
    const checkKkInTable = async (tableName: string, cleanKkValue: string) => {
      if (!cleanKkValue) return null;
      try {
        const tableRef = ref(database, tableName);
        const q1 = query(tableRef, orderByChild('noKK'), equalTo(cleanKkValue), limitToFirst(1));
        const snap1 = await get(q1);
        if (snap1.exists()) return Object.values(snap1.val())[0] as any;

        const q2 = query(tableRef, orderByChild('kk'), equalTo(cleanKkValue), limitToFirst(1));
        const snap2 = await get(q2);
        if (snap2.exists()) return Object.values(snap2.val())[0] as any;
      } catch (e) {
        try {
          const snap = await get(ref(database, tableName));
          if (snap.exists()) {
            const list = Object.values(snap.val()) as any[];
            return list.find((item: any) => {
              const itemKk = String(item?.noKK || item?.kk || item?.NOKK || '').replace(/[^0-9]/g, '');
              return itemKk === cleanKkValue;
            }) || null;
          }
        } catch (err) {}
      }
      return null;
    };

    const [dupByNik, dupByKK, blacklistRecord, data2025Record] = await Promise.all([
      checkDuplicateByField('nik', cleanNik),
      checkDuplicateByField('noKK', cleanKk),
      checkKkInTable('blacklist_data', cleanKk),
      checkKkInTable('master_data_2025', cleanKk),
    ]);

    if (blacklistRecord) {
      return NextResponse.json(
        {
          success: false,
          message: `PENDAFTARAN DITOLAK! Nomor KK (${cleanKk}) terdaftar dalam Sheet 4 : Blacklist (${blacklistRecord.catatan || blacklistRecord.alasan || 'Data Masuk Daftar Blacklist'}). Pendaftaran tidak diizinkan.`,
        },
        { status: 403 }
      );
    }

    if (data2025Record && !comparisonPhotoUrl) {
      return NextResponse.json(
        {
          success: false,
          message: `FHOTO PEMBANDING WAJIB! Nomor KK (${cleanKk}) terdaftar dalam Sheet 3 : Pembanding 2025. Wajib melampirkan Fhoto Pembanding pada Tahapan 1 sebelum melanjutkan.`,
        },
        { status: 400 }
      );
    }

    const duplicateInActors = dupByNik || dupByKK;
    if (duplicateInActors) {
      return NextResponse.json(
        {
          success: false,
          message: `DATA TELAH DI INPUT! NIK atau Nomor KK ini sudah terdaftar di SIMPU (Data Pelaku Usaha 2026) dengan Nomor Registrasi: ${duplicateInActors.registrationCode || '-'} dan Usulan Koordinator: ${duplicateInActors.coordinator || '-'}.`,
          duplicateData: {
            registrationCode: duplicateInActors.registrationCode,
            coordinator: duplicateInActors.coordinator,
            fullName: duplicateInActors.fullName,
          }
        },
        { status: 409 }
      );
    }

    // 3. Normalisasi & Validasi Kuota Koordinator
    const finalCoordinator = normalizeCoordinator(coordinator);
    if (finalCoordinator) {
      try {
        const [quotaSnap, statsSnap] = await Promise.all([
          get(ref(database, 'koordinator_kuotas')),
          get(ref(database, 'system_stats')),
        ]);

        if (quotaSnap.exists()) {
          const quotasVal = quotaSnap.val();
          const quotaList = Array.isArray(quotasVal) ? quotasVal : Object.values(quotasVal);
          const matchedQuota = quotaList.find((q: any) => q && normalizeCoordinator(q.name) === finalCoordinator);

          if (matchedQuota) {
            const systemStats = statsSnap.exists() ? statsSnap.val() : {};
            const achievedMap = systemStats?.coordinator || {};
            const currentUsed = achievedMap[(finalCoordinator || '').toUpperCase().trim()] || 0;
            const quotaLimit = parseInt(String(matchedQuota.quota)) || 0;

            if (quotaLimit > 0 && currentUsed >= quotaLimit) {
              return NextResponse.json(
                {
                  success: false,
                  message: `KUOTA HABIS! Data tidak bisa diinput dikarenakan kuota koordinator ${finalCoordinator} telah habis (${currentUsed}/${quotaLimit}). Silakan pilih koordinator lain.`,
                },
                { status: 400 }
              );
            }
          }
        }
      } catch (quotaErr) {
        console.warn("Coordinator quota check failed, continuing:", quotaErr);
      }
    }

    // 4. Generate Nomor Registrasi 8 digit acak
    const registrationCode = Math.floor(10000000 + Math.random() * 90000000).toString();

    // 5. Data Pelaku Usaha Baru
    const newActorRef = push(actorsRef);
    const actorId = newActorRef.key;
    const derivedGender = gender ? String(gender).trim() : (extractGenderFromNik(cleanNik) || "Laki-laki");

    const actorData: any = {
      id: actorId,
      ownerId: "pendaftaran_mandiri",
      createdBy: "PENDAFTARAN MANDIRI (ONLINE)",
      fullName: String(fullName).trim(),
      gender: derivedGender,
      nik: cleanNik,
      noKK: cleanKk,
      registrationCode,
      pobDob: `${String(pob).trim()}, ${String(dob).trim()}`,
      pob: String(pob).trim(),
      dob: String(dob).trim(),
      phone: String(phone).trim(),
      agama: String(agama).trim(),
      pekerjaan: String(pekerjaan).trim(),
      address: String(address).trim(),
      rtRw: String(rtRw).trim(),
      kelurahan: String(kelurahan).trim(),
      kecamatan: String(kecamatan).trim(),
      tanggalCetakKtp: String(tanggalCetakKtp).trim(),
      statusKeluarga: String(statusKeluarga).trim(),
      namaKepalaKeluarga: String(namaKepalaKeluarga).trim(),
      nikKepalaKeluarga: cleanNikKk,
      pobKepalaKeluarga: String(pobKepalaKeluarga).trim(),
      dobKepalaKeluarga: String(dobKepalaKeluarga).trim(),
      pobDobKepalaKeluarga: `${String(pobKepalaKeluarga).trim()}, ${String(dobKepalaKeluarga).trim()}`,
      agamaKepalaKeluarga: String(agamaKepalaKeluarga).trim(),
      pekerjaanKepalaKeluarga: String(pekerjaanKepalaKeluarga).trim(),
      tanggalCetakKk: String(tanggalCetakKk).trim(),
      businessCategory: String(businessCategory).trim(),
      businessName: String(businessName).trim(),
      businessLocation: String(businessLocation).trim(),
      coordinator: finalCoordinator,
      status: "pending",
      createdAt: new Date().toISOString(),
      source: "WEB_PENDAFTARAN_MANDIRI",
      ...(comparisonPhotoUrl ? {
        comparisonPhotoUrl,
        verificationBypass: {
          isBypassed: true,
          reason: "Fhoto Pembanding Sheet 3 (2025) - Diinput pada Tahapan 1 Pendaftaran",
          fileBase64: comparisonPhotoUrl,
        }
      } : {}),
    };

    await set(newActorRef, actorData);

    // 6. Update system_stats secara aman (background update)
    import('@/lib/stats-service').then(({ updateStatsOnNewActor }) => {
      updateStatsOnNewActor(database, actorData).catch((err) => {
        console.error("Stats update error on self registration:", err);
      });
    }).catch(console.error);

    // 7. Log Activity
    const activityRef = push(ref(database, 'activity_logs'));
    set(activityRef, {
      timestamp: Date.now(),
      query: `PENDAFTARAN WEB: ${actorData.fullName} (${actorData.nik})`,
      results: "Berhasil Daftar",
      device: req.headers.get('user-agent') || 'Web Browser',
      source: 'Link Web Pendaftaran',
      method: 'PENDAFTARAN MANDIRI',
      userId: 'PORTAL PUBLIK'
    }).catch((err) => console.error("Log activity error:", err));

    return NextResponse.json({
      success: true,
      message: "Data pendaftaran pelaku usaha berhasil disimpan.",
      registrationCode,
      actorId,
      data: actorData,
    });

  } catch (error: any) {
    console.error("Error in POST /api/pendaftaran:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Terjadi kesalahan saat memproses pendaftaran: ${error.message || 'Silakan coba beberapa saat lagi.'}`,
      },
      { status: 500 }
    );
  }
}
