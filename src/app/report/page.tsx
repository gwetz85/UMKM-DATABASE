"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react"
import { useUser, useDatabase, useMemoFirebase, useObject } from "@/firebase"
import { ref, get, set, update } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { logActivity, getDeviceType } from "@/lib/logger"
import { cn, formatDateTimeIndo } from "@/lib/utils"
import {
  buildBpjsLookupMap,
  resolveBpjsForActor,
  type ReportActor,
} from "@/lib/report-excel-generator"
import type { BerkasRangkapLayout } from "@/lib/pdf-generator"
import {
  FileSpreadsheet,
  FileDown,
  Printer,
  RefreshCw,
  Loader2,
  ClipboardCheck,
  CreditCard,
  Users,
  ShieldCheck,
  Search,
  Building2,
  CheckCircle2,
  Layers,
  Filter,
  X,
  Eye,
  FileText,
  Sparkles,
  AlertCircle,
  Download,
  Database,
} from "lucide-react"

// ── IndexedDB Cache Helper for instant 0ms hydration ──────────────────────────
const IDB_CACHE_KEY = "simpu_report_dataset_v2"
const REPORT_INDEX_STALE_MS = 30 * 60 * 1000 // 30 minutes

function getFromIDB(key: string): Promise<any | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) return resolve(null)
    try {
      const req = window.indexedDB.open("simpu_large_cache", 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("store")) {
          req.result.createObjectStore("store")
        }
      }
      req.onsuccess = () => {
        try {
          const tx = req.result.transaction("store", "readonly")
          const getReq = tx.objectStore("store").get(key)
          getReq.onsuccess = () => resolve(getReq.result || null)
          getReq.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function setToIDB(key: string, value: any): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) return resolve()
    try {
      const req = window.indexedDB.open("simpu_large_cache", 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("store")) {
          req.result.createObjectStore("store")
        }
      }
      req.onsuccess = () => {
        try {
          const tx = req.result.transaction("store", "readwrite")
          tx.objectStore("store").put(value, key)
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        } catch {
          resolve()
        }
      }
      req.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  )
}

function normalizeBankForFilter(bankName?: string): string {
  if (!bankName || !bankName.trim()) return ""
  const upper = bankName.trim().toUpperCase()
  if (upper === "-") return ""
  if (upper.includes("RIAU KEPRI") || upper.includes("BRK")) return "BRK"
  if (upper.includes("SYARIAH INDONESIA") || upper.includes("BSI")) return "BSI"
  if (upper.includes("RAKYAT INDONESIA") || upper.includes("BRI")) return "BRI"
  if (upper.includes("NEGARA INDONESIA") || upper.includes("BNI")) return "BNI"
  if (upper.includes("CENTRAL ASIA") || upper.includes("BCA")) return "BCA"
  if (upper.includes("TABUNGAN NEGARA") || upper.includes("BTN")) return "BTN"
  if (upper.includes("CIMB") || upper.includes("NIAGA")) return "CIMB NIAGA"
  const known = [
    "BCA", "BNI", "BRI", "BRK", "MANDIRI", "BSI", "BTN",
    "OCBC", "PANIN", "MUAMALAT", "MAYBANK", "BUKOPIN", "DANAMON", "PERMATA", "CIMB NIAGA"
  ]
  return known.find((b) => upper.includes(b)) || upper
}

function hasValidBank(actor: ReportActor): boolean {
  const num = String(actor.bankNumber || "").trim()
  return num !== "" && num !== "-"
}

function isVerifiedWithBank(actor: ReportActor): boolean {
  if (!actor) return false
  const s = String(actor.status || "").toLowerCase().trim()
  const isCancelDinas =
    (s === "verified_dinas" && actor.hasilVerifikasiDinas === "Tidak Lolos") ||
    Boolean(actor.alasanCancelDinas)
  if (
    isCancelDinas ||
    s === "rejected" ||
    s === "pending" ||
    s === "hold" ||
    s === "lengkapi_data" ||
    s === "verifikasi_manual" ||
    s === "dihapus_dinas"
  ) {
    return false
  }
  return hasValidBank(actor)
}

function parseSystemUsersMap(rawUsers: any): any[] {
  if (!rawUsers || typeof rawUsers !== "object") return []
  return Object.entries(rawUsers)
    .filter(([, u]) => u && typeof u === "object")
    .map(([id, u]: [string, any]) => ({
      id,
      username: u.username || id,
      fullName: u.fullName || u.name || "",
      role: u.role || "",
      nipppk: u.nipppk || "",
      pejabatData: u.pejabatData || null,
    }))
}

