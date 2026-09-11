import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, push, set, query, orderByChild, equalTo, limitToFirst } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { normalizeCoordinator } from '@/lib/coordinator-utils';

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
      address,
      rtRw,
      kelurahan,
      kecamatan,
      businessCategory,
      businessName,
      businessLocation,
      coordinator,
    } = body;

    // 1. Validasi Kolom Wajib
    if (!fullName || !gender || !nik || !noKK || !pob || !dob || !phone || !address || !rtRw || !kelurahan || !kecamatan || !businessCategory || !businessName || !businessLocation || !coordinator) {
      return NextResponse.json(
        { success: false, message: "Semua kolom formulir pendaftaran wajib diisi lengkap." },
        { status: 400 }
      );
    }

    const cleanNik = String(nik).replace(/[^0-9]/g, "").trim();
    const cleanKk = String(noKK).replace(/[^0-9]/g, "").trim();

    if (cleanNik.length !== 16) {
      return NextResponse.json(
        { success: false, message: "NIK harus berjumlah 16 digit angka." },
        { status: 400 }
      );
    }

    if (cleanKk.length !== 16) {
      return NextResponse.json(
        { success: false, message: "Nomor KK harus berjumlah 16 digit angka." },
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

    const [dupByNik, dupByKK] = await Promise.all([
      checkDuplicateByField('nik', cleanNik),
      checkDuplicateByField('noKK', cleanKk),
    ]);

    const duplicateInActors = dupByNik || dupByKK;
    if (duplicateInActors) {
      return NextResponse.json(
        {
          success: false,
          message: `DATA TELAH DI INPUT! NIK atau Nomor KK ini sudah terdaftar di SIMPU dengan Nomor Registrasi: ${duplicateInActors.registrationCode || '-'} dan Usulan Koordinator: ${duplicateInActors.coordinator || '-'}.`,
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

    const actorData = {
      id: actorId,
      ownerId: "pendaftaran_mandiri",
      createdBy: "PENDAFTARAN MANDIRI (ONLINE)",
      fullName: String(fullName).trim(),
      gender: String(gender).trim(),
      nik: cleanNik,
      noKK: cleanKk,
      registrationCode,
      pobDob: `${String(pob).trim()}, ${String(dob).trim()}`,
      pob: String(pob).trim(),
      dob: String(dob).trim(),
      phone: String(phone).trim(),
      address: String(address).trim(),
      rtRw: String(rtRw).trim(),
      kelurahan: String(kelurahan).trim(),
      kecamatan: String(kecamatan).trim(),
      businessCategory: String(businessCategory).trim(),
      businessName: String(businessName).trim(),
      businessLocation: String(businessLocation).trim(),
      coordinator: finalCoordinator,
      status: "pending",
      createdAt: new Date().toISOString(),
      source: "WEB_PENDAFTARAN_MANDIRI",
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
