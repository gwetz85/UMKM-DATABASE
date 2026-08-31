"use client";

import { useEffect, useRef } from "react";
import { useDatabase, useObject, useMemoFirebase } from "@/firebase";
import { ref } from "firebase/database";

export function GlobalStatsAutoSync() {
  const database = useDatabase();
  const isSyncingRef = useRef(false);
  const dbRef = useRef(database);
  dbRef.current = database;

  // Pantau lastUpdated dari system_stats (hanya string timestamp kecil, sangat ringan)
  const lastUpdatedRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'system_stats/lastUpdated');
  }, [database]);
  const { data: lastUpdated } = useObject<string>(lastUpdatedRef);

  useEffect(() => {
    const activeDb = dbRef.current || database;
    if (!activeDb) return;

    const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

    const checkAndSync = async () => {
      const db = dbRef.current || database;
      if (isSyncingRef.current || !db) return;

      const lastUpdatedTime = lastUpdated ? new Date(lastUpdated).getTime() : 0;
      const now = Date.now();

      // Hanya jalankan jika waktu sinkronisasi terakhir belum ada atau sudah >= 5 menit
      if (!lastUpdatedTime || (now - lastUpdatedTime >= SYNC_INTERVAL_MS)) {
        isSyncingRef.current = true;
        try {
          const { recalculateAndSaveSystemStats } = await import("@/lib/stats-service");
          await recalculateAndSaveSystemStats(db);
        } catch (err) {
          console.error("[GlobalStatsAutoSync] Error:", err);
        } finally {
          isSyncingRef.current = false;
        }
      }
    };

    // Jalankan pengecekan langsung saat mount / saat lastUpdated terdeteksi kadaluarsa
    checkAndSync();

    // Jalankan timer pengecekan setiap 5 detik agar tepat waktu saat countdown 00:00 tercapai
    const interval = setInterval(checkAndSync, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [database, lastUpdated]);

  return null;
}
