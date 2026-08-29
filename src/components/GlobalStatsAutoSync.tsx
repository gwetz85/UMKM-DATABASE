"use client";

import { useEffect, useRef } from "react";
import { useDatabase, useObject, useMemoFirebase } from "@/firebase";
import { ref } from "firebase/database";

export function GlobalStatsAutoSync() {
  const database = useDatabase();
  const isSyncingRef = useRef(false);

  // Monitor lastUpdated from system_stats
  const statsRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'system_stats');
  }, [database]);
  const { data: systemStats } = useObject(statsRef);

  useEffect(() => {
    if (!database) return;

    const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

    const checkAndSync = async () => {
      if (isSyncingRef.current || !database) return;

      const lastUpdatedStr = systemStats?.lastUpdated;
      const lastUpdatedTime = lastUpdatedStr ? new Date(lastUpdatedStr).getTime() : 0;
      const now = Date.now();

      // Jika belum pernah disinkronkan, atau sudah lebih dari 5 menit
      if (!lastUpdatedTime || (now - lastUpdatedTime >= SYNC_INTERVAL_MS)) {
        isSyncingRef.current = true;
        try {
          const { recalculateAndSaveSystemStats } = await import("@/lib/stats-service");
          await recalculateAndSaveSystemStats(database);
        } catch (err) {
          console.error("[GlobalStatsAutoSync] Error syncing stats:", err);
        } finally {
          isSyncingRef.current = false;
        }
      }
    };

    // Jalankan pengecekan pertama kali
    checkAndSync();

    // Jalankan timer polling setiap 15 detik untuk memastikan sync tepat waktu
    const interval = setInterval(() => {
      checkAndSync();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [database, systemStats?.lastUpdated]);

  return null;
}
