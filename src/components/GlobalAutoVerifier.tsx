"use client"

import { useEffect, useMemo } from "react"
import { useDatabase, useList, useUser, updateDocumentNonBlocking, useObject } from "@/firebase"
import { ref } from "firebase/database"

export function GlobalAutoVerifier() {
  // This logic has been migrated to the server-side API: /api/cron/auto-verify
  // for automatic processing without needing the app to be open.
  // The client-side interval is disabled to prevent redundant processing.
  return null;
}
