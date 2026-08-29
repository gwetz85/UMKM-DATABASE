import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { recalculateAndSaveSystemStats } from '@/lib/stats-service';

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

    // 3. Recalculate and save stats
    const stats = await recalculateAndSaveSystemStats(database);

    return NextResponse.json({
      success: true,
      message: 'System stats synchronized successfully',
      lastUpdated: stats?.lastUpdated,
      totalActors: stats?.totalActors,
      verified: stats?.status?.verified
    });
  } catch (error: any) {
    console.error('[API Cron Sync Stats] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
