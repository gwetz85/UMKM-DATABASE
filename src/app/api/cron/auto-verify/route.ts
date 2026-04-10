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
    const now = Date.now();
    const updates: Record<string, any> = {};

    // 4. Processing Logic
    pendingActors.forEach(actor => {
      // Check data completeness
      const isDataComplete = !!(
        actor.fullName && actor.nik && actor.noKK && actor.gender && 
        actor.pobDob && actor.phone && actor.address && actor.rtRw && 
        actor.kelurahan && actor.kecamatan && actor.businessCategory && 
        actor.businessName && actor.businessLocation && actor.coordinator
      );

      if (!isDataComplete) return;

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

      // Rule 1 & 2: Verification Timeline
      const targetMins = matchCount === 0 ? 10 : 60;
      const isAutoEligible = matchCount < 2;

      if (isAutoEligible) {
        const createdAt = new Date(actor.createdAt).getTime();
        const targetTime = createdAt + (targetMins * 60000);
        
        if (now >= targetTime) {
          updates[`businessActors/${actor.id}/status`] = 'verified_actor';
          verifiedCount++;
        }
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
        processedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Auto-verify job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
