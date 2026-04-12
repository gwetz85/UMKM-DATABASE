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
    const blacklistDataRef = ref(database, 'blacklist_data');

    const [actorsSnap, masterSnap, blacklistSnap] = await Promise.all([
      get(actorsRef),
      get(masterDataRef),
      get(blacklistDataRef)
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
    const allBlacklistData = blacklistSnap.exists() ? Object.values(blacklistSnap.val()) : [];
    
    let verifiedCount = 0;
    let rejectedCount = 0;
    let manualCount = 0;
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
      if (!actor.businessName) missingFields.push("Usaha");
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

      // RULE 1: Check Blacklist (Sheet 2) based on KK
      const isBlacklisted = allBlacklistData.some((b: any) => b.noKK && b.noKK === actor.noKK);
      if (isBlacklisted) {
        updates[`businessActors/${actor.id}/status`] = 'rejected';
        updates[`businessActors/${actor.id}/rejectionReason`] = 'Ditolak Otomatis: Data KK terdeteksi pada Sheet 2 (Cancell).';
        rejectedCount++;
        return;
      }

      // RULE 2: Calculate KK matches in Master Data (Sheet 1)
      const kkMatches = allMasterData.filter((m: any) => m.noKK && m.noKK === actor.noKK);
      const matchCount = kkMatches.length;

      // RULE 3: Routing based on Match Count
      if (matchCount >= 2) {
        // 2+ matches -> Manual Verification
        updates[`businessActors/${actor.id}/status`] = 'verifikasi_manual';
        manualCount++;
        return;
      }

      // RULE 4: Timer based on Match Count (0 match = 1m, 1 match = 10m)
      const targetMins = matchCount === 0 ? 1 : 10;
      const createdAt = new Date(actor.createdAt).getTime();
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
