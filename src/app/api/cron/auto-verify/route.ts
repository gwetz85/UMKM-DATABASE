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
    const master2023Ref = ref(database, 'master_data_2023');
    const master2024Ref = ref(database, 'master_data_2024');
    const master2025Ref = ref(database, 'master_data_2025');
    const blacklistRef = ref(database, 'blacklist_data');

    const [actorsSnap, m2023Snap, m2024Snap, m2025Snap, blacklistSnap] = await Promise.all([
      get(actorsRef),
      get(master2023Ref),
      get(master2024Ref),
      get(master2025Ref),
      get(blacklistRef)
    ]);

    if (!actorsSnap.exists()) {
      return NextResponse.json({ message: 'No actors found', processed: 0 });
    }

    const allActors = actorsSnap.val();
    const actorsList = Object.keys(allActors).map(id => ({ ...allActors[id], id }));
    
    // Process actors that are pending, lengkapi_data, or hold (to re-evaluate)
    const pendingActors = actorsList.filter(a => 
      a.status === 'pending' || 
      a.status === 'lengkapi_data' || 
      a.status === 'hold' ||
      a.status === 'verifikasi_manual'
    );

    if (pendingActors.length === 0) {
      return NextResponse.json({ message: 'No actors to process', processed: 0 });
    }

    const data2023 = m2023Snap.exists() ? Object.values(m2023Snap.val()) : [];
    const data2024 = m2024Snap.exists() ? Object.values(m2024Snap.val()) : [];
    const data2025 = m2025Snap.exists() ? Object.values(m2025Snap.val()) : [];
    const dataBlacklist = blacklistSnap.exists() ? Object.values(blacklistSnap.val()) : [];
    
    let verifiedCount = 0;
    let rejectedCount = 0;
    let holdCount = 0;
    let incompleteCount = 0;
    const now = Date.now();
    const updates: Record<string, any> = {};
    const skipped: any[] = [];

    // 4. Processing Logic
    pendingActors.forEach(actor => {
      // Check data completeness
      const isComplete = !!(
        actor.fullName && actor.nik && actor.noKK && actor.gender && 
        actor.pobDob && actor.phone && actor.address && actor.rtRw && 
        actor.kelurahan && actor.kecamatan && actor.businessCategory && 
        actor.businessName && actor.businessLocation && actor.coordinator
      );

      if (!isComplete) {
        if (actor.status !== 'lengkapi_data') {
          updates[`businessActors/${actor.id}/status`] = 'lengkapi_data';
          incompleteCount++;
        }
        skipped.push({ id: actor.id, name: actor.fullName, reason: "Data belum lengkap" });
        return;
      }

      // Check Matches
      const checkMatch = (data: any[]) => data.some((d: any) => 
        (d.nik && d.nik === actor.nik) || (d.noKK && d.noKK === actor.noKK)
      );

      const hasBlacklist = checkMatch(dataBlacklist);
      const has2023 = checkMatch(data2023);
      const has2024 = checkMatch(data2024);
      const has2025 = checkMatch(data2025);

      const createdAt = new Date(actor.createdAt).getTime();

      // LOGIC PRIORITY (REFINED)
      // 1. Blacklist -> 30s -> rejected
      if (hasBlacklist) {
        const targetTime = createdAt + 30000;
        if (now >= targetTime) {
          updates[`businessActors/${actor.id}/status`] = 'rejected';
          updates[`businessActors/${actor.id}/rejectionReason`] = 'Ditolak Otomatis: Terdaftar di Data Blacklist (Sheet 4).';
          rejectedCount++;
        } else {
          skipped.push({ id: actor.id, name: actor.fullName, reason: "Waiting Blacklist timer (30s)" });
        }
        return;
      }

      // 2. 2025 -> instant -> hold (moves to manual after 24h)
      if (has2025) {
        const holdTargetTime = createdAt + (24 * 60 * 60 * 1000); 
        if (now >= holdTargetTime) {
          if (actor.status !== 'verifikasi_manual') {
            updates[`businessActors/${actor.id}/status`] = 'verifikasi_manual';
          }
        } else {
          if (actor.status !== 'hold') {
            updates[`businessActors/${actor.id}/status`] = 'hold';
            holdCount++;
          }
          skipped.push({ id: actor.id, name: actor.fullName, reason: "Waiting 2025/HOLD timer (24h)" });
        }
        return;
      }

      // 3. 2023 -> 1m -> verified_actor
      if (has2023) {
        const targetTime = createdAt + 60000;
        if (now >= targetTime) {
          updates[`businessActors/${actor.id}/status`] = 'verified_actor';
          verifiedCount++;
        } else {
          skipped.push({ id: actor.id, name: actor.fullName, reason: "Waiting 2023 timer (1m)" });
        }
        return;
      }

      // 4. 2024 -> 10m -> verified_actor
      if (has2024) {
        const targetTime = createdAt + 600000;
        if (now >= targetTime) {
          updates[`businessActors/${actor.id}/status`] = 'verified_actor';
          verifiedCount++;
        } else {
          skipped.push({ id: actor.id, name: actor.fullName, reason: "Waiting 2024 timer (10m)" });
        }
        return;
      }

      // 5. No Match -> Move to manual verification if it was pending or lengkapi_data
      if (actor.status !== 'verifikasi_manual') {
        updates[`businessActors/${actor.id}/status`] = 'verifikasi_manual';
      }
    });

    // 5. Apply Updates
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: pendingActors.length,
        verified: verifiedCount,
        rejected: rejectedCount,
        hold: holdCount,
        incomplete: incompleteCount,
        skippedCount: skipped.length,
        processedAt: new Date().toISOString()
      },
      skipped
    });

  } catch (error: any) {
    console.error('Auto-verify job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
