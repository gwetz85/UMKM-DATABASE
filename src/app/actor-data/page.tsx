
"use client"

import { useState, useEffect, Suspense, useMemo, useRef } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject, deleteDocumentNonBlocking } from "@/firebase"
import { ref, query, equalTo, limitToFirst, orderByChild, startAt, get } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Printer, Edit3, Loader2, Save, Trash2, Eye, User, CreditCard, History, X, RotateCcw, Building2, MapPin, CheckCircle2, Store, Search, ChevronRight, FileSpreadsheet, ArrowLeft, BarChart3, RefreshCw, ClipboardCheck, Send, Folder, MessageCircle, ClipboardList, Camera } from "lucide-react"
import * as XLSX from "xlsx"

import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { BusinessActor } from "../lib/types"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckDataIndicator } from "@/components/check-data-indicator"
import { VerificationBadge } from "@/components/verification-badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ConfirmDialog } from "@/components/confirm-dialog"


const normalizeGender = (g: string) => {
  const val = (g || "").toLowerCase().trim();
  if (val === "l" || val === "laki-laki") return "Laki-laki";
  if (val === "p" || val === "perempuan") return "Perempuan";
  return "";
};


import { cn, extractDobFromNik, parsePobDob, calculateAge } from "@/lib/utils"
import { normalizeCoordinator } from "@/lib/coordinator-utils"
import { resolveSurveyorCanonicalName, buildSurveyorMaps } from "@/lib/surveyor-utils"
import { generateRegistrationForm, generateCoordinatorReport, generateAllCoordinatorsReport } from "@/lib/pdf-generator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const BANK_LIST = [
  "BCA", "BNI", "BRI", "BRK", "MANDIRI", "BSI", "BTN", "OCBC", "PANIN", "MUAMALAT", "MAYBANK", "BUKOPIN", "DANAMON", "PERMATA"
]


