
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
import { Printer, Edit3, Loader2, Save, Trash2, Eye, User, CreditCard, History, X, RotateCcw, Building2, MapPin, CheckCircle2, Store, Search, ChevronRight, FileSpreadsheet, ArrowLeft, BarChart3, RefreshCw, ClipboardCheck, Send, Folder, MessageCircle } from "lucide-react"
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
import { generateRegistrationForm, generateCoordinatorReport, generateAllCoordinatorsReport } from "@/lib/pdf-generator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const BANK_LIST = [
  "BCA", "BNI", "BRI", "BRK", "MANDIRI", "PANIN", "OCBC", "DANAMON", "BUKOPIN", "BTN"
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

  const [pageLimit, setPageLimit] = useState(50)
  
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
    
    // For Admin / Inspektorat / Monitoring / Filter Coordinator / Search:
    // Using base ref and filtering client-side keeps Firebase RTDB cached in memory,
    // making coordinator card switching 100% instant (0ms) without unindexed query delays!
    if (filterCoordinator || isInspektorat || isMonitoring || searchQuery.length >= 3) {
      return ref(database, 'businessActors')
    }

    return null
  }, [database, isProfileLoading, isPetugas, isKoordinator, userProfile?.fullName, filterCoordinator, isInspektorat, isMonitoring, searchQuery])

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

  const actors = useMemo(() => {
    if (!allActorsRaw) return undefined;
    return allActorsRaw.filter(a => {
      if (!a) return false;
      const s = a.status || "";
      if (!['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s)) return false;
      
      if (filterCoordinator) {
        const actorCoord = String(a.coordinator || "").toUpperCase().trim();
        const targetCoord = String(filterCoordinator).toUpperCase().trim();
        if (actorCoord !== targetCoord) return false;
      }

      if (isPetugas) {
        if (!userProfile?.fullName) return false;
        const userPetugasUpper = String(userProfile.fullName).toUpperCase().trim();
        const actorPetugasUpper = String(a.petugasSurvey || a.createdBy || "").toUpperCase().trim();
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
    if (viewId && actors && !viewingActor && !hasAutoOpened.current) {
      const actorToView = actors.find(a => a.id === viewId)
      if (actorToView) {
        hasAutoOpened.current = true;
        setViewingActor(actorToView)
        fetchAuxData(actorToView)
      }
    }
  }, [viewId, actors, viewingActor])



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
          const isVerified = ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s)
          const isRejected = s === 'rejected'
          
          if (isVerified || isRejected) {
            stats.status[isVerified ? 'verified' : 'rejected']++
            
            if (isVerified) {
              const g = (actor.gender || "").toLowerCase().trim()
              const genderKey = (g === 'perempuan' || g === 'p') ? 'Perempuan' : 'Laki-laki'
              stats.verifiedGender[genderKey] = (stats.verifiedGender[genderKey] || 0) + 1

              // Populate detailedStatus based on exact value matching the menus
              // "Survey Dinas" menu queries lpj_pending
              if (s === 'lpj_pending') stats.detailedStatus.survey++
              
              // "Verifikasi Dinas" menu queries verified_dinas
              if (s === 'verified_dinas' || s === 'bank_pending') stats.detailedStatus.verifikasi++
              
              // "LPJ" menu queries finish + readyForLPJ + !lpjNominal
              if (s === 'finish' && actor.readyForLPJ && !actor.lpjNominal) stats.detailedStatus.lpj++
              
              // "Selesai" menu queries finish (that are not pending LPJ)
              if (s === 'finish' && (!actor.readyForLPJ || actor.lpjNominal)) stats.detailedStatus.selesai++

              if (actor.coordinator) {
                const coord = actor.coordinator.toUpperCase().trim()
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

  const handleSaveFullEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAdmin || !database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    
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
      coordinator: formData.get('coordinator') as string,
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
      query: `EDIT DATA: ${viewingActor.fullName}`,
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
      updateStatsOnStatusChange(database, viewingActor.status || 'verified_actor', 'bank_pending', viewingActor);
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
    
    // Update global stats
    import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
      const actorObj = actors?.find(a => a.id === actorId) || { id: actorId, status: 'verified_actor' };
      updateStatsOnStatusChange(database, 'verified_actor', 'pending', actorObj);
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
    const actorToDelete = viewingActor || {}; // Keep ref for stats
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
          dataToExport = allActors.filter(a => ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(a.status || ""))
        }
      }

      if (dataToExport.length === 0) {
        toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data untuk diekspor." })
        return
      }

      const sortedData = [...dataToExport].sort((a, b) => {
        const indexA = globalIndexMap.get(a.id)
        const indexB = globalIndexMap.get(b.id)
        if (indexA !== undefined && indexB !== undefined) return indexA - indexB
        const coordA = String(a.coordinator || "Tanpa Koordinator")
        const coordB = String(b.coordinator || "Tanpa Koordinator")
        const coordCompare = coordA.localeCompare(coordB)
        if (coordCompare !== 0) return coordCompare
        return String(a.fullName || "").localeCompare(String(b.fullName || ""))
      })

      const toRow = (actor: BusinessActor, index: number) => ({
        "NO": globalIndexMap.get(actor.id) || (index + 1),
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
        "KOORDINATOR": (actor.coordinator || "").toUpperCase(),
        "REG ID": actor.registrationCode || "-",
      })

      const setColWidths = (ws: any, rows: ReturnType<typeof toRow>[]) => {
        if (rows.length === 0) return
        ws['!cols'] = Object.keys(rows[0]).map(key => {
          let max = key.length
          rows.forEach(row => { const v = String((row as any)[key] || ""); if (v.length > max) max = v.length })
          return { wch: max + 2 }
        })
      }

      const workbook = XLSX.utils.book_new()

      if (sheetsToExport && sheetsToExport.length > 0) {
        // Export per-sheet (per koordinator yang dipilih)
        sheetsToExport.forEach(coordKey => {
          const coordActors = sortedData.filter(a =>
            String(a.coordinator || "Tanpa Koordinator").toUpperCase().trim() === coordKey
          )
          if (coordActors.length === 0) return
          const rows = coordActors.map((a, i) => toRow(a, i))
          const ws = XLSX.utils.json_to_sheet(rows)
          setColWidths(ws, rows)
          // Sheet name max 31 chars
          const sheetName = coordKey.substring(0, 31)
          XLSX.utils.book_append_sheet(workbook, ws, sheetName)
        })
        // Tambahkan sheet GABUNGAN juga
        const allRows = sortedData
          .filter(a => sheetsToExport.includes(String(a.coordinator || "Tanpa Koordinator").toUpperCase().trim()))
          .map((a, i) => toRow(a, i))
        const wsAll = XLSX.utils.json_to_sheet(allRows)
        setColWidths(wsAll, allRows)
        XLSX.utils.book_append_sheet(workbook, wsAll, "SEMUA")
      } else {
        // Export semua dalam satu sheet
        const exportData = sortedData.map((actor, index) => toRow(actor, index))
        const worksheet = XLSX.utils.json_to_sheet(exportData)
        setColWidths(worksheet, exportData)
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pelaku")
      }

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

      toast({ title: "Berhasil", description: "Data berhasil diekspor ke Excel." })
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

  const currentDataToDisplay = isInspektorat || isKoordinator ? (filteredActors || []) : (groupedActors[String(filterCoordinator || "").toUpperCase().trim()] || []);

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
        <div className="flex flex-wrap gap-2 w-full md:w-auto print:hidden">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari Nama, NIK, Usaha..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-10 border-primary/20 bg-white"
            />
          </div>

          {!isMonitoring && (
          <Button onClick={() => {
            const allKeys = Object.keys(groupedActors).sort()
            setSelectedExportSheets(allKeys)
            setShowExportDialog(true)
          }} className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md w-full md:w-auto h-10 rounded-xl">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> EKSPOR EXCEL
          </Button>
        )}
          {!isMonitoring && (
          <Button
            onClick={() => {
              if (filterCoordinator) {
                generateCoordinatorReport(filterCoordinator, groupedActors[filterCoordinator] || [])
              } else {
                generateAllCoordinatorsReport(groupedActors)
              }
            }}
            className="bg-red-600 hover:bg-red-700 font-bold shadow-md w-full md:w-auto h-10"
          >
            <Printer className="w-4 h-4 mr-2" /> CETAK PDF
          </Button>
        )}
        </div>
      </div>

      {/* Dialog Export Excel - Filter Sheet */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-emerald-700 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" /> Pilih Sheet yang Diekspor
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-xs text-slate-500 font-medium">Pilih koordinator yang data-nya akan dimasukkan sebagai sheet terpisah. Sheet <strong>SEMUA</strong> akan selalu disertakan sebagai gabungan.</p>
            <div className="flex gap-2 mb-1">
              <button onClick={() => setSelectedExportSheets(Object.keys(groupedActors).sort())} className="text-[11px] font-bold text-emerald-600 hover:underline">Pilih Semua</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => setSelectedExportSheets([])} className="text-[11px] font-bold text-red-500 hover:underline">Batal Semua</button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1 border rounded-xl p-2">
              {Object.keys(groupedActors).sort().map(coordKey => (
                <label key={coordKey} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedExportSheets.includes(coordKey)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedExportSheets(prev => [...prev, coordKey])
                      } else {
                        setSelectedExportSheets(prev => prev.filter(k => k !== coordKey))
                      }
                    }}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase truncate">{coordKey}</p>
                    <p className="text-[10px] text-slate-400">{groupedActors[coordKey]?.length || 0} data</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">{selectedExportSheets.length} dari {Object.keys(groupedActors).length} koordinator dipilih</p>
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowExportDialog(false)} className="flex-1 font-bold">Batal</Button>
            <Button
              disabled={selectedExportSheets.length === 0}
              onClick={() => handleExportExcel(selectedExportSheets)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Ekspor {selectedExportSheets.length} Sheet
            </Button>
          </div>
        </DialogContent>
      </Dialog>



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
        ) : (isKoordinator || filterCoordinator || isInspektorat) ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
              {!isInspektorat && !isKoordinator && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push('/actor-data')}
                  className="font-bold border-primary text-primary hover:bg-primary/5"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> KEMBALI KE MODUL
                </Button>
              )}
              <h2 className="text-xl font-black text-primary uppercase tracking-tighter">
                {isInspektorat ? "DATABASE PELAKU USAHA" : isKoordinator ? `DATA: ${userProfile?.fullName}` : `DATA: ${filterCoordinator}`}
              </h2>
              {isAdmin && filterCoordinator && !isKoordinator && !isInspektorat && (
                <Button 
                  size="sm" 
                  disabled={isLanjutDinasBatching}
                  onClick={() => handleLanjutDinasBatch(filterCoordinator, groupedActors[String(filterCoordinator || "").toUpperCase().trim()] || [])} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold ml-auto shadow-sm" 
                  title="Lanjut ke Verifikasi Dinas"
                >
                  {isLanjutDinasBatching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
                  <span className="hidden md:inline">Lanjut Dinas (Koordinator)</span>
                  <span className="md:hidden">Lanjut Dinas</span>
                </Button>
              )}
            </div>
            
            {isMonitoring ? (
  <div className="rounded-xl border bg-white/95 backdrop-blur-md shadow-sm overflow-hidden print:border-black print:rounded-none">
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
            <TableCell className="py-4 font-black text-primary">{actor.coordinator}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    {currentDataToDisplay.length > pageLimit && (
      <div className="p-4 flex justify-center border-t bg-slate-50 print:hidden">
        <Button variant="outline" onClick={() => setPageLimit(prev => prev + 50)} className="font-bold border-primary text-primary hover:bg-primary/10">
          <RefreshCw className="w-4 h-4 mr-2" /> Tampilkan Lebih Banyak Data
        </Button>
      </div>
    )}
    </div>
  </div>
) : (
  <div className="rounded-xl border bg-white shadow-sm overflow-hidden print:border-black print:rounded-none">
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
    {currentDataToDisplay.length > pageLimit && (
      <div className="p-4 flex justify-center border-t bg-slate-50 print:hidden">
        <Button variant="outline" onClick={() => setPageLimit(prev => prev + 50)} className="font-bold border-primary text-primary hover:bg-primary/10">
          <RefreshCw className="w-4 h-4 mr-2" /> Tampilkan Lebih Banyak Data
        </Button>
      </div>
    )}
    </div>
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
                        <Label className="text-xs font-bold uppercase">Tanggal Lahir (Otomatis)</Label>
                        <Input 
                          name="dob" 
                          value={editDob} 
                          readOnly 
                          className="bg-muted font-semibold"
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
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Koordinator</Label><Input name="coordinator" defaultValue={viewingActor.coordinator} /></div>
                      <div className="space-y-1 md:col-span-2"><Label className="text-xs font-bold uppercase">Link Google Drive</Label><Input name="googleDriveLink" defaultValue={viewingActor.googleDriveLink || ""} placeholder="Link folder Google Drive (opsional)" /></div>
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

                        return [
                          { label: "Usaha", value: viewingActor.businessName },
                          { label: "Kategori Usaha", value: viewingActor.businessCategory },
                          { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                          ...(!isInspektorat ? [
                            { label: "USULAN", value: viewingActor.coordinator },
                            { label: "NO. HP USULAN", value: coordPhone, isPhone: true },
                            { label: "PETUGAS SURVEY", value: viewingActor.petugasSurvey || "Belum ada" }
                          ] : [])
                        ].map((item: any, i: number) => (
                          <div key={i} className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                            {item.isPhone && item.value ? (
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