function ReportContent() {
  const { user, userProfile, isUserLoading, isProfileLoading } = useUser()
  const database = useDatabase()
  const { toast } = useToast()

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const roleStr = String(userProfile?.role || "").toLowerCase().trim()
  const isAdmin =
    !!adminRole ||
    user?.email?.toLowerCase() === "agus@umkm.id" ||
    roleStr === "admin" ||
    roleStr === "administrator" ||
    roleStr === "superadmin"
  const isStaff = roleStr === "staff"
  const isAllowed =
    isAdmin ||
    isStaff ||
    roleStr === "monitoring" ||
    roleStr === "dinas" ||
    roleStr === "verifikator_dinas" ||
    roleStr === "inspektorat"

  // Data state
  const [actors, setActors] = useState<ReportActor[]>([])
  const [systemUsers, setSystemUsers] = useState<any[]>([])
  const [generatedAt, setGeneratedAt] = useState<string>("")
  const [isFullIndex, setIsFullIndex] = useState<boolean>(false)
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [isSyncingFull, setIsSyncingFull] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const hasTriggeredBgSyncRef = useRef(false)
  const syncingFullRef = useRef(false)

  // Global Excel filters
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("ALL")
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("ALL")

  // Per-report options
  const [selectedBank, setSelectedBank] = useState<string>("ALL")

  // Berkas Pencairan options
  const [berkasLayout, setBerkasLayout] = useState<BerkasRangkapLayout>("paired")
  const [coordSearch, setCoordSearch] = useState<string>("")
  const [previewCoord, setPreviewCoord] = useState<{ name: string; actors: ReportActor[] } | null>(null)

  // Export loading states
  const [exportingKey, setExportingKey] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState<string>("")

  // ── Background / On-Demand Full Sync (builds lightweight settings/report_index) ──
  const syncFullMasterIndex = useCallback(
    async (showToast = false) => {
      if (syncingFullRef.current) return
      syncingFullRef.current = true
      try {
        setIsSyncingFull(true)
        const res = await fetch("/api/reports/data?mode=full", { cache: "no-store" })
        const json = await res.json()
        if (!res.ok || !json.success || !Array.isArray(json.actors)) {
          throw new Error(json.error || "Gagal menyinkronkan data penuh.")
        }

        const freshActors: ReportActor[] = json.actors
        const freshUsers: any[] = Array.isArray(json.systemUsers) ? json.systemUsers : []
        const freshTime: string = json.generatedAt || new Date().toISOString()

        setActors(freshActors)
        if (freshUsers.length > 0) setSystemUsers(freshUsers)
        setGeneratedAt(freshTime)
        setIsFullIndex(true)
        setIsLoadingData(false)

        // Persist to IndexedDB for instant 0ms next load
        setToIDB(IDB_CACHE_KEY, {
          actors: freshActors,
          systemUsers: freshUsers,
          generatedAt: freshTime,
          isFullIndex: true,
        })

        // Persist lightweight index to RTDB from authenticated client so all users get < 250ms loads
        if (database && (isAdmin || isStaff) && freshActors.length > 0) {
          const compactMap: Record<string, any> = {}
          freshActors.forEach((a) => {
            if (!a || !a.id) return
            const { bpjsResolved: _omit, ...rest } = a
            compactMap[a.id] = rest
          })
          set(
            ref(database, "settings/report_index"),
            JSON.parse(JSON.stringify({ updatedAt: freshTime, count: freshActors.length, actors: compactMap }))
          ).catch(() => {})
        }

        if (showToast) {
          const verifiedCount = freshActors.filter(isVerifiedWithBank).length
          toast({
            title: "Sinkronisasi Penuh Selesai",
            description: `${verifiedCount.toLocaleString("id-ID")} data pelaku usaha terverifikasi (rekening terinput) & waktu verifikasi dinas telah diperbarui.`,
          })
        }
      } catch (err: any) {
        console.warn("Background full sync error:", err)
        if (showToast) {
          toast({
            variant: "destructive",
            title: "Gagal Sinkronisasi Penuh",
            description: err?.message || "Silakan coba lagi beberapa saat.",
          })
        }
      } finally {
        syncingFullRef.current = false
        setIsSyncingFull(false)
      }
    },
    [database, isAdmin, isStaff, toast]
  )

  // ── Ultra-Fast Direct RTDB Loader (< 200ms) + 0ms IndexedDB Hydration ────────
  const loadFastData = useCallback(
    async (isManualRefresh = false) => {
      if (!database) return
      try {
        if (isManualRefresh) setIsRefreshing(true)
        setLoadError(null)

        // Start BPJS fetch in parallel, but DO NOT block initial UI render on it!
        const bpjsPromise = Promise.all([
          get(ref(database, "settings/bpjs_comparison_data")).catch(() => null),
          get(ref(database, "bpjs_comparison_data")).catch(() => null),
        ])

        // Step A (< 150ms): Fetch lightweight index + users immediately
        const [reportIdxSnap, searchIdxSnap, usersSnap] = await Promise.all([
          get(ref(database, "settings/report_index")).catch(() => null),
          get(ref(database, "settings/actors_search")).catch(() => null),
          get(ref(database, "system_users")).catch(() => null),
        ])

        const parsedUsers = parseSystemUsersMap(usersSnap?.exists() ? usersSnap.val() : null)
        if (parsedUsers.length > 0) setSystemUsers(parsedUsers)

        const emptyBpjsMap = new Map<string, any>()
        let loadedActors: ReportActor[] = []
        let loadedFromFullIndex = false
        let loadedTime = new Date().toISOString()
        let isIndexStale = true

        const searchValMap: Record<string, any> =
          searchIdxSnap && searchIdxSnap.exists() ? (searchIdxSnap.val() || {}) : {}
        const syncUpdates: Record<string, any> = {}

        const mergeLiveSearchOverlay = (id: string, baseItem: any): ReportActor => {
          const live = searchValMap[id]
          const merged = live
            ? {
                ...baseItem,
                fullName: live.fullName || baseItem.fullName || "",
                nik: live.nik || baseItem.nik || "",
                noKK: live.noKK || baseItem.noKK || "",
                pob: live.pob || baseItem.pob || "",
                dob: live.dob || baseItem.dob || "",
                pobDob: live.pobDob || baseItem.pobDob || "",
                gender: live.gender || baseItem.gender || "",
                phone: live.phone || baseItem.phone || "",
                address: live.address || baseItem.address || "",
                rtRw: live.rtRw || baseItem.rtRw || "",
                kelurahan: live.kelurahan || baseItem.kelurahan || "",
                kecamatan: live.kecamatan || baseItem.kecamatan || "",
                businessName: live.businessName || baseItem.businessName || "",
                businessCategory: live.businessCategory || baseItem.businessCategory || "",
                businessLocation: live.businessLocation || baseItem.businessLocation || "",
                coordinator: live.coordinator || baseItem.coordinator || "",
                petugasSurvey: live.petugasSurvey || baseItem.petugasSurvey || "",
                verifikatorDinas: live.verifikatorDinas || baseItem.verifikatorDinas || "",
                status: live.status || baseItem.status || "",
                bankName: live.bankName || baseItem.bankName || "",
                bankNumber: live.bankNumber || baseItem.bankNumber || "",
                bankOwner: live.bankOwner || baseItem.bankOwner || "",
                lpjNominal: live.lpjNominal !== undefined && live.lpjNominal !== "" ? live.lpjNominal : baseItem.lpjNominal,
                readyForLPJ: live.readyForLPJ !== undefined ? Boolean(live.readyForLPJ) : Boolean(baseItem.readyForLPJ),
              }
            : { ...baseItem }

          const cleanFullName = String(merged.fullName || "").trim()
          const cleanNik = String(merged.nik || "").trim()
          const cleanBankNum = String(merged.bankNumber || "").trim()
          const cleanBankOwner = String(merged.bankOwner || "").trim()

          if (cleanFullName && cleanBankNum) {
            // Pastikan nama pemilik rekening selalu sama dengan nama pelaku usaha
            if (cleanBankOwner.toUpperCase() !== cleanFullName.toUpperCase()) {
              syncUpdates[`businessActors/${id}/bankOwner`] = cleanFullName
              syncUpdates[`settings/actors_search/${id}/bankOwner`] = cleanFullName
              syncUpdates[`settings/report_index/actors/${id}/bankOwner`] = cleanFullName
              syncUpdates[`settings/report_index/actors/${id}/fullName`] = cleanFullName
            }
            merged.fullName = cleanFullName
            merged.bankOwner = cleanFullName
          }

          if (cleanNik) {
            merged.nik = cleanNik
          }

          // Auto-heal semua field yang berubah (NIK, Nama, TTL, JK, Alamat, Usaha, Rekening) di settings/report_index
          if (live && baseItem && live !== baseItem) {
            const syncFields = [
              "fullName", "nik", "noKK", "pob", "dob", "pobDob", "gender",
              "phone", "address", "rtRw", "kelurahan", "kecamatan",
              "businessName", "businessCategory", "businessLocation",
              "coordinator", "petugasSurvey", "verifikatorDinas",
              "bankName", "bankNumber", "bankOwner", "status",
            ]
            for (const f of syncFields) {
              const oldVal = String(baseItem[f] || "").trim()
              const newVal = String((merged as any)[f] || "").trim()
              if (newVal !== "" && oldVal !== newVal) {
                syncUpdates[`settings/report_index/actors/${id}/${f}`] = newVal
              }
            }
          }

          return {
            ...merged,
            id,
            bpjsResolved: resolveBpjsForActor(merged, emptyBpjsMap),
          }
        }

        // Priority 1: Lightweight pre-built full index (`settings/report_index`) overlaid with live `settings/actors_search`
        if (reportIdxSnap && reportIdxSnap.exists()) {
          const val = reportIdxSnap.val() || {}
          const rawMap = val.actors || val
          if (rawMap && typeof rawMap === "object") {
            const list: ReportActor[] = []
            const seenIds = new Set<string>()
            for (const [id, item] of Object.entries(rawMap as Record<string, any>)) {
              if (!item || typeof item !== "object" || (!item.fullName && !item.nik)) continue
              seenIds.add(id)
              list.push(mergeLiveSearchOverlay(id, item))
            }
            // Include any new verified actors present in actors_search but not yet in report_index
            for (const [id, liveItem] of Object.entries(searchValMap)) {
              if (seenIds.has(id) || !liveItem || typeof liveItem !== "object" || (!liveItem.fullName && !liveItem.nik)) continue
              list.push(mergeLiveSearchOverlay(id, liveItem))
            }
            if (list.length > 0) {
              loadedActors = list
              loadedFromFullIndex = true
              loadedTime = val.updatedAt || loadedTime
              const updatedMs = val.updatedAt ? new Date(val.updatedAt).getTime() : 0
              isIndexStale = !updatedMs || Date.now() - updatedMs > REPORT_INDEX_STALE_MS
            }
          }
        }

        // Priority 2: Fallback to lightweight `settings/actors_search` (< 150ms)
        if (loadedActors.length === 0 && Object.keys(searchValMap).length > 0) {
          const list: ReportActor[] = []
          for (const [id, item] of Object.entries(searchValMap)) {
            if (!item || typeof item !== "object" || (!item.fullName && !item.nik)) continue
            list.push(mergeLiveSearchOverlay(id, item))
          }
          loadedActors = list
          loadedFromFullIndex = false
          isIndexStale = true
        }

        // Admin auto-heal: sinkronkan otomatis bankOwner & report_index yang belum sama dengan fullName
        if (isAdmin && Object.keys(syncUpdates).length > 0) {
          update(ref(database), syncUpdates).catch(() => {})
        }

        // Render immediately without waiting for BPJS node!
        if (loadedActors.length > 0) {
          setActors(loadedActors)
          setGeneratedAt(loadedTime)
          setIsFullIndex(loadedFromFullIndex)
          setIsLoadingData(false)
        }

        // Step B: Merge BPJS comparison data as soon as it resolves
        const [settingsBpjsSnap, rootBpjsSnap] = await bpjsPromise
        const bpjsMap = buildBpjsLookupMap(
          settingsBpjsSnap?.exists() ? settingsBpjsSnap.val() : null,
          rootBpjsSnap?.exists() ? rootBpjsSnap.val() : null
        )

        if (loadedActors.length > 0) {
          const bpjsSheetIsEmpty = bpjsMap.size === 0
          const enrichedActors = loadedActors.map((item) => ({
            ...item,
            bpjsResolved: resolveBpjsForActor(item, bpjsMap, true),
          }))
          setActors(enrichedActors)
          setToIDB(IDB_CACHE_KEY, {
            actors: enrichedActors,
            systemUsers: parsedUsers,
            generatedAt: loadedTime,
            isFullIndex: loadedFromFullIndex,
          })

          // Jika Sheet 5 BPJS kosong (di-reset) namun masih ada sisa field bpjs lama, bersihkan otomatis oleh Admin
          if (isAdmin && bpjsSheetIsEmpty) {
            const hasStaleBpjs = loadedActors.some(
              (a: any) => a && (a.bpjsSubmissionStatus || a.bpjsCheckStatus || a.bpjsStatus || a.bpjsKeterangan || a.bpjsCheckNote || a.bpjsKpj)
            )
            if (hasStaleBpjs) {
              import("@/lib/stats-service").then(({ purgeAllBpjsDataFromActors }) => {
                purgeAllBpjsDataFromActors(database).catch(() => {})
              })
            }
          }
        } else {
          // Neither lightweight index exists yet -> fall back to full API build
          await syncFullMasterIndex(false)
        }

        if (isManualRefresh) {
          const verifiedCount = loadedActors.filter(isVerifiedWithBank).length
          toast({
            title: "Data Diperbarui",
            description: `${verifiedCount.toLocaleString("id-ID")} data pelaku usaha terverifikasi siap diunduh.`,
          })
        }

        // Non-blocking background sync to build/refresh full index (pending/rejected/timestamps)
        if ((!loadedFromFullIndex || isIndexStale) && !hasTriggeredBgSyncRef.current) {
          hasTriggeredBgSyncRef.current = true
          syncFullMasterIndex(false)
        }
      } catch (err: any) {
        console.error("Fast report load failed:", err)
        setLoadError(err?.message || "Gagal memuat data laporan.")
      } finally {
        setIsLoadingData(false)
        setIsRefreshing(false)
      }
    },
    [database, isAdmin, syncFullMasterIndex, toast]
  )

  useEffect(() => {
    if (!user || !isAllowed) return
    let mounted = true

    // 1. 0ms Instant Hydration from IndexedDB
    getFromIDB(IDB_CACHE_KEY).then((cached) => {
      if (!mounted || !cached) return
      if (Array.isArray(cached.actors) && cached.actors.length > 0) {
        setActors(cached.actors)
        if (Array.isArray(cached.systemUsers)) setSystemUsers(cached.systemUsers)
        if (cached.generatedAt) setGeneratedAt(cached.generatedAt)
        setIsFullIndex(Boolean(cached.isFullIndex))
        setIsLoadingData(false)
      }
    })

    // 2. < 250ms Direct Firebase RTDB Lightweight Fetch
    if (database) {
      loadFastData(false)
    }

    return () => {
      mounted = false
    }
  }, [user, isAllowed, database, loadFastData])

  // Hanya menampilkan dan mencetak pelaku usaha terverifikasi yang rekeningnya sudah terinput
  const verifiedActors = useMemo(() => {
    return actors.filter(isVerifiedWithBank)
  }, [actors])

  // Unique coordinators & kecamatan for global filters
  const coordinatorOptions = useMemo(() => {
    const setVals = new Set<string>()
    verifiedActors.forEach((a) => {
      const c = String(a.coordinator || "TANPA KOORDINATOR").toUpperCase().trim()
      if (c) setVals.add(c)
    })
    return Array.from(setVals).sort((a, b) => a.localeCompare(b))
  }, [verifiedActors])

  const kecamatanOptions = useMemo(() => {
    const setVals = new Set<string>()
    verifiedActors.forEach((a) => {
      const k = String(a.kecamatan || "").toUpperCase().trim()
      if (k && k !== "-") setVals.add(k)
    })
    return Array.from(setVals).sort((a, b) => a.localeCompare(b))
  }, [verifiedActors])

  const bankOptions = useMemo(() => {
    const map = new Map<string, number>()
    verifiedActors.forEach((a) => {
      const b = normalizeBankForFilter(a.bankName) || "LAINNYA"
      map.set(b, (map.get(b) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [verifiedActors])

  // Apply global filters (Coordinator & Kecamatan) for Excel reports
  const globalFilteredActors = useMemo(() => {
    return verifiedActors.filter((a) => {
      if (selectedCoordinator !== "ALL") {
        const c = String(a.coordinator || "TANPA KOORDINATOR").toUpperCase().trim()
        if (c !== selectedCoordinator) return false
      }
      if (selectedKecamatan !== "ALL") {
        const k = String(a.kecamatan || "").toUpperCase().trim()
        if (k !== selectedKecamatan) return false
      }
      return true
    })
  }, [verifiedActors, selectedCoordinator, selectedKecamatan])

  // Datasets per report (semua khusus pelaku usaha terverifikasi yang rekeningnya terinput)
  const dinasDataset = globalFilteredActors

  const rekeningDataset = useMemo(() => {
    return globalFilteredActors.filter((a) => {
      if (selectedBank !== "ALL") {
        const b = normalizeBankForFilter(a.bankName) || "LAINNYA"
        if (b !== selectedBank) return false
      }
      return true
    })
  }, [globalFilteredActors, selectedBank])

  const pelakuUsahaDataset = globalFilteredActors

  // Berkas Pencairan per Koordinator (terverifikasi & rekening terinput)
  const berkasCoordinators = useMemo(() => {
    const map = new Map<string, ReportActor[]>()
    verifiedActors.forEach((a) => {
      const cName = String(a.coordinator || "TANPA KOORDINATOR").toUpperCase().trim()
      if (!map.has(cName)) map.set(cName, [])
      map.get(cName)!.push(a)
    })

    return Array.from(map.entries())
      .map(([name, list]) => ({
        name,
        count: list.length,
        totalPages: list.length * 5,
        actors: [...list].sort((x, y) =>
          String(x.fullName || "").localeCompare(String(y.fullName || ""))
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [verifiedActors])

  const filteredBerkasCoordinators = useMemo(() => {
    const q = coordSearch.toLowerCase().trim()
    if (!q) return berkasCoordinators
    return berkasCoordinators.filter((c) => c.name.toLowerCase().includes(q))
  }, [berkasCoordinators, coordSearch])

  const totalBerkasActors = useMemo(
    () => berkasCoordinators.reduce((sum, c) => sum + c.count, 0),
    [berkasCoordinators]
  )

  const bpjsVerifiedCount = useMemo(
    () => verifiedActors.filter((a) => a.bpjsResolved?.hasMatch).length,
    [verifiedActors]
  )

  const buildFilterLabel = (extra?: string) => {
    const parts: string[] = []
    if (selectedCoordinator !== "ALL") parts.push(`Koordinator: ${selectedCoordinator}`)
    if (selectedKecamatan !== "ALL") parts.push(`Kecamatan: ${selectedKecamatan}`)
    if (extra) parts.push(extra)
    return parts.length > 0 ? parts.join(" • ") : "Semua Data"
  }

  // ── Export Handlers ────────────────────────────────────────────────────────
  const handleDownloadReportDinas = async () => {
    if (dinasDataset.length === 0) {
      toast({ variant: "destructive", title: "Data Kosong", description: "Tidak ada data untuk Report Dinas pada filter ini." })
      return
    }
    try {
      setExportingKey("dinas")
      setExportProgress("Memuat Foto Survey...")
      toast({ title: "Menyusun Report Dinas...", description: `Memuat foto survey & menyusun ${dinasDataset.length.toLocaleString("id-ID")} data ke dalam 1 lembar Excel rapi.` })
      const { exportReportDinasExcel } = await import("@/lib/report-excel-generator")
      await exportReportDinasExcel(
        dinasDataset,
        systemUsers,
        buildFilterLabel("Terverifikasi & Rekening Terinput"),
        {
          database,
          onProgress: (stage, done, total) => {
            if (stage === "photos" && total) {
              setExportProgress(`Memuat Foto ${done}/${total}...`)
            } else {
              setExportProgress("Menyusun File Excel...")
            }
          },
        }
      )
      logActivity({
        query: `DOWNLOAD REPORT DINAS (${dinasDataset.length} data)`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: "Web",
        method: "REPORT DINAS",
        userId: user?.email || user?.uid || "Admin",
      })
      toast({
        title: "Report Dinas Berhasil Diunduh",
        description: `${dinasDataset.length.toLocaleString("id-ID")} data beserta foto survey telah dicetak dalam 1 lembar Excel yang rapi.`,
      })
    } catch (err: any) {
      console.error("Export Report Dinas error:", err)
      toast({ variant: "destructive", title: "Gagal Export Report Dinas", description: err?.message || "Terjadi kesalahan saat membuat Excel." })
    } finally {
      setExportingKey(null)
      setExportProgress("")
    }
  }

  const handleDownloadReportRekening = async () => {
    if (rekeningDataset.length === 0) {
      toast({ variant: "destructive", title: "Data Kosong", description: "Tidak ada data untuk Report Rekening pada filter ini." })
      return
    }
    try {
      setExportingKey("rekening")
      toast({ title: "Menyusun Report Rekening...", description: `Memproses ${rekeningDataset.length.toLocaleString("id-ID")} data rekening ke dalam 1 lembar Excel rapi.` })
      const { exportReportRekeningExcel } = await import("@/lib/report-excel-generator")
      const bankLabel = selectedBank !== "ALL" ? `Bank: ${selectedBank}` : undefined
      await exportReportRekeningExcel(
        rekeningDataset,
        buildFilterLabel(["Terverifikasi & Rekening Terinput", bankLabel].filter(Boolean).join(" • "))
      )
      logActivity({
        query: `DOWNLOAD REPORT REKENING (${rekeningDataset.length} data)`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: "Web",
        method: "REPORT REKENING",
        userId: user?.email || user?.uid || "Admin",
      })
      toast({
        title: "Report Rekening Berhasil Diunduh",
        description: `${rekeningDataset.length.toLocaleString("id-ID")} data rekening berhasil diekspor dalam 1 lembar Excel.`,
      })
    } catch (err: any) {
      console.error("Export Report Rekening error:", err)
      toast({ variant: "destructive", title: "Gagal Export Report Rekening", description: err?.message || "Terjadi kesalahan saat membuat Excel." })
    } finally {
      setExportingKey(null)
    }
  }

  const handleDownloadReportPelakuUsaha = async () => {
    if (pelakuUsahaDataset.length === 0) {
      toast({ variant: "destructive", title: "Data Kosong", description: "Tidak ada data pelaku usaha untuk diekspor." })
      return
    }
    try {
      setExportingKey("pelaku_usaha")
      setExportProgress("Memuat Foto Survey...")
      toast({
        title: "Menyusun Report Pelaku Usaha Lengkap...",
        description: `Memuat foto survey & menggabungkan ${pelakuUsahaDataset.length.toLocaleString("id-ID")} data (Biodata, Survey Dinas, BPJS & Rekening) dalam 1 lembar Excel.`,
      })
      const { exportReportPelakuUsahaExcel } = await import("@/lib/report-excel-generator")
      await exportReportPelakuUsahaExcel(
        pelakuUsahaDataset,
        systemUsers,
        buildFilterLabel("Terverifikasi & Rekening Terinput + BPJS"),
        {
          database,
          onProgress: (stage, done, total) => {
            if (stage === "photos" && total) {
              setExportProgress(`Memuat Foto ${done}/${total}...`)
            } else {
              setExportProgress("Menyusun File Excel...")
            }
          },
        }
      )
      logActivity({
        query: `DOWNLOAD REPORT PELAKU USAHA LENGKAP (${pelakuUsahaDataset.length} data)`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: "Web",
        method: "REPORT PELAKU USAHA",
        userId: user?.email || user?.uid || "Admin",
      })
      toast({
        title: "Report Pelaku Usaha Berhasil Diunduh",
        description: `${pelakuUsahaDataset.length.toLocaleString("id-ID")} data lengkap (termasuk Foto Survey, Rekening & BPJS) tercetak dalam 1 lembar Excel.`,
      })
    } catch (err: any) {
      console.error("Export Report Pelaku Usaha error:", err)
      toast({ variant: "destructive", title: "Gagal Export Report Pelaku Usaha", description: err?.message || "Terjadi kesalahan saat membuat Excel." })
    } finally {
      setExportingKey(null)
      setExportProgress("")
    }
  }

  const handleDownloadBerkasPencairan = async (targetActors: ReportActor[], coordinatorName: string, keyId: string) => {
    if (!targetActors || targetActors.length === 0) {
      toast({ variant: "destructive", title: "Data Kosong", description: "Tidak ada berkas pencairan siap cetak." })
      return
    }
    try {
      setExportingKey(keyId)
      const totalPages = targetActors.length * 5
      toast({
        title: "Menyusun PDF Berkas Pencairan...",
        description: `Koordinator ${coordinatorName}: ${targetActors.length} pelaku usaha (${totalPages} halaman — Kuitansi x2, Surat Pernyataan x2, LPJ x1).`,
      })
      const { generateBerkasPencairanRangkapBulk } = await import("@/lib/pdf-generator")
      const cleanName = coordinatorName.replace(/[^a-z0-9]/gi, "_").toUpperCase()
      const filename = `REPORT_BERKAS_PENCAIRAN_${cleanName}_RANGKAP2_(${targetActors.length}_DATA).pdf`
      generateBerkasPencairanRangkapBulk(targetActors, filename, berkasLayout)

      logActivity({
        query: `REPORT BERKAS PENCAIRAN KOORDINATOR ${coordinatorName} (${targetActors.length} data, ${totalPages} hal)`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: "Web",
        method: "REPORT BERKAS PENCAIRAN",
        userId: user?.email || user?.uid || "Admin",
      })

      toast({
        title: "PDF Berkas Pencairan Siap",
        description: `${targetActors.length} pelaku usaha (${totalPages} halaman) untuk Koordinator ${coordinatorName} telah diunduh.`,
      })
    } catch (err: any) {
      console.error("Export Report Berkas Pencairan error:", err)
      toast({ variant: "destructive", title: "Gagal Membuat PDF", description: err?.message || "Terjadi kesalahan saat menyusun PDF." })
    } finally {
      setTimeout(() => setExportingKey(null), 800)
    }
  }

  if (isUserLoading || isProfileLoading || isAdminLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  if (!isAllowed) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white">Akses Terbatas</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Menu Report hanya tersedia untuk Petugas / Staff / Dinas / Monitoring / Administrator.
        </p>
      </div>
    )
  }

  const hasActiveGlobalFilter = selectedCoordinator !== "ALL" || selectedKecamatan !== "ALL"

  return (
    <div className="p-3 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-400">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25 shrink-0">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight uppercase text-slate-900 dark:text-white leading-none">
                Report
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Pusat Download Report Pelaku Usaha Terverifikasi & Rekening Terinput (Excel 1 Lembar Rapi & PDF Berkas Pencairan Rangkap 2)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {isSyncingFull ? (
            <Badge
              variant="outline"
              className="h-9 px-3 rounded-xl bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800 text-[11px] font-bold text-sky-700 dark:text-sky-300 gap-1.5"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Melengkapi Indeks Penuh...
            </Badge>
          ) : generatedAt && !isLoadingData ? (
            <Badge
              variant="outline"
              className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {isFullIndex ? "Data Penuh" : "Indeks Cepat"} • {formatDateTimeIndo(generatedAt)}
            </Badge>
          ) : null}

          <Button
            type="button"
            variant="outline"
            onClick={() => loadFastData(true)}
            disabled={isLoadingData || isRefreshing}
            className="h-9 px-3.5 rounded-xl font-bold text-xs gap-1.5 border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isLoadingData || isRefreshing) && "animate-spin")} />
            Segarkan
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => syncFullMasterIndex(true)}
            disabled={isSyncingFull}
            className="h-9 px-3.5 rounded-xl font-bold text-xs gap-1.5 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            title="Sinkronkan ulang seluruh data master termasuk status Pending/Ditolak & waktu verifikasi dinas terbaru"
          >
            <Database className={cn("w-3.5 h-3.5", isSyncingFull && "animate-pulse")} />
            Sinkron Penuh
          </Button>
        </div>
      </div>

      {/* ── ERROR BANNER ────────────────────────────────────────────────────── */}
      {loadError && (
        <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs sm:text-sm font-bold">{loadError}</p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => loadFastData(true)} className="rounded-xl text-xs font-bold">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── KPI SUMMARY STRIP ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Pelaku Usaha Terverifikasi",
            value: verifiedActors.length,
            sub: "Rekening Terinput & Siap Report",
            icon: Users,
            color: "text-sky-600 dark:text-sky-400",
            bg: "bg-sky-50 dark:bg-sky-950/40",
            border: "border-sky-100 dark:border-sky-900/50",
          },
          {
            label: "Terdata BPJS",
            value: bpjsVerifiedCount,
            sub: "Hasil Verifikasi BPJS Ketenagakerjaan",
            icon: ShieldCheck,
            color: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-950/40",
            border: "border-purple-100 dark:border-purple-900/50",
          },
          {
            label: "Rekening Terinput",
            value: verifiedActors.length,
            sub: `${bankOptions.length} Bank Terdaftar`,
            icon: CreditCard,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950/40",
            border: "border-emerald-100 dark:border-emerald-900/50",
          },
          {
            label: "Berkas Pencairan",
            value: totalBerkasActors,
            sub: `${berkasCoordinators.length} Koordinator • ${(totalBerkasActors * 5).toLocaleString("id-ID")} Hal`,
            icon: Printer,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950/40",
            border: "border-amber-100 dark:border-amber-900/50",
          },
        ].map((kpi) => (
          <Card key={kpi.label} className={cn("rounded-2xl shadow-sm border", kpi.border)}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={cn("p-2.5 rounded-xl shrink-0", kpi.bg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                  {kpi.label}
                </p>
                {isLoadingData ? (
                  <Skeleton className="h-7 w-20 mt-1 rounded-md" />
                ) : (
                  <p className={cn("text-xl sm:text-2xl font-black leading-tight mt-0.5 tabular-nums", kpi.color)}>
                    {kpi.value.toLocaleString("id-ID")}
                  </p>
                )}
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {kpi.sub}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── GLOBAL FILTER BAR FOR EXCEL REPORTS ─────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shadow-xs">
        <CardContent className="p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            <Filter className="w-4 h-4 text-primary shrink-0" />
            <span>Filter Export Excel (Opsional)</span>
            {hasActiveGlobalFilter && (
              <Badge className="bg-primary/15 text-primary border-none text-[10px] font-black">
                {globalFilteredActors.length.toLocaleString("id-ID")} Data Terpilih
              </Badge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="w-full sm:w-56">
              <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator}>
                <SelectTrigger className="h-9 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold">
                  <SelectValue placeholder="Semua Koordinator" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL" className="text-xs font-bold">
                    Semua Koordinator ({coordinatorOptions.length})
                  </SelectItem>
                  {coordinatorOptions.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs font-semibold">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-52">
              <Select value={selectedKecamatan} onValueChange={setSelectedKecamatan}>
                <SelectTrigger className="h-9 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold">
                  <SelectValue placeholder="Semua Kecamatan" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL" className="text-xs font-bold">
                    Semua Kecamatan
                  </SelectItem>
                  {kecamatanOptions.map((k) => (
                    <SelectItem key={k} value={k} className="text-xs font-semibold">
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveGlobalFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCoordinator("ALL")
                  setSelectedKecamatan("ALL")
                }}
                className="h-9 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 1: 3 LAPORAN EXPORT EXCEL (1 LEMBAR RAPI) ───────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Laporan Excel (1 Lembar Rapi)
          </h2>
          <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
            Format .xlsx • AutoFilter • Teks NIK/Rekening Utuh
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* ── CARD 1: REPORT DINAS ── */}
          <Card className="rounded-3xl border border-purple-200/80 dark:border-purple-900/60 shadow-md hover:shadow-lg transition-all flex flex-col overflow-hidden bg-white dark:bg-slate-900">
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-500" />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200 border border-purple-200 dark:border-purple-800 font-black text-[10px]">
                  EXCEL • 1 LEMBAR
                </Badge>
              </div>
              <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white pt-2">
                Report Dinas
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                Data pelaku usaha lengkap, proses & hasil survey lapangan, petugas survey, petugas verifikator sampai dengan waktu diverifikasi oleh dinas.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4 pt-0">
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Biodata & Alamat Pelaku Usaha Lengkap</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Proses, Hasil & Fhoto Survey Tercetak di Kolom</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Petugas Survey & Verifikator (+ NIP/NIPPPK)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Waktu Submit Survey & Waktu Verifikasi Dinas</span>
                  </div>
                </div>

                <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Cakupan Data</span>
                  <span className="font-black text-purple-600 dark:text-purple-400">
                    Terverifikasi & Ada Rekening
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Siap di-export</span>
                  <span className="font-black text-purple-700 dark:text-purple-300 tabular-nums">
                    {isLoadingData ? "..." : `${dinasDataset.length.toLocaleString("id-ID")} Baris`}
                  </span>
                </div>
                <Button
                  onClick={handleDownloadReportDinas}
                  disabled={isLoadingData || exportingKey !== null || dinasDataset.length === 0}
                  className="w-full h-11 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider gap-2 shadow-md shadow-purple-600/20"
                >
                  {exportingKey === "dinas" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exportingKey === "dinas" && exportProgress ? exportProgress : "Download Report Dinas"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── CARD 2: REPORT REKENING ── */}
          <Card className="rounded-3xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-md hover:shadow-lg transition-all flex flex-col overflow-hidden bg-white dark:bg-slate-900">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-green-500" />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <CreditCard className="w-6 h-6" />
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 font-black text-[10px]">
                  EXCEL • 1 LEMBAR
                </Badge>
              </div>
              <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white pt-2">
                Report Rekening
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                Semua data pelaku usaha lengkap sampai dengan data rekening bank (Nama Pemilik Rekening, Nomor Rekening, Nama Bank) dalam 1 lembar rapi.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4 pt-0">
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Data Pelaku Usaha, Usaha & Koordinator Lengkap</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Nama Bank, Nomor Rekening & Pemilik Rekening</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Nomor Rekening & NIK Format Teks (Anti Rusak)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Status LPJ, Nominal LPJ & Tanggal Entry LPJ</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Filter Bank (Opsional)
                  </label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger className="h-9 rounded-xl text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="ALL" className="text-xs font-bold">
                        Semua Bank ({globalFilteredActors.length.toLocaleString("id-ID")})
                      </SelectItem>
                      {bankOptions.map(([bankName, count]) => (
                        <SelectItem key={bankName} value={bankName} className="text-xs font-semibold">
                          {bankName} ({count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Siap di-export</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {isLoadingData ? "..." : `${rekeningDataset.length.toLocaleString("id-ID")} Baris`}
                  </span>
                </div>
                <Button
                  onClick={handleDownloadReportRekening}
                  disabled={isLoadingData || exportingKey !== null || rekeningDataset.length === 0}
                  className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider gap-2 shadow-md shadow-emerald-600/20"
                >
                  {exportingKey === "rekening" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download Report Rekening
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── CARD 3: REPORT PELAKU USAHA (MASTER ALL DATA + BPJS) ── */}
          <Card className="rounded-3xl border border-sky-200/80 dark:border-sky-900/60 shadow-md hover:shadow-lg transition-all flex flex-col overflow-hidden bg-white dark:bg-slate-900">
            <div className="h-1.5 w-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600" />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="p-2.5 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                  <Sparkles className="w-6 h-6" />
                </div>
                <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200 border border-sky-200 dark:border-sky-800 font-black text-[10px]">
                  TERVERIFIKASI • 1 LEMBAR
                </Badge>
              </div>
              <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white pt-2">
                Report Pelaku Usaha
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                Seluruh data pelaku usaha terverifikasi (rekening terinput): Gabungan Report Dinas + Report Rekening + Hasil Verifikasi BPJS Ketenagakerjaan dalam 1 lembar rapi.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4 pt-0">
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Khusus Pelaku Usaha Terverifikasi & Rekening Terinput</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Lengkap: Biodata, KK, Usaha, Survey & Fhoto Survey</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Termasuk Hasil Verifikasi BPJS Ketenagakerjaan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Lengkap: Data Rekening Bank, LPJ & Header Berwarna</span>
                  </div>
                </div>

                <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Terverifikasi BPJS</span>
                  <span className="font-black text-teal-600 dark:text-teal-400 tabular-nums">
                    {isLoadingData
                      ? "..."
                      : `${pelakuUsahaDataset.filter((a) => a.bpjsResolved?.hasMatch).length.toLocaleString("id-ID")} Data`}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Siap di-export (65 Kolom)</span>
                  <span className="font-black text-sky-700 dark:text-sky-300 tabular-nums">
                    {isLoadingData ? "..." : `${pelakuUsahaDataset.length.toLocaleString("id-ID")} Baris`}
                  </span>
                </div>
                <Button
                  onClick={handleDownloadReportPelakuUsaha}
                  disabled={isLoadingData || exportingKey !== null || pelakuUsahaDataset.length === 0}
                  className="w-full h-11 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs uppercase tracking-wider gap-2 shadow-md shadow-sky-600/20"
                >
                  {exportingKey === "pelaku_usaha" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exportingKey === "pelaku_usaha" && exportProgress ? exportProgress : "Download Report Pelaku Usaha"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SECTION 2: REPORT BERKAS PENCAIRAN (PER KOORDINATOR • RANGKAP 2) ── */}
      <Card className="rounded-3xl border border-amber-200/80 dark:border-amber-900/60 shadow-lg overflow-hidden bg-white dark:bg-slate-900">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50/70 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
                <FileDown className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Report Berkas Pencairan (Per Koordinator)
                  </CardTitle>
                  <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-black text-[10px]">
                    PDF • RANGKAP 2
                  </Badge>
                </div>
                <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Setiap pelaku usaha dicetak otomatis sebanyak <strong className="text-slate-900 dark:text-white">5 halaman</strong>: Halaman 1 (Kuitansi) <strong className="text-amber-700 dark:text-amber-300">Rangkap 2</strong>, Halaman 2 (Surat Pernyataan) <strong className="text-amber-700 dark:text-amber-300">Rangkap 2</strong>, dan Halaman 3 (LPJ) <strong className="text-emerald-700 dark:text-emerald-300">1 Lembar</strong>.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              {/* Susunan Halaman Selector */}
              <Select value={berkasLayout} onValueChange={(v) => setBerkasLayout(v as BerkasRangkapLayout)}>
                <SelectTrigger className="h-10 sm:w-64 rounded-xl bg-white dark:bg-slate-950 text-xs font-bold border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paired" className="text-xs font-semibold">
                    Per Set: [Kuitansi + SP] x2 → LPJ x1
                  </SelectItem>
                  <SelectItem value="grouped" className="text-xs font-semibold">
                    Per Jenis: Kuitansi x2 → SP x2 → LPJ x1
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Search Koordinator */}
              <div className="relative sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Cari nama koordinator..."
                  value={coordSearch}
                  onChange={(e) => setCoordSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-950 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Visual 5-page breakdown bar */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800">
              <FileText className="w-3.5 h-3.5" />
              Hal 1: Kuitansi (×2 Lembar)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-100/80 dark:bg-orange-950/50 text-orange-900 dark:text-orange-200 border border-orange-200/80 dark:border-orange-800">
              <FileText className="w-3.5 h-3.5" />
              Hal 2: Surat Pernyataan (×2 Lembar)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800">
              <FileText className="w-3.5 h-3.5" />
              Hal 3: LPJ (×1 Lembar)
            </span>
            <span className="ml-auto text-slate-500 dark:text-slate-400 font-extrabold">
              {berkasCoordinators.length} Koordinator • {totalBerkasActors.toLocaleString("id-ID")} Pelaku Usaha Siap Cetak
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {isLoadingData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <Skeleton className="h-5 w-40 rounded" />
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredBerkasCoordinators.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-black uppercase text-slate-600 dark:text-slate-300">
                Tidak Ada Koordinator Ditemukan
              </p>
              <p className="text-xs text-slate-400">
                {coordSearch
                  ? "Coba kata kunci nama koordinator yang berbeda."
                  : "Belum ada pelaku usaha berstatus selesai dengan rekening bank lengkap."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredBerkasCoordinators.map((coord) => {
                const keyId = `berkas_${coord.name}`
                const isExportingThis = exportingKey === keyId
                return (
                  <div
                    key={coord.name}
                    className="group p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-900 hover:border-amber-400/80 dark:hover:border-amber-700 hover:shadow-md transition-all flex flex-col justify-between gap-3.5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <h3 className="font-black text-xs sm:text-sm uppercase text-slate-900 dark:text-white leading-tight truncate" title={coord.name}>
                            {coord.name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-black bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-none"
                        >
                          {coord.count} Pelaku Usaha
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        >
                          {coord.totalPages} Halaman PDF
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2.5 border-t border-slate-200/70 dark:border-slate-800">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewCoord({ name: coord.name, actors: coord.actors })}
                        className="h-9 px-3 rounded-xl text-[11px] font-bold gap-1.5 shrink-0"
                        title="Lihat daftar pelaku usaha"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Daftar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={exportingKey !== null}
                        onClick={() => handleDownloadBerkasPencairan(coord.actors, coord.name, keyId)}
                        className="flex-1 h-9 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black uppercase tracking-wide gap-1.5 shadow-sm"
                      >
                        {isExportingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Printer className="w-3.5 h-3.5" />
                        )}
                        Download PDF
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MODAL PREVIEW DAFTAR PELAKU USAHA PER KOORDINATOR ───────────────── */}
      <Dialog open={!!previewCoord} onOpenChange={(open) => !open && setPreviewCoord(null)}>
        <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-5 sm:p-6 pb-4 bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800">
            <DialogTitle className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              Koordinator: {previewCoord?.name}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500">
              {previewCoord?.actors.length || 0} Pelaku Usaha siap cetak • Total {(previewCoord?.actors.length || 0) * 5} Halaman PDF (2x Kuitansi, 2x Surat Pernyataan, 1x LPJ per orang)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center text-[10px] font-black uppercase">No</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Nama Lengkap</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">NIK</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Rekening Bank</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase">Cetak Satuan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewCoord?.actors.map((actor, idx) => {
                  const singleKey = `single_${actor.id}`
                  return (
                    <TableRow key={actor.id}>
                      <TableCell className="text-center text-xs font-bold text-slate-400">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-xs uppercase text-slate-900 dark:text-white">
                          {actor.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">
                          {actor.businessName || actor.businessCategory || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-300">
                        {actor.nik || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                          {actor.bankNumber}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">
                          {actor.bankName || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={exportingKey !== null}
                          onClick={() =>
                            handleDownloadBerkasPencairan(
                              [actor],
                              `${actor.fullName || "PELAKU_USAHA"}`,
                              singleKey
                            )
                          }
                          className="h-7 px-2.5 text-[10px] font-black uppercase rounded-lg gap-1"
                        >
                          {exportingKey === singleKey ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Printer className="w-3 h-3" />
                          )}
                          5 Hal
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewCoord(null)} className="rounded-xl font-bold text-xs">
              Tutup
            </Button>
            {previewCoord && (
              <Button
                size="sm"
                disabled={exportingKey !== null}
                onClick={() =>
                  handleDownloadBerkasPencairan(
                    previewCoord.actors,
                    previewCoord.name,
                    `berkas_${previewCoord.name}`
                  )
                }
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase gap-1.5"
              >
                {exportingKey === `berkas_${previewCoord.name}` ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Printer className="w-3.5 h-3.5" />
                )}
                Download Semua ({previewCoord.actors.length * 5} Halaman)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