function ActorDataContent() {
  const { user, userProfile, isProfileLoading } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterCoordinator = searchParams.get('coordinator')
  
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [printDate, setPrintDate] = useState<string>("")
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || "")
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "")
  const viewId = searchParams.get('viewId')

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('id-ID'))
  }, [])

  useEffect(() => {
    setPageLimit(50)
  }, [searchQuery, filterCoordinator])

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isMonitoring = userProfile?.role === 'monitoring'
  const isKoordinator = userProfile?.role === 'koordinator'
  const isInspektorat = userProfile?.role === 'inspektorat'
  const isPetugas = userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas'
  const isStaff = userProfile?.role === 'staff'

  const [surveyViewActor, setSurveyViewActor] = useState<BusinessActor | null>(null)
  const [pageLimit, setPageLimit] = useState(50)
  const isSearching = Boolean(searchQuery && searchQuery.trim().length > 0)

  // Use pre-calculated stats for the overview
  const statsRef = useMemoFirebase(() => database ? ref(database, 'system_stats') : null, [database])
  const { data: systemStats, isLoading: isStatsLoading } = useObject(statsRef)

  const memoQuery = useMemoFirebase(() => {
    if (!database || isProfileLoading) return null
    
    if (isPetugas && userProfile?.fullName) {
      return query(ref(database, 'businessActors'), orderByChild('petugasSurvey'), equalTo(userProfile.fullName.toUpperCase().trim()))
    }

    if (isKoordinator && userProfile?.fullName) {
      return query(ref(database, 'businessActors'), orderByChild('coordinator'), equalTo(userProfile.fullName.toUpperCase().trim()))
    }

    if (filterCoordinator) {
      return query(ref(database, 'businessActors'), orderByChild('coordinator'), equalTo(String(filterCoordinator).toUpperCase().trim()))
    }

    // Only load all actors when actively searching across all data or for Inspektorat
    if (isSearching || isInspektorat) {
      return ref(database, 'businessActors')
    }
    
    // Default overview for Admin / Monitoring / Staff is the Koordinator Cards grid.
    // Koordinator cards are rendered INSTANTLY (<0.1s) from systemStats & kuotaData without downloading 200MB+ of raw data!
    return null
  }, [database, isProfileLoading, isPetugas, isKoordinator, filterCoordinator, userProfile?.fullName, isSearching, isInspektorat])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  // Auxiliary data is now fetched on-demand in the detail dialog
  const [activeDetailData, setActiveDetailData] = useState<{
    data2023: any[], data2024: any[], data2025: any[], dataBlacklist: any[]
  }>({ data2023: [], data2024: [], data2025: [], dataBlacklist: [] })

  const fetchAuxData = async (actor: BusinessActor) => {
    if (!database) return;
    const checkMaster = async (path: string, nik: string) => {
      const q = query(ref(database, path), orderByChild('nik'), equalTo(nik), limitToFirst(1))
      const snap = await get(q)
      return snap.exists() ? Object.values(snap.val()) : []
    }
    // Just fetch enough to show the indicator for this actor
    const [d23, d24, d25, dBl] = await Promise.all([
      checkMaster('master_data_2023', actor.nik || ""),
      checkMaster('master_data_2024', actor.nik || ""),
      checkMaster('master_data_2025', actor.nik || ""),
      checkMaster('blacklist_data', actor.nik || "")
    ])
    setActiveDetailData({ data2023: d23, data2024: d24, data2025: d25, dataBlacklist: dBl })
  }

  const kuotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const { data: kuotaData, isLoading: isKuotaLoading } = useList<any>(kuotaRef)

  const systemUsersRef = useMemoFirebase(() => database ? ref(database, 'system_users') : null, [database])
  const { data: systemUsersRaw } = useList<any>(systemUsersRef)

  const surveyorOptions = useMemo(() => {
    if (!systemUsersRaw) return []
    const { registeredSurveyors } = buildSurveyorMaps(systemUsersRaw)
    return registeredSurveyors
  }, [systemUsersRaw])

  const availableCoordinators = useMemo(() => {
    if (!kuotaData) return []
    const achievedMap = (systemStats as any)?.coordinator || {}

    return kuotaData
      .map((q: any) => {
        const nameUpper = (q.name || "").toUpperCase().trim()
        const used = achievedMap[nameUpper] || 0
        const quota = parseInt(String(q.quota)) || 0
        const remaining = quota - used
        return {
          id: q.id,
          name: q.name?.trim() || nameUpper,
          nameUpper,
          quota,
          used,
          remaining
        }
      })
      .filter((q: any) => {
        if (!q.nameUpper) return false
        return !q.nameUpper.includes('( PERBAIKKAN )') && 
               !q.nameUpper.includes('( PERBAIKAN )') && 
               !q.nameUpper.includes('( DIHAPUS )')
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
  }, [kuotaData, systemStats])

  const actors = useMemo(() => {
    if (!allActorsRaw) return undefined;
    return allActorsRaw.filter(a => {
      if (!a) return false;
      const s = a.status || "";
      const isCancelDinas = (s === 'verified_dinas' && a.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(a.alasanCancelDinas);
      if (!['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) || isCancelDinas) return false;
      
      if (filterCoordinator) {
        const actorCoord = String(a.coordinator || "").toUpperCase().trim();
        const targetCoord = String(filterCoordinator).toUpperCase().trim();
        if (actorCoord !== targetCoord) return false;
      }

      if (isPetugas) {
        if (!userProfile?.fullName) return false;
        const userPetugasUpper = String(userProfile.fullName).toUpperCase().trim();
        const actorPetugasUpper = String(a.petugasSurvey || "").toUpperCase().trim();
        if (!actorPetugasUpper || actorPetugasUpper === "BELUM ADA" || actorPetugasUpper === "-") return false;
        return actorPetugasUpper === userPetugasUpper;
      }
      if (isKoordinator) {
        if (!a.coordinator || !userProfile?.fullName) return false;
        return String(a.coordinator).toLowerCase() === String(userProfile.fullName).toLowerCase();
      }
      return true;
    });
  }, [allActorsRaw, filterCoordinator, isPetugas, isKoordinator, userProfile?.fullName]);

  const [isEditMode, setIsEditMode] = useState(false)
  const [editingBankMode, setEditingBankMode] = useState(false)
  const [editingDriveMode, setEditingDriveMode] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [selectedExportSheets, setSelectedExportSheets] = useState<string[]>([])

  const filteredActors = useMemo(() => {
    if (!actors) return undefined;
    const lowerQuery = searchQuery.toLowerCase();
    return actors.filter(a => 
      (a.fullName || "").toLowerCase().includes(lowerQuery) ||
      (a.nik || "").includes(searchQuery) ||
      (a.businessName || "").toLowerCase().includes(lowerQuery) ||
      (a.address || "").toLowerCase().includes(lowerQuery)
    ).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  }, [actors, searchQuery]);

  const hasAutoOpened = useRef(false)

  useEffect(() => {
    if (viewId && database && !viewingActor && !hasAutoOpened.current) {
      if (actors && actors.length > 0) {
        const actorToView = actors.find(a => a.id === viewId)
        if (actorToView) {
          hasAutoOpened.current = true;
          setViewingActor(actorToView)
          fetchAuxData(actorToView)
          return
        }
      }
      // Direct point fetch if actors list isn't loaded (instant <10ms)
      get(ref(database, `businessActors/${viewId}`)).then(snap => {
        if (snap.exists()) {
          hasAutoOpened.current = true;
          const actor = { ...snap.val(), id: snap.key } as BusinessActor;
          setViewingActor(actor);
          fetchAuxData(actor);
        }
      }).catch(console.error);
    }
  }, [viewId, actors, viewingActor, database])

  const { groupedActors, globalIndexMap } = useMemo(() => {
    if (!filteredActors) return { groupedActors: {}, globalIndexMap: new Map<string, number>() }
    const sorted = [...filteredActors].sort((a, b) => {
      const coordA = String(a.coordinator || "Tanpa Koordinator");
      const coordB = String(b.coordinator || "Tanpa Koordinator");
      const coordCompare = coordA.localeCompare(coordB);
      if (coordCompare !== 0) return coordCompare;
      return String(a.fullName || "").localeCompare(String(b.fullName || ""));
    });
    
    const groups: Record<string, BusinessActor[]> = {}
    const indexMap = new Map<string, number>()
    
    sorted.forEach((actor, index) => {
      indexMap.set(actor.id, index + 1)
      const key = String(actor.coordinator || "Tanpa Koordinator").toUpperCase().trim()
      if (!groups[key]) groups[key] = []
      groups[key].push(actor)
    })
    return { groupedActors: groups, globalIndexMap: indexMap }
  }, [filteredActors])

  // Automatically select all coordinators when export dialog opens or when data finishes loading
  useEffect(() => {
    if (showExportDialog) {
      const allKeys = Object.keys(groupedActors).sort()
      if (allKeys.length > 0 && selectedExportSheets.length === 0) {
        setSelectedExportSheets(allKeys)
      }
    }
  }, [showExportDialog, groupedActors, selectedExportSheets.length])

  const coordinatorStats = useMemo(() => {
    // 1. Get all known coordinator names from kuotaData
    const allNames = new Set<string>()
    if (kuotaData) {
      kuotaData.forEach((q: any) => {
        if (q.name) allNames.add(q.name.toUpperCase().trim())
      })
    }

    // 2. Add names from live data if any (just in case they aren't in kuotaData)
    Object.keys(groupedActors).forEach(name => allNames.add(name))

    return Array.from(allNames).map(name => {
      const quotaObj = (kuotaData || []).find((q: any) => (q.name || "").toUpperCase().trim() === name)
      const quota = quotaObj?.quota || 0
      
      // Verified count is now the primary metric for quota usage (Usage = Verified)
      // Fallback to systemStats if we haven't fetched allActorsRaw
      let verifiedCount = (groupedActors[name] || []).length;
      if (!allActorsRaw && systemStats) {
        verifiedCount = (systemStats as any)?.coordinator?.[name] || 0;
      }
      
      // Rejected count is for statistics only
      const totalCount_Global = (systemStats as any)?.coordinator?.[name] || verifiedCount
      const rejectedCount = Math.max(0, totalCount_Global - verifiedCount)
      
      const remaining = quota - verifiedCount
      const isFull = quota > 0 && remaining <= 0
      
      return {
        name,
        count: verifiedCount, // Primary count is now Verified only
        verifiedCount,
        rejectedCount,
        totalInput: verifiedCount + rejectedCount,
        quota,
        remaining,
        isFull
      }
    }).sort((a: any, b: any) => a.name.localeCompare(b.name))
  }, [groupedActors, kuotaData, systemStats])

  const currentKoorStat = useMemo(() => {
    if (!filterCoordinator) return null
    return coordinatorStats.find(s => s.name === filterCoordinator)
  }, [coordinatorStats, filterCoordinator])




  const [isLanjutDinasBatching, setIsLanjutDinasBatching] = useState(false)

  // ConfirmDialog states
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const [revertPending, setRevertPending] = useState<{actorId: string, fullName: string} | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePending, setDeletePending] = useState<{actorId: string, fullName: string} | null>(null)
  const [showLanjutDinasDialog, setShowLanjutDinasDialog] = useState(false)
  const [lanjutDinasPending, setLanjutDinasPending] = useState<{coordinator: string, eligibleActors: BusinessActor[]} | null>(null)
  const [showSingleLanjutDinasDialog, setShowSingleLanjutDinasDialog] = useState(false)
  const [singleLanjutDinasPending, setSingleLanjutDinasPending] = useState<BusinessActor | null>(null)
  const [isSingleLanjutDinasSubmitting, setIsSingleLanjutDinasSubmitting] = useState(false)
  const [editNik, setEditNik] = useState("")
  const [editPob, setEditPob] = useState("")
  const [editDob, setEditDob] = useState("")

  useEffect(() => {
    if (viewingActor) {
      const parsed = parsePobDob(viewingActor.pobDob || "")
      setEditNik(viewingActor.nik || "")
      setEditPob(parsed.pob || viewingActor.pob || "")
      setEditDob(parsed.dob || viewingActor.dob || "")
    } else {
      setEditNik("")
      setEditPob("")
      setEditDob("")
      setIsEditMode(false)
    }
  }, [viewingActor, isEditMode])

  const handleSyncStats = async (silent = false) => {
    if (!database || isSyncing || !isAdmin) return
    setIsSyncing(true)
    try {
      const { get, ref, update, set } = await import("firebase/database")
      const actorsRef = ref(database, 'businessActors')
      const snap = await get(actorsRef)
      
      if (snap.exists()) {
        const stats = {
          totalActors: 0,
          gender: { 'Laki-laki': 0, 'Perempuan': 0, unknown: 0 },
          verifiedGender: { 'Laki-laki': 0, 'Perempuan': 0 },
          status: { pending: 0, verified: 0, rejected: 0, finish: 0 },
          detailedStatus: { survey: 0, verifikasi: 0, lpj: 0, selesai: 0 },
          kelurahan: {},
          coordinator: {},
          lastUpdated: new Date().toISOString()
        } as any

        let fixCount = 0
        const updates: Record<string, any> = {}

        snap.forEach((child) => {
          const actor = child.val()
          stats.totalActors++
          
          const s = actor.status || 'pending'
          const isCancelDinas = (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(actor.alasanCancelDinas)
          const isRejected = s === 'rejected' || isCancelDinas
          const isVerified = ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) && !isCancelDinas
          
          if (isVerified || isRejected) {
            stats.status[isVerified ? 'verified' : 'rejected']++
            
            if (isVerified) {
              const g = (actor.gender || "").toLowerCase().trim()
              const genderKey = (g === 'perempuan' || g === 'p') ? 'Perempuan' : 'Laki-laki'
              stats.verifiedGender[genderKey] = (stats.verifiedGender[genderKey] || 0) + 1

              // Populate detailedStatus based on exact value matching the menus
              // "Survey Dinas" menu queries lpj_pending
              if (s === 'lpj_pending') stats.detailedStatus.survey++
              
              // "Verifikasi Dinas" menu queries verified_dinas with Lolos and !berkasDinasVerified
              if (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Lolos' && !actor.berkasDinasVerified) stats.detailedStatus.verifikasi++
              
              // "Hasil Verifikasi" menu queries verified_dinas with Lolos and berkasDinasVerified
              if (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Lolos' && actor.berkasDinasVerified) {
                stats.detailedStatus.hasilVerifikasi = (stats.detailedStatus.hasilVerifikasi || 0) + 1
              }
              
              if (s === 'bank_pending') stats.detailedStatus.verifikasi++
              
              // "LPJ" menu queries finish + readyForLPJ + !lpjNominal
              if (s === 'finish' && actor.readyForLPJ && !actor.lpjNominal) stats.detailedStatus.lpj++
              
              // "Selesai" menu queries finish (that are not pending LPJ)
              if (s === 'finish' && (!actor.readyForLPJ || actor.lpjNominal)) stats.detailedStatus.selesai++

              if (actor.coordinator) {
                const rawCoord = actor.coordinator.toUpperCase().trim()
                const coord = normalizeCoordinator(rawCoord).toUpperCase().trim()
                stats.coordinator[coord] = (stats.coordinator[coord] || 0) + 1
                
                if (actor.coordinator !== coord) {
                  updates[`${child.key}/coordinator`] = coord
                  fixCount++
                }
              }
              if (actor.kelurahan) {
                 const k = actor.kelurahan.toUpperCase().trim()
                 stats.kelurahan[k] = (stats.kelurahan[k] || 0) + 1
              }
            }
          } else {
            stats.status.pending++
          }

          const g = (actor.gender || "").toLowerCase().trim()
          const genderKey = (g === 'perempuan' || g === 'p') ? 'Perempuan' : 'Laki-laki'
          stats.gender[genderKey]++
        })

        if (fixCount > 0) {
          await update(actorsRef, updates)
          if (!silent) toast({ title: "Auto-Fix Berhasil", description: `${fixCount} data koordinator berhasil diseragamkan.` })
        }

        await set(ref(database, 'system_stats'), stats)
        if (!silent) toast({ title: "Sinkronisasi Selesai", description: "Statistik sistem telah berhasil diperbarui." })
      }
    } catch (err) {
      console.error(err)
      if (!silent) toast({ variant: "destructive", title: "Gagal Sinkronisasi", description: "Terjadi kesalahan saat menghitung ulang statistik." })
    } finally {
      setIsSyncing(false)
    }
  }

  // Otomatis ubah koordinator DKUKM menjadi AGUS jika ditemukan
  useEffect(() => {
    if (!database || !isAdmin || !allActorsRaw) return
    const dkukmActors = allActorsRaw.filter(a => a.coordinator && a.coordinator.toUpperCase().includes('DKUKM'))
    if (dkukmActors.length > 0) {
      const updates: Record<string, any> = {}
      dkukmActors.forEach(a => {
        updates[`businessActors/${a.id}/coordinator`] = 'AGUS'
      })
      import("firebase/database").then(({ update }) => {
        update(ref(database), updates).then(() => {
          handleSyncStats(true)
        }).catch(err => console.error("Error auto-updating DKUKM to AGUS:", err))
      })
    }
  }, [database, isAdmin, allActorsRaw])

  const handleSaveFullEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAdmin || !database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    
    const pSurveyRaw = (formData.get('petugasSurvey') as string || "").trim()
    const pSurvey = resolveSurveyorCanonicalName(pSurveyRaw, systemUsersRaw)

    const updates: Partial<BusinessActor> = {
      fullName: formData.get('fullName') as string,
      nik: editNik,
      noKK: formData.get('noKK') as string,
      gender: formData.get('gender') as "Laki-laki" | "Perempuan",
      pobDob: `${editPob}, ${editDob}`,
      pob: editPob,
      dob: editDob,
      phone: formData.get('phone') as string,
      kecamatan: formData.get('kecamatan') as string,
      kelurahan: formData.get('kelurahan') as string,
      rtRw: formData.get('rtRw') as string,
      address: formData.get('address') as string,
      businessName: formData.get('businessName') as string,
      businessCategory: formData.get('businessCategory') as "Kuliner" | "Bukan Kuliner",
      businessLocation: formData.get('businessLocation') as string,
      coordinator: normalizeCoordinator(formData.get('coordinator') as string).toUpperCase().trim(),
      petugasSurvey: pSurvey,
      bankName: formData.get('bankName') as string,
      bankNumber: formData.get('bankNumber') as string,
      bankOwner: formData.get('bankOwner') as string,
      googleDriveLink: formData.get('googleDriveLink') as string,
    }

    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)
    
    // Update global stats
    import("@/lib/stats-service").then(({ updateStatsOnEdit }) => {
      updateStatsOnEdit(database, viewingActor, { ...viewingActor, ...updates }).catch(e => console.error(e));
    });
    
    logActivity({
      query: `EDIT DATA: ${viewingActor.fullName} (Petugas: ${pSurvey})`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA PELAKU USAHA',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Tersimpan", description: "Data pelaku usaha berhasil diperbarui." })
    setIsEditMode(false)
    setViewingActor({ ...viewingActor, ...updates } as BusinessActor)
  }

  const handleQuickReassignPetugas = (actorId: string, newPetugas: string) => {
    if (!isAdmin || !database) return
    const val = resolveSurveyorCanonicalName(newPetugas, systemUsersRaw)
    
    updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), {
      petugasSurvey: val
    })

    logActivity({
      query: `GANTI PETUGAS SURVEY: ${viewingActor?.fullName || actorId} -> ${val}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA PELAKU USAHA',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({
      title: "Petugas Survey Diperbarui",
      description: val === "BELUM ADA" ? "Status petugas diubah menjadi BELUM ADA (Hanya Admin yang dapat mengakses)." : `Petugas Survey dialihkan ke ${val}.`
    })

    if (viewingActor && viewingActor.id === actorId) {
      setViewingActor(prev => prev ? { ...prev, petugasSurvey: val } : null)
    }
  }

  const handleSaveBank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || isMonitoring || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    const updates = {
      bankNumber: formData.get('bankNumber'),
      bankOwner: formData.get('bankOwner'),
      bankName: formData.get('bankName'),
      status: 'bank_pending'
    }
    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)
    
    // Update global stats categories if necessary (both are 'verified' so no change, but consistent)
    import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
      updateStatsOnStatusChange(database, viewingActor, { ...viewingActor, ...updates }, viewingActor);
    });

    logActivity({
      query: `INPUT REKENING: ${viewingActor.fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA PELAKU USAHA',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Tersimpan", description: "Data rekening telah dikirim." })
    setEditingBankMode(false)
    setViewingActor(null)
  }

  const handleSaveDrive = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    const updates = {
      googleDriveLink: formData.get('googleDriveLink') as string
    }
    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)
    
    logActivity({
      query: `UPDATE GOOGLE DRIVE: ${viewingActor.fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA PELAKU USAHA',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Tersimpan", description: "Link Google Drive berhasil ditambahkan." })
    setEditingDriveMode(false)
    setViewingActor({ ...viewingActor, ...updates } as BusinessActor)
  }


  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setRevertPending({ actorId, fullName })
    setShowRevertDialog(true)
  }

  const executeRevert = () => {
    if (!revertPending || !database) return
    const { actorId, fullName } = revertPending
    // Reset status and creation time to ensure fresh auto-verification countdown
    updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), { 
      status: 'pending',
      createdAt: new Date().toISOString() 
    })
    
    const actorObj = actors?.find(a => a.id === actorId) || viewingActor || { id: actorId, status: 'verified_actor' };
    
    // Update global stats
    import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
      updateStatsOnStatusChange(database, actorObj, { ...actorObj, status: 'pending' }, actorObj);
    });

    logActivity({
      query: `KEMBALIKAN DATA: ${fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA PELAKU USAHA',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Berhasil", description: "Status dikembalikan ke antrean Verifikasi Admin." })
    setViewingActor(null)
    setShowRevertDialog(false)
    setRevertPending(null)
  }


  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setDeletePending({ actorId, fullName })
    setShowDeleteDialog(true)
  }

  const executeDelete = () => {
    if (!deletePending || !database) return
    const { actorId, fullName } = deletePending
    const actorToDelete = actors?.find(a => a.id === actorId) || viewingActor || {}; // Keep ref for stats
    deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
    
    // Update global stats
    import("@/lib/stats-service").then(({ updateStatsOnDelete }) => {
      updateStatsOnDelete(database, actorToDelete).catch(err => console.error(err));
    });

    logActivity({
      query: `HAPUS DATA: ${fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA PELAKU USAHA',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ variant: "destructive", title: "Terhapus", description: "Data dihapus permanen." })
    setViewingActor(null)
    setShowDeleteDialog(false)
    setDeletePending(null)
  }

  const handleLanjutDinasBatch = async (coordinator: string, coordinatorActors: BusinessActor[]) => {
    if (!isAdmin || !database) return
    const eligibleActors = coordinatorActors.filter(a => a.status === 'verified_actor')
    
    if (eligibleActors.length === 0) {
      toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data pelaku usaha yang berstatus Terverifikasi untuk dilanjutkan ke Dinas." })
      return
    }

    setLanjutDinasPending({ coordinator, eligibleActors })
    setShowLanjutDinasDialog(true)
  }

  const executeLanjutDinas = async () => {
    if (!lanjutDinasPending || !database) return
    const { coordinator, eligibleActors } = lanjutDinasPending
    setShowLanjutDinasDialog(false)
    setIsLanjutDinasBatching(true)
    try {
      const { updateStatsOnStatusChange } = await import("@/lib/stats-service")
      
      for (const actor of eligibleActors) {
        updateDocumentNonBlocking(ref(database, `businessActors/${actor.id}`), { 
          status: 'lpj_pending'
        })
        await updateStatsOnStatusChange(database, 'verified_actor', 'lpj_pending', actor)
      }

      logActivity({
        query: `LANJUT VERIFIKASI DINAS BATCH: ${coordinator} (${eligibleActors.length} data)`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'DATA PELAKU USAHA',
        userId: user?.email || user?.uid || 'Admin'
      })
      
      toast({ title: "Berhasil", description: `${eligibleActors.length} data dilanjutkan ke Verifikasi Dinas.` })
    } catch (error) {
      console.error("Batch update error:", error)
      toast({ variant: "destructive", title: "Error", description: "Terjadi kesalahan sistem." })
    } finally {
      setIsLanjutDinasBatching(false)
      setLanjutDinasPending(null)
    }
  }

  const handleSingleLanjutDinas = (actor: BusinessActor) => {
    if (!isAdmin || !database) return
    setSingleLanjutDinasPending(actor)
    setShowSingleLanjutDinasDialog(true)
  }

  const executeSingleLanjutDinas = async () => {
    if (!singleLanjutDinasPending || !database) return
    const actor = singleLanjutDinasPending
    setShowSingleLanjutDinasDialog(false)
    setIsSingleLanjutDinasSubmitting(true)
    try {
      const { updateStatsOnStatusChange } = await import("@/lib/stats-service")
      const oldStatus = actor.status || 'verified_actor'

      updateDocumentNonBlocking(ref(database, `businessActors/${actor.id}`), { 
        status: 'lpj_pending',
        pushedSusulanAt: new Date().toISOString(),
        pushedSusulanBy: user?.email || user?.uid || 'Admin'
      })

      await updateStatsOnStatusChange(database, oldStatus, 'lpj_pending', actor)

      logActivity({
        query: `PUSH DATA SUSULAN DINAS: ${actor.fullName} (NIK: ${actor.nik})`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'DATA PELAKU USAHA',
        userId: user?.email || user?.uid || 'Admin'
      })
      
      toast({ title: "Berhasil Push Susulan", description: `Data ${actor.fullName} berhasil dipush ke Verifikasi Dinas.` })
      if (viewingActor?.id === actor.id) {
        setViewingActor({ ...viewingActor, status: 'lpj_pending' })
      }
    } catch (error) {
      console.error("Single push susulan error:", error)
      toast({ variant: "destructive", title: "Error", description: "Terjadi kesalahan saat mempush data susulan." })
    } finally {
      setIsSingleLanjutDinasSubmitting(false)
      setSingleLanjutDinasPending(null)
    }
  }

  const handlePrintForm = async (actor: BusinessActor) => {
    if (!database) return

    let actorToPrint = { ...actor }

    // Generate random 8-digit code if not exists
    if (!actor.registrationCode) {
      const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString()
      updateDocumentNonBlocking(ref(database, `businessActors/${actor.id}`), {
        registrationCode: randomCode
      })
      actorToPrint.registrationCode = randomCode
      toast({ title: "Kode Registrasi Di-generate", description: `Kode baru: ${randomCode} telah disimpan.` })
    }
    const sequenceNumber = globalIndexMap.get(actor.id)
    await generateRegistrationForm(actorToPrint, sequenceNumber)
  }

  const handleExportExcel = async (sheetsToExport?: string[]) => {
    try {
      // Use the exact same data source as the displayed table
      let dataToExport = (isInspektorat || isKoordinator)
        ? (filteredActors || [])
        : filterCoordinator
          ? (groupedActors[String(filterCoordinator).toUpperCase().trim()] || [])
          : (filteredActors || [])

      if (dataToExport.length === 0 && !filterCoordinator && isAdmin) {
        toast({ title: "Mengambil data...", description: "Mohon tunggu sebentar." })
        const { get, ref } = await import("firebase/database")
        if (!database) {
          toast({ variant: "destructive", title: "Error", description: "Database belum siap." })
          return
        }
        const snap = await get(ref(database, 'businessActors'))
        if (snap.exists()) {
          const allActors = Object.values(snap.val()) as BusinessActor[]
          dataToExport = allActors.filter(a => {
            const s = a.status || "";
            const isCancelDinas = (s === 'verified_dinas' && a.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(a.alasanCancelDinas);
            return ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) && !isCancelDinas;
          })
        }
      }

      if (dataToExport.length === 0) {
        toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data untuk diekspor." })
        return
      }

      // Sort: by coordinator name first, then by full name
      const sortedData = [...dataToExport].sort((a, b) => {
        const coordA = String(a.coordinator || "Tanpa Koordinator")
        const coordB = String(b.coordinator || "Tanpa Koordinator")
        const coordCompare = coordA.localeCompare(coordB)
        if (coordCompare !== 0) return coordCompare
        return String(a.fullName || "").localeCompare(String(b.fullName || ""))
      })

      // Build all rows in 1 combined sheet with sequential numbering (1, 2, 3, ...)
      const exportData = sortedData.map((actor, index) => {
        const petugas = (actor.petugasSurvey || (actor.surveyData as any)?.pejabatData?.petugas?.nama || "").trim().toUpperCase()
        return {
          "NO": index + 1,
          "NAMA LENGKAP": (actor.fullName || "").toUpperCase(),
          "JENIS KELAMIN": actor.gender || "-",
          "NIK": actor.nik || "-",
          "NOMOR KK": actor.noKK || "-",
          "TEMPAT LAHIR": actor.pob || parsePobDob(actor.pobDob || "").pob || "-",
          "TANGGAL LAHIR": actor.dob || parsePobDob(actor.pobDob || "").dob || "-",
          "UMUR": calculateAge(actor.dob || (actor.pobDob ? parsePobDob(actor.pobDob).dob : "") || extractDobFromNik(actor.nik || "")),
          "NOMOR HP": actor.phone || "-",
          "ALAMAT": (actor.address || "").toUpperCase(),
          "RT/RW": actor.rtRw || "-",
          "KELURAHAN": (actor.kelurahan || "").toUpperCase(),
          "JENIS USAHA": (actor.businessCategory || "").toUpperCase(),
          "USAHA": (actor.businessName || "").toUpperCase(),
          "LOKASI USAHA": (actor.businessLocation || "").toUpperCase(),
          "KOORDINATOR": normalizeCoordinator(actor.coordinator || "").toUpperCase(),
          "NAMA PETUGAS SURVEY": petugas || "-",
          "REG ID": actor.registrationCode || "-",
        }
      })

      // Auto-fit column widths
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      if (exportData.length > 0) {
        worksheet['!cols'] = Object.keys(exportData[0]).map(key => {
          let max = key.length
          exportData.forEach(row => { const v = String((row as any)[key] || ""); if (v.length > max) max = v.length })
          return { wch: max + 2 }
        })
      }

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pelaku Usaha")

      // Generate binary dan download via Blob (kompatibel di semua browser)
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Data_Pelaku_Usaha_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      toast({ title: "Berhasil", description: `${exportData.length} data berhasil diekspor ke Excel.` })
      setShowExportDialog(false)
    } catch (error) {
      console.error("Export Excel Error:", error)
      toast({ variant: "destructive", title: "Error", description: "Gagal mengekspor data." })
    }
  }

  // Auto-generate missing registration codes for currently filtered actors
  useEffect(() => {
    if (!database || !filteredActors || filteredActors.length === 0) return;
    
    const missingCodes = filteredActors.filter(a => !a.registrationCode);
    if (missingCodes.length === 0) return;

    // Process a small batch to prevent firebase connection throttling
    const batch = missingCodes.slice(0, 20);
    batch.forEach(actor => {
       const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
       updateDocumentNonBlocking(ref(database, `businessActors/${actor.id}`), {
          registrationCode: randomCode
       });
    });
  }, [filteredActors, database]);

  const currentDataToDisplay = (isInspektorat || isKoordinator || isSearching) 
    ? (filteredActors || []) 
    : (groupedActors[String(filterCoordinator || "").toUpperCase().trim()] || []);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="hidden print:block text-center space-y-2 mb-8 border-b-2 border-black pb-4">
        <h1 className="text-xl font-black uppercase">LAPORAN DATA PELAKU USAHA (SIMPU)</h1>
        <p className="text-xs font-bold uppercase tracking-widest">Sistem Informasi Manajemen Pelaku Usaha</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Data Pelaku Usaha</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">Data lolos verifikasi siap diisi rekening.</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto print:hidden">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari Nama, NIK, Usaha..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-10 border-primary/20 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
            {!isMonitoring && (
              <Button onClick={() => handleExportExcel()} className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md h-10 rounded-xl text-xs sm:text-sm">
                <FileSpreadsheet className="w-4 h-4 mr-1.5" /> EKSPOR EXCEL
              </Button>
            )}
            {!isMonitoring && (
              <Button
                onClick={async () => {
                  if (filterCoordinator) {
                    generateCoordinatorReport(filterCoordinator, groupedActors[filterCoordinator] || [])
                  } else {
                    if (Object.keys(groupedActors).length === 0) {
                      toast({ title: "Menyiapkan Dokumen", description: "Sedang mengambil data untuk cetak PDF seluruh koordinator..." })
                      try {
                        const { get, ref } = await import("firebase/database")
                        const snap = await get(ref(database!, 'businessActors'))
                        if (snap.exists()) {
                          const allActors = Object.values(snap.val()) as BusinessActor[]
                          const groups: Record<string, BusinessActor[]> = {}
                          allActors.forEach(a => {
                            const s = a.status || "";
                            const isCancelDinas = (s === 'verified_dinas' && a.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(a.alasanCancelDinas);
                            if (!['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) || isCancelDinas) return;
                            const coord = (a.coordinator || "Tanpa Koordinator").toUpperCase().trim()
                            if (!groups[coord]) groups[coord] = []
                            groups[coord].push(a)
                          })
                          generateAllCoordinatorsReport(groups)
                        }
                      } catch (e) {
                        toast({ variant: "destructive", title: "Gagal", description: "Gagal memuat data PDF." })
                      }
                    } else {
                      generateAllCoordinatorsReport(groupedActors)
                    }
                  }
                }}
                className="bg-red-600 hover:bg-red-700 font-bold shadow-md h-10 rounded-xl text-xs sm:text-sm"
              >
                <Printer className="w-4 h-4 mr-1.5" /> CETAK PDF
              </Button>
            )}
          </div>
        </div>
      </div>



      <div className="bg-transparent print:bg-transparent">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : isInspektorat ? (
           <div className="space-y-12">
            {Object.entries(groupedActors).map(([coordinator, actors]) => (
              <div key={coordinator} className="space-y-4 break-after-page">
                <div className="flex items-center justify-between border-l-4 border-primary pl-4 py-1 print:border-black">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-primary uppercase tracking-tight print:text-black">{coordinator}</h2>
                    <Badge variant="secondary" className="font-bold print:hidden">{actors.length} DATA</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 print:flex print:flex-col print:gap-1">
                  {actors.map((actor) => (
                    <Card 
                      key={actor.id} 
                      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group relative overflow-hidden print:shadow-none print:border-b print:rounded-none"
                      onClick={() => {
                        setViewingActor(actor)
                        setIsEditMode(false)
                        fetchAuxData(actor)
                      }}
                    >
                      <CardContent className="p-4 flex flex-col items-center text-center gap-3 print:flex-row print:justify-between print:text-left print:p-2">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform print:hidden shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 w-full justify-center">
                          <p className="font-bold text-[13px] md:text-sm line-clamp-2 uppercase leading-tight print:line-clamp-none text-primary/80" title={actor.businessName}>
                            {actor.businessName || "NAMA USAHA KOSONG"}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase line-clamp-1 print:line-clamp-none font-bold flex items-center justify-center print:justify-start gap-1" title={actor.fullName}>
                            <User className="w-3 h-3 print:hidden" /> {actor.fullName}
                          </p>
                          <p className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-sm print:hidden">
                            Reg: {actor.registrationCode || "PROSES..."}
                          </p>
                          <VerificationBadge actor={actor} />
                        </div>
                        <div className="text-[9px] font-black uppercase bg-primary text-white w-full justify-center print:w-auto shrink-0 mt-auto rounded-full py-0.5 px-2 flex items-center">
                          LIHAT DETAIL
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (isKoordinator || filterCoordinator || isInspektorat || isSearching) ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-2">
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start flex-wrap">
                {!isInspektorat && !isKoordinator && (filterCoordinator || isSearching) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSearchInput("")
                      setSearchQuery("")
                      if (filterCoordinator) router.push('/actor-data')
                    }}
                    className="font-bold border-primary text-primary hover:bg-primary/5 shrink-0 h-9 text-xs sm:text-sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
                  </Button>
                )}
                <h2 className="text-base sm:text-xl font-black text-primary uppercase tracking-tight truncate max-w-[240px] sm:max-w-none">
                  {isSearching
                    ? `HASIL: "${searchQuery}" (${currentDataToDisplay.length})`
                    : isInspektorat
                    ? "DATABASE PELAKU USAHA"
                    : isKoordinator
                    ? `DATA: ${userProfile?.fullName}`
                    : `DATA: ${filterCoordinator}`}
                </h2>
              </div>
              {isAdmin && filterCoordinator && !isKoordinator && !isInspektorat && (
                <Button 
                  size="sm" 
                  disabled={isLanjutDinasBatching}
                  onClick={() => handleLanjutDinasBatch(filterCoordinator, groupedActors[String(filterCoordinator || "").toUpperCase().trim()] || [])} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm w-full sm:w-auto h-9 text-xs sm:text-sm shrink-0" 
                  title="Lanjut ke Verifikasi Dinas"
                >
                  {isLanjutDinasBatching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
                  <span>Lanjut Dinas (Koordinator)</span>
                </Button>
              )}
            </div>
            
            {isMonitoring ? (
              <div className="space-y-4">
                {/* Mobile Monitoring Cards */}
                <div className="md:hidden flex flex-col gap-3">
                  {currentDataToDisplay.slice(0, pageLimit).map((actor, index) => {
                    const isFemale = normalizeGender(actor.gender) === 'Perempuan';
                    const actorAge = calculateAge(actor.dob || (actor.pobDob ? parsePobDob(actor.pobDob).dob : "") || extractDobFromNik(actor.nik || ""));
                    return (
                      <Card key={actor.id} className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                        <CardContent className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center justify-center shrink-0">
                                {globalIndexMap.get(actor.id) || index + 1}
                              </span>
                              <h3 className={cn("font-black text-sm uppercase truncate", isFemale ? "text-red-600" : "text-blue-600")}>
                                {actor.fullName}
                              </h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">
                              {actor.businessCategory || '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <div><span className="text-slate-400">Usia:</span> <strong>{actorAge || '-'}</strong></div>
                            <div><span className="text-slate-400">HP:</span> <strong>{actor.phone || '-'}</strong></div>
                            <div className="col-span-2"><span className="text-slate-400">Alamat:</span> {actor.address || '-'}</div>
                            <div className="col-span-2 text-primary font-black"><span className="text-slate-400 font-normal">Koor:</span> {normalizeCoordinator(actor.coordinator)}</div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Desktop Monitoring Table */}
                <div className="hidden md:block rounded-xl border bg-white/95 backdrop-blur-md shadow-sm overflow-hidden print:block print:border-black print:rounded-none">
                  <div className="max-h-[calc(100vh-280px)] overflow-auto print:max-h-none print:overflow-visible">
                    <Table>
                      <TableHeader className="bg-muted/50 print:bg-slate-100 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="font-bold text-primary py-4 pl-6 w-12 text-center print:text-black">NO</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">NAMA PELAKU USAHA</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">USIA</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">JENIS USAHA</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">NOMOR PONSEL</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">ALAMAT</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">KOORDINATOR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentDataToDisplay.slice(0, pageLimit).map((actor, index) => (
                          <TableRow key={actor.id} className="hover:bg-primary/5 transition-colors group print:border-black">
                            <TableCell className="py-4 pl-6 text-center font-bold text-slate-500 print:text-black">{globalIndexMap.get(actor.id) || index + 1}</TableCell>
                            <TableCell className={cn("py-4 font-bold", normalizeGender(actor.gender) === 'Perempuan' ? "text-red-600" : "text-blue-600")}>{actor.fullName}</TableCell>
                            <TableCell className="py-4 text-[13px] font-bold text-slate-700">{calculateAge(actor.dob || (actor.pobDob ? parsePobDob(actor.pobDob).dob : "") || extractDobFromNik(actor.nik || ""))}</TableCell>
                            <TableCell className="py-4">{actor.businessCategory}</TableCell>
                            <TableCell className="py-4">{actor.phone}</TableCell>
                            <TableCell className="py-4">{actor.address}</TableCell>
                            <TableCell className="py-4 font-black text-primary">{normalizeCoordinator(actor.coordinator)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {currentDataToDisplay.length > pageLimit && (
                  <div className="p-4 flex justify-center border-t bg-slate-50 rounded-2xl print:hidden">
                    <Button variant="outline" onClick={() => setPageLimit(prev => prev + 50)} className="font-bold border-primary text-primary hover:bg-primary/10">
                      <RefreshCw className="w-4 h-4 mr-2" /> Tampilkan Lebih Banyak Data
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mobile Normal Cards (md:hidden) */}
                <div className="md:hidden flex flex-col gap-3">
                  {currentDataToDisplay.slice(0, pageLimit).map((actor, index) => {
                    const isFemale = normalizeGender(actor.gender) === 'Perempuan';
                    const actorAge = calculateAge(actor.dob || (actor.pobDob ? parsePobDob(actor.pobDob).dob : "") || extractDobFromNik(actor.nik || ""));
                    return (
                      <Card key={actor.id} className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          {/* Card Header: Index, Name, Gender, Badge */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                {globalIndexMap.get(actor.id) || index + 1}
                              </span>
                              <div className="min-w-0">
                                <h3 className={cn(
                                  "font-black text-sm uppercase leading-snug truncate",
                                  isFemale ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                                )}>
                                  {actor.fullName}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-slate-500 font-mono font-bold">
                                    {actor.nik || '-'}
                                  </span>
                                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                    Reg: {actor.registrationCode || '...'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0">
                              <VerificationBadge actor={actor} />
                            </div>
                          </div>

                          {/* Business & Personal Info */}
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl space-y-1.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-xs text-primary uppercase truncate">
                                {actor.businessName || 'Nama Usaha Belum Diisi'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">
                                {actor.businessCategory || '-'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 text-[11px]">
                              <span>Usia: <strong>{actorAge || '-'}</strong></span>
                              <span>•</span>
                              <span>HP: <strong>{actor.phone || '-'}</strong></span>
                            </div>
                            {actor.address && (
                              <p className="text-[11px] text-slate-500 leading-tight">
                                <MapPin className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                                {actor.address}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons Row */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <Button
                              size="sm"
                              className="flex-1 h-9 rounded-xl font-black text-xs bg-primary text-white hover:bg-primary/90 shadow-sm flex items-center justify-center gap-1.5"
                              onClick={() => {
                                setViewingActor(actor);
                                setIsEditMode(false);
                                setEditingBankMode(false);
                                setEditingDriveMode(false);
                                fetchAuxData(actor);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              <span>Lihat Detail</span>
                            </Button>

                            {isAdmin && (actor as any).surveyData && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 px-2.5 rounded-xl text-teal-600 border-teal-200 hover:bg-teal-50"
                                onClick={() => setSurveyViewActor(actor)}
                                title="Form Survey Lengkap"
                              >
                                <ClipboardList className="w-4 h-4" />
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-9 px-2.5 rounded-xl transition-colors",
                                actor.googleDriveLink ? "text-blue-600 bg-blue-50 border-blue-200" : "text-slate-400 border-slate-200 hover:text-blue-600"
                              )}
                              onClick={() => {
                                setViewingActor(actor);
                                setIsEditMode(false);
                                setEditingBankMode(false);
                                setEditingDriveMode(true);
                                fetchAuxData(actor);
                              }}
                              title="Google Drive"
                            >
                              <Folder className="w-4 h-4" />
                            </Button>

                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 px-2.5 rounded-xl text-purple-600 border-purple-200 hover:bg-purple-50"
                                onClick={() => handleSingleLanjutDinas(actor)}
                                title="Lanjut Dinas"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 px-2.5 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => handlePrintForm(actor)}
                              title="Cetak Formulir"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Desktop Normal Table (hidden md:block) */}
                <div className="hidden md:block rounded-xl border bg-white shadow-sm overflow-hidden print:block print:border-black print:rounded-none">
                  <div className="max-h-[calc(100vh-280px)] overflow-auto print:max-h-none print:overflow-visible">
                    <Table>
                      <TableHeader className="bg-muted/50 print:bg-slate-100 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="font-bold text-primary py-4 pl-6 w-12 text-center print:text-black">NO</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">NAMA PELAKU USAHA</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">NIK</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">USIA</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">NOMOR PONSEL</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">ALAMAT LENGKAP</TableHead>
                          <TableHead className="font-bold text-primary py-4 print:text-black">USAHA</TableHead>
                          {!isMonitoring && <TableHead className="font-bold text-primary py-4 pr-6 text-right print:hidden">AKSI</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentDataToDisplay.slice(0, pageLimit).map((actor, index) => (
                          <TableRow key={actor.id} className="hover:bg-primary/5 transition-colors group print:border-black">
                            <TableCell className="py-4 pl-6 text-center font-bold text-slate-500 print:text-black">{globalIndexMap.get(actor.id) || index + 1}</TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col items-start gap-2">
                                {isKoordinator && (
                                  <div className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 shadow-sm border print:hidden",
                                    normalizeGender(actor.gender) === 'Perempuan'
                                      ? "bg-pink-100 border-pink-200 text-pink-600"
                                      : "bg-blue-100 border-blue-200 text-blue-600"
                                  )}>
                                    <span className="text-lg">{normalizeGender(actor.gender) === 'Perempuan' ? '👧' : '👦'}</span>
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className={cn("font-bold uppercase text-[13px] leading-tight print:text-black", normalizeGender(actor.gender) === 'Perempuan' ? "text-red-600" : "text-blue-600")}>{actor.fullName}</span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              <span className="font-mono text-[11px] text-slate-600 print:text-black block">{actor.nik}</span>
                              <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded-sm print:hidden inline-block mt-0.5">
                                Reg: {actor.registrationCode || "..."}
                              </span>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="font-bold text-slate-700 text-[13px] print:text-black block">{calculateAge(actor.dob || (actor.pobDob ? parsePobDob(actor.pobDob).dob : "") || extractDobFromNik(actor.nik || ""))}</span>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="font-bold text-slate-800 text-[13px] print:text-black block">{actor.phone || "-"}</span>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="text-[10px] text-slate-600 print:text-black block leading-tight max-w-[200px]">{actor.address || "-"}</span>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col">
                                <span className="font-black text-primary uppercase text-[12px] print:text-black">{actor.businessName}</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase print:hidden">{actor.businessCategory}</span>
                                <VerificationBadge actor={actor} />
                              </div>
                            </TableCell>
                            {!isMonitoring && (
                              <TableCell className="py-4 pr-6 text-right print:hidden">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                    onClick={() => {
                                      setViewingActor(actor);
                                      setIsEditMode(false);
                                      setEditingBankMode(false);
                                      setEditingDriveMode(false);
                                      fetchAuxData(actor);
                                    }}
                                    title="Lihat Detail"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {isAdmin && (actor as any).surveyData && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50"
                                      onClick={() => setSurveyViewActor(actor)}
                                      title="Lihat Form Survey Lengkap"
                                    >
                                      <ClipboardList className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                      "h-8 w-8 p-0 hover:bg-blue-50 transition-colors",
                                      actor.googleDriveLink ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-slate-400 hover:text-blue-600"
                                    )}
                                    onClick={() => {
                                      setViewingActor(actor);
                                      setIsEditMode(false);
                                      setEditingBankMode(false);
                                      setEditingDriveMode(true);
                                      fetchAuxData(actor);
                                    }}
                                    title={actor.googleDriveLink ? "Edit/Buka Link Google Drive" : "Input Link Google Drive"}
                                  >
                                    <Folder className="w-4 h-4" />
                                  </Button>
                                  {isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-50"
                                      onClick={() => handleSingleLanjutDinas(actor)}
                                      title="Lanjut Dinas (Push Data Susulan)"
                                    >
                                      <Send className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50"
                                    onClick={() => handlePrintForm(actor)}
                                    title="Cetak Formulir"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}

                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {currentDataToDisplay.length > pageLimit && (
                  <div className="p-4 flex justify-center border-t bg-slate-50 rounded-2xl print:hidden">
                    <Button variant="outline" onClick={() => setPageLimit(prev => prev + 50)} className="font-bold border-primary text-primary hover:bg-primary/10">
                      <RefreshCw className="w-4 h-4 mr-2" /> Tampilkan Lebih Banyak Data
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {(isKuotaLoading || (!systemStats && isStatsLoading)) ? (
              [...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="flex flex-col p-4 md:p-5 rounded-[2rem] bg-slate-100 dark:bg-slate-800 animate-pulse h-[130px] md:h-[150px] justify-center items-center gap-3 border border-slate-200/50"
                >
                  <div className="w-16 h-3 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <div className="w-24 h-5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                </div>
              ))
            ) : coordinatorStats.filter(stat => stat.count > 0).map((stat) => (
              <div 
                key={stat.name}
                onClick={() => router.push(`/actor-data?coordinator=${stat.name}`)}
                className={cn(
                  "group relative flex flex-col p-4 md:p-5 rounded-[2rem] transition-all duration-300 ease-out overflow-hidden shadow-lg border cursor-pointer active:scale-95 h-[130px] md:h-[150px] justify-center items-center animate-in fade-in slide-in-from-bottom-4",
                  "hover:shadow-2xl hover:-translate-y-1.5 hover:brightness-110",
                  stat.isFull 
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400/20" 
                    : "bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400/20"
                )}
              >
                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

                {/* Icon Section */}
                <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10">
                  <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300 ease-out shadow-xl backdrop-blur-sm">
                    <User className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-white" />
                  </div>
                </div>

                {/* Title Section */}
                <div className="flex-1 relative z-10 flex flex-col items-center justify-center gap-2 mt-4 w-full text-center">
                  <h3 
                    className="text-[11px] md:text-sm font-black text-white leading-tight uppercase tracking-tight text-center break-words line-clamp-2 w-full px-1" 
                    title={stat.name}
                  >
                    {stat.name}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 px-3 py-0.5 bg-white/20 rounded-full backdrop-blur-md border border-white/20 shadow-md">
                    <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-wider">{stat.count} Berkas</span>
                  </div>
                </div>

                {/* Decorative Light Effect */}
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
              </div>
            ))}

            {!(isKuotaLoading || (!systemStats && isStatsLoading)) && coordinatorStats.filter(stat => stat.count > 0).length === 0 && (
               <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                 <div className="p-4 bg-slate-50 rounded-full">
                    <Search className="w-10 h-10 text-slate-300" />
                 </div>
                 <p className="font-black text-slate-400 uppercase tracking-widest">Belum ada data koordinator ditemukan</p>
               </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!viewingActor} onOpenChange={(open) => {
        if (!open) {
          setViewingActor(null)
          setIsEditMode(false)
          setEditingBankMode(false)
          setEditingDriveMode(false)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingActor && !editingBankMode && !editingDriveMode && (
            <div className="flex flex-col gap-2 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
                <DialogTitle className="text-xl md:text-2xl font-black text-primary uppercase">
                  {isEditMode ? "Edit Data Pelaku Usaha" : "Detail Pelaku Usaha"}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  {!isEditMode && viewingActor && !isKoordinator && !isInspektorat && (
                    <Button 
                      size="sm" 
                      onClick={() => handlePrintForm(viewingActor)}
                      className="font-bold bg-primary hover:bg-primary/90 text-white"
                    >
                      <Printer className="w-4 h-4 mr-2" /> Cetak Formulir
                    </Button>
                  )}
                  {!isEditMode && isAdmin && viewingActor && (viewingActor as any).surveyData && (
                    <Button
                      size="sm"
                      onClick={() => setSurveyViewActor(viewingActor)}
                      className="font-bold bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <ClipboardList className="w-4 h-4 mr-2" /> Lihat Form Survey
                    </Button>
                  )}
                  {!isAdmin && !isMonitoring && !isKoordinator && !isEditMode && viewingActor.status === 'verified_actor' && (

                    <Button 
                      size="sm" 
                      onClick={() => setEditingBankMode(true)}
                      className="font-bold bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <CreditCard className="w-4 h-4 mr-2" /> Input Rekening
                    </Button>
                  )}
                  {isAdmin && !isEditMode && (
                    <Button 
                      size="sm" 
                      onClick={() => setEditingDriveMode(true)}
                      className="font-bold bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Folder className="w-4 h-4 mr-2" /> Link Drive
                    </Button>
                  )}
                  {isAdmin && !isEditMode && viewingActor && (
                    <Button 
                      size="sm" 
                      onClick={() => handleSingleLanjutDinas(viewingActor)}
                      className="font-bold bg-purple-600 hover:bg-purple-700 text-white"
                      title="Push Data Susulan ke Verifikasi Dinas"
                    >
                      <Send className="w-4 h-4 mr-2" /> Lanjut Dinas (Susulan)
                    </Button>
                  )}
                  {isAdmin && (
                    <Button 
                      variant={isEditMode ? "outline" : "default"} 
                      size="sm" 
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={cn("font-bold", isEditMode ? "border-amber-500 text-amber-600" : "bg-primary")}
                    >
                      {isEditMode ? "Batal Edit" : <><Edit3 className="w-4 h-4 mr-2"/> Edit Semua Data</>}
                    </Button>
                  )}
                  {isAdmin && !isEditMode && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleRevert(viewingActor.id, viewingActor.fullName)} className="border-amber-500 text-amber-600 font-bold" title="Kembalikan ke antrean awal (Pending)">
                        <RotateCcw className="w-4 h-4 mr-1 md:mr-0" /> <span className="md:hidden">Revert</span>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(viewingActor.id, viewingActor.fullName)} className="font-bold" title="Hapus Permanen">
                        <Trash2 className="w-4 h-4 mr-1 md:mr-0" /> <span className="md:hidden">Delete</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isEditMode ? (
                <form onSubmit={handleSaveFullEdit} className="grid gap-6 py-4">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Lengkap</Label><Input name="fullName" defaultValue={viewingActor.fullName} required /></div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">NIK</Label>
                        <Input 
                          name="nik" 
                          value={editNik} 
                          required 
                          onChange={(e) => {
                            const cleanNik = e.target.value.replace(/[^0-9]/g, "");
                            setEditNik(cleanNik);
                            if (cleanNik.length >= 12) {
                              const extracted = extractDobFromNik(cleanNik);
                              if (extracted) {
                                setEditDob(extracted);
                              }
                            } else {
                              setEditDob("");
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor KK</Label><Input name="noKK" defaultValue={viewingActor.noKK} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Jenis Kelamin</Label>
                        <select name="gender" defaultValue={normalizeGender(viewingActor.gender || "")} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">Tempat Lahir</Label>
                        <Input 
                          name="pob" 
                          value={editPob} 
                          onChange={(e) => setEditPob(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase">Tanggal Lahir</Label>
                        <Input 
                          name="dob" 
                          value={editDob} 
                          onChange={(e) => setEditDob(e.target.value)}
                          placeholder="DD-MM-YYYY"
                          className="font-semibold"
                        />
                      </div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor HP</Label><Input name="phone" defaultValue={viewingActor.phone} /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kecamatan</Label><Input name="kecamatan" defaultValue={viewingActor.kecamatan} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kelurahan</Label><Input name="kelurahan" defaultValue={viewingActor.kelurahan} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">RT/RW</Label><Input name="rtRw" defaultValue={viewingActor.rtRw} /></div>
                      <div className="space-y-1 md:col-span-3"><Label className="text-xs font-bold uppercase">Alamat Lengkap</Label><Input name="address" defaultValue={viewingActor.address} /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Usaha</Label><Input name="businessName" defaultValue={viewingActor.businessName} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kategori</Label><Input name="businessCategory" defaultValue={viewingActor.businessCategory} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Lokasi Usaha</Label><Input name="businessLocation" defaultValue={viewingActor.businessLocation} /></div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase flex items-center justify-between">
                          <span>Koordinator</span>
                          {isAdmin && <span className="text-[10px] text-muted-foreground font-normal">Pilih nama atau pindah data</span>}
                        </Label>
                        {isAdmin ? (() => {
                          const currentCoord = normalizeCoordinator(viewingActor.coordinator ? viewingActor.coordinator.toUpperCase().trim() : "");
                          return (
                            <select 
                              name="coordinator" 
                              defaultValue={currentCoord}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-bold"
                              required
                            >
                              <option value="" disabled>-- PILIH KOORDINATOR --</option>
                              {/* Jika koordinator saat ini tidak ada di daftar kuota atau kuotanya penuh, tetap tampilkan opsi saat ini */}
                              {currentCoord && !availableCoordinators.some(c => c.nameUpper === currentCoord && c.remaining > 0) && (
                                <option value={currentCoord} className="font-bold text-amber-600">
                                  🟡 {currentCoord} (Saat Ini)
                                </option>
                              )}
                              {availableCoordinators
                                .filter(c => c.remaining > 0 || (currentCoord && c.nameUpper === currentCoord))
                                .map((c) => {
                                  const isCurrent = currentCoord && c.nameUpper === currentCoord;
                                  return (
                                    <option key={c.id || c.nameUpper} value={c.nameUpper}>
                                      🟢 {c.nameUpper} {isCurrent ? `(Saat Ini - Sisa: ${c.remaining})` : `(Sisa Kuota: ${c.remaining})`}
                                    </option>
                                  );
                                })}
                            </select>
                          );
                        })() : (
                          <>
                            <input type="hidden" name="coordinator" value={normalizeCoordinator(viewingActor.coordinator) || ""} />
                            <div className="inline-flex items-center gap-1.5 text-xs font-black text-primary uppercase bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/20 h-9 w-full">
                              <span>{normalizeCoordinator(viewingActor.coordinator) || "-"}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase flex items-center justify-between">
                          <span>Petugas Survey</span>
                          {isAdmin && <span className="text-[10px] text-muted-foreground font-normal">Pilih nama atau BELUM ADA</span>}
                        </Label>
                        {(() => {
                          const canonicalPetugas = resolveSurveyorCanonicalName(viewingActor.petugasSurvey, systemUsersRaw)
                          const isBelumAda = canonicalPetugas === "BELUM ADA"

                          return isAdmin ? (
                            <select 
                              name="petugasSurvey" 
                              defaultValue={canonicalPetugas}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-bold"
                            >
                              <option value="BELUM ADA" className="text-rose-600 font-bold">🔴 BELUM ADA (Hanya Admin)</option>
                              {!isBelumAda && !surveyorOptions.includes(canonicalPetugas) && (
                                <option value={canonicalPetugas}>
                                  🟢 {canonicalPetugas} (Saat Ini)
                                </option>
                              )}
                              {surveyorOptions.map((name: string) => (
                                <option key={name} value={name}>
                                  🟢 {name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
                              {/* Hidden input agar nilai tidak berubah saat form disimpan oleh non-Admin */}
                              <input type="hidden" name="petugasSurvey" value={canonicalPetugas} />
                              {!isBelumAda ? (
                                <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 h-9 w-full">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span>{canonicalPetugas}</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 text-xs font-black text-rose-500 uppercase bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 h-9 w-full">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                                  <span>BELUM ADA</span>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Link Google Drive</Label><Input name="googleDriveLink" defaultValue={viewingActor.googleDriveLink || ""} placeholder="Link folder Google Drive (opsional)" /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Bank</Label><Input name="bankName" defaultValue={viewingActor.bankName} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor Rekening</Label><Input name="bankNumber" defaultValue={viewingActor.bankNumber} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Pemilik Rekening</Label><Input name="bankOwner" defaultValue={viewingActor.bankOwner} className="uppercase" /></div>
                    </div>
                  </section>

                  <div className="sticky bottom-0 bg-white dark:bg-zinc-950 p-4 border-t flex justify-end gap-2 mt-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] rounded-b-lg">
                    <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} className="font-bold">Batal</Button>
                    <Button type="submit" className="bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</Button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-6 py-4">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Reg ID", value: viewingActor.registrationCode },
                        { label: "Nama Lengkap", value: viewingActor.fullName },
                        { label: "NIK", value: viewingActor.nik },
                        { label: "Nomor KK", value: viewingActor.noKK },
                        { label: "Jenis Kelamin", value: viewingActor.gender },
                        { label: "Tempat Lahir", value: viewingActor.pob || parsePobDob(viewingActor.pobDob).pob },
                        { label: "Tanggal Lahir", value: viewingActor.dob || parsePobDob(viewingActor.pobDob).dob },
                        { label: "Usia", value: calculateAge(viewingActor.dob || parsePobDob(viewingActor.pobDob).dob || extractDobFromNik(viewingActor.nik || "")) },
                        { label: "Nomor HP", value: viewingActor.phone, isPhone: true }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          {(item as any).isPhone && item.value ? (
                            <a
                              href={`https://wa.me/${String(item.value).replace(/\D/g, "").replace(/^0/, "62")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-bold text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                            >
                              {item.value}
                            </a>
                          ) : (
                            <p className="text-sm font-bold">{item.value || "-"}</p>
                          )}
                        </div>
                      ))}
                      <div className="md:col-span-3 pt-2 border-t">
                          <CheckDataIndicator 
                            actor={viewingActor} 
                            data2023={activeDetailData.data2023}
                            data2024={activeDetailData.data2024}
                            data2025={activeDetailData.data2025}
                            dataBlacklist={activeDetailData.dataBlacklist}
                          />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Kecamatan", value: viewingActor.kecamatan },
                        { label: "Kelurahan", value: viewingActor.kelurahan },
                        { label: "RT/RW", value: viewingActor.rtRw },
                        { label: "Alamat Lengkap", value: viewingActor.address, fullWidth: true }
                      ].map((item, i) => (
                        <div key={i} className={item.fullWidth ? "md:col-span-3 space-y-1" : "space-y-1"}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                      {(() => {
                        const found = kuotaData?.find((q: any) => (q.name || q.coordinator || "").toUpperCase().trim() === (viewingActor.coordinator || "").toUpperCase().trim());
                        const coordPhone = found?.phone || found?.noHp || found?.hp || "";
                        
                        const getWaLink = (phoneStr: string) => {
                          if (!phoneStr) return "#";
                          let clean = phoneStr.replace(/\D/g, "");
                          if (clean.startsWith("0")) clean = "62" + clean.slice(1);
                          else if (!clean.startsWith("62")) clean = "62" + clean;
                          return `https://wa.me/${clean}`;
                        };

                        const canonicalPetugas = resolveSurveyorCanonicalName(viewingActor.petugasSurvey, systemUsersRaw);
                        const isBelumAdaPetugas = canonicalPetugas === "BELUM ADA";

                        return [
                          { label: "Usaha", value: viewingActor.businessName },
                          { label: "Kategori Usaha", value: viewingActor.businessCategory },
                          { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                          ...(!isInspektorat ? [
                            { label: "USULAN", value: viewingActor.coordinator },
                            { label: "NO. HP USULAN", value: coordPhone, isPhone: true },
                            { 
                              label: "PETUGAS SURVEY", 
                              value: canonicalPetugas !== "BELUM ADA" ? canonicalPetugas : "BELUM ADA",
                              isPetugasField: true,
                              isBelumAda: isBelumAdaPetugas
                            }
                          ] : [])
                        ].map((item: any, i: number) => (
                          <div key={i} className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                            {item.isPetugasField ? (
                              <div className="space-y-1.5">
                                {item.isBelumAda ? (
                                  <div className="inline-flex items-center gap-1.5 text-xs font-black text-rose-500 uppercase bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                                    <span>BELUM ADA</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                    <span>{item.value}</span>
                                  </div>
                                )}
                                {isAdmin && (
                                  <div className="pt-0.5">
                                    <select
                                      value={!item.isBelumAda ? canonicalPetugas : "BELUM ADA"}
                                      onChange={(e) => handleQuickReassignPetugas(viewingActor.id, e.target.value)}
                                      className="text-[11px] font-bold h-7 rounded border border-slate-300 dark:border-slate-700 bg-background px-2 py-0.5 shadow-sm text-primary cursor-pointer hover:border-primary transition-all w-full max-w-[220px]"
                                      title="Admin: Ganti Petugas Survey secara langsung"
                                    >
                                      <option value="BELUM ADA" className="text-rose-600 font-bold">🔴 BELUM ADA (Hanya Admin)</option>
                                      {!item.isBelumAda && !surveyorOptions.includes(canonicalPetugas) && (
                                        <option value={canonicalPetugas}>
                                          🟢 {canonicalPetugas} (Saat Ini)
                                        </option>
                                      )}
                                      {surveyorOptions.map((name: string) => (
                                        <option key={name} value={name}>
                                          🟢 {name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            ) : item.isPhone && item.value ? (
                              <a
                                href={getWaLink(item.value)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm transition-all active:scale-95 w-fit"
                                title="Klik untuk membuka obrolan WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20" />
                                <span>{item.value}</span>
                              </a>
                            ) : (
                              <p className="text-sm font-bold">{item.value || "-"}</p>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Nama Bank", value: viewingActor.bankName },
                        { label: "Nomor Rekening", value: viewingActor.bankNumber },
                        { label: "Nama Pemilik Rekening", value: viewingActor.bankOwner }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-black text-primary">{item.value || "BELUM TERISI"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Data Titik Lokasi Verifikasi</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(viewingActor as any).verificationLocation && (
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Sumber: Verifikasi Admin</p>
                          <p className="text-xs font-mono text-emerald-800 font-semibold">{(viewingActor as any).verificationLocation.lat}, {(viewingActor as any).verificationLocation.lon}</p>
                          <a href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocation.lat},${(viewingActor as any).verificationLocation.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-2 inline-block">Lihat di Peta</a>
                        </div>
                      )}
                      {(viewingActor as any).verificationBypass?.isBypassed && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                          <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Sumber: Verifikasi Admin (Bypass)</p>
                          <p className="text-xs text-amber-800 font-medium mb-2">Alasan: {(viewingActor as any).verificationBypass.reason}</p>
                          {(viewingActor as any).verificationBypass.fileBase64 && (
                            <a href={(viewingActor as any).verificationBypass.fileBase64} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-amber-200 text-amber-800 px-3 py-1 rounded shadow-sm hover:bg-amber-300 transition-colors inline-block mt-1">Lihat Bukti Lampiran</a>
                          )}
                        </div>
                      )}
                      {(viewingActor as any).verificationLocationDinas && (
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                          <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Sumber: Verifikasi Dinas</p>
                          <p className="text-xs font-mono text-indigo-800 font-semibold">{(viewingActor as any).verificationLocationDinas.lat}, {(viewingActor as any).verificationLocationDinas.lon}</p>
                          <a href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocationDinas.lat},${(viewingActor as any).verificationLocationDinas.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-2 inline-block">Lihat di Peta</a>
                        </div>
                      )}
                      {!(viewingActor as any).verificationLocation && !(viewingActor as any).verificationLocationDinas && !(viewingActor as any).verificationBypass?.isBypassed && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-full">
                          <p className="text-xs font-medium text-slate-500 text-center">Belum ada titik lokasi yang direkam.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {viewingActor.googleDriveLink && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Folder className="w-4 h-4" /> Berkas Tambahan (Google Drive)</div>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold text-blue-800 uppercase">Folder Google Drive Pelaku Usaha</p>
                          <p className="text-[10px] font-medium text-blue-600 mt-1">Berisi foto, video, dokumen usulan, atau file lainnya</p>
                        </div>
                        <a href={viewingActor.googleDriveLink} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold px-4 py-2.5 rounded-lg text-xs shadow flex items-center justify-center min-w-[140px]">
                          Buka Folder Drive
                        </a>
                      </div>
                    </section>
                  )}

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Informasi Sistem & Audit</div>
                    <div className="bg-slate-50 p-4 rounded-xl text-xs font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Status Terakhir</p>
                        <p className="capitalize text-primary">{(viewingActor.status || "").replace('_', ' ')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Petugas Input</p>
                        <p>{viewingActor.createdBy || "System"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Waktu Pendaftaran</p>
                        <p>{viewingActor.createdAt ? new Date(viewingActor.createdAt).toLocaleString('id-ID') : "-"}</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}

          {viewingActor && editingBankMode && (
            <div className="flex flex-col gap-4">
              <div className="border-b pb-2 flex justify-between items-center">
                <DialogTitle className="text-xl font-black text-amber-600 flex items-center gap-2">
                  <CreditCard className="w-5 h-5"/> INPUT REKENING
                </DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingBankMode(false)}>Batal</Button>
              </div>
              <form onSubmit={handleSaveBank}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Nomor Rekening</Label>
                    <Input name="bankNumber" defaultValue={viewingActor.bankNumber} placeholder="Contoh: 00129384812" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Nama Pemilik Sesuai Rekening</Label>
                    <Input name="bankOwner" defaultValue={viewingActor.bankOwner} className="uppercase" placeholder="Contoh: AGUS SURIYADI" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Nama Bank</Label>
                    <Select name="bankName" defaultValue={viewingActor.bankName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Bank..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BANK_LIST.map(bank => (
                          <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="submit" className="w-full bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan & Proses LPJ</Button>
                </div>
              </form>
            </div>
          )}

          {viewingActor && editingDriveMode && (
            <div className="flex flex-col gap-4">
              <div className="border-b pb-2 flex justify-between items-center">
                <DialogTitle className="text-xl font-black text-blue-600 flex items-center gap-2">
                  <Folder className="w-5 h-5"/> INPUT LINK GOOGLE DRIVE
                </DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingDriveMode(false)}>Batal</Button>
              </div>
              <form onSubmit={handleSaveDrive}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Link Folder Google Drive</Label>
                    <Input name="googleDriveLink" defaultValue={viewingActor.googleDriveLink || ""} placeholder="Contoh: https://drive.google.com/drive/folders/..." required />
                    <p className="text-[10px] text-slate-500 font-medium">Link folder ini akan digunakan untuk lampiran foto/video/dokumen tambahan (opsional).</p>
                  </div>
                  {viewingActor.googleDriveLink && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-800">Link saat ini sudah tersimpan</span>
                      <a href={viewingActor.googleDriveLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <Folder className="w-3.5 h-3.5" /> Buka Folder
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"><Save className="w-4 h-4 mr-2" /> Simpan Link Drive</Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Lihat Form Survey Lengkap */}
      <Dialog open={!!surveyViewActor} onOpenChange={(open) => { if (!open) setSurveyViewActor(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {surveyViewActor && (surveyViewActor as any).surveyData && (() => {
            const sd = (surveyViewActor as any).surveyData as any
            const Field = ({ label, value }: { label: string; value?: string | null }) => (
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
                <p className="text-sm font-bold">{value || '-'}</p>
              </div>
            )
            return (
              <div className="flex flex-col gap-4">
                <div className="border-b pb-3">
                  <DialogTitle className="text-xl font-black text-teal-700 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" /> FORM SURVEY LENGKAP
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {surveyViewActor.fullName} &mdash; NIK: {surveyViewActor.nik}
                  </p>
                </div>

                {/* Tanggal Survey */}
                {sd.tanggalSurvey && (
                  <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-2">
                    <span className="text-[10px] font-bold text-teal-600 uppercase">Tanggal Survey:</span>
                    <span className="text-sm font-black text-teal-800">{sd.tanggalSurvey}</span>
                  </div>
                )}

                {/* Informasi Pemilik */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-teal-700 font-black text-sm uppercase border-b pb-1">
                    <User className="w-4 h-4" /> Informasi Pemilik Usaha
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                    <Field label="Nama Pemilik" value={sd.namaPemilik} />
                    <Field label="Jenis Kelamin" value={sd.jenisKelamin} />
                    <Field label="Status Perkawinan" value={sd.status} />
                    <Field label="Alamat Rumah" value={sd.alamatRumah} />
                    <Field label="Nomor HP" value={sd.noHp} />
                    <Field label="Email" value={sd.email} />
                    <Field label="Sosial Media" value={sd.sosmed} />
                  </div>
                </section>

                {/* DTKS */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-teal-700 font-black text-sm uppercase border-b pb-1">
                    <CheckCircle2 className="w-4 h-4" /> Data Terpadu Kesejahteraan Sosial (DTKS)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Masuk DTKS</p>
                      <p className={`text-sm font-black ${sd.dtks?.masuk ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {sd.dtks?.masuk === undefined ? '-' : sd.dtks.masuk ? 'Ya' : 'Tidak'}
                      </p>
                    </div>
                    {sd.dtks?.masuk && (
                      <Field label="Jenis Bantuan" value={sd.dtks?.jenis} />
                    )}
                  </div>
                </section>

                {/* Informasi Usaha */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-teal-700 font-black text-sm uppercase border-b pb-1">
                    <Building2 className="w-4 h-4" /> Informasi Usaha
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                    <Field label="Nama Usaha" value={sd.namaUsaha} />
                    <Field label="Bidang Usaha" value={sd.bidangUsaha} />
                    <Field label="Tahun Berdiri" value={sd.tahunBerdiri} />
                    <Field label="Peralatan" value={sd.peralatan} />
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Izin Usaha</p>
                      <p className="text-sm font-bold">
                        {(sd.izin && sd.izin.length > 0) ? sd.izin.join(', ') : '-'}
                      </p>
                    </div>
                    <Field label="Modal Usaha" value={sd.modalUsaha} />
                    <Field label="Omset / Bulan" value={sd.omset} />
                  </div>
                </section>

                {/* Hibah */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-teal-700 font-black text-sm uppercase border-b pb-1">
                    <CreditCard className="w-4 h-4" /> Riwayat Hibah
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Pernah Menerima Hibah</p>
                      <p className={`text-sm font-black ${sd.hibah?.pernah ? 'text-amber-600' : 'text-slate-600'}`}>
                        {sd.hibah?.pernah === undefined ? '-' : sd.hibah.pernah ? 'Pernah' : 'Belum Pernah'}
                      </p>
                    </div>
                    {sd.hibah?.pernah && (
                      <>
                        <Field label="Dari Mana" value={sd.hibah?.dariMana} />
                        <Field label="Tahun" value={sd.hibah?.tahun} />
                      </>
                    )}
                  </div>
                </section>

                {/* Rencana & Hasil */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-teal-700 font-black text-sm uppercase border-b pb-1">
                    <ClipboardCheck className="w-4 h-4" /> Rencana Penggunaan & Hasil Survey
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                    <Field label="Rencana Penggunaan Bantuan" value={sd.rencanaPenggunaan} />
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Hasil Rekomendasi Survey</p>
                      <p className={`text-sm font-black ${sd.hasilSurvey === 'Layak' ? 'text-emerald-600' : sd.hasilSurvey === 'Tidak Layak' ? 'text-red-600' : 'text-slate-700'}`}>
                        {sd.hasilSurvey || '-'}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Foto Survey */}
                {sd.fotoSurveyUrl && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-teal-700 font-black text-sm uppercase border-b pb-1">
                      <Camera className="w-4 h-4" /> Foto Survey
                    </div>
                    <div className="flex justify-center bg-muted/30 p-4 rounded-xl">
                      <img
                        src={sd.fotoSurveyUrl}
                        alt="Foto Survey"
                        className="max-h-64 rounded-lg object-contain shadow border"
                      />
                    </div>
                  </section>
                )}

                {/* Pejabat */}
                {sd.pejabatData && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-teal-700 font-black text-sm uppercase border-b pb-1">
                      <User className="w-4 h-4" /> Data Pejabat
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-teal-600 uppercase">Verifikator</p>
                        <Field label="Nama" value={sd.pejabatData?.verifikator?.nama} />
                        <Field label="NIP/NIPPPK" value={sd.pejabatData?.verifikator?.nipppk} />
                        <Field label="Pangkat" value={sd.pejabatData?.verifikator?.pangkat} />
                        <Field label="Jabatan" value={sd.pejabatData?.verifikator?.jabatan} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-teal-600 uppercase">Petugas Survey</p>
                        <Field label="Nama" value={sd.pejabatData?.petugas?.nama} />
                        <Field label="NIP/NIPPPK" value={sd.pejabatData?.petugas?.nipppk} />
                        <Field label="Pangkat" value={sd.pejabatData?.petugas?.pangkat} />
                        <Field label="Jabatan" value={sd.pejabatData?.petugas?.jabatan} />
                      </div>
                    </div>
                  </section>
                )}

                <div className="flex justify-end pt-2 border-t">
                  <Button variant="outline" onClick={() => setSurveyViewActor(null)} className="font-bold">
                    Tutup
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialogs */}

      <ConfirmDialog
        open={showRevertDialog}
        onOpenChange={(open) => {
          setShowRevertDialog(open)
          if (!open) setRevertPending(null)
        }}
        icon={<RotateCcw className="w-6 h-6" />}
        title="Kembalikan ke Pending?"
        description={`Kembalikan status ${revertPending?.fullName || ''} ke Pending?`}
        confirmText="Ya, Kembalikan"
        confirmIcon={<RotateCcw className="w-4 h-4" />}
        variant="default"
        onConfirm={executeRevert}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open)
          if (!open) setDeletePending(null)
        }}
        icon={<Trash2 className="w-6 h-6" />}
        title="Hapus Permanen?"
        description={`Hapus permanen ${deletePending?.fullName || ''}? Semua data terkait akan hilang.`}
        confirmText="Ya, Hapus"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        variant="destructive"
        onConfirm={executeDelete}
      />

      <ConfirmDialog
        open={showLanjutDinasDialog}
        onOpenChange={(open) => {
          setShowLanjutDinasDialog(open)
          if (!open) setLanjutDinasPending(null)
        }}
        icon={<Send className="w-6 h-6" />}
        title="Lanjutkan ke Verifikasi Dinas?"
        description={`Lanjutkan ${lanjutDinasPending?.eligibleActors.length || 0} data pelaku usaha (Koordinator: ${lanjutDinasPending?.coordinator || ''}) ke Verifikasi Dinas?`}
        confirmText="Ya, Lanjutkan"
        confirmIcon={<Send className="w-4 h-4" />}
        variant="default"
        onConfirm={executeLanjutDinas}
      />

      <ConfirmDialog
        open={showSingleLanjutDinasDialog}
        onOpenChange={(open) => {
          setShowSingleLanjutDinasDialog(open)
          if (!open) setSingleLanjutDinasPending(null)
        }}
        icon={<Send className="w-6 h-6 text-purple-600" />}
        title="Push Data Susulan ke Dinas?"
        description={`Apakah Anda yakin ingin mempush data ${singleLanjutDinasPending?.fullName || ''} (${singleLanjutDinasPending?.businessName || ''}) ke Verifikasi Dinas sebagai Data Susulan?`}
        confirmText="Ya, Push Susulan"
        confirmIcon={<Send className="w-4 h-4" />}
        variant="default"
        onConfirm={executeSingleLanjutDinas}
      />
    </div>
  )
}

export default function ActorDataPage() {
  return (<Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}><ActorDataContent /></Suspense>)
}
