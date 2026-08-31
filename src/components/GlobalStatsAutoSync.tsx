"use client";

import { useEffect, useRef } from "react";
import { useDatabase } from "@/firebase";

export function GlobalStatsAutoSync() {
  const database = useDatabase();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!database) return;

    // Background server-side sync trigger without downloading heavy collections on client
    const triggerServerSync = async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        // Ping the server endpoint quietly in the background
        await fetch('/api/cron/sync-stats?key=simpu_auto_verify_2026').catch(() => {});
      } catch (err) {
        // Silently ignore background cron error
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Run once in background with a delay after initial paint
    const timer = setTimeout(triggerServerSync, 15000);

    return () => {
      clearTimeout(timer);
    };
  }, [database]);

  return null;
}

