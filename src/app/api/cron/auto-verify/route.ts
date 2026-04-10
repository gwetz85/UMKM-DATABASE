import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase (Server-side compatible)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

const CRON_SECRET = "simpu_auto_verify_2026";

export async function GET(req: NextRequest) {
  try {
    // 1. Security Check
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (key !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Authenticate with Firebase if not already
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    // 3. Fetch Data
    const actorsRef = ref(database, 'businessActors');
    const masterDataRef = ref(database, 'master_data');

    const [actorsSnap, masterSnap] = await Promise.all([
      get(actorsRef),
      get(masterDataRef)
    ]);

    if (!actorsSnap.exists()) {
      return NextResponse.json({ message: 'No actors found', processed: 0 });
    }

    const allActors = actorsSnap.val();
    const actorsList = Object.keys(allActors).map(id => ({ ...allActors[id], id }));
    const pendingActors = actorsList.filter(a => a.status === 'pending');

    if (pendingActors.length === 0) {
      return NextResponse.json({ message: 'No pending actors to process', processed: 0 });
    }

    const allMasterData = masterSnap.exists() ? Object.values(masterSnap.val()) : [];
    
    let verifiedCount = 0;
    let rejectedCount = 0;
    let isolirCount = 0;
    const now = Date.now();
    const updates: Record<string, any> = {};
    const skipped: any[] = [];

    // 4. Processing Logic
    pendingActors.forEach(actor => {
      // Check data completeness
      const missingFields = [];
      if (!actor.fullName) missingFields.push("Nama Lengkap");
      if (!actor.nik) missingFields.push("NIK");
      if (!actor.noKK) missingFields.push("Nomor KK");
      if (!actor.gender) missingFields.push("Jenis Kelamin");
      if (!actor.pobDob) missingFields.push("TTL");
      if (!actor.phone) missingFields.push("Nomor HP");
      if (!actor.address) missingFields.push("Alamat");
      if (!actor.rtRw) missingFields.push("RT/RW");
      if (!actor.kelurahan) missingFields.push("Kelurahan");
      if (!actor.kecamatan) missingFields.push("Kecamatan");
      if (!actor.businessCategory) missingFields.push("Jenis Usaha");
      if (!actor.businessName) missingFields.push("Nama Usaha");
      if (!actor.businessLocation) missingFields.push("Lokasi Usaha");
      if (!actor.coordinator) missingFields.push("Koordinator");

      if (missingFields.length > 0) {
        skipped.push({
          id: actor.id,
          name: actor.fullName || "Unnamed",
          reason: "Data tidak lengkap",
          details: `Missing: ${missingFields.join(', ')}`
        });
        return;
      }

      // Calculate matches in Master Data
      const nikMatches = allMasterData.filter((m: any) => m.nik && m.nik === actor.nik);
      const kkMatches = allMasterData.filter((m: any) => m.noKK && m.noKK === actor.noKK);
      const combinedMatches = [...nikMatches, ...kkMatches];
      const uniqueIds = new Set(combinedMatches.map(m => (m as any).id || `${(m as any).nik}-${(m as any).nama}`));
      const matchCount = uniqueIds.size;

      // Rule 4: Check for Cancell in Master Data
      const hasCancell = combinedMatches.some(m => ((m as any).status || "").toLowerCase().includes('cancell'));
      if (hasCancell) {
        updates[`businessActors/${actor.id}/status`] = 'rejected';
        updates[`businessActors/${actor.id}/rejectionReason`] = 'Ditolak Otomatis: Terdeteksi status Cancell pada Data Master Pembanding.';
        rejectedCount++;
        return;
      }

      // New Rule: Check for same business name in KK for Year 2025 (Isolir)
      const isIsolir = kkMatches.some((m: any) => 
        String(m.tahunPengajuan) === "2025" && 
        (m.usaha || "").toLowerCase().trim() === (actor.businessName || "").toLowerCase().trim()
      );
      
      const createdAt = new Date(actor.createdAt).getTime();

      if (isIsolir) {
        // Enforce 1 minute wait time for Isolir Data
        const targetTimeIsolir = createdAt + 60000;
        if (now >= targetTimeIsolir) {
          updates[`businessActors/${actor.id}/status`] = 'isolir_data';
          updates[`businessActors/${actor.id}/rejectionReason`] = 'Pengajuan Diblok dikarenakan indikasi usaha yang sama';
          isolirCount++;
          return;
        }
        // If not yet 1 minute, skip this actor for now (it will stay pending)
        skipped.push({
          id: actor.id,
          name: actor.fullName,
          reason: "Menunggu timer Isolir (1m)",
          details: "Terdeteksi indikasi usaha sama, menunggu masa sanggah/cek sistem 1 menit."
        });
        return;
      }

      // Rule 1 & 2: Verification Timeline (REVISED: 1 min for match, 5 mins for new)
      const targetMins = matchCount === 0 ? 5 : 1;
      const isAutoEligible = matchCount < 2;

      if (isAutoEligible) {
        const targetTime = createdAt + (targetMins * 60000);
        
        if (now >= targetTime) {
          updates[`businessActors/${actor.id}/status`] = 'verified_actor';
          verifiedCount++;
        } else {
          const remainingSecs = Math.ceil((targetTime - now) / 1000);
          skipped.push({
            id: actor.id,
            name: actor.fullName,
            reason: `Menunggu timer (${targetMins}m)`,
            details: `Akan diverifikasi dalam ${remainingSecs} detik.`
          });
        }
      } else {
        skipped.push({
          id: actor.id,
          name: actor.fullName,
          reason: "Verifikasi Manual",
          details: `Terdeteksi ${matchCount} kecocokan di Master Data (Perlu cek manual).`
        });
      }
    });

    // 5. Apply Updates
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalPending: pendingActors.length,
        verified: verifiedCount,
        rejected: rejectedCount,
        isolir: isolirCount,
        skippedCount: skipped.length,
        processedAt: new Date().toISOString()
      },
      skipped: skipped
    });

  } catch (error: any) {
    console.error('Auto-verify job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
