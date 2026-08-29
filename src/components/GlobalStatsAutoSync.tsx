"use client";

import { useEffect, useRef } from "react";
import { useDatabase, useObject, useMemoFirebase } from "@/firebase";
import { ref } from "firebase/database";

export function GlobalStatsAutoSync() {
  const database = useDatabase();
  const isSyncingRef = useRef(false);

  // Pantau lastUpdated dari system_stats (hanya string timestamp kecil, sangat ringan)
  const lastUpdatedRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'system_stats/lastUpdated');
  }, [database]);
  const { data: lastUpdated } = useObject<string>(lastUpdatedRef);

  useEffect(() => {
    if (!database) return;

    const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

    const checkAndSync = async () => {
      if (isSyncingRef.current || !database) return;

      const lastUpdatedTime = lastUpdated ? new Date(lastUpdated).getTime() : 0;
      const now = Date.now();

      // Hanya jalankan jika waktu sinkronisasi terakhir sudah >= 5 menit
      if (!lastUpdatedTime || (now - lastUpdatedTime >= SYNC_INTERVAL_MS)) {
        isSyncingRef.current = true;
        try {
          const { recalculateAndSaveSystemStats } = await import("@/lib/stats-service");
          await recalculateAndSaveSystemStats(database);
        } catch (err) {
          console.error("[GlobalStatsAutoSync] Error:", err);
        } finally {
          isSyncingRef.current = false;
        }
      }
    };

    // Jalankan timer pengecekan ringan setiap 60 detik
    const interval = setInterval(checkAndSync, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [database, lastUpdated]);

  return null;
}
