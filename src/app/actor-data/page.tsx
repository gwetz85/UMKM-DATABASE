
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Printer, Edit3, Loader2, Save, Trash2, Eye, User, Users, CreditCard, History, X, RotateCcw, Building2, MapPin, CheckCircle2, Store, Search, ChevronRight, FileSpreadsheet, ArrowLeft, BarChart3, RefreshCw, ClipboardCheck, Send, Folder, MessageCircle, ClipboardList, Camera, Copy, Check, MoreVertical, ExternalLink, Calendar, Phone, PhoneCall, Sparkles, Navigation, UserCheck, Maximize2, ShieldCheck, BadgeCheck } from "lucide-react"
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

const getActorMapUrl = (actor: BusinessActor) => {
  const loc = (actor as any).verificationLocationDinas || (actor as any).verificationLocation || (actor as any).surveyData?.lokasiSurvey;
  if (loc && loc.lat && loc.lon) return `https://www.google.com/maps?q=${loc.lat},${loc.lon}`;
  if ((actor as any).lat && (actor as any).lon) return `https://www.google.com/maps?q=${(actor as any).lat},${(actor as any).lon}`;
  const query = [actor.businessLocation || actor.address, actor.kelurahan, actor.kecamatan, "Tanjungpinang"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};


import { cn, extractDobFromNik, parsePobDob, calculateAge, formatCurrency, formatDateTimeIndo } from "@/lib/utils"
import { normalizeCoordinator } from "@/lib/coordinator-utils"
import { resolveSurveyorCanonicalName, buildSurveyorMaps } from "@/lib/surveyor-utils"
import { generateRegistrationForm, generateCoordinatorReport, generateAllCoordinatorsReport } from "@/lib/pdf-generator"
import { formatTanggalIndonesia } from "@/lib/generate-berita-acara-pdf"
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
  const [localIndex, setLocalIndex] = useState<BusinessActor[] | null>(null)

  const handleCopyText = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast({
      title: `${label} Disalin`,
      description: `${label} (${text}) berhasil disalin ke clipboard.`,
    })
  }

  // Pre-fetch lightweight search index (590KB) in background for instant 0ms mobile search
  useEffect(() => {
    if (!database) return
    get(ref(database, 'settings/actors_search')).then(snap => {
      if (snap.exists()) {
        const val = snap.val()
        if (val) {
          setLocalIndex(Object.values(val) as BusinessActor[])
        }
      }
    }).catch(() => {})
  }, [database])

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 100)
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
  const [surveyPhotoUrl, setSurveyPhotoUrl] = useState<string | null>(null)
  const [isSurveyPhotoLoading, setIsSurveyPhotoLoading] = useState(false)
  const [showFullPhotoDialog, setShowFullPhotoDialog] = useState(false)

  useEffect(() => {
    if (!surveyViewActor) {
      setSurveyPhotoUrl(null)
      setIsSurveyPhotoLoading(false)
      return
    }
    const directPhoto = surveyViewActor.surveyData?.fotoSurveyUrl || surveyViewActor.photoSurveyUrl
    if (directPhoto && directPhoto.startsWith("data:")) {
      setSurveyPhotoUrl(directPhoto)
      setIsSurveyPhotoLoading(false)
      return
    }
    setIsSurveyPhotoLoading(true)
    import("@/lib/survey-photo-service").then(({ getSurveyPhoto }) => {
      getSurveyPhoto(database, surveyViewActor.id, surveyViewActor)
        .then(p => setSurveyPhotoUrl(p))
        .catch(() => setSurveyPhotoUrl(null))
        .finally(() => setIsSurveyPhotoLoading(false))
    })
  }, [surveyViewActor, database])

  const [pageLimit, setPageLimit] = useState(50)
  const isSearching = Boolean(searchQuery && searchQuery.trim().length > 0)
  const [searchResults, setSearchResults] = useState<BusinessActor[] | null>(null)
  const [isSearchLoading, setIsSearchLoading] = useState(false)

  // Use pre-calculated stats for the overview
  const statsRef = useMemoFirebase(() => database ? ref(database, 'system_stats') : null, [database])
  const { data: systemStats, isLoading: isStatsLoading } = useObject(statsRef)

  // High-speed fallback search across all actors (if local index is still loading)
  useEffect(() => {
    if (!isSearching || localIndex) {
      if (!isSearching) setSearchResults(null)
      setIsSearchLoading(false)
      return
    }

    const controller = new AbortController()
    setIsSearchLoading(true)

    const coordParam = filterCoordinator ? `&coordinator=${encodeURIComponent(filterCoordinator)}` : ''
    fetch(`/api/actors/search?q=${encodeURIComponent(searchQuery)}${coordParam}`, {
      signal: controller.signal
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSearchResults(data.results || [])
        } else {
          setSearchResults([])
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Search error:', err)
          setSearchResults([])
        }
      })
      .finally(() => {
        setIsSearchLoading(false)
      })

    return () => controller.abort()
  }, [searchQuery, isSearching, filterCoordinator, localIndex])

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

    // Only load all actors when viewing Inspektorat. Global search is handled via ultra-fast API
    if (isInspektorat) {
      return ref(database, 'businessActors')
    }
    
    // Default overview for Admin / Monitoring / Staff is the Koordinator Cards grid.
    // Koordinator cards are rendered INSTANTLY (<0.1s) from systemStats & kuotaData without downloading 200MB+ of raw data!
    return null
  }, [database, isProfileLoading, isPetugas, isKoordinator, filterCoordinator, userProfile?.fullName, isInspektorat])

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
    if (isSearching) {
      // Prioritize localIndex for 0ms instant search, then searchResults, then actors
      const sourceList = localIndex || searchResults || actors || [];
      const lowerQuery = searchQuery.toLowerCase();
      const cleanDigits = searchQuery.replace(/[^0-9]/g, '');

      return sourceList.filter(a => {
        if (filterCoordinator && String(a.coordinator || '').toUpperCase().trim() !== String(filterCoordinator).toUpperCase().trim()) {
          return false;
        }
        const fullName = (a.fullName || "").toLowerCase();
        const businessName = (a.businessName || "").toLowerCase();
        const address = (a.address || "").toLowerCase();
        const coord = (a.coordinator || "").toLowerCase();
        const nik = String(a.nik || "");
        const noKK = String(a.noKK || "");
        const phone = String(a.phone || "").replace(/[^0-9]/g, "");

        return (
          fullName.includes(lowerQuery) ||
          businessName.includes(lowerQuery) ||
          address.includes(lowerQuery) ||
          coord.includes(lowerQuery) ||
          (nik && nik.includes(searchQuery)) ||
          (noKK && noKK.includes(searchQuery)) ||
          (cleanDigits.length >= 3 && phone.includes(cleanDigits))
        );
      }).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    }

    if (!actors) return undefined;
    return actors;
  }, [actors, searchQuery, isSearching, filterCoordinator, searchResults, localIndex]);

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

  const activeCoordinatorCount = useMemo(() => {
    return coordinatorStats.filter(s => s.count > 0).length
  }, [coordinatorStats])

  const totalVerifiedCount = useMemo(() => {
    return coordinatorStats.reduce((acc, curr) => acc + curr.count, 0)
  }, [coordinatorStats])

  const fullQuotaCount = useMemo(() => {
    return coordinatorStats.filter(s => s.count > 0 && s.isFull).length
  }, [coordinatorStats])




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
          coordinatorRekening: {},
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
                if (actor.bankNumber && String(actor.bankNumber).trim() !== '') {
                  stats.coordinatorRekening[coord] = (stats.coordinatorRekening[coord] || 0) + 1
                }
                
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

      {/* Modern Frosted Glass Canvas */}
      <div className="bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl border border-white/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl shadow-slate-300/40 dark:shadow-none space-y-6">
        {/* Sticky Fixed Header & Stats Ribbon Section */}
        <div className="sticky -top-4 md:-top-8 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-4 border-b border-slate-200/80 dark:border-slate-800 rounded-t-3xl shadow-sm space-y-4 print:static print:p-0 print:m-0 print:border-none print:shadow-none">
          {/* Main Top Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Direktori & Database Pelaku Usaha
                </span>
              </div>
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors h-9 w-9 rounded-xl" />
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-headline">
                  Data Pelaku Usaha
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Data lolos verifikasi siap diisi rekening dan diteruskan ke tahap dinas.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 w-full lg:w-auto print:hidden">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cari Nama, NIK, Usaha..." 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 h-11 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-sm focus-visible:ring-primary font-medium text-xs sm:text-sm"
                />
                {searchInput && (
                  <button 
                    onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
                {!isMonitoring && (
                  <Button 
                    onClick={() => handleExportExcel()} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 hover:shadow-lg h-11 rounded-2xl text-xs sm:text-sm transition-all"
                  >
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
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 hover:shadow-lg h-11 rounded-2xl text-xs sm:text-sm transition-all"
                  >
                    <Printer className="w-4 h-4 mr-1.5" /> CETAK PDF
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Overview Stats Ribbon (when showing all coordinators) */}
          {!isSearching && !filterCoordinator && !isInspektorat && !isKoordinator && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 print:hidden pt-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-50/80 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/10 border border-indigo-100/80 dark:border-indigo-900/30 shadow-sm">
                <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                  <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Koordinator</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{activeCoordinatorCount}</span>
                    <span className="hidden sm:inline text-xs font-semibold text-slate-500">Penanggung Jawab</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-100/80 dark:border-emerald-900/30 shadow-sm">
                <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Siap Rekening</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">{totalVerifiedCount.toLocaleString('id-ID')}</span>
                    <span className="hidden sm:inline text-xs font-semibold text-slate-500">Pelaku Usaha</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-100/80 dark:border-amber-900/30 shadow-sm">
                <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Penuh</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{fullQuotaCount}</span>
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500">/ {activeCoordinatorCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subheader when filtered or searching */}
          {(isKoordinator || filterCoordinator || isInspektorat || isSearching) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
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
                    className="font-bold border-primary text-primary hover:bg-primary/5 shrink-0 h-9 text-xs sm:text-sm rounded-xl"
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm w-full sm:w-auto h-9 text-xs sm:text-sm shrink-0 rounded-xl" 
                  title="Lanjut ke Verifikasi Dinas"
                >
                  {isLanjutDinasBatching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
                  <span>Lanjut Dinas (Koordinator)</span>
                </Button>
              )}
            </div>
          )}
        </div>




      <div className="bg-transparent print:bg-transparent">
        {(isSearching && !localIndex ? isSearchLoading : isLoading) ? (
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
            
            {isMonitoring ? (
              <div className="space-y-4">
                {/* Responsive Monitoring Cards (Screen) */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 print:hidden">
                  {currentDataToDisplay.slice(0, pageLimit).map((actor, index) => {
                    const isFemale = normalizeGender(actor.gender) === 'Perempuan';
                    const actorAge = calculateAge(actor.dob || (actor.pobDob ? parsePobDob(actor.pobDob).dob : "") || extractDobFromNik(actor.nik || ""));
                    return (
                      <div key={actor.id} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                        {/* Top Section */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <span className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-sm sm:text-base flex items-center justify-center shrink-0">
                              {globalIndexMap.get(actor.id) || index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className={cn(
                                "font-extrabold text-base sm:text-[17px] tracking-tight truncate leading-tight uppercase",
                                isFemale ? "text-rose-600 dark:text-rose-400" : "text-[#1d63c6] dark:text-blue-400"
                              )}>
                                {actor.fullName}
                              </h3>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tight">
                                  {actor.nik || '-'}
                                </span>
                                <div className="bg-[#edf5fd] dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 px-2.5 py-0.5 rounded-lg flex flex-col leading-none">
                                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">Reg:</span>
                                  <span className="text-xs font-black text-blue-700 dark:text-blue-300 font-mono">
                                    {actor.registrationCode || '...'}
                                  </span>
                                </div>
                                <VerificationBadge actor={actor} />
                              </div>
                            </div>
                          </div>
                          <a
                            href={getActorMapUrl(actor)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200/90 dark:border-blue-800 bg-[#edf5fd] dark:bg-blue-950/50 text-[#1d63c6] dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-black text-xs transition-colors shrink-0 shadow-2xs group"
                            title="Buka Lokasi di Google Maps"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#1d63c6] dark:text-blue-400 group-hover:scale-110 transition-transform" />
                            <span>LOKASI</span>
                            <ExternalLink className="w-3 h-3 text-[#1d63c6] dark:text-blue-400 opacity-70" />
                          </a>
                        </div>

                        {/* Middle Info Container */}
                        <div className="bg-[#f8fafc] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 my-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-sm sm:text-[15px] text-[#1d63c6] dark:text-blue-400 uppercase tracking-tight truncate">
                              {actor.businessName || 'Nama Usaha Belum Diisi'}
                            </span>
                            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
                              {actor.businessCategory || '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 flex-wrap">
                            <span>Usia: <strong className="font-extrabold text-slate-800 dark:text-slate-100">{actorAge ? `${actorAge} Tahun` : '-'}</strong></span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span>HP: <strong className="font-extrabold text-slate-800 dark:text-slate-100">{actor.phone || '-'}</strong></span>
                          </div>
                          <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="font-medium line-clamp-1 uppercase tracking-tight">
                              {actor.businessLocation || actor.address || 'Alamat belum diisi'}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-primary pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                            <span className="text-slate-500 font-normal">Koordinator:</span>
                            <span className="font-black text-primary">{normalizeCoordinator(actor.coordinator)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Printable Monitoring Table (Hidden on screen, shown when printing) */}
                <div className="hidden print:block rounded-none border-b border-black">
                  <Table>
                    <TableHeader className="bg-slate-100 print:bg-slate-100">
                      <TableRow>
                        <TableHead className="font-bold text-black py-4 pl-6 w-12 text-center">NO</TableHead>
                        <TableHead className="font-bold text-black py-4">NAMA PELAKU USAHA</TableHead>
                        <TableHead className="font-bold text-black py-4">USIA</TableHead>
                        <TableHead className="font-bold text-black py-4">JENIS USAHA</TableHead>
                        <TableHead className="font-bold text-black py-4">NOMOR PONSEL</TableHead>
                        <TableHead className="font-bold text-black py-4">ALAMAT</TableHead>
                        <TableHead className="font-bold text-black py-4">KOORDINATOR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDataToDisplay.slice(0, pageLimit).map((actor, index) => (
                        <TableRow key={actor.id} className="border-black">
                          <TableCell className="py-4 pl-6 text-center font-bold text-black">{globalIndexMap.get(actor.id) || index + 1}</TableCell>
                          <TableCell className="py-4 font-bold text-black uppercase">{actor.fullName}</TableCell>
                          <TableCell className="py-4 text-[13px] font-bold text-black">{calculateAge(actor.dob || (actor.pobDob ? parsePobDob(actor.pobDob).dob : "") || extractDobFromNik(actor.nik || ""))}</TableCell>
                          <TableCell className="py-4 text-black">{actor.businessCategory}</TableCell>
                          <TableCell className="py-4 text-black">{actor.phone}</TableCell>
                          <TableCell className="py-4 text-black">{actor.address}</TableCell>
                          <TableCell className="py-4 font-black text-black">{normalizeCoordinator(actor.coordinator)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                {/* Responsive Actor Cards Grid (Visible on all screen sizes, hidden on print) */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 print:hidden">
                  {currentDataToDisplay.slice(0, pageLimit).map((actor, index) => {
                    const isFemale = normalizeGender(actor.gender) === 'Perempuan';
                    const actorAge = calculateAge(actor.dob || (actor.pobDob ? parsePobDob(actor.pobDob).dob : "") || extractDobFromNik(actor.nik || ""));
                    return (
                      <div
                        key={actor.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                      >
                        {/* Top Section */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Circle Index Badge */}
                            <span className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-sm sm:text-base flex items-center justify-center shrink-0">
                              {globalIndexMap.get(actor.id) || index + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                              {/* Full Name */}
                              <h3
                                className={cn(
                                  "font-extrabold text-base sm:text-[17px] tracking-tight truncate leading-tight uppercase",
                                  isFemale ? "text-rose-600 dark:text-rose-400" : "text-[#1d63c6] dark:text-blue-400"
                                )}
                              >
                                {actor.fullName}
                              </h3>

                              {/* NIK & Reg Code */}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tight">
                                  {actor.nik || '-'}
                                </span>

                                <div className="bg-[#edf5fd] dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 px-2.5 py-0.5 rounded-lg flex flex-col leading-none">
                                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">Reg:</span>
                                  <span className="text-xs font-black text-blue-700 dark:text-blue-300 font-mono">
                                    {actor.registrationCode || '...'}
                                  </span>
                                </div>

                                <VerificationBadge actor={actor} />
                              </div>
                            </div>
                          </div>

                          {/* LOKASI Button */}
                          <a
                            href={getActorMapUrl(actor)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200/90 dark:border-blue-800 bg-[#edf5fd] dark:bg-blue-950/50 text-[#1d63c6] dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-black text-xs transition-colors shrink-0 shadow-2xs group/btn"
                            title="Buka Lokasi di Google Maps"
                          >
                            <MapPin className="w-3.5 h-3.5 text-[#1d63c6] dark:text-blue-400 group-hover/btn:scale-110 transition-transform" />
                            <span>LOKASI</span>
                            <ExternalLink className="w-3 h-3 text-[#1d63c6] dark:text-blue-400 opacity-70" />
                          </a>
                        </div>

                        {/* Middle Info Container */}
                        <div className="bg-[#f8fafc] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 my-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-sm sm:text-[15px] text-[#1d63c6] dark:text-blue-400 uppercase tracking-tight truncate">
                              {actor.businessName || 'Nama Usaha Belum Diisi'}
                            </span>
                            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
                              {actor.businessCategory || '-'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 flex-wrap">
                            <span>Usia: <strong className="font-extrabold text-slate-800 dark:text-slate-100">{actorAge ? `${actorAge} Tahun` : '-'}</strong></span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span>HP: <strong className="font-extrabold text-slate-800 dark:text-slate-100">{actor.phone || '-'}</strong></span>
                          </div>

                          <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="font-medium line-clamp-1 uppercase tracking-tight">
                              {actor.businessLocation || actor.address || 'Alamat belum diisi'}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex items-center gap-2 sm:gap-2.5 pt-0.5">
                          {/* Lihat Detail */}
                          <Button
                            size="sm"
                            className="flex-1 h-11 rounded-2xl font-black text-xs sm:text-sm bg-[#1d63c6] hover:bg-[#1550a2] text-white shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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

                          {/* Form Survey Lengkap */}
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-11 h-11 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shrink-0 transition-all active:scale-95 shadow-2xs"
                            onClick={() => setSurveyViewActor(actor)}
                            title="Form Survey Lengkap"
                          >
                            <ClipboardList className="w-5 h-5" />
                          </Button>

                          {/* Google Drive */}
                          <Button
                            size="icon"
                            variant="outline"
                            className={cn(
                              "w-11 h-11 rounded-2xl border shrink-0 transition-all active:scale-95 shadow-2xs",
                              actor.googleDriveLink
                                ? "border-blue-300 dark:border-blue-700 bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                                : "border-blue-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            )}
                            onClick={() => {
                              setViewingActor(actor);
                              setIsEditMode(false);
                              setEditingBankMode(false);
                              setEditingDriveMode(true);
                              fetchAuxData(actor);
                            }}
                            title={actor.googleDriveLink ? "Buka / Edit Link Google Drive" : "Input Link Google Drive"}
                          >
                            <Folder className="w-5 h-5" />
                          </Button>

                          {/* Lanjut Dinas */}
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-11 h-11 rounded-2xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 shrink-0 transition-all active:scale-95 shadow-2xs"
                            onClick={() => handleSingleLanjutDinas(actor)}
                            title="Lanjut Dinas (Push Data Susulan)"
                          >
                            <Send className="w-4 h-4 -rotate-12" />
                          </Button>

                          {/* Cetak Formulir */}
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-11 h-11 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shrink-0 transition-all active:scale-95 shadow-2xs"
                            onClick={() => handlePrintForm(actor)}
                            title="Cetak Formulir"
                          >
                            <Printer className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Printable Table (Hidden on screen, visible on print) */}
                <div className="hidden print:block rounded-none border-b border-black">
                  <Table>
                    <TableHeader className="bg-slate-100 print:bg-slate-100">
                      <TableRow>
                        <TableHead className="font-bold text-black py-4 pl-6 w-12 text-center">NO</TableHead>
                        <TableHead className="font-bold text-black py-4">NAMA PELAKU USAHA</TableHead>
                        <TableHead className="font-bold text-black py-4">NIK</TableHead>
                        <TableHead className="font-bold text-black py-4">USIA</TableHead>
                        <TableHead className="font-bold text-black py-4">NOMOR PONSEL</TableHead>
                        <TableHead className="font-bold text-black py-4">ALAMAT LENGKAP</TableHead>
                        <TableHead className="font-bold text-black py-4">USAHA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDataToDisplay.slice(0, pageLimit).map((actor, index) => (
                        <TableRow key={actor.id} className="border-black">
                          <TableCell className="py-4 pl-6 text-center font-bold text-black">{globalIndexMap.get(actor.id) || index + 1}</TableCell>
                          <TableCell className="py-4 font-bold text-black uppercase">{actor.fullName}</TableCell>
                          <TableCell className="py-4 font-mono text-[11px] text-black">{actor.nik}</TableCell>
                          <TableCell className="py-4 font-bold text-black text-[13px]">{calculateAge(actor.dob || (actor.pobDob ? parsePobDob(actor.pobDob).dob : "") || extractDobFromNik(actor.nik || ""))}</TableCell>
                          <TableCell className="py-4 font-bold text-black text-[13px]">{actor.phone || "-"}</TableCell>
                          <TableCell className="py-4 text-[10px] text-black leading-tight max-w-[200px]">{actor.address || "-"}</TableCell>
                          <TableCell className="py-4">
                            <span className="font-black uppercase text-[12px] text-black block">{actor.businessName}</span>
                            <span className="text-[10px] text-black font-bold uppercase">{actor.businessCategory}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
            {(isKuotaLoading || (!systemStats && isStatsLoading)) ? (
              [...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="flex flex-col p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-800/60 animate-pulse min-h-[165px] justify-between border border-slate-200/50 dark:border-slate-800"
                >
                  <div className="flex justify-between items-center">
                    <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                    <div className="w-14 h-4 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  </div>
                  <div className="space-y-2 my-2">
                    <div className="w-3/4 h-3.5 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                    <div className="w-1/2 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
              ))
            ) : coordinatorStats.filter(stat => stat.count > 0).map((stat) => {
              const quotaPercent = stat.quota > 0 ? Math.min(100, Math.round((stat.count / stat.quota) * 100)) : 0;
              return (
                <div 
                  key={stat.name}
                  onClick={() => router.push(`/actor-data?coordinator=${encodeURIComponent(stat.name)}`)}
                  className={cn(
                    "group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl transition-all duration-300 ease-out overflow-hidden cursor-pointer active:scale-95 min-h-[165px] border shadow-sm hover:shadow-xl hover:-translate-y-1.5 animate-in fade-in slide-in-from-bottom-3",
                    "bg-white dark:bg-slate-900",
                    stat.isFull 
                      ? "border-emerald-200/90 dark:border-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-700 hover:shadow-emerald-500/10" 
                      : "border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-700 hover:shadow-indigo-500/10"
                  )}
                >
                  {/* Glowing Top Accent Stripe */}
                  <div 
                    className={cn(
                      "absolute top-0 left-0 right-0 h-1.5 transition-all duration-300",
                      stat.isFull 
                        ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" 
                        : "bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
                    )} 
                  />

                  {/* Top Row: Avatar & Status Badge */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div 
                      className={cn(
                        "w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm shrink-0",
                        stat.isFull 
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60" 
                          : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60"
                      )}
                    >
                      <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>

                    {stat.isFull ? (
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Penuh
                      </span>
                    ) : stat.quota > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 shrink-0">
                        Sisa {stat.remaining}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shrink-0">
                        Aktif
                      </span>
                    )}
                  </div>

                  {/* Middle: Coordinator Name & Berkas Count */}
                  <div className="space-y-1.5 my-2">
                    <h3 
                      className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors"
                      title={stat.name}
                    >
                      {stat.name}
                    </h3>
                    
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                        {stat.count}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Berkas
                      </span>
                    </div>

                    {/* Mini Progress Bar when quota > 0 */}
                    {stat.quota > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              stat.isFull ? "bg-emerald-500" : "bg-indigo-500"
                            )}
                            style={{ width: `${quotaPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] sm:text-[10px] text-slate-400 font-semibold">
                          <span>Target: {stat.quota}</span>
                          <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{quotaPercent}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Cue */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-primary group-hover:text-primary/90">
                    <span>Lihat Berkas</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>

                  {/* Ambient Glow in background */}
                  <div 
                    className={cn(
                      "absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl transition-all duration-700 pointer-events-none group-hover:scale-150",
                      stat.isFull ? "bg-emerald-500/10" : "bg-indigo-500/10"
                    )} 
                  />
                </div>
              );
            })}

            {!(isKuotaLoading || (!systemStats && isStatsLoading)) && coordinatorStats.filter(stat => stat.count > 0).length === 0 && (
               <div className="col-span-full py-16 text-center flex flex-col items-center gap-4 bg-white/60 dark:bg-slate-900/60 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                 <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    <Search className="w-8 h-8 text-slate-400" />
                 </div>
                 <p className="font-bold text-slate-400 uppercase tracking-wider text-xs sm:text-sm">Belum ada data koordinator ditemukan</p>
               </div>
            )}
          </div>
        )}
      </div>
    </div>

      <Dialog open={!!viewingActor} onOpenChange={(open) => {
        if (!open) {
          setViewingActor(null)
          setIsEditMode(false)
          setEditingBankMode(false)
          setEditingDriveMode(false)
        }
      }}>
        <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] p-4 sm:p-6 overflow-y-auto">
          {viewingActor && !editingBankMode && !editingDriveMode && (
            <div className="flex flex-col gap-2 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
                <div>
                  <DialogTitle className="text-xl md:text-2xl font-black text-primary uppercase">
                    {isEditMode ? "Edit Data Pelaku Usaha" : "Detail Pelaku Usaha"}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Informasi data registrasi dan hasil verifikasi</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {!isEditMode && viewingActor && !isKoordinator && !isInspektorat && (
                    <Button 
                      size="sm" 
                      onClick={() => handlePrintForm(viewingActor)}
                      className="font-bold bg-primary hover:bg-primary/90 text-white shadow-xs"
                    >
                      <Printer className="w-4 h-4 mr-1.5" /> Cetak Formulir
                    </Button>
                  )}
                  {!isEditMode && isAdmin && viewingActor && (viewingActor as any).surveyData && (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (database && viewingActor?.id && !(viewingActor as any).surveyData?.fotoSurveyUrl) {
                          get(ref(database, `businessActors/${viewingActor.id}`)).then(snap => {
                            if (snap.exists()) {
                              const full = { ...snap.val(), id: snap.key } as BusinessActor;
                              setViewingActor(full);
                              setSurveyViewActor(full);
                            } else {
                              setSurveyViewActor(viewingActor);
                            }
                          }).catch(() => setSurveyViewActor(viewingActor));
                        } else {
                          setSurveyViewActor(viewingActor);
                        }
                      }}
                      className="font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                    >
                      <ClipboardList className="w-4 h-4 mr-1.5" /> Lihat Form Survey
                    </Button>
                  )}
                  {!isAdmin && !isMonitoring && !isKoordinator && !isEditMode && viewingActor.status === 'verified_actor' && (
                    <Button 
                      size="sm" 
                      onClick={() => setEditingBankMode(true)}
                      className="font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                    >
                      <CreditCard className="w-4 h-4 mr-1.5" /> Input Rekening
                    </Button>
                  )}
                  {isAdmin && !isEditMode && (
                    <Button 
                      size="sm" 
                      onClick={() => setEditingDriveMode(true)}
                      className="font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-xs"
                    >
                      <Folder className="w-4 h-4 mr-1.5" /> Link Drive
                    </Button>
                  )}
                  {isAdmin && !isEditMode && viewingActor && (
                    <Button 
                      size="sm" 
                      onClick={() => handleSingleLanjutDinas(viewingActor)}
                      className="font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                      title="Push Data Susulan ke Verifikasi Dinas"
                    >
                      <Send className="w-4 h-4 mr-1.5" /> Lanjut Dinas (Susulan)
                    </Button>
                  )}
                  {isAdmin && (
                    <Button 
                      variant={isEditMode ? "outline" : "default"} 
                      size="sm" 
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={cn("font-bold shadow-xs", isEditMode ? "border-amber-500 text-amber-600" : "bg-primary")}
                    >
                      {isEditMode ? "Batal Edit" : <><Edit3 className="w-4 h-4 mr-1.5"/> Edit Semua Data</>}
                    </Button>
                  )}
                  {isAdmin && !isEditMode && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleRevert(viewingActor.id, viewingActor.fullName)} className="border-amber-500 text-amber-600 font-bold shadow-xs" title="Kembalikan ke antrean awal (Pending)">
                        <RotateCcw className="w-4 h-4 mr-1 md:mr-0" /> <span className="md:hidden">Revert</span>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(viewingActor.id, viewingActor.fullName)} className="font-bold shadow-xs" title="Hapus Permanen">
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
                  {/* 1. INFORMASI PRIBADI */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-1">
                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase">
                        <User className="w-4 h-4" /> Informasi Pribadi
                      </div>
                      <div className="flex items-center gap-1.5">
                        <VerificationBadge actor={viewingActor} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Reg ID", value: viewingActor.registrationCode, isCopyable: true },
                        { label: "Nama Lengkap", value: viewingActor.fullName },
                        { label: "NIK", value: viewingActor.nik, isCopyable: true },
                        { label: "Nomor KK", value: viewingActor.noKK, isCopyable: true },
                        { label: "Jenis Kelamin", value: normalizeGender(viewingActor.gender) || viewingActor.gender },
                        { label: "Tempat Lahir", value: viewingActor.pob || parsePobDob(viewingActor.pobDob).pob },
                        { label: "Tanggal Lahir", value: viewingActor.dob || parsePobDob(viewingActor.pobDob).dob },
                        { label: "Usia", value: calculateAge(viewingActor.dob || parsePobDob(viewingActor.pobDob).dob || extractDobFromNik(viewingActor.nik || "")) },
                        { label: "Nomor HP", value: viewingActor.phone, isPhone: true }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          {(item as any).isPhone && item.value ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={`https://wa.me/${String(item.value).replace(/\D/g, "").replace(/^0/, "62")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-bold text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                              >
                                {item.value}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyText(item.value || '', 'No HP')}
                                className="text-slate-400 hover:text-primary p-0.5"
                                title="Salin No HP"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (item as any).isCopyable && item.value ? (
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">{item.value}</p>
                              <button
                                type="button"
                                onClick={() => handleCopyText(item.value || '', item.label)}
                                className="text-slate-400 hover:text-primary p-0.5"
                                title={`Salin ${item.label}`}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.value || "-"}</p>
                          )}
                        </div>
                      ))}
                      <div className="sm:col-span-2 md:col-span-3 pt-2 border-t">
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

                  {/* 2. ALAMAT & DOMISILI */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                      <MapPin className="w-4 h-4" /> Alamat & Domisili
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Kecamatan", value: viewingActor.kecamatan },
                        { label: "Kelurahan", value: viewingActor.kelurahan },
                        { label: "RT/RW", value: viewingActor.rtRw },
                        { label: "Alamat Lengkap", value: viewingActor.address, fullWidth: true }
                      ].map((item, i) => (
                        <div key={i} className={item.fullWidth ? "sm:col-span-2 md:col-span-3 space-y-1" : "space-y-1"}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 3. INFORMASI USAHA */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                      <Building2 className="w-4 h-4" /> Informasi Usaha
                    </div>
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
                          { label: "Nama Usaha", value: viewingActor.businessName },
                          { label: "Kategori Usaha", value: viewingActor.businessCategory },
                          { label: "Lokasi Usaha", value: viewingActor.businessLocation || viewingActor.address },
                          ...(!isInspektorat ? [
                            { label: "USULAN / KOORDINATOR", value: viewingActor.coordinator },
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
                                      className="text-[11px] font-bold h-7 rounded border border-slate-300 dark:border-slate-700 bg-background px-2 py-0.5 shadow-xs text-primary cursor-pointer hover:border-primary transition-all w-full max-w-[220px]"
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
                                className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-xs transition-all active:scale-95 w-fit"
                                title="Klik untuk membuka obrolan WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20" />
                                <span>{item.value}</span>
                              </a>
                            ) : (
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.value || "-"}</p>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </section>

                  {/* 4. DATA PERBANKAN */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-1">
                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase">
                        <CreditCard className="w-4 h-4" /> Data Perbankan
                      </div>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingBankMode(true)}
                          className="h-7 text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" /> Ubah Rekening
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Nama Bank", value: viewingActor.bankName },
                        { label: "Nomor Rekening", value: viewingActor.bankNumber, isCopyable: true },
                        { label: "Nama Pemilik Rekening", value: viewingActor.bankOwner }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-primary">{item.value || "BELUM TERISI"}</p>
                            {item.isCopyable && item.value && (
                              <button
                                type="button"
                                onClick={() => handleCopyText(item.value || '', 'Nomor Rekening')}
                                className="text-slate-400 hover:text-primary p-0.5"
                                title="Salin Nomor Rekening"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 5. DATA TITIK LOKASI VERIFIKASI */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1">
                      <MapPin className="w-4 h-4" /> Data Titik Lokasi Verifikasi
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(viewingActor as any).verificationLocation && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Sumber: Verifikasi Admin</p>
                          <p className="text-xs font-mono text-emerald-800 dark:text-emerald-200 font-semibold">{(viewingActor as any).verificationLocation.lat}, {(viewingActor as any).verificationLocation.lon}</p>
                          <a href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocation.lat},${(viewingActor as any).verificationLocation.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline mt-2 inline-block">Lihat di Peta</a>
                        </div>
                      )}
                      {(viewingActor as any).verificationBypass?.isBypassed && (
                        <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Sumber: Verifikasi Admin (Bypass)</p>
                          <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-2">Alasan: {(viewingActor as any).verificationBypass.reason}</p>
                          {(viewingActor as any).verificationBypass.fileBase64 && (
                            <a href={(viewingActor as any).verificationBypass.fileBase64} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-amber-200 text-amber-800 px-3 py-1 rounded shadow-xs hover:bg-amber-300 transition-colors inline-block mt-1">Lihat Bukti Lampiran</a>
                          )}
                        </div>
                      )}
                      {(viewingActor as any).verificationLocationDinas && (
                        <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Sumber: Verifikasi Dinas</p>
                          <p className="text-xs font-mono text-indigo-800 dark:text-indigo-200 font-semibold">{(viewingActor as any).verificationLocationDinas.lat}, {(viewingActor as any).verificationLocationDinas.lon}</p>
                          <a href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocationDinas.lat},${(viewingActor as any).verificationLocationDinas.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline mt-2 inline-block">Lihat di Peta</a>
                        </div>
                      )}
                      {!(viewingActor as any).verificationLocation && !(viewingActor as any).verificationLocationDinas && !(viewingActor as any).verificationBypass?.isBypassed && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 col-span-full">
                          <p className="text-xs font-medium text-slate-500 text-center">Belum ada titik lokasi yang direkam.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* 6. BERKAS TAMBAHAN (GOOGLE DRIVE) */}
                  {viewingActor.googleDriveLink && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Folder className="w-4 h-4" /> Berkas Tambahan (Google Drive)</div>
                      <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-100 dark:border-blue-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold text-blue-800 dark:text-blue-200 uppercase">Folder Google Drive Pelaku Usaha</p>
                          <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mt-1">Berisi foto, video, dokumen usulan, atau file lainnya</p>
                        </div>
                        <a href={viewingActor.googleDriveLink} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold px-4 py-2.5 rounded-lg text-xs shadow-xs flex items-center justify-center min-w-[140px]">
                          Buka Folder Drive
                        </a>
                      </div>
                    </section>
                  )}

                  {/* 7. INFORMASI SISTEM & AUDIT */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Informasi Sistem & Audit</div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-xs font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200 dark:border-slate-800">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Status Alur Sistem</p>
                        <p className="capitalize text-primary">{(viewingActor.status || "").replace('_', ' ')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Petugas Input</p>
                        <p className="text-slate-800 dark:text-slate-200">{viewingActor.createdBy || "System"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Waktu Pendaftaran</p>
                        <p className="text-slate-800 dark:text-slate-200">{viewingActor.createdAt ? new Date(viewingActor.createdAt).toLocaleString('id-ID') : "-"}</p>
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

              {/* ── LAYOUT 2 KOLOM MENYAMPING ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* ── KOLOM KIRI: DETAIL PELAKU USAHA ── */}
                <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500">
                          <User className="w-3.5 h-3.5" /> Detail Pelaku Usaha
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-snug">
                          {viewingActor.fullName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                            NIK: {viewingActor.nik || "-"}
                          </span>
                          {viewingActor.noKK && (
                            <span className="font-mono text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              KK: {viewingActor.noKK}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block text-[10px] font-black px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-lg uppercase border border-amber-200 dark:border-amber-800">
                          {viewingActor.kelurahan || "Kelurahan"}
                        </span>
                        {viewingActor.kecamatan && (
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase">
                            Kec. {viewingActor.kecamatan}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Usaha & Kategori
                        </p>
                        <p className="font-black text-slate-900 dark:text-slate-100 uppercase text-sm">
                          {viewingActor.businessName || "-"}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {viewingActor.businessCategory || "Kategori Belum Ditentukan"}
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Alamat / Lokasi Usaha
                        </p>
                        <p className="font-medium text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                          {viewingActor.address || viewingActor.businessLocation || "-"} {viewingActor.rtRw ? `(RT/RW ${viewingActor.rtRw})` : ""}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {viewingActor.phone && (
                          <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[9px] font-bold uppercase text-slate-400 block">No. HP / WhatsApp</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                              <MessageCircle className="w-3 h-3" /> {viewingActor.phone}
                            </span>
                          </div>
                        )}
                        {viewingActor.coordinator && (
                          <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[9px] font-bold uppercase text-slate-400 block">Usulan / Koord</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase block truncate mt-0.5">
                              {viewingActor.coordinator}
                            </span>
                          </div>
                        )}
                      </div>

                      {(viewingActor as any).petugasSurvey && (
                        <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase text-slate-400">Petugas Survey:</span>
                          <span className="font-black text-emerald-700 dark:text-emerald-400 uppercase text-xs">
                            {(viewingActor as any).petugasSurvey}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── KOLOM KANAN: FORM INPUT REKENING ── */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <form onSubmit={handleSaveBank} className="h-full flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500">
                          <CreditCard className="w-3.5 h-3.5" /> Formulir Rekening Bank
                        </span>
                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">
                          Input Data Rekening
                        </h4>
                      </div>

                      <div className="space-y-3.5">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                            Pilih Nama Bank <span className="text-rose-500">*</span>
                          </Label>
                          <Select name="bankName" defaultValue={viewingActor.bankName}>
                            <SelectTrigger className="w-full h-11 font-bold text-sm bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                              <SelectValue placeholder="Pilih Bank..." />
                            </SelectTrigger>
                            <SelectContent>
                              {BANK_LIST.map(bank => (
                                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-black uppercase text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4" /> Nomor Rekening <span className="text-rose-500">*</span>
                            </Label>
                            <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded uppercase tracking-wide">
                              Ukuran Besar & Jelas
                            </span>
                          </div>
                          <Input
                            name="bankNumber"
                            defaultValue={viewingActor.bankNumber}
                            placeholder="Contoh: 1234567890"
                            className="h-16 font-mono font-black tracking-widest text-slate-900 dark:text-slate-100 bg-amber-50/60 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-500 focus-visible:border-amber-500 focus-visible:ring-4 focus-visible:ring-amber-500/20 rounded-xl px-4 shadow-sm"
                            style={{ fontSize: "28px", fontWeight: "900", letterSpacing: "0.1em" }}
                            autoComplete="off"
                            spellCheck={false}
                            required
                            autoFocus
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                            Nama Pemilik Sesuai Rekening <span className="text-rose-500">*</span>
                          </Label>
                          <Input
                            name="bankOwner"
                            defaultValue={viewingActor.bankOwner || viewingActor.fullName}
                            className="h-11 font-bold uppercase text-sm bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus-visible:border-amber-500 rounded-xl px-3.5"
                            placeholder="Contoh: AGUS SURIYADI"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <Button type="button" variant="ghost" onClick={() => setEditingBankMode(false)}>Batal</Button>
                      <Button type="submit" className="min-w-[170px] bg-primary font-bold h-11"><Save className="w-4 h-4 mr-2" /> Simpan & Proses LPJ</Button>
                    </div>
                  </form>
                </div>
              </div>
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
      <Dialog open={!!surveyViewActor} onOpenChange={(open) => { 
        if (!open) {
          setSurveyViewActor(null)
          setSurveyPhotoUrl(null)
        }
      }}>
        <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border bg-slate-50/50 dark:bg-slate-900/90">
          {surveyViewActor && (() => {
            const actor = surveyViewActor
            const sd = (actor as any).surveyData || {}
            const pobDobData = parsePobDob(actor.pobDob || "")
            const ageDisplay = calculateAge(actor.dob || pobDobData.dob || extractDobFromNik(actor.nik || ""))
            
            const Field = ({ label, value, className }: { label: string; value?: React.ReactNode | string | null; className?: string }) => (
              <div className={cn("space-y-0.5", className)}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <div className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-200 break-words">{value || '-'}</div>
              </div>
            )

            const petugasNama = actor.petugasSurvey || sd.pejabatData?.petugas?.nama || (actor as any).surveyData?.pejabatData?.petugas?.nama || ""
            const verifikatorNama = actor.verifikatorDinas || sd.pejabatData?.verifikator?.nama || (actor as any).berkasDinasVerifiedBy || ""
            const surveyLocation = (sd.location?.lat && sd.location?.lon) ? sd.location : actor.verificationLocationDinas

            return (
              <div className="flex flex-col h-full max-h-[92vh] overflow-hidden">
                {/* Modal Top Header */}
                <div className="bg-white dark:bg-slate-900 px-4 py-3 md:px-6 md:py-4 border-b flex flex-row items-center justify-between gap-3 shrink-0 shadow-sm pr-12 md:pr-14">
                  <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                    <div className="p-2 md:p-2.5 bg-teal-500/10 text-teal-700 dark:text-teal-400 rounded-xl border border-teal-500/20 shadow-sm shrink-0">
                      <ClipboardList className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="text-sm md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex flex-wrap items-center gap-1.5 md:gap-2">
                        <span>Form Survey Lengkap</span>
                        <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-200 text-[9px] md:text-[10px] font-black uppercase px-2 py-0.5 whitespace-nowrap">
                          Dinas UKM
                        </Badge>
                      </DialogTitle>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5 flex-wrap truncate">
                        <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{actor.fullName}</span>
                        <span>&bull;</span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">NIK: {actor.nik}</span>
                        {actor.coordinator && (
                          <>
                            <span>&bull;</span>
                            <span className="text-teal-700 dark:text-teal-300 font-bold uppercase">Koor: {actor.coordinator}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn(
                      "font-black text-[10px] md:text-xs uppercase px-2.5 py-1 rounded-lg border",
                      actor.status === 'finish' ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                      actor.status === 'verified_dinas' ? "bg-blue-50 text-blue-700 border-blue-300" :
                      actor.status === 'lpj_pending' ? "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-300" :
                      "bg-slate-100 text-slate-700 border-slate-300"
                    )}>
                      {actor.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Modal Body: Split 2 Kolom (Kiri: Data Pelaku Usaha + Foto Survey | Kanan: Data Survey Lengkap + Tanggal & Petugas) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start">

                    {/* ══════════════════════════════════════════════════════════
                        KOLOM KIRI: DATA PELAKU USAHA & FOTO SURVEY
                       ══════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* 1. Foto Survey Card */}
                      <div className="bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-black text-xs uppercase tracking-wide">
                            <Camera className="w-4 h-4" /> Foto Survey Lapangan
                          </div>
                          {surveyPhotoUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowFullPhotoDialog(true)}
                              className="h-6 px-2 text-[10px] font-bold text-teal-700 hover:bg-teal-50 flex items-center gap-1"
                            >
                              <Maximize2 className="w-3 h-3" /> Perbesar
                            </Button>
                          )}
                        </div>

                        {isSurveyPhotoLoading ? (
                          <div className="h-60 rounded-xl bg-slate-50 dark:bg-slate-900/60 border flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                            <span className="text-xs font-bold text-slate-500">Memuat Foto Survey...</span>
                          </div>
                        ) : surveyPhotoUrl ? (
                          <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 shadow-sm">
                            <img
                              src={surveyPhotoUrl}
                              alt="Foto Survey Lapangan"
                              className="w-full max-h-72 object-contain bg-slate-900 cursor-pointer hover:opacity-95 transition-opacity"
                              onClick={() => setShowFullPhotoDialog(true)}
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setShowFullPhotoDialog(true)}
                              className="absolute bottom-2.5 right-2.5 h-7 px-2.5 bg-black/70 hover:bg-black text-white text-[10px] font-bold backdrop-blur-sm rounded-lg flex items-center gap-1.5 shadow-md"
                            >
                              <Maximize2 className="w-3 h-3" /> Lihat Ukuran Penuh
                            </Button>
                          </div>
                        ) : (
                          <div className="h-44 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex flex-col items-center justify-center gap-2 text-slate-400 p-4 text-center">
                            <Camera className="w-8 h-8 text-slate-300" />
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Foto Survey Belum Diunggah</p>
                            <p className="text-[10px] text-slate-400 max-w-[220px]">Petugas lapangan belum melampirkan foto saat proses survey</p>
                          </div>
                        )}
                      </div>

                      {/* 2. Identitas Pelaku Usaha */}
                      <div className="bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-black text-xs uppercase tracking-wide">
                            <User className="w-4 h-4" /> Identitas Pelaku Usaha
                          </div>
                          <Badge variant="outline" className="text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                            DATA KTP
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="Nama Lengkap" value={<span className="uppercase text-slate-900 dark:text-white font-black">{actor.fullName || "-"}</span>} className="sm:col-span-2" />
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NIK</p>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs md:text-sm font-black text-slate-800 dark:text-slate-200">{actor.nik || "-"}</span>
                              {actor.nik && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(actor.nik)
                                    toast({ title: "NIK Disalin", description: `${actor.nik}` })
                                  }}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                  title="Salin NIK"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <Field label="No. Kartu Keluarga" value={<span className="font-mono">{actor.noKK || "-"}</span>} />
                          <Field label="Jenis Kelamin" value={actor.gender || "-"} />
                          <Field 
                            label="Tempat, Tgl Lahir" 
                            value={
                              <span>
                                {pobDobData.pob || actor.pob || "-"}, {pobDobData.dob || actor.dob || "-"}
                                {ageDisplay !== "-" && <span className="text-slate-500 font-bold ml-1">({ageDisplay})</span>}
                              </span>
                            } 
                          />
                          <div className="space-y-0.5 sm:col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nomor HP / WhatsApp</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs md:text-sm font-black text-slate-800 dark:text-slate-200">{actor.phone || "-"}</span>
                              {actor.phone && (
                                <a
                                  href={`https://wa.me/${String(actor.phone).replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors shadow-sm"
                                  title="Chat via WhatsApp"
                                >
                                  <Phone className="w-2.5 h-2.5" /> WhatsApp
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Alamat Domisili KTP */}
                          <div className="sm:col-span-2 pt-2 border-t space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alamat Domisili KTP</p>
                            <p className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-200 uppercase">
                              {actor.address || "-"} RT/RW {actor.rtRw || "-"}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase flex-wrap">
                              <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                Kel. {actor.kelurahan || "-"}
                              </span>
                              <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                Kec. {actor.kecamatan || "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Informasi Usaha (Pendaftaran) */}
                      <div className="bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-black text-xs uppercase tracking-wide">
                            <Building2 className="w-4 h-4" /> Informasi Usaha (Pendaftaran)
                          </div>
                          <Badge variant="outline" className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200">
                            DATABASE
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="Nama Usaha" value={<span className="text-primary font-black uppercase">{actor.businessName || "-"}</span>} className="sm:col-span-2" />
                          <Field label="Kategori Usaha" value={<Badge variant="secondary" className="font-bold text-[10px] uppercase">{actor.businessCategory || "-"}</Badge>} />
                          <Field label="Koordinator Pengusul" value={<span className="font-bold uppercase text-slate-700 dark:text-slate-300">{actor.coordinator || "-"}</span>} />
                          <Field label="Lokasi Tempat Usaha" value={<span className="uppercase">{actor.businessLocation || "-"}</span>} className="sm:col-span-2" />
                          <Field 
                            label="Rekening Bank" 
                            value={
                              actor.bankNumber ? (
                                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {actor.bankName || "Bank"} - {actor.bankNumber}
                                  {actor.bankOwner && <span className="block text-[10px] text-slate-500 font-sans">a.n. {actor.bankOwner}</span>}
                                </span>
                              ) : "Belum Diinput"
                            } 
                            className="sm:col-span-2"
                          />
                          <Field label="Tanggal Masuk Data" value={<span className="font-medium text-xs">{formatDateTimeIndo(actor.createdAt)}</span>} className="sm:col-span-2" />
                        </div>
                      </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════
                        KOLOM KANAN: DATA SURVEY LENGKAP, TANGGAL & PETUGAS SURVEY
                       ══════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* 1. Highlight Banner: Tanggal Survey & Petugas Survey */}
                      <div className="bg-gradient-to-br from-teal-50 via-emerald-50/70 to-teal-50/40 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-teal-950/20 border-2 border-teal-300/80 dark:border-teal-700/80 rounded-2xl p-4 md:p-5 shadow-sm space-y-3.5 overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* Tanggal Survey */}
                          <div className="bg-white/90 dark:bg-slate-900/90 rounded-xl p-3.5 border border-teal-100 dark:border-teal-900 shadow-sm flex items-start gap-3">
                            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-sm shrink-0">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider">Tanggal Survey</p>
                              <p className="text-sm md:text-base font-black text-slate-900 dark:text-white mt-0.5">
                                {sd.tanggalSurvey ? (formatTanggalIndonesia(sd.tanggalSurvey).fullText || sd.tanggalSurvey) : "-"}
                              </p>
                              {actor.verifiedDinasAt && (
                                <p className="text-[10px] text-teal-700/90 dark:text-teal-400 font-semibold mt-0.5">
                                  Verifikasi: {formatDateTimeIndo(actor.verifiedDinasAt)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Petugas Survey */}
                          <div className="bg-white/90 dark:bg-slate-900/90 rounded-xl p-3.5 border border-teal-100 dark:border-teal-900 shadow-sm flex items-start gap-3">
                            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-sm shrink-0">
                              <UserCheck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider">Petugas Survey</p>
                              <p className="text-sm md:text-base font-black text-slate-900 dark:text-white uppercase mt-0.5 break-words" title={petugasNama || "-"}>
                                {petugasNama || "-"}
                              </p>
                              {(sd.pejabatData?.petugas?.nipppk || sd.pejabatData?.petugas?.jabatan) && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 break-words">
                                  {sd.pejabatData.petugas.nipppk ? `NIP: ${sd.pejabatData.petugas.nipppk}` : ''} {sd.pejabatData.petugas.jabatan ? `(${sd.pejabatData.petugas.jabatan})` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Baris Tambahan: Verifikator & Hasil Rekomendasi */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2.5 border-t border-teal-200/70 dark:border-teal-800/50 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 flex-wrap min-w-0">
                            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                            <span className="font-bold text-[11px] shrink-0">Verifikator Dinas:</span>
                            <strong className="text-slate-900 dark:text-white uppercase break-words">
                              {verifikatorNama || "-"}
                            </strong>
                            {sd.pejabatData?.verifikator?.nipppk && (
                              <span className="text-[10px] font-mono text-slate-500 break-all">
                                (NIP: {sd.pejabatData.verifikator.nipppk})
                              </span>
                            )}
                          </div>

                          <div className="flex items-start sm:items-center gap-1.5 min-w-0 max-w-full">
                            <span className="font-bold text-[11px] text-slate-600 dark:text-slate-400 shrink-0 mt-0.5 sm:mt-0">Hasil:</span>
                            <div className={cn(
                              "text-[10px] md:text-xs font-black uppercase px-2.5 py-1 rounded-lg shadow-sm leading-relaxed whitespace-normal break-words max-w-full inline-block text-left",
                              sd.hasilSurvey === 'Layak' ? "bg-emerald-600 text-white" :
                              sd.hasilSurvey === 'Tidak Layak' ? "bg-rose-600 text-white" :
                              "bg-teal-600 text-white"
                            )}>
                              {sd.hasilSurvey || "-"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Informasi Pemilik Usaha (Survey) */}
                      <div className="bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-black text-xs uppercase tracking-wide">
                            <User className="w-4 h-4" /> Informasi Pemilik Usaha (Hasil Survey)
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <Field label="Nama Pemilik" value={<span className="uppercase font-black text-slate-900 dark:text-white">{sd.namaPemilik || "-"}</span>} />
                          <Field label="Jenis Kelamin" value={sd.jenisKelamin || "-"} />
                          <Field label="Status Perkawinan" value={<span className="font-bold text-slate-800 dark:text-slate-200">{sd.status || "-"}</span>} />
                          <Field label="Alamat Rumah Survey" value={<span className="uppercase">{sd.alamatRumah || "-"}</span>} className="sm:col-span-2 lg:col-span-3" />
                          <Field label="Nomor HP Survey" value={<span className="font-mono font-bold">{sd.noHp || "-"}</span>} />
                          <Field label="Email" value={sd.email || "-"} />
                          <Field label="Sosial Media" value={sd.sosmed || "-"} />
                        </div>
                      </div>

                      {/* 3. DTKS (Data Terpadu Kesejahteraan Sosial) */}
                      <div className="bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
                            <CheckCircle2 className="w-4 h-4" /> Data Terpadu Kesejahteraan Sosial (DTKS)
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terdaftar di DTKS</p>
                            <Badge className={cn(
                              "text-xs font-black uppercase px-2.5 py-0.5 mt-0.5",
                              sd.dtks?.masuk ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-100 text-slate-700 border-slate-200"
                            )}>
                              {sd.dtks?.masuk === undefined ? "-" : sd.dtks.masuk ? "Ya (Terdaftar DTKS)" : "Tidak Terdaftar"}
                            </Badge>
                          </div>
                          {sd.dtks?.masuk && (
                            <Field label="Jenis Bantuan Sosial" value={<Badge className="bg-emerald-600 text-white font-black text-xs">{sd.dtks?.jenis || "Bansos Pemerintah"}</Badge>} />
                          )}
                        </div>
                      </div>

                      {/* 4. Informasi Usaha (Hasil Survey Lapangan) */}
                      <div className="bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-black text-xs uppercase tracking-wide">
                            <Store className="w-4 h-4" /> Informasi Usaha Lapangan (Survey)
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <Field label="Nama Usaha (Survey)" value={<span className="font-black text-teal-700 dark:text-teal-400 uppercase">{sd.namaUsaha || "-"}</span>} />
                          <Field label="Bidang Usaha" value={sd.bidangUsaha || "-"} />
                          <Field label="Tahun Berdiri" value={sd.tahunBerdiri || "-"} />
                          <Field label="Peralatan Usaha" value={sd.peralatan || "-"} className="sm:col-span-2 lg:col-span-3" />
                          <Field label="Izin Usaha" value={(sd.izin && sd.izin.length > 0) ? sd.izin.join(', ') : '-'} />
                          <Field label="Estimasi Modal Usaha" value={<span className="font-bold text-slate-800 dark:text-slate-200">{sd.modalUsaha ? formatCurrency(sd.modalUsaha) : '-'}</span>} />
                          <Field label="Estimasi Omset / Bulan" value={<span className="font-bold text-slate-800 dark:text-slate-200">{sd.omset ? formatCurrency(sd.omset) : '-'}</span>} />
                        </div>
                      </div>

                      {/* 5. Riwayat Hibah */}
                      <div className="bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black text-xs uppercase tracking-wide">
                            <CreditCard className="w-4 h-4" /> Riwayat Hibah Bantuan
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pernah Menerima Hibah</p>
                            <Badge className={cn(
                              "text-xs font-black uppercase px-2.5 py-0.5 mt-0.5",
                              sd.hibah?.pernah ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-slate-100 text-slate-700 border-slate-200"
                            )}>
                              {sd.hibah?.pernah === undefined ? "-" : sd.hibah.pernah ? "Pernah Menerima" : "Belum Pernah"}
                            </Badge>
                          </div>
                          {sd.hibah?.pernah && (
                            <>
                              <Field label="Sumber Bantuan / Instansi" value={sd.hibah?.dariMana || "-"} />
                              <Field label="Tahun Menerima" value={sd.hibah?.tahun || "-"} />
                            </>
                          )}
                        </div>
                      </div>

                      {/* 6. Rencana Penggunaan Bantuan & Hasil Survey */}
                      <div className="bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-black text-xs uppercase tracking-wide">
                            <ClipboardCheck className="w-4 h-4" /> Rencana Penggunaan & Hasil Rekomendasi
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rencana Penggunaan Bantuan Hibah</p>
                            <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">{sd.rencanaPenggunaan || '-'}</p>
                          </div>
                          <div className="p-3 bg-teal-50/80 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 space-y-1">
                            <p className="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-wider">Hasil Rekomendasi Petugas Survey Lapangan</p>
                            <p className="text-xs md:text-sm font-black text-teal-900 dark:text-teal-100 break-words leading-relaxed">{sd.hasilSurvey || '-'}</p>
                          </div>
                          {(actor.keteranganDinas || (actor as any).filingNote) && (
                            <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/60 space-y-1">
                              <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">Catatan Tambahan Dinas</p>
                              <p className="text-xs font-bold text-blue-900 dark:text-blue-100">{actor.keteranganDinas || (actor as any).filingNote}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 7. Lokasi Geotagging GPS */}
                      {surveyLocation && surveyLocation.lat && surveyLocation.lon && (
                        <div className="bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 shadow-sm shrink-0">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lokasi Geotagging Survey</p>
                              <p className="text-xs md:text-sm font-mono font-black text-slate-800 dark:text-white">
                                Lat: {surveyLocation.lat}, Lon: {surveyLocation.lon}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`https://www.google.com/maps?q=${surveyLocation.lat},${surveyLocation.lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-3 py-1.5 rounded-xl border transition-colors shadow-sm shrink-0"
                          >
                            <Navigation className="w-3.5 h-3.5 text-rose-600" /> Buka di Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-white dark:bg-slate-900 px-5 py-3 md:px-6 md:py-3.5 border-t flex items-center justify-between gap-3 shrink-0 shadow-sm">
                  <div className="text-[11px] text-slate-500 font-medium hidden sm:flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-teal-600" />
                    <span>SIMPU &bull; Sistem Informasi Manajemen Pelaku Usaha Kota Tanjungpinang</span>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSurveyViewActor(null)
                      setSurveyPhotoUrl(null)
                    }} 
                    className="font-bold px-6 rounded-xl hover:bg-slate-100"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog Preview Foto Penuh */}
      {showFullPhotoDialog && surveyPhotoUrl && (
        <Dialog open={showFullPhotoDialog} onOpenChange={setShowFullPhotoDialog}>
          <DialogContent className="max-w-4xl max-h-[92vh] p-3 flex flex-col items-center justify-center bg-black/95 border-slate-800 text-white rounded-2xl overflow-hidden">
            <div className="w-full flex justify-between items-center px-3 py-1.5 border-b border-white/10 mb-2">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-teal-300">
                <Camera className="w-4 h-4 text-teal-400" /> Foto Survey Lapangan &mdash; {surveyViewActor?.fullName}
              </span>
              <Button size="sm" variant="ghost" className="h-7 text-white hover:bg-white/10 rounded-lg" onClick={() => setShowFullPhotoDialog(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden w-full p-2">
              <img
                src={surveyPhotoUrl}
                alt="Foto Survey Lapangan"
                className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

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
