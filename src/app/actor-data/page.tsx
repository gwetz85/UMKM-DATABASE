
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
import { Printer, Edit3, Loader2, Save, Trash2, Eye, User, Users, CreditCard, History, X, RotateCcw, Building2, MapPin, CheckCircle2, Store, Search, ChevronRight, ChevronDown, Download, FileSpreadsheet, ArrowLeft, BarChart3, RefreshCw, ClipboardCheck, Send, Folder, MessageCircle, ClipboardList, Camera, Copy, Check, MoreVertical, ExternalLink, Calendar, Phone, PhoneCall, Sparkles, Navigation, UserCheck, Maximize2, ShieldCheck, BadgeCheck, UploadCloud, Ban, XCircle, AlertTriangle, Database, FileText, Briefcase, Heart, Mail, Globe, Banknote, Layers } from "lucide-react"
import * as XLSX from "xlsx"

import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { BusinessActor } from "../lib/types"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckDataIndicator } from "@/components/check-data-indicator"
import { VerificationBadge } from "@/components/verification-badge"
import { ActorMenuBadge } from "@/components/actor-menu-badge"
import { getActorCurrentMenu } from "@/lib/actor-menu-status"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ConfirmDialog } from "@/components/confirm-dialog"


const normalizeGender = (g: string, nik?: string) => {
  const val = (g || "").toLowerCase().trim();
  if (val === "l" || val === "laki-laki" || val.includes("laki") || val === "pria") return "Laki-laki";
  if (val === "p" || val === "perempuan" || val.includes("perempuan") || val === "wanita") return "Perempuan";
  if (nik && nik.replace(/\D/g, "").length >= 8) {
    const cleanNik = nik.replace(/\D/g, "");
    const day = parseInt(cleanNik.substring(6, 8), 10);
    if (!isNaN(day)) {
      return day > 40 ? "Perempuan" : "Laki-laki";
    }
  }
  return "";
};

const GenderAvatar = ({ isFemale, className }: { isFemale: boolean; className?: string }) => {
  if (isFemale) {
    // Avatar Anak Perempuan (Perempuan)
    return (
      <div
        className={cn(
          "w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full overflow-hidden border-2 border-rose-200 dark:border-rose-800 shadow-xs shrink-0 bg-gradient-to-b from-rose-100 to-pink-200 dark:from-rose-950 dark:to-pink-900 flex items-center justify-center",
          className
        )}
        title="Perempuan"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Background Circle */}
          <circle cx="50" cy="50" r="50" fill="url(#girlBg)" />
          {/* Back Hair & Pigtails */}
          <circle cx="22" cy="48" r="12" fill="#2D1B18" />
          <circle cx="78" cy="48" r="12" fill="#2D1B18" />
          <path d="M24 38C24 22 35 15 50 15C65 15 76 22 76 38V66H24V38Z" fill="#2D1B18" />
          {/* Hair Ribbons / Clips */}
          <circle cx="26" cy="40" r="4.5" fill="#F43F5E" />
          <circle cx="74" cy="40" r="4.5" fill="#F43F5E" />
          {/* Shirt / Outfit */}
          <path d="M22 100C24 80 35 74 50 74C65 74 76 80 78 100H22Z" fill="#E11D48" />
          {/* Peter Pan White Collar */}
          <path d="M38 74L50 84L43 87L34 77Z" fill="#FFFFFF" />
          <path d="M62 74L50 84L57 87L66 77Z" fill="#FFFFFF" />
          {/* Neck */}
          <rect x="44" y="64" width="12" height="13" rx="6" fill="#F5CBA7" />
          {/* Ears */}
          <circle cx="28" cy="50" r="5" fill="#F5CBA7" />
          <circle cx="72" cy="50" r="5" fill="#F5CBA7" />
          {/* Earring dots */}
          <circle cx="28" cy="53" r="1.5" fill="#FBBF24" />
          <circle cx="72" cy="53" r="1.5" fill="#FBBF24" />
          {/* Face */}
          <rect x="30" y="27" width="40" height="42" rx="20" fill="#FFE0C2" />
          {/* Cheeks Blush */}
          <ellipse cx="37" cy="53" rx="4.5" ry="2.5" fill="#FB7185" fillOpacity="0.45" />
          <ellipse cx="63" cy="53" rx="4.5" ry="2.5" fill="#FB7185" fillOpacity="0.45" />
          {/* Eyes */}
          <circle cx="40" cy="46" r="3.2" fill="#1E293B" />
          <circle cx="60" cy="46" r="3.2" fill="#1E293B" />
          <circle cx="41" cy="44.8" r="1.1" fill="#FFFFFF" />
          <circle cx="61" cy="44.8" r="1.1" fill="#FFFFFF" />
          {/* Eyelashes */}
          <path d="M36 44L34.5 42.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M64 44L65.5 42.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
          {/* Eyebrows */}
          <path d="M36 39.5C38 38 42 38 44 39.5" stroke="#3E2723" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M56 39.5C58 38 62 38 64 39.5" stroke="#3E2723" strokeWidth="1.8" strokeLinecap="round" />
          {/* Cute Smile */}
          <path d="M44 56C46 59.5 54 59.5 56 56" stroke="#BE123C" strokeWidth="2.2" strokeLinecap="round" />
          {/* Front Hair Bangs */}
          <path d="M28 42C28 26 38 18 50 18C62 18 72 26 72 42C66 36 58 31 50 35C42 31 34 36 28 42Z" fill="#3E2723" />
          <defs>
            <linearGradient id="girlBg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFE4E6" />
              <stop offset="1" stopColor="#FECDD3" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Avatar Anak Laki-laki (Laki-laki)
  return (
    <div
      className={cn(
        "w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full overflow-hidden border-2 border-sky-200 dark:border-sky-800 shadow-xs shrink-0 bg-gradient-to-b from-sky-100 to-blue-200 dark:from-sky-950 dark:to-blue-900 flex items-center justify-center",
        className
      )}
      title="Laki-laki"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background Circle */}
        <circle cx="50" cy="50" r="50" fill="url(#boyBg)" />
        {/* Shirt / Hoodie */}
        <path d="M20 100C22 79 34 73 50 73C66 73 78 79 80 100H20Z" fill="#0284C7" />
        {/* Inner White Crew Neck & Collar */}
        <path d="M41 73L50 83L59 73H41Z" fill="#FFFFFF" />
        <path d="M36 74L45 84L40 87L32 77Z" fill="#38BDF8" />
        <path d="M64 74L55 84L60 87L68 77Z" fill="#38BDF8" />
        {/* Neck */}
        <rect x="44" y="63" width="12" height="13" rx="6" fill="#F5CBA7" />
        {/* Ears */}
        <circle cx="28" cy="49" r="5.5" fill="#F5CBA7" />
        <circle cx="72" cy="49" r="5.5" fill="#F5CBA7" />
        {/* Face */}
        <rect x="30" y="27" width="40" height="42" rx="20" fill="#FFE0C2" />
        {/* Subtle Cheeks */}
        <ellipse cx="37" cy="53" rx="4" ry="2.2" fill="#F87171" fillOpacity="0.35" />
        <ellipse cx="63" cy="53" rx="4" ry="2.2" fill="#F87171" fillOpacity="0.35" />
        {/* Eyes */}
        <circle cx="40" cy="46" r="3.2" fill="#0F172A" />
        <circle cx="60" cy="46" r="3.2" fill="#0F172A" />
        <circle cx="41" cy="44.8" r="1.1" fill="#FFFFFF" />
        <circle cx="61" cy="44.8" r="1.1" fill="#FFFFFF" />
        {/* Eyebrows */}
        <path d="M35.5 39.5C38 38 42.5 38 44.5 39.5" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M55.5 39.5C57.5 38 62 38 64.5 39.5" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
        {/* Cheerful Smile */}
        <path d="M43.5 55.5C46 59.5 54 59.5 56.5 55.5" stroke="#9A3412" strokeWidth="2.3" strokeLinecap="round" />
        {/* Short Boy Hair with Spiky Fringe */}
        <path d="M27 42C26 26 36 16 50 16C64 16 74 26 73 42C70 34 64 31 57 33C53 29 46 30 42 34C36 31 30 35 27 42Z" fill="#1E293B" />
        <path d="M44 17C47 12 53 12 56 16" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
        <defs>
          <linearGradient id="boyBg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E0F2FE" />
            <stop offset="1" stopColor="#BAE6FD" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const getActorMapUrl = (actor: BusinessActor) => {
  const loc = (actor as any).verificationLocationDinas || (actor as any).verificationLocation || (actor as any).surveyData?.lokasiSurvey;
  if (loc && loc.lat && loc.lon) return `https://www.google.com/maps?q=${loc.lat},${loc.lon}`;
  if ((actor as any).lat && (actor as any).lon) return `https://www.google.com/maps?q=${(actor as any).lat},${(actor as any).lon}`;
  const query = [actor.businessLocation || actor.address, actor.kelurahan, actor.kecamatan, "Tanjungpinang"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};


import { cn, extractDobFromNik, parsePobDob, calculateAge, formatCurrency, formatDateTimeIndo, AGAMA_INDONESIA, STATUS_KELUARGA_LIST, PEKERJAAN_DUKCAPIL } from "@/lib/utils"
import { normalizeCoordinator } from "@/lib/coordinator-utils"
import { resolveSurveyorCanonicalName, buildSurveyorMaps } from "@/lib/surveyor-utils"
import { generateRegistrationForm, generateCoordinatorReport, generateAllCoordinatorsReport } from "@/lib/pdf-generator"
import { formatTanggalIndonesia } from "@/lib/generate-berita-acara-pdf"
import { getSurveyPhoto } from "@/lib/survey-photo-service"
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
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [filterMenu, setFilterMenu] = useState<string>("all")

  const handleCopyText = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    setTimeout(() => setCopiedField(null), 1500)
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
  }, [searchQuery, filterCoordinator, filterMenu])

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

  const bpjsComparisonRef = useMemoFirebase(() => database ? ref(database, 'settings/bpjs_comparison_data') : null, [database])
  const { data: rawBpjsData } = useList(bpjsComparisonRef)

  const bpjsLookupMap = useMemo(() => {
    const map = new Map<string, any>()
    if (!rawBpjsData) return map
    rawBpjsData.forEach((item: any) => {
      if (item && item.nik) {
        const clean = String(item.nik).replace(/\D/g, '')
        if (clean) map.set(clean, item)
      }
      if (item && item.nama) {
        map.set(String(item.nama).trim().toUpperCase(), item)
      }
    })
    return map
  }, [rawBpjsData])

  const getActorBpjsStatus = (actor: BusinessActor) => {
    const cleanNik = actor.nik ? String(actor.nik).replace(/\D/g, '') : ""
    const upperName = actor.fullName ? String(actor.fullName).trim().toUpperCase() : ""
    const bpjsItem = (cleanNik ? bpjsLookupMap.get(cleanNik) : null) || (upperName ? bpjsLookupMap.get(upperName) : null)

    const rawKet = (
      bpjsItem?.keterangan || 
      (actor as any).bpjsCheckNote || 
      (actor as any).bpjsKeterangan || 
      ""
    ).toUpperCase().trim()

    const rawStatus = (
      bpjsItem?.status || 
      (actor as any).bpjsStatus || 
      ""
    ).toUpperCase().trim()

    const hasMatch = Boolean(
      bpjsItem || 
      (actor as any).bpjsCheckStatus || 
      (actor as any).bpjsStatus || 
      (actor as any).bpjsKeterangan || 
      (actor as any).bpjsCheckNote
    )

    if (!hasMatch) {
      return {
        hasMatch: false,
        isVerified: false,
        type: 'none' as const,
        badgeLabel: '',
        cardLabel: '',
        color: '',
        note: '',
        statusCode: '',
        bpjsItem
      }
    }

    // 1. NIK Duplikasi -> Tidak Bisa Didaftarkan (Badge Oren)
    if (rawKet.includes('DUPLIKASI') || rawKet.includes('DUPLIKAT') || rawKet.includes('GANDA') || rawKet.includes('SUDAH MENJADI PESERTA')) {
      return {
        hasMatch: true,
        isVerified: false,
        type: 'duplicate' as const,
        badgeLabel: 'TIDAK BISA DIDAFTARKAN',
        cardLabel: 'BPJS: TIDAK BISA DIDAFTARKAN',
        color: 'orange',
        note: bpjsItem?.keterangan || (actor as any).bpjsCheckNote || 'DUPLIKASI KEPESERTAAN BPJS',
        statusCode: rawStatus || 'T',
        bpjsItem
      }
    }

    // 2. Usia Lebih 65 Tahun -> Usia diatas 65 Tahun (Badge Merah)
    if (rawKet.includes('65') || (rawKet.includes('USIA') && (rawKet.includes('LEBIH') || rawKet.includes('DIATAS')))) {
      return {
        hasMatch: true,
        isVerified: false,
        type: 'overage' as const,
        badgeLabel: 'USIA DIATAS 65 TAHUN',
        cardLabel: 'BPJS: USIA DIATAS 65 TAHUN',
        color: 'red',
        note: bpjsItem?.keterangan || (actor as any).bpjsCheckNote || 'Usia Lebih 65 Tahun',
        statusCode: rawStatus || 'T',
        bpjsItem
      }
    }

    // 3. Bisa Daftar -> Terverifikasi (Badge Hijau)
    const isBisaDaftar = 
      rawStatus === 'Y' ||
      rawKet.includes('BISA DAFTAR') ||
      rawKet.includes('TERVERIFIKASI') ||
      rawKet.includes('SESUAI') ||
      rawKet.includes('LOLOS') ||
      (bpjsItem && !rawKet && !rawStatus)

    if (isBisaDaftar && rawStatus !== 'T' && rawStatus !== 'N') {
      return {
        hasMatch: true,
        isVerified: true,
        type: 'verified' as const,
        badgeLabel: 'TERVERIFIKASI',
        cardLabel: 'BPJS: TERVERIFIKASI',
        color: 'green',
        note: bpjsItem?.keterangan || (actor as any).bpjsCheckNote || 'Bisa Daftar / Terverifikasi',
        statusCode: rawStatus || 'Y',
        bpjsItem
      }
    }

    // 4. Other rejected
    return {
      hasMatch: true,
      isVerified: false,
      type: 'rejected' as const,
      badgeLabel: bpjsItem?.keterangan || (actor as any).bpjsKeterangan || 'TIDAK LOLOS',
      cardLabel: `BPJS: ${bpjsItem?.keterangan || (actor as any).bpjsKeterangan || 'TIDAK LOLOS'}`,
      color: 'red',
      note: bpjsItem?.keterangan || (actor as any).bpjsCheckNote || 'Tidak Lolos Verifikasi BPJS',
      statusCode: rawStatus || 'T',
      bpjsItem
    }
  }
  
  // Auxiliary data is fetched on-demand in the detail dialog (checks both NIK and Nomor KK)
  const [activeDetailData, setActiveDetailData] = useState<{
    data2023: any[], data2024: any[], data2025: any[], dataBlacklist: any[]
  }>({ data2023: [], data2024: [], data2025: [], dataBlacklist: [] })
  const [isCheckingAuxData, setIsCheckingAuxData] = useState(false)
  const [detailSurveyPhotoUrl, setDetailSurveyPhotoUrl] = useState<string | null>(null)
  const [isDetailPhotoLoading, setIsDetailPhotoLoading] = useState(false)
  const [activeDetailGroup, setActiveDetailGroup] = useState<string>("all")
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null)

  const fetchAuxData = async (actor: BusinessActor) => {
    if (!database || !actor) return;
    setIsCheckingAuxData(true);
    try {
      const cleanNik = String(actor.nik || "").replace(/\D/g, "").trim();
      const cleanKk = String(actor.noKK || "").replace(/\D/g, "").trim();

      const checkMaster = async (path: string, sourceLabel: string) => {
        const results: any[] = [];
        const seenKeys = new Set<string>();
        const addItems = (valObj: Record<string, any>, matchedBy: string) => {
          Object.entries(valObj).forEach(([key, item]) => {
            if (item && !seenKeys.has(key)) {
              seenKeys.add(key);
              results.push({ ...item, _key: key, source: sourceLabel, _matchedBy: matchedBy });
            } else if (item && seenKeys.has(key)) {
              const existing = results.find(r => r._key === key);
              if (existing && !existing._matchedBy.includes(matchedBy)) {
                existing._matchedBy = `${existing._matchedBy} & ${matchedBy}`;
              }
            }
          });
        };

        const tasks: Promise<void>[] = [];
        if (cleanNik) {
          tasks.push(
            get(query(ref(database, path), orderByChild('nik'), equalTo(cleanNik)))
              .then(snap => { if (snap.exists()) addItems(snap.val(), 'NIK'); })
              .catch(() => {})
          );
        }
        if (cleanKk) {
          tasks.push(
            get(query(ref(database, path), orderByChild('noKK'), equalTo(cleanKk)))
              .then(snap => {
                if (snap.exists()) {
                  addItems(snap.val(), 'No. KK');
                } else {
                  return get(query(ref(database, path), orderByChild('kk'), equalTo(cleanKk)))
                    .then(snapFb => { if (snapFb.exists()) addItems(snapFb.val(), 'No. KK'); })
                    .catch(() => {});
                }
              })
              .catch(() => {})
          );
        }
        await Promise.all(tasks);
        return results;
      };

      const [d23, d24, d25, dBl] = await Promise.all([
        checkMaster('master_data_2023', 'Sheet 2 : Database 2023 (1m)'),
        checkMaster('master_data_2024', 'Sheet 1 : Database 2024 (3m)'),
        checkMaster('master_data_2025', 'Sheet 3 : Database 2025 (HOLD)'),
        checkMaster('blacklist_data', 'Sheet 4 : Database Blacklist (REJECT)')
      ]);
      setActiveDetailData({ data2023: d23, data2024: d24, data2025: d25, dataBlacklist: dBl });
    } catch (err) {
      console.error("Error fetching aux data:", err);
    } finally {
      setIsCheckingAuxData(false);
    }
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
      // Prioritize loaded full actors when available (e.g. inside coordinator view), otherwise localIndex for 0ms global search
      const sourceList = (actors && actors.length > 0) ? actors : (localIndex || searchResults || actors || []);
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

  const coordinatorOptions = useMemo(() => {
    const names = new Set<string>()
    if (kuotaData) {
      kuotaData.forEach((q: any) => {
        const n = normalizeCoordinator(q.name || q.coordinator || "").toUpperCase().trim()
        if (
          n &&
          !n.includes("( PERBAIKKAN )") &&
          !n.includes("( PERBAIKAN )") &&
          !n.includes("( DIHAPUS )")
        ) {
          names.add(n)
        }
      })
    }
    coordinatorStats.forEach(s => {
      const n = normalizeCoordinator(s.name || "").toUpperCase().trim()
      if (
        n &&
        n !== "TANPA KOORDINATOR" &&
        !n.includes("( PERBAIKKAN )") &&
        !n.includes("( PERBAIKAN )") &&
        !n.includes("( DIHAPUS )")
      ) {
        names.add(n)
      }
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [kuotaData, coordinatorStats])

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
      setDetailSurveyPhotoUrl(null)
      setActiveDetailGroup("all")
    }
  }, [viewingActor, isEditMode])

  // Hydrate full actor record from Firebase when detail modal opens (in case viewingActor came from lightweight search index)
  useEffect(() => {
    if (!viewingActor?.id || !database) {
      setDetailSurveyPhotoUrl(null)
      return
    }
    const actorId = viewingActor.id
    let cancelled = false
    setActiveDetailGroup("all")
    setIsDetailPhotoLoading(true)

    get(ref(database, `businessActors/${actorId}`))
      .then(async (snap) => {
        if (cancelled) return
        let targetActor = viewingActor
        if (snap.exists()) {
          const fullData = snap.val()
          targetActor = { ...viewingActor, ...fullData, id: actorId }
          setViewingActor(prev => (prev && prev.id === actorId ? targetActor : prev))
        }
        // Re-fetch aux data with full actor (ensuring both NIK and No. KK are checked)
        fetchAuxData(targetActor)

        // Load survey photo if available
        const directPhoto = targetActor.surveyData?.fotoSurveyUrl || (targetActor as any).photoSurveyUrl || (targetActor.surveyData as any)?.photoSurvey
        if (directPhoto && typeof directPhoto === "string" && directPhoto.startsWith("data:")) {
          if (!cancelled) {
            setDetailSurveyPhotoUrl(directPhoto)
            setIsDetailPhotoLoading(false)
          }
          return
        }
        try {
          const photoUrl = await getSurveyPhoto(database, actorId, targetActor)
          if (!cancelled) setDetailSurveyPhotoUrl(photoUrl)
        } catch {
          if (!cancelled) setDetailSurveyPhotoUrl(directPhoto || null)
        } finally {
          if (!cancelled) setIsDetailPhotoLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setIsDetailPhotoLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [viewingActor?.id, database])

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
      agama: (formData.get('agama') as string) ?? viewingActor.agama ?? "",
      pekerjaan: (formData.get('pekerjaan') as string) ?? viewingActor.pekerjaan ?? "",
      tanggalCetakKtp: (formData.get('tanggalCetakKtp') as string) ?? viewingActor.tanggalCetakKtp ?? "",
      phone: formData.get('phone') as string,
      kecamatan: formData.get('kecamatan') as string,
      kelurahan: formData.get('kelurahan') as string,
      rtRw: formData.get('rtRw') as string,
      address: formData.get('address') as string,
      statusKeluarga: (formData.get('statusKeluarga') as string) ?? viewingActor.statusKeluarga ?? "",
      namaKepalaKeluarga: (formData.get('namaKepalaKeluarga') as string) ?? viewingActor.namaKepalaKeluarga ?? "",
      nikKepalaKeluarga: (formData.get('nikKepalaKeluarga') as string) ?? viewingActor.nikKepalaKeluarga ?? "",
      pobKepalaKeluarga: (formData.get('pobKepalaKeluarga') as string) ?? viewingActor.pobKepalaKeluarga ?? "",
      dobKepalaKeluarga: (formData.get('dobKepalaKeluarga') as string) ?? viewingActor.dobKepalaKeluarga ?? "",
      agamaKepalaKeluarga: (formData.get('agamaKepalaKeluarga') as string) ?? viewingActor.agamaKepalaKeluarga ?? "",
      pekerjaanKepalaKeluarga: (formData.get('pekerjaanKepalaKeluarga') as string) ?? viewingActor.pekerjaanKepalaKeluarga ?? "",
      tanggalCetakKk: (formData.get('tanggalCetakKk') as string) ?? viewingActor.tanggalCetakKk ?? "",
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
    const updatedActor = { ...viewingActor, ...updates } as BusinessActor
    setViewingActor(updatedActor)
    setLocalIndex(prev => prev ? prev.map(a => a.id === viewingActor.id ? { ...a, ...updates } : a) : null)
    setSearchResults(prev => prev ? prev.map(a => a.id === viewingActor.id ? { ...a, ...updates } : a) : null)
  }

  const handleQuickReassignPetugas = (actorId: string, newPetugas: string) => {
    if (!isAdmin || !database) return
    const val = resolveSurveyorCanonicalName(newPetugas, systemUsersRaw)
    
    updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), {
      petugasSurvey: val
    })

    if (viewingActor && viewingActor.id === actorId) {
      const updatedActor = { ...viewingActor, petugasSurvey: val }
      setViewingActor(updatedActor)
      import("@/lib/stats-service").then(({ syncActorToSearchIndex }) => {
        syncActorToSearchIndex(database, updatedActor).catch(() => {})
      })
    }
    setLocalIndex(prev => prev ? prev.map(a => a.id === actorId ? { ...a, petugasSurvey: val } : a) : null)
    setSearchResults(prev => prev ? prev.map(a => a.id === actorId ? { ...a, petugasSurvey: val } : a) : null)

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
  }

  const handleQuickReassignCoordinator = async (actorId: string, newCoordinator: string) => {
    if (!isAdmin || !database || !newCoordinator) return
    const val = normalizeCoordinator(newCoordinator).toUpperCase().trim()
    if (!val) return

    const currentActor = actors?.find(a => a.id === actorId) || viewingActor
    const oldCoord = normalizeCoordinator(currentActor?.coordinator || "").toUpperCase().trim()
    if (oldCoord === val) return

    // Optimistically update local states immediately
    if (viewingActor && viewingActor.id === actorId) {
      setViewingActor(prev => prev ? { ...prev, coordinator: val } : null)
    }
    setLocalIndex(prev => prev ? prev.map(a => a.id === actorId ? { ...a, coordinator: val } : a) : null)
    setSearchResults(prev => prev ? prev.map(a => a.id === actorId ? { ...a, coordinator: val } : a) : null)

    try {
      const actorRef = ref(database, `businessActors/${actorId}`)
      const snap = await get(actorRef)
      const baseActor = snap.exists() ? { ...snap.val(), id: actorId } : { ...(currentActor || {}), id: actorId }
      const actualOldCoord = normalizeCoordinator(baseActor.coordinator || oldCoord).toUpperCase().trim()

      updateDocumentNonBlocking(actorRef, {
        coordinator: val
      })

      const { updateStatsOnEdit } = await import("@/lib/stats-service")
      await updateStatsOnEdit(
        database,
        { ...baseActor, coordinator: actualOldCoord },
        { ...baseActor, coordinator: val }
      )

      logActivity({
        query: `PINDAH KOORDINATOR: ${baseActor.fullName || viewingActor?.fullName || actorId} (${actualOldCoord || '-'} -> ${val})`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'DATA PELAKU USAHA',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({
        title: "Koordinator Diperbarui",
        description: `Data ${baseActor.fullName || viewingActor?.fullName || ''} beserta seluruh data terkait berhasil dipindahkan dari ${actualOldCoord || '-'} ke ${val}.`
      })
    } catch (err) {
      console.error("Error reassigning coordinator:", err)
      toast({
        variant: "destructive",
        title: "Gagal Memindahkan Koordinator",
        description: "Terjadi kesalahan saat memperbarui data koordinator."
      })
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

  const rawDataToDisplay = (isInspektorat || isKoordinator || isSearching) 
    ? (filteredActors || []) 
    : (groupedActors[String(filterCoordinator || "").toUpperCase().trim()] || []);

  const currentDataToDisplay = useMemo(() => {
    if (filterMenu === "all") return rawDataToDisplay;
    return rawDataToDisplay.filter(a => {
      const info = getActorCurrentMenu(a);
      return info.menuName === filterMenu || info.displayLabel === filterMenu || info.menuPath === filterMenu;
    });
  }, [rawDataToDisplay, filterMenu]);

  return (
    <div className="p-0 space-y-4">
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
                      const targetCoordinator = filterCoordinator || (isKoordinator ? userProfile?.fullName : null);
                      if (targetCoordinator) {
                        const coordKey = String(targetCoordinator).toUpperCase().trim();
                        let coordActors: BusinessActor[] = [];

                        if (actors && actors.length > 0) {
                          if (filterMenu !== "all" || isSearching) {
                            const displayIds = new Set(currentDataToDisplay.map((a) => a.id));
                            coordActors = actors.filter((a) => displayIds.has(a.id));
                          } else {
                            coordActors = groupedActors[coordKey] || actors;
                          }
                        } else if (database) {
                          toast({ title: "Menyiapkan PDF", description: `Mengambil data lengkap untuk Koordinator ${coordKey}...` });
                          try {
                            const { get, ref, query, orderByChild, equalTo } = await import("firebase/database");
                            const q = query(ref(database, 'businessActors'), orderByChild('coordinator'), equalTo(coordKey));
                            const snap = await get(q);
                            if (snap.exists()) {
                              const rawList = Object.entries(snap.val()).map(([k, v]: [string, any]) => ({ ...v, id: v?.id || k })) as BusinessActor[];
                              coordActors = rawList.filter((a) => {
                                const s = a.status || "";
                                const isCancelDinas = (s === 'verified_dinas' && a.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(a.alasanCancelDinas);
                                return ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) && !isCancelDinas;
                              });
                            }
                          } catch (e) {
                            console.error("Error fetching coordinator actors for PDF:", e);
                          }
                        }

                        if (!coordActors || coordActors.length === 0) {
                          toast({ variant: "destructive", title: "Tidak Ada Data", description: `Belum ada data pelaku usaha untuk koordinator ${coordKey}.` });
                          return;
                        }

                        generateCoordinatorReport(coordKey, coordActors, systemUsersRaw || []);
                      } else {
                        if (!allActorsRaw || Object.keys(groupedActors).length === 0) {
                          toast({ title: "Menyiapkan Dokumen", description: "Sedang mengambil data lengkap seluruh koordinator untuk cetak PDF..." });
                          try {
                            const { get, ref } = await import("firebase/database");
                            const snap = await get(ref(database!, 'businessActors'));
                            if (snap.exists()) {
                              const allActors = Object.entries(snap.val()).map(([k, v]: [string, any]) => ({ ...v, id: v?.id || k })) as BusinessActor[];
                              const groups: Record<string, BusinessActor[]> = {};
                              allActors.forEach((a) => {
                                const s = a.status || "";
                                const isCancelDinas = (s === 'verified_dinas' && a.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(a.alasanCancelDinas);
                                if (!['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) || isCancelDinas) return;
                                const coord = (a.coordinator || "Tanpa Koordinator").toUpperCase().trim();
                                if (!groups[coord]) groups[coord] = [];
                                groups[coord].push(a);
                              });
                              generateAllCoordinatorsReport(groups, systemUsersRaw || []);
                            }
                          } catch (e) {
                            toast({ variant: "destructive", title: "Gagal", description: "Gagal memuat data PDF." });
                          }
                        } else {
                          generateAllCoordinatorsReport(groupedActors, systemUsersRaw || []);
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
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                {/* Filter Berdasarkan Posisi Menu Berkas */}
                <div className="flex items-center gap-1.5">
                  <Select value={filterMenu} onValueChange={setFilterMenu}>
                    <SelectTrigger className="h-9 w-44 sm:w-56 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-800/90 shadow-2xs">
                      <SelectValue placeholder="Filter Menu Berkas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Menu Berkas</SelectItem>
                      <SelectItem value="Data Pelaku Usaha">Menu: Data Pelaku Usaha</SelectItem>
                      <SelectItem value="Survey Dinas">Menu: Survey Dinas</SelectItem>
                      <SelectItem value="Verifikasi Dinas">Menu: Verifikasi Dinas</SelectItem>
                      <SelectItem value="Hasil Verifikasi">Menu: Hasil Verifikasi</SelectItem>
                      <SelectItem value="Cetak Berkas">Menu: Cetak Berkas</SelectItem>
                      <SelectItem value="LPJ">Menu: LPJ</SelectItem>
                      <SelectItem value="Data Selesai">Menu: Data Selesai</SelectItem>
                      <SelectItem value="Data Ditolak">Menu: Data Ditolak</SelectItem>
                      <SelectItem value="Menu Blacklist">Menu: Blacklist</SelectItem>
                      <SelectItem value="Verifikasi Admin">Menu: Verifikasi Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {filterMenu !== "all" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setFilterMenu("all")}
                      className="h-9 px-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      title="Reset Filter Menu"
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Reset
                    </Button>
                  )}
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
                          <div className="flex justify-center print:hidden">
                            <ActorMenuBadge actor={actor} compact asLink />
                          </div>
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
                    const cardTheme = isFemale ? '#e11d48' : '#0284c7';
                    return (
                      <div 
                        key={actor.id} 
                        style={{
                          borderColor: `${cardTheme}45`,
                          boxShadow: `0 4px 20px -2px ${cardTheme}20`
                        }}
                        className="group relative overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 ease-out rounded-3xl p-5 bg-white dark:bg-slate-900 hover:-translate-y-1.5 flex flex-col justify-between"
                      >
                        {/* Glowing Top Accent Stripe */}
                        <div 
                          className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2 z-10"
                          style={{ background: `linear-gradient(90deg, ${cardTheme}, ${cardTheme}dd, ${cardTheme}aa)` }} 
                        />

                        {/* Colorful Gradient Wash Overlay */}
                        <div 
                          className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-60 group-hover:opacity-100"
                          style={{ background: `linear-gradient(145deg, transparent 35%, ${cardTheme}0d 80%, ${cardTheme}18 100%)` }}
                        />

                        {/* Ambient Soft Glow Orb */}
                        <div 
                          className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl transition-all duration-700 pointer-events-none opacity-20 group-hover:opacity-40 group-hover:scale-150"
                          style={{ backgroundColor: cardTheme }}
                        />

                        {/* Large Decorative Watermark Icon (Bottom-Right) */}
                        <div 
                          className="absolute -bottom-3 -right-3 pointer-events-none transition-all duration-500 ease-out opacity-[0.06] dark:opacity-[0.12] group-hover:opacity-[0.20] group-hover:scale-125 group-hover:-rotate-12"
                          style={{ color: cardTheme }}
                        >
                          <Users className="w-28 h-28 stroke-[1.5]" />
                        </div>

                        {/* Top Section */}
                        <div className="relative z-10 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <span 
                              className="w-10 h-10 rounded-full text-white font-extrabold text-sm sm:text-base flex items-center justify-center shrink-0 shadow-md transition-all duration-300 group-hover:scale-105"
                              style={{ backgroundColor: cardTheme }}
                            >
                              {globalIndexMap.get(actor.id) || index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className={cn(
                                "font-extrabold text-base sm:text-[17px] tracking-tight truncate leading-tight uppercase",
                                isFemale ? "text-rose-600 dark:text-rose-400" : "text-[#1d63c6] dark:text-blue-400"
                              )}>
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
                              </div>

                              {/* Status Hasil Verifikasi BPJS */}
                              {(() => {
                                const bpjsInfo = getActorBpjsStatus(actor)
                                if (!bpjsInfo.hasMatch) return null

                                return (
                                  <div className="mt-1.5 flex items-center">
                                    {bpjsInfo.type === 'verified' && (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-2xs leading-tight shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                        title={`Hasil Verifikasi BPJS: ${bpjsInfo.note}`}
                                      >
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        <span>{bpjsInfo.cardLabel}</span>
                                      </span>
                                    )}
                                    {bpjsInfo.type === 'duplicate' && (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-2xs leading-tight shrink-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                        title={`Hasil Verifikasi BPJS: ${bpjsInfo.note}`}
                                      >
                                        <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                        <span>{bpjsInfo.cardLabel}</span>
                                      </span>
                                    )}
                                    {(bpjsInfo.type === 'overage' || bpjsInfo.type === 'rejected') && (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-2xs leading-tight shrink-0 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                        title={`Hasil Verifikasi BPJS: ${bpjsInfo.note}`}
                                      >
                                        <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                        <span>{bpjsInfo.cardLabel}</span>
                                      </span>
                                    )}
                                  </div>
                                )
                              })()}

                              {/* Status & Alur Posisi Menu Berkas Pelaku (Tepat di Bawah Status BPJS Ketenagakerjaan) */}
                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                <ActorMenuBadge actor={actor} asLink showStage />
                                <VerificationBadge actor={actor} hideLocation />
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
                        <div className="bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 my-3.5 space-y-2 relative z-10 backdrop-blur-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span 
                              className="font-extrabold text-sm sm:text-[15px] uppercase tracking-tight truncate"
                              style={{ color: cardTheme }}
                            >
                              {actor.businessName || 'Nama Usaha Belum Diisi'}
                            </span>
                            <span 
                              className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                              style={{ backgroundColor: `${cardTheme}15`, color: cardTheme }}
                            >
                              {actor.businessCategory || '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 flex-wrap">
                            <span>Usia: <strong className="font-extrabold text-slate-800 dark:text-slate-100">{actorAge || '-'}</strong></span>
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
                    const cardTheme = isFemale ? '#e11d48' : '#0284c7';
                    return (
                      <div
                        key={actor.id}
                        style={{
                          borderColor: `${cardTheme}45`,
                          boxShadow: `0 4px 20px -2px ${cardTheme}20`
                        }}
                        className="group relative overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 ease-out rounded-3xl p-5 bg-white dark:bg-slate-900 hover:-translate-y-1.5 flex flex-col justify-between"
                      >
                        {/* Glowing Top Accent Stripe */}
                        <div 
                          className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2 z-10"
                          style={{ background: `linear-gradient(90deg, ${cardTheme}, ${cardTheme}dd, ${cardTheme}aa)` }} 
                        />

                        {/* Colorful Gradient Wash Overlay */}
                        <div 
                          className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-60 group-hover:opacity-100"
                          style={{ background: `linear-gradient(145deg, transparent 35%, ${cardTheme}0d 80%, ${cardTheme}18 100%)` }}
                        />

                        {/* Ambient Soft Glow Orb */}
                        <div 
                          className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl transition-all duration-700 pointer-events-none opacity-20 group-hover:opacity-40 group-hover:scale-150"
                          style={{ backgroundColor: cardTheme }}
                        />

                        {/* Large Decorative Watermark Icon (Bottom-Right) */}
                        <div 
                          className="absolute -bottom-3 -right-3 pointer-events-none transition-all duration-500 ease-out opacity-[0.06] dark:opacity-[0.12] group-hover:opacity-[0.20] group-hover:scale-125 group-hover:-rotate-12"
                          style={{ color: cardTheme }}
                        >
                          <Users className="w-28 h-28 stroke-[1.5]" />
                        </div>

                        {/* Top Section */}
                        <div className="relative z-10 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Circle Index Badge */}
                            <span 
                              className="w-10 h-10 rounded-full text-white font-extrabold text-sm sm:text-base flex items-center justify-center shrink-0 shadow-md transition-all duration-300 group-hover:scale-105"
                              style={{ backgroundColor: cardTheme }}
                            >
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
                              </div>

                              {/* Status Hasil Verifikasi BPJS */}
                              {(() => {
                                const bpjsInfo = getActorBpjsStatus(actor)
                                if (!bpjsInfo.hasMatch) return null

                                return (
                                  <div className="mt-1.5 flex items-center">
                                    {bpjsInfo.type === 'verified' && (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-2xs leading-tight shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                        title={`Hasil Verifikasi BPJS: ${bpjsInfo.note}`}
                                      >
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        <span>{bpjsInfo.cardLabel}</span>
                                      </span>
                                    )}
                                    {bpjsInfo.type === 'duplicate' && (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-2xs leading-tight shrink-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                        title={`Hasil Verifikasi BPJS: ${bpjsInfo.note}`}
                                      >
                                        <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                        <span>{bpjsInfo.cardLabel}</span>
                                      </span>
                                    )}
                                    {(bpjsInfo.type === 'overage' || bpjsInfo.type === 'rejected') && (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-2xs leading-tight shrink-0 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                        title={`Hasil Verifikasi BPJS: ${bpjsInfo.note}`}
                                      >
                                        <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                        <span>{bpjsInfo.cardLabel}</span>
                                      </span>
                                    )}
                                  </div>
                                )
                              })()}

                              {/* Status & Alur Posisi Menu Berkas Pelaku (Tepat di Bawah Status BPJS Ketenagakerjaan) */}
                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                <ActorMenuBadge actor={actor} asLink showStage />
                                <VerificationBadge actor={actor} hideLocation />
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
                        <div className="bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 my-3.5 space-y-2 relative z-10 backdrop-blur-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span 
                              className="font-extrabold text-sm sm:text-[15px] uppercase tracking-tight truncate"
                              style={{ color: cardTheme }}
                            >
                              {actor.businessName || 'Nama Usaha Belum Diisi'}
                            </span>
                            <span 
                              className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                              style={{ backgroundColor: `${cardTheme}15`, color: cardTheme }}
                            >
                              {actor.businessCategory || '-'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 flex-wrap">
                            <span>Usia: <strong className="font-extrabold text-slate-800 dark:text-slate-100">{actorAge || '-'}</strong></span>
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
                        <div className="flex items-center gap-2 sm:gap-2.5 pt-0.5 relative z-10">
                          {/* Lihat Detail */}
                          <Button
                            size="sm"
                            style={{ backgroundColor: cardTheme }}
                            className="flex-1 h-11 rounded-2xl font-black text-xs sm:text-sm text-white shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:opacity-95"
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
              const themeColor = stat.isFull ? '#10b981' : '#6366f1';
              return (
                <div 
                  key={stat.name}
                  onClick={() => router.push(`/actor-data?coordinator=${encodeURIComponent(stat.name)}`)}
                  style={{
                    borderColor: `${themeColor}50`,
                    boxShadow: `0 4px 18px -2px ${themeColor}20`
                  }}
                  className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl transition-all duration-300 ease-out overflow-hidden cursor-pointer active:scale-95 min-h-[165px] border-2 bg-white dark:bg-slate-900 hover:shadow-xl hover:-translate-y-1.5 animate-in fade-in slide-in-from-bottom-3"
                >
                  {/* Glowing Top Accent Stripe */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2 z-10"
                    style={{
                      background: stat.isFull 
                        ? "linear-gradient(90deg, #10b981, #34d399, #10b981)" 
                        : "linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)"
                    }}
                  />

                  {/* Colorful Gradient Wash Overlay */}
                  <div 
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-60 group-hover:opacity-100"
                    style={{ 
                      background: `linear-gradient(145deg, transparent 35%, ${themeColor}15 80%, ${themeColor}25 100%)` 
                    }}
                  />

                  {/* Ambient Soft Glow Orb */}
                  <div 
                    className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl transition-all duration-700 pointer-events-none opacity-25 group-hover:opacity-50 group-hover:scale-150"
                    style={{ backgroundColor: themeColor }} 
                  />

                  {/* Large Decorative Watermark Icon (Bottom-Right) */}
                  <div 
                    className="absolute -bottom-2.5 -right-2.5 pointer-events-none transition-all duration-500 ease-out opacity-[0.08] dark:opacity-[0.14] group-hover:opacity-[0.24] group-hover:scale-125 group-hover:-rotate-12"
                    style={{ color: themeColor }}
                  >
                    <User className="w-24 h-24 stroke-[1.5]" />
                  </div>

                  {/* Top Row: Avatar & Status Badge */}
                  <div className="relative z-10 flex items-center justify-between gap-2 pt-1">
                    <div 
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-md shrink-0 text-white"
                      style={{ 
                        backgroundColor: themeColor,
                        boxShadow: `0 6px 14px -3px ${themeColor}60`
                      }}
                    >
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>

                    {stat.isFull ? (
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Penuh
                      </span>
                    ) : stat.quota > 0 ? (
                      <span 
                        className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs shrink-0"
                        style={{
                          backgroundColor: `${themeColor}15`,
                          borderColor: `${themeColor}35`,
                          color: themeColor
                        }}
                      >
                        Sisa {stat.remaining}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shrink-0">
                        Aktif
                      </span>
                    )}
                  </div>

                  {/* Middle: Coordinator Name & Berkas Count */}
                  <div className="relative z-10 space-y-1.5 my-2">
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="w-1.5 h-1.5 rounded-full shrink-0 transition-transform duration-300 group-hover:scale-150" 
                        style={{ backgroundColor: themeColor }} 
                      />
                      <h3 
                        className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors"
                        title={stat.name}
                      >
                        {stat.name}
                      </h3>
                    </div>
                    
                    <div className="flex items-baseline gap-1.5 pl-3">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                        {stat.count}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Berkas
                      </span>
                    </div>

                    {/* Mini Progress Bar when quota > 0 */}
                    {stat.quota > 0 && (
                      <div className="space-y-1 pt-1 pl-3">
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
                  <div 
                    className="relative z-10 pt-2 border-t flex items-center justify-between text-[10px] sm:text-[11px] font-bold transition-colors"
                    style={{ borderColor: `${themeColor}25` }}
                  >
                    <span 
                      className="font-bold transition-colors"
                      style={{ color: themeColor }}
                    >
                      Lihat Berkas
                    </span>
                    <div 
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shadow-xs"
                      style={{ 
                        backgroundColor: themeColor,
                        color: '#ffffff',
                        boxShadow: `0 4px 10px -2px ${themeColor}50`
                      }}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
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
        <DialogContent className="w-[96vw] max-w-6xl max-h-[94vh] p-0 overflow-hidden flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-[#F8FAFC] dark:bg-slate-950 [&>button]:hidden">
          {viewingActor && !editingBankMode && !editingDriveMode && (() => {
            const isFemale = normalizeGender(viewingActor.gender, viewingActor.nik) === 'Perempuan';
            const initials = (viewingActor.fullName || "U")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((n: string) => n[0])
              .join("")
              .toUpperCase();
            const rawAge = calculateAge(viewingActor.dob || parsePobDob(viewingActor.pobDob).dob || extractDobFromNik(viewingActor.nik || ""));
            const cleanAge = rawAge && rawAge !== '-' ? rawAge.replace(/[^0-9]/g, '') : '';

            // ── STRICT AVAILABILITY HELPER: Hanya tampilkan data yang tersedia / diinput ──
            const hasVal = (v: any): boolean => {
              if (v === null || v === undefined) return false;
              if (typeof v === "boolean") return true;
              if (typeof v === "number") return !isNaN(v) && v > 0;
              if (Array.isArray(v)) return v.filter(item => hasVal(item)).length > 0;
              if (typeof v === "string") {
                const trimmed = v.trim();
                if (!trimmed) return false;
                const upper = trimmed.toUpperCase();
                if (
                  upper === "-" ||
                  upper === "--" ||
                  upper === "BELUM ADA" ||
                  upper === "BELUM TERISI" ||
                  upper === "BELUM DIINPUT" ||
                  upper === "TIDAK ADA" ||
                  upper === "NULL" ||
                  upper === "UNDEFINED" ||
                  upper === "N/A"
                ) {
                  return false;
                }
                return true;
              }
              if (typeof v === "object") return Object.keys(v).length > 0;
              return Boolean(v);
            };

            const getWaLink = (phoneStr: string) => {
              if (!phoneStr) return "#";
              let clean = String(phoneStr).replace(/\D/g, "");
              if (clean.startsWith("0")) clean = "62" + clean.slice(1);
              else if (!clean.startsWith("62")) clean = "62" + clean;
              return `https://wa.me/${clean}`;
            };

            const avatarPhotoUrl = detailSurveyPhotoUrl || viewingActor.photoUsahaUri || viewingActor.ktpUri || null;
            const statusRaw = viewingActor.status || "pending";
            const isCancelDinas = (statusRaw === "verified_dinas" && viewingActor.hasilVerifikasiDinas === "Tidak Lolos") || Boolean(viewingActor.alasanCancelDinas);
            const isRejected = statusRaw === "rejected" || isCancelDinas;
            const statusLabel = isRejected
              ? "Ditolak / Batal"
              : statusRaw === "finish"
              ? "Selesai"
              : statusRaw === "lpj_pending"
              ? "Proses Survey"
              : statusRaw === "verified_dinas"
              ? "Verifikasi Dinas"
              : statusRaw === "verified_actor"
              ? "Terverifikasi"
              : "Menunggu Verifikasi";

            // Reusable Clean Field Component (matches reference screenshot)
            const CleanField = ({
              label,
              value,
              subValue,
              isMono = false,
              isCopyable = false,
              copyLabel,
              colSpan2 = false,
            }: {
              label: string;
              value: React.ReactNode;
              subValue?: string;
              isMono?: boolean;
              isCopyable?: boolean;
              copyLabel?: string;
              colSpan2?: boolean;
            }) => (
              <div className={cn("space-y-1", colSpan2 && "sm:col-span-2")}>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {label}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={cn(
                    "text-sm font-semibold text-slate-900 dark:text-slate-100 break-words leading-snug",
                    isMono && "font-mono tracking-tight"
                  )}>
                    {value}
                  </div>
                  {isCopyable && typeof value === "string" && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(value, copyLabel || label)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded transition-colors cursor-pointer"
                      title={`Salin ${copyLabel || label}`}
                    >
                      {copiedField === (copyLabel || label) ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
                {hasVal(subValue) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {subValue}
                  </p>
                )}
              </div>
            );

            return (
              <div className="flex flex-col h-full max-h-[94vh] overflow-y-auto custom-scrollbar">
                <div className="p-4 sm:p-6 md:p-8 space-y-5">
                  {/* ── TOP BREADCRUMB & BACK BUTTON BAR ── */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>Dashboard</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <span>Data Pelaku Usaha</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Detail Pelaku Usaha #{viewingActor.registrationCode || viewingActor.nik || viewingActor.id.slice(0, 8)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setViewingActor(null);
                        setIsEditMode(false);
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-500" />
                      <span>Kembali ke Daftar</span>
                    </button>
                  </div>

                  {/* ── HERO PROFILE CARD ── */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <GenderAvatar isFemale={isFemale} />

                      <div className="min-w-0 space-y-1">
                        <DialogTitle className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                          {isEditMode ? `Edit: ${viewingActor.fullName}` : viewingActor.fullName}
                        </DialogTitle>

                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                          {hasVal(viewingActor.businessName) && (
                            <span className="font-medium">{viewingActor.businessName}</span>
                          )}
                          {hasVal(viewingActor.businessName) && hasVal(viewingActor.businessCategory) && (
                            <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                          )}
                          {hasVal(viewingActor.businessCategory) && (
                            <span className="text-slate-500">{viewingActor.businessCategory}</span>
                          )}
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                            isRejected
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          )}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                          {hasVal(viewingActor.registrationCode) && (
                            <span>ID: {viewingActor.registrationCode}</span>
                          )}
                          {hasVal(viewingActor.nik) && (
                            <span className="font-mono">NIK: {viewingActor.nik}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action Buttons (Edit Data & Cetak / Ekspor Dropdown) */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setIsEditMode(!isEditMode)}
                          className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-colors cursor-pointer",
                            isEditMode
                              ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                              : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                          )}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isEditMode ? "Batal Edit" : "Edit Data"}</span>
                        </button>
                      )}

                      {!isEditMode && (!isMonitoring && !isKoordinator && !isInspektorat && (isAdmin || viewingActor.status === 'verified_actor')) && (
                        <button
                          type="button"
                          onClick={() => setEditingBankMode(true)}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                          <span>{hasVal(viewingActor.bankNumber) ? "Ubah Rekening" : "Input Rekening"}</span>
                        </button>
                      )}

                      {!isEditMode && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-500" />
                              <span>Cetak / Aksi</span>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-xl">
                            <DropdownMenuLabel className="text-xs text-slate-500">Dokumen & Tindakan</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {!isKoordinator && !isInspektorat && (
                              <DropdownMenuItem onClick={() => handlePrintForm(viewingActor)} className="cursor-pointer text-xs font-medium">
                                <Printer className="w-4 h-4 mr-2 text-slate-500" /> Cetak Formulir Pendaftaran
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (viewingActor as any).surveyData && (
                              <DropdownMenuItem
                                onClick={() => setSurveyViewActor(viewingActor)}
                                className="cursor-pointer text-xs font-medium"
                              >
                                <ClipboardList className="w-4 h-4 mr-2 text-teal-600" /> Lihat Form Survey Lengkap
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => setEditingDriveMode(true)} className="cursor-pointer text-xs font-medium">
                                  <Folder className="w-4 h-4 mr-2 text-blue-600" /> Input Link Google Drive
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSingleLanjutDinas(viewingActor)} className="cursor-pointer text-xs font-medium">
                                  <Send className="w-4 h-4 mr-2 text-purple-600" /> Push Lanjut ke Dinas
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleRevert(viewingActor.id, viewingActor.fullName)} className="cursor-pointer text-xs font-medium text-amber-700">
                                  <RotateCcw className="w-4 h-4 mr-2 text-amber-600" /> Kembalikan ke Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(viewingActor.id, viewingActor.fullName)} className="cursor-pointer text-xs font-medium text-rose-600">
                                  <Trash2 className="w-4 h-4 mr-2 text-rose-600" /> Hapus Permanen
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* ── BODY: EDIT MODE OR 2-COLUMN CLEAN DETAIL VIEW ── */}
                  {isEditMode ? (
                    <form onSubmit={handleSaveFullEdit} className="space-y-5">
                      {/* 1. Edit Data Pelaku Usaha */}
                      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                          Data Pelaku Usaha (Edit)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Nama Lengkap</Label><Input name="fullName" defaultValue={viewingActor.fullName} required className="rounded-lg" /></div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-slate-500">NIK (No. KTP)</Label>
                            <Input 
                              name="nik" 
                              value={editNik} 
                              required 
                              className="rounded-lg font-mono"
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
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Nomor KK</Label><Input name="noKK" defaultValue={viewingActor.noKK} className="rounded-lg font-mono" /></div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Jenis Kelamin</Label>
                            <select name="gender" defaultValue={normalizeGender(viewingActor.gender || "")} className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                              <option value="Laki-laki">Laki-laki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-slate-500">Tempat Lahir</Label>
                            <Input 
                              name="pob" 
                              value={editPob}
                              onChange={(e) => setEditPob(e.target.value)}
                              className="rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-slate-500">Tanggal Lahir</Label>
                              {editDob && <span className="text-[10px] text-primary font-semibold">(Auto-NIK)</span>}
                            </div>
                            <Input 
                              name="dob" 
                              value={editDob} 
                              onChange={(e) => setEditDob(e.target.value)}
                              placeholder="DD-MM-YYYY" 
                              className="rounded-lg font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-slate-500">Agama</Label>
                            <select name="agama" defaultValue={viewingActor.agama || ""} className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                              <option value="">-- Pilih Agama --</option>
                              {AGAMA_INDONESIA.map((a) => (
                                <option key={a} value={a}>{a}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-slate-500">Pekerjaan</Label>
                            <Input name="pekerjaan" defaultValue={viewingActor.pekerjaan || ""} list="pekerjaan-list-edit" className="rounded-lg" />
                            <datalist id="pekerjaan-list-edit">
                              {PEKERJAAN_DUKCAPIL.map((p) => (
                                <option key={p} value={p} />
                              ))}
                            </datalist>
                          </div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Tanggal Cetak KTP</Label><Input name="tanggalCetakKtp" defaultValue={viewingActor.tanggalCetakKtp || ""} placeholder="DD-MM-YYYY" className="rounded-lg" /></div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Nomor HP / WhatsApp</Label><Input name="phone" defaultValue={viewingActor.phone} className="rounded-lg" /></div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Kecamatan</Label><Input name="kecamatan" defaultValue={viewingActor.kecamatan} className="rounded-lg" /></div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Kelurahan</Label><Input name="kelurahan" defaultValue={viewingActor.kelurahan} className="rounded-lg" /></div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">RT / RW</Label><Input name="rtRw" defaultValue={viewingActor.rtRw} className="rounded-lg" /></div>
                          <div className="space-y-1 md:col-span-2"><Label className="text-xs font-medium text-slate-500">Alamat Lengkap</Label><Input name="address" defaultValue={viewingActor.address} className="rounded-lg" /></div>
                        </div>
                      </section>

                      {/* 2. Edit Data Keluarga */}
                      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                          Data Keluarga (Edit)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-slate-500">Status Dalam Keluarga</Label>
                            <select name="statusKeluarga" defaultValue={viewingActor.statusKeluarga || ""} className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                              <option value="">-- Pilih Status Keluarga --</option>
                              {STATUS_KELUARGA_LIST.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Nama Kepala Keluarga</Label><Input name="namaKepalaKeluarga" defaultValue={viewingActor.namaKepalaKeluarga || ""} className="rounded-lg uppercase" /></div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">NIK Kepala Keluarga</Label><Input name="nikKepalaKeluarga" defaultValue={viewingActor.nikKepalaKeluarga || ""} className="rounded-lg font-mono" /></div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Tempat Lahir Kepala Keluarga</Label><Input name="pobKepalaKeluarga" defaultValue={viewingActor.pobKepalaKeluarga || ""} className="rounded-lg uppercase" /></div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Tanggal Lahir Kepala Keluarga</Label><Input name="dobKepalaKeluarga" defaultValue={viewingActor.dobKepalaKeluarga || ""} placeholder="DD-MM-YYYY" className="rounded-lg font-mono" /></div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-slate-500">Agama Kepala Keluarga</Label>
                            <select name="agamaKepalaKeluarga" defaultValue={viewingActor.agamaKepalaKeluarga || ""} className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                              <option value="">-- Pilih Agama --</option>
                              {AGAMA_INDONESIA.map((a) => (
                                <option key={a} value={a}>{a}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-slate-500">Pekerjaan Kepala Keluarga</Label>
                            <Input name="pekerjaanKepalaKeluarga" defaultValue={viewingActor.pekerjaanKepalaKeluarga || ""} list="pekerjaan-list-edit" className="rounded-lg" />
                          </div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Tanggal Cetak KK</Label><Input name="tanggalCetakKk" defaultValue={viewingActor.tanggalCetakKk || ""} placeholder="DD-MM-YYYY" className="rounded-lg" /></div>
                        </div>
                      </section>

                      {/* 3. Edit Data Usaha */}
                      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                          Data Usaha (Edit)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Nama Usaha</Label><Input name="businessName" defaultValue={viewingActor.businessName} className="rounded-lg" /></div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Kategori Usaha</Label><Input name="businessCategory" defaultValue={viewingActor.businessCategory} className="rounded-lg" /></div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-slate-500">Usulan Koordinator</Label>
                            <select
                              name="coordinator"
                              defaultValue={normalizeCoordinator(viewingActor.coordinator || "").toUpperCase().trim()}
                              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold uppercase"
                            >
                              {viewingActor.coordinator && !coordinatorOptions.includes(normalizeCoordinator(viewingActor.coordinator).toUpperCase().trim()) && (
                                <option value={normalizeCoordinator(viewingActor.coordinator).toUpperCase().trim()}>
                                  {normalizeCoordinator(viewingActor.coordinator).toUpperCase().trim()} (Saat Ini)
                                </option>
                              )}
                              {coordinatorOptions.map((name: string) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Petugas Survey</Label><Input name="petugasSurvey" defaultValue={viewingActor.petugasSurvey || ""} className="rounded-lg" /></div>
                          <div className="space-y-1 md:col-span-2"><Label className="text-xs font-medium text-slate-500">Lokasi Usaha</Label><Input name="businessLocation" defaultValue={viewingActor.businessLocation} className="rounded-lg" /></div>
                          <div className="space-y-1 md:col-span-3"><Label className="text-xs font-medium text-slate-500">Link Google Drive</Label><Input name="googleDriveLink" defaultValue={viewingActor.googleDriveLink || ""} className="rounded-lg" /></div>
                        </div>
                      </section>

                      {/* 4. Edit Data Rekening */}
                      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                          Data Rekening (Edit)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Nama Bank</Label><Input name="bankName" defaultValue={viewingActor.bankName} className="rounded-lg" /></div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Nomor Rekening</Label><Input name="bankNumber" defaultValue={viewingActor.bankNumber} className="rounded-lg font-mono" /></div>
                          <div className="space-y-1"><Label className="text-xs font-medium text-slate-500">Pemilik Rekening</Label><Input name="bankOwner" defaultValue={viewingActor.bankOwner} className="uppercase rounded-lg" /></div>
                        </div>
                      </section>

                      <div className="flex justify-end gap-2.5 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} className="font-semibold rounded-lg cursor-pointer">Batal</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-2xs cursor-pointer"><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</Button>
                      </div>
                    </form>
                  ) : (() => {
                    // ────────────────────────────────────────────────────────────
                    // 1. PERSIAPAN DATA PELAKU USAHA
                    // ────────────────────────────────────────────────────────────
                    const pobVal = viewingActor.pob || parsePobDob(viewingActor.pobDob || "").pob;
                    const dobVal = viewingActor.dob || parsePobDob(viewingActor.pobDob || "").dob;
                    const ttlCombined = hasVal(pobVal) && hasVal(dobVal)
                      ? `${pobVal}, ${dobVal}`
                      : (hasVal(pobVal) ? pobVal : (hasVal(dobVal) ? dobVal : ""));
                    const genderVal = normalizeGender(viewingActor.gender || "") || viewingActor.gender;
                    const noKkVal = viewingActor.noKK || (viewingActor as any).kk;
                    const ageVal = hasVal(cleanAge) ? `${cleanAge} Tahun` : "";
                    const createdAtVal = viewingActor.createdAt ? formatDateTimeIndo(viewingActor.createdAt) : "";

                    const fullAddressParts = [
                      hasVal(viewingActor.address) ? viewingActor.address : "",
                      hasVal(viewingActor.rtRw) ? `RT/RW ${viewingActor.rtRw}` : "",
                      hasVal(viewingActor.kelurahan) ? `Kel. ${viewingActor.kelurahan}` : "",
                      hasVal(viewingActor.kecamatan) ? `Kec. ${viewingActor.kecamatan}` : "",
                    ].filter(Boolean).join(", ");

                    const pelakuFields = [
                      { key: "fullName", label: "Nama Lengkap", value: viewingActor.fullName, isCopyable: true },
                      { key: "ttl", label: "Tempat, Tanggal Lahir", value: ttlCombined },
                      { key: "gender", label: "Jenis Kelamin", value: genderVal },
                      { key: "age", label: "Usia", value: ageVal },
                      { key: "nik", label: "No. KTP (NIK)", value: viewingActor.nik, isMono: true, isCopyable: true },
                      { key: "noKK", label: "Nomor Kartu Keluarga", value: noKkVal, isMono: true, isCopyable: true },
                      { key: "agama", label: "Agama", value: viewingActor.agama },
                      { key: "pekerjaan", label: "Pekerjaan", value: viewingActor.pekerjaan },
                      { key: "phone", label: "Nomor Telepon / WhatsApp", value: viewingActor.phone, isMono: true, isCopyable: true },
                      { key: "tanggalCetakKtp", label: "Tanggal Cetak KTP", value: viewingActor.tanggalCetakKtp },
                      { key: "kelurahan", label: "Kelurahan", value: viewingActor.kelurahan },
                      { key: "kecamatan", label: "Kecamatan", value: viewingActor.kecamatan },
                      { key: "rtRw", label: "RT / RW", value: viewingActor.rtRw },
                      { key: "registrationCode", label: "Kode Registrasi", value: viewingActor.registrationCode, isMono: true, isCopyable: true },
                      { key: "address", label: "Alamat Lengkap", value: fullAddressParts || viewingActor.address, colSpan2: true },
                    ].filter(f => hasVal(f.value));

                    const hasPelakuKtpPhoto = hasVal(viewingActor.ktpUri);
                    const hasPelakuGroup = pelakuFields.length > 0 || hasPelakuKtpPhoto;

                    // ────────────────────────────────────────────────────────────
                    // 2. PERSIAPAN DATA PEMBACAAN DATABASE
                    // ────────────────────────────────────────────────────────────
                    const bpjsInfo = getActorBpjsStatus(viewingActor);
                    const hasBpjsData = Boolean(
                      bpjsInfo.hasMatch ||
                      hasVal((viewingActor as any).bpjsKpj) ||
                      hasVal((viewingActor as any).bpjsStatusCode) ||
                      hasVal((viewingActor as any).bpjsCheckNote) ||
                      hasVal((viewingActor as any).bpjsKeterangan)
                    );

                    const allMasterMatches: Array<{ sheetTitle: string; sheetBadge: string; theme: "emerald" | "amber" | "rose"; item: any }> = [
                      ...(activeDetailData.data2024 || []).map((item: any) => ({
                        sheetTitle: "Sheet 1 — Database Penerima Tahun 2024",
                        sheetBadge: "Sheet 1 (2024)",
                        theme: "emerald" as const,
                        item
                      })),
                      ...(activeDetailData.data2023 || []).map((item: any) => ({
                        sheetTitle: "Sheet 2 — Database Penerima Tahun 2023",
                        sheetBadge: "Sheet 2 (2023)",
                        theme: "emerald" as const,
                        item
                      })),
                      ...(activeDetailData.data2025 || []).map((item: any) => ({
                        sheetTitle: "Sheet 3 — Database Pembanding Tahun 2025",
                        sheetBadge: "Sheet 3 (2025)",
                        theme: "amber" as const,
                        item
                      })),
                      ...(activeDetailData.dataBlacklist || []).map((item: any) => ({
                        sheetTitle: "Sheet 4 — Database Blacklist / Cekal",
                        sheetBadge: "Blacklist",
                        theme: "rose" as const,
                        item
                      })),
                    ];

                    const hasComparisonPhoto = hasVal(viewingActor.comparisonPhotoUrl);
                    const hasDatabaseGroup = allMasterMatches.length > 0 || hasBpjsData || hasComparisonPhoto;

                    // ────────────────────────────────────────────────────────────
                    // 3. PERSIAPAN DATA KELUARGA
                    // ────────────────────────────────────────────────────────────
                    const ttlKkCombined = hasVal(viewingActor.pobKepalaKeluarga) && hasVal(viewingActor.dobKepalaKeluarga)
                      ? `${viewingActor.pobKepalaKeluarga}, ${viewingActor.dobKepalaKeluarga}`
                      : (hasVal(viewingActor.pobKepalaKeluarga) ? viewingActor.pobKepalaKeluarga : (hasVal(viewingActor.dobKepalaKeluarga) ? viewingActor.dobKepalaKeluarga : ""));

                    const keluargaFields = [
                      { key: "noKK", label: "Nomor Kartu Keluarga (No. KK)", value: noKkVal, isMono: true, isCopyable: true },
                      { key: "statusKeluarga", label: "Status Dalam Keluarga", value: viewingActor.statusKeluarga },
                      { key: "namaKepalaKeluarga", label: "Nama Kepala Keluarga", value: viewingActor.namaKepalaKeluarga, isCopyable: true },
                      { key: "nikKepalaKeluarga", label: "NIK Kepala Keluarga", value: viewingActor.nikKepalaKeluarga, isMono: true, isCopyable: true },
                      { key: "ttlKepalaKeluarga", label: "Tempat, Tanggal Lahir Kepala Keluarga", value: ttlKkCombined },
                      { key: "agamaKepalaKeluarga", label: "Agama Kepala Keluarga", value: viewingActor.agamaKepalaKeluarga },
                      { key: "pekerjaanKepalaKeluarga", label: "Pekerjaan Kepala Keluarga", value: viewingActor.pekerjaanKepalaKeluarga },
                      { key: "tanggalCetakKk", label: "Tanggal Cetak KK", value: viewingActor.tanggalCetakKk },
                    ].filter(f => hasVal(f.value));

                    const hasKkPhoto = hasVal(viewingActor.kkUri);
                    const hasKeluargaGroup = keluargaFields.length > 0 || hasKkPhoto;

                    // ────────────────────────────────────────────────────────────
                    // 4. PERSIAPAN DATA USAHA
                    // ────────────────────────────────────────────────────────────
                    const foundQuota = kuotaData?.find((q: any) => (q.name || q.coordinator || "").toUpperCase().trim() === (viewingActor.coordinator || "").toUpperCase().trim());
                    const coordPhone = foundQuota?.phone || foundQuota?.noHp || foundQuota?.hp || "";
                    const canonicalCoordinator = normalizeCoordinator(viewingActor.coordinator || "").toUpperCase().trim();
                    const hasCoordinator = hasVal(canonicalCoordinator);
                    const rawPetugas = resolveSurveyorCanonicalName(viewingActor.petugasSurvey, systemUsersRaw);
                    const hasPetugasSurvey = hasVal(rawPetugas);

                    const usahaFields = [
                      { key: "businessName", label: "Nama Usaha / Produk", value: viewingActor.businessName },
                      { key: "businessCategory", label: "Kategori / Jenis Usaha", value: viewingActor.businessCategory },
                      ...(!isInspektorat && hasCoordinator ? [{ key: "coordinator", label: "Usulan / Koordinator", value: canonicalCoordinator }] : []),
                      ...(!isInspektorat && hasPetugasSurvey ? [{ key: "petugasSurvey", label: "Petugas Survey", value: rawPetugas }] : []),
                      { key: "businessLocation", label: "Lokasi Tempat Usaha", value: viewingActor.businessLocation, colSpan2: true },
                    ].filter(f => hasVal(f.value));

                    const hasDriveLink = hasVal(viewingActor.googleDriveLink);
                    const hasNibPhoto = hasVal(viewingActor.nibUri);
                    const hasUsahaPhoto = hasVal(viewingActor.photoUsahaUri);
                    const hasUsahaGroup = usahaFields.length > 0 || hasDriveLink || hasNibPhoto || hasUsahaPhoto;

                    // ────────────────────────────────────────────────────────────
                    // 5. PERSIAPAN DATA REKENING
                    // ────────────────────────────────────────────────────────────
                    const lpjNominalVal = viewingActor.lpjNominal && Number(viewingActor.lpjNominal) > 0
                      ? formatCurrency(Number(viewingActor.lpjNominal))
                      : "";
                    const lpjDateVal = hasVal(viewingActor.lpjEntryDate) ? viewingActor.lpjEntryDate : "";

                    const rekeningFields = [
                      { key: "bankName", label: "Bank Penyalur", value: viewingActor.bankName },
                      { key: "bankNumber", label: "Nomor Rekening", value: viewingActor.bankNumber, isMono: true, isCopyable: true },
                      { key: "bankOwner", label: "Nama Pemilik Rekening", value: viewingActor.bankOwner },
                      { key: "lpjNominal", label: "Nominal Pencairan / LPJ", value: lpjNominalVal },
                      { key: "lpjEntryDate", label: "Tanggal Input LPJ", value: lpjDateVal },
                    ].filter(f => hasVal(f.value));

                    const hasRekeningGroup = rekeningFields.length > 0;

                    // ────────────────────────────────────────────────────────────
                    // 6. PERSIAPAN DATA SURVEY
                    // ────────────────────────────────────────────────────────────
                    const sd = (viewingActor as any).surveyData || {};
                    const pejabatPetugas = sd.pejabatData?.petugas || {};
                    const pejabatVerifikator = sd.pejabatData?.verifikator || {};

                    const tanggalSurveyVal = hasVal(sd.tanggalSurvey)
                      ? (formatTanggalIndonesia(sd.tanggalSurvey).fullText || sd.tanggalSurvey)
                      : "";
                    const verifiedDinasAtVal = hasVal(viewingActor.verifiedDinasAt)
                      ? formatDateTimeIndo(viewingActor.verifiedDinasAt)
                      : "";
                    const petugasSurveyVal = hasVal(pejabatPetugas.nama)
                      ? pejabatPetugas.nama
                      : (hasPetugasSurvey ? rawPetugas : "");
                    const verifikatorVal = hasVal(viewingActor.verifikatorDinas)
                      ? viewingActor.verifikatorDinas
                      : (hasVal(pejabatVerifikator.nama) ? pejabatVerifikator.nama : (hasVal((viewingActor as any).berkasDinasVerifiedBy) ? (viewingActor as any).berkasDinasVerifiedBy : ""));

                    const modalUsahaVal = sd.modalUsaha && Number(sd.modalUsaha) > 0 ? formatCurrency(Number(sd.modalUsaha)) : "";
                    const omsetVal = sd.omset && Number(sd.omset) > 0 ? formatCurrency(Number(sd.omset)) : "";
                    const izinVal = Array.isArray(sd.izin) && sd.izin.filter((x: any) => hasVal(x)).length > 0
                      ? sd.izin.filter((x: any) => hasVal(x)).join(", ")
                      : (typeof sd.izin === "string" && hasVal(sd.izin) ? sd.izin : "");

                    const dtksVal = sd.dtks && typeof sd.dtks.masuk === "boolean"
                      ? (sd.dtks.masuk ? `Terdaftar DTKS${hasVal(sd.dtks.jenis) ? ` (${sd.dtks.jenis})` : ""}` : "Tidak Terdaftar DTKS")
                      : "";

                    const hibahVal = sd.hibah && typeof sd.hibah.pernah === "boolean"
                      ? (sd.hibah.pernah
                          ? `Pernah Menerima${hasVal(sd.hibah.dariMana) ? ` dari ${sd.hibah.dariMana}` : ""}${hasVal(sd.hibah.tahun) ? ` (Tahun ${sd.hibah.tahun})` : ""}`
                          : "Belum Pernah Menerima")
                      : "";

                    const surveyMainFields = [
                      { key: "tanggalSurvey", label: "Tanggal Pelaksanaan Survey", value: tanggalSurveyVal },
                      { key: "petugasSurvey", label: "Petugas Survey Lapangan", value: petugasSurveyVal, subValue: [pejabatPetugas.nipppk ? `NIP/NIPPPK: ${pejabatPetugas.nipppk}` : "", pejabatPetugas.pangkat, pejabatPetugas.jabatan].filter(Boolean).join(" • ") },
                      { key: "verifikatorDinas", label: "Verifikator Dinas", value: verifikatorVal, subValue: [pejabatVerifikator.nipppk ? `NIP/NIPPPK: ${pejabatVerifikator.nipppk}` : "", pejabatVerifikator.pangkat, pejabatVerifikator.jabatan].filter(Boolean).join(" • ") },
                      { key: "verifiedDinasAt", label: "Waktu Verifikasi Dinas", value: verifiedDinasAtVal },
                      { key: "hasilVerifikasiDinas", label: "Status Verifikasi Dinas", value: viewingActor.hasilVerifikasiDinas },
                      { key: "hasilSurvey", label: "Hasil Rekomendasi Survey", value: sd.hasilSurvey },
                      { key: "namaPemilik", label: "Nama Pemilik (Saat Survey)", value: sd.namaPemilik },
                      { key: "jenisKelamin", label: "Jenis Kelamin (Survey)", value: sd.jenisKelamin },
                      { key: "statusPerkawinan", label: "Status Perkawinan", value: sd.status },
                      { key: "noHp", label: "Nomor HP (Survey)", value: sd.noHp, isMono: true },
                      { key: "email", label: "Alamat Email", value: sd.email },
                      { key: "sosmed", label: "Akun Sosial Media", value: sd.sosmed },
                      { key: "dtks", label: "Status DTKS", value: dtksVal },
                      { key: "namaUsaha", label: "Nama Usaha (Hasil Survey)", value: sd.namaUsaha },
                      { key: "bidangUsaha", label: "Bidang Usaha (Survey)", value: sd.bidangUsaha },
                      { key: "tahunBerdiri", label: "Tahun Berdiri Usaha", value: sd.tahunBerdiri },
                      { key: "izin", label: "Legalitas / Izin Usaha", value: izinVal },
                      { key: "modalUsaha", label: "Estimasi Modal Usaha", value: modalUsahaVal },
                      { key: "omset", label: "Estimasi Omset / Bulan", value: omsetVal },
                      { key: "hibah", label: "Riwayat Penerimaan Hibah", value: hibahVal },
                      { key: "alamatRumah", label: "Alamat Rumah (Hasil Survey)", value: sd.alamatRumah, colSpan2: true },
                      { key: "alamatUsaha", label: "Alamat Usaha (Hasil Survey)", value: sd.alamatUsaha, colSpan2: true },
                      { key: "peralatan", label: "Peralatan Usaha yang Dimiliki", value: sd.peralatan, colSpan2: true },
                      { key: "rencanaPenggunaan", label: "Rencana Penggunaan Bantuan Hibah", value: sd.rencanaPenggunaan, colSpan2: true },
                      { key: "keteranganDinas", label: "Catatan / Keterangan Dinas", value: viewingActor.keteranganDinas || (viewingActor as any).filingNote, colSpan2: true },
                      { key: "catatanPengembalian", label: "Catatan Pengembalian Berkas", value: viewingActor.catatanPengembalian, colSpan2: true },
                      { key: "alasanCancelDinas", label: "Alasan Pembatalan / Penolakan", value: viewingActor.alasanCancelDinas || (viewingActor as any).rejectionReason, colSpan2: true },
                    ].filter(f => hasVal(f.value));

                    const gpsPoints: Array<{ label: string; lat: number; lon: number }> = [];
                    if ((viewingActor as any).verificationLocation?.lat && (viewingActor as any).verificationLocation?.lon) {
                      gpsPoints.push({
                        label: "Titik Lokasi Verifikasi Admin",
                        lat: (viewingActor as any).verificationLocation.lat,
                        lon: (viewingActor as any).verificationLocation.lon,
                      });
                    }
                    if ((viewingActor as any).verificationLocationDinas?.lat && (viewingActor as any).verificationLocationDinas?.lon) {
                      gpsPoints.push({
                        label: "Titik Lokasi Verifikasi Dinas",
                        lat: (viewingActor as any).verificationLocationDinas.lat,
                        lon: (viewingActor as any).verificationLocationDinas.lon,
                      });
                    }
                    if (sd.location?.lat && sd.location?.lon) {
                      const isDup = gpsPoints.some(p => p.lat === sd.location.lat && p.lon === sd.location.lon);
                      if (!isDup) {
                        gpsPoints.push({
                          label: "Titik Lokasi Geotagging Survey",
                          lat: sd.location.lat,
                          lon: sd.location.lon,
                        });
                      }
                    }

                    const hasBypass = Boolean((viewingActor as any).verificationBypass?.isBypassed && hasVal((viewingActor as any).verificationBypass?.reason));
                    const hasSurveyPhoto = hasVal(detailSurveyPhotoUrl);
                    const hasTandaTangan = hasVal(sd.tandaTanganPelakuUsaha);
                    const hasActualSurveyFields = surveyMainFields.some(f => f.key !== "petugasSurvey");
                    const hasSurveyGroup = hasActualSurveyFields || gpsPoints.length > 0 || hasBypass || hasSurveyPhoto || hasTandaTangan;

                    // ────────────────────────────────────────────────────────────
                    // 7. RIWAYAT AKTIVITAS TERAKHIR (TIMELINE)
                    // ────────────────────────────────────────────────────────────
                    const activityLogs: Array<{ title: string; date: string }> = [];
                    if (hasVal(lpjDateVal)) {
                      activityLogs.push({
                        title: `Input Pencairan / LPJ${hasVal(lpjNominalVal) ? ` (${lpjNominalVal})` : ""}`,
                        date: lpjDateVal
                      });
                    }
                    if (hasVal(tanggalSurveyVal)) {
                      activityLogs.push({
                        title: `Pelaksanaan Survey Lapangan${hasVal(petugasSurveyVal) ? ` oleh ${petugasSurveyVal}` : ""}`,
                        date: tanggalSurveyVal
                      });
                    }
                    if (hasVal(verifiedDinasAtVal)) {
                      activityLogs.push({
                        title: `Verifikasi Berkas Dinas${hasVal(verifikatorVal) ? ` oleh ${verifikatorVal}` : ""}`,
                        date: verifiedDinasAtVal
                      });
                    }
                    if (hasVal(createdAtVal)) {
                      activityLogs.push({
                        title: `Data Didaftarkan oleh ${hasVal(viewingActor.createdBy) ? viewingActor.createdBy : "Sistem"}`,
                        date: createdAtVal
                      });
                    }

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        {/* ════════════════════════════════════════════════════════════
                            KOLOM KIRI: STACKED SUMMARY CARDS (SAMA SEPERTI SCREENSHOT)
                           ════════════════════════════════════════════════════════════ */}
                        <div className="lg:col-span-4 xl:col-span-3 space-y-3.5">
                          {/* Card 1: Status Data */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-2">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Status Data
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "w-2.5 h-2.5 rounded-full shrink-0",
                                isRejected ? "bg-rose-500" : "bg-emerald-500"
                              )} />
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {statusLabel}
                              </span>
                            </div>
                            <div className="pt-1 flex flex-wrap gap-1.5">
                              <ActorMenuBadge actor={viewingActor} asLink />
                              <VerificationBadge actor={viewingActor} className="mt-0" />
                            </div>
                          </div>

                          {/* Card 2: Koordinator / Pengusul (Hanya jika tersedia) */}
                          {!isInspektorat && hasCoordinator && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-1.5">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Usulan / Koordinator
                              </p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                {canonicalCoordinator}
                              </p>
                              {hasVal(coordPhone) && (
                                <a
                                  href={getWaLink(coordPhone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline pt-0.5"
                                >
                                  <Phone className="w-3.5 h-3.5" /> WA Koordinator ({coordPhone})
                                </a>
                              )}
                              {isAdmin && (
                                <div className="pt-1.5">
                                  <select
                                    value={canonicalCoordinator}
                                    onChange={(e) => handleQuickReassignCoordinator(viewingActor.id, e.target.value)}
                                    className="text-xs font-medium h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 text-slate-700 dark:text-slate-200 cursor-pointer w-full"
                                  >
                                    {!coordinatorOptions.includes(canonicalCoordinator) && (
                                      <option value={canonicalCoordinator}>{canonicalCoordinator} (Saat Ini)</option>
                                    )}
                                    {coordinatorOptions.map((name: string) => (
                                      <option key={name} value={name}>{name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Card 3: Petugas Survey (Hanya jika tersedia) */}
                          {!isInspektorat && hasPetugasSurvey && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-1.5">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Petugas Survey
                              </p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                {rawPetugas}
                              </p>
                              {isAdmin && (
                                <div className="pt-1.5">
                                  <select
                                    value={rawPetugas}
                                    onChange={(e) => handleQuickReassignPetugas(viewingActor.id, e.target.value)}
                                    className="text-xs font-medium h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 text-slate-700 dark:text-slate-200 cursor-pointer w-full"
                                  >
                                    <option value="BELUM ADA">BELUM ADA</option>
                                    {!surveyorOptions.includes(rawPetugas) && (
                                      <option value={rawPetugas}>{rawPetugas} (Saat Ini)</option>
                                    )}
                                    {surveyorOptions.map((name: string) => (
                                      <option key={name} value={name}>{name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Card 4: Tanggal Terdaftar (Hanya jika tersedia) */}
                          {hasVal(createdAtVal) && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-1">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Tanggal Terdaftar
                              </p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {createdAtVal}
                              </p>
                            </div>
                          )}

                          {/* Card 5: Kontak Cepat (Hanya jika tersedia) */}
                          {(hasVal(viewingActor.phone) || hasVal(sd.email) || hasVal(viewingActor.address) || hasDriveLink) && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-2.5">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Kontak Cepat
                              </p>
                              <div className="space-y-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                                {hasVal(sd.email) && (
                                  <a
                                    href={`mailto:${sd.email}`}
                                    className="flex items-center gap-2.5 hover:text-blue-600 transition-colors break-all"
                                  >
                                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>{sd.email}</span>
                                  </a>
                                )}
                                {hasVal(viewingActor.phone) && (
                                  <a
                                    href={getWaLink(viewingActor.phone)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2.5 hover:text-emerald-600 transition-colors"
                                  >
                                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>{viewingActor.phone}</span>
                                  </a>
                                )}
                                {hasVal(viewingActor.address) && (
                                  <a
                                    href={getActorMapUrl(viewingActor)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5 hover:text-blue-600 transition-colors"
                                  >
                                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>Buka Lokasi di Maps</span>
                                  </a>
                                )}
                                {hasDriveLink && (
                                  <a
                                    href={viewingActor.googleDriveLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2.5 hover:text-blue-600 transition-colors"
                                  >
                                    <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>Folder Google Drive</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ════════════════════════════════════════════════════════════
                            KOLOM KANAN: 6 KELOMPOK DATA LENGKAP (CLEAN WHITE CARDS)
                           ════════════════════════════════════════════════════════════ */}
                        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
                          {/* ── 1. DATA PELAKU USAHA ── */}
                          {hasPelakuGroup && (
                            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs">
                              <h4 className="text-base font-bold text-slate-900 dark:text-white pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                                Data Pelaku Usaha
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                {pelakuFields.map((item) => (
                                  <CleanField
                                    key={item.key}
                                    label={item.label}
                                    value={item.value}
                                    isMono={item.isMono}
                                    isCopyable={item.isCopyable}
                                    colSpan2={item.colSpan2}
                                  />
                                ))}
                              </div>

                              {hasPelakuKtpPhoto && (
                                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                  <p className="text-xs font-medium text-slate-400">Foto / Dokumen KTP</p>
                                  <img
                                    src={viewingActor.ktpUri}
                                    alt="Foto KTP"
                                    onClick={() => setPreviewImageModal({ url: viewingActor.ktpUri!, title: `Foto KTP — ${viewingActor.fullName}` })}
                                    className="max-h-48 rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
                                  />
                                </div>
                              )}
                            </section>
                          )}

                          {/* ── 2. DATA PEMBACAAN DATABASE ── */}
                          {(hasDatabaseGroup || isCheckingAuxData) && (
                            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                  Data Pembacaan Database
                                </h4>
                                <CheckDataIndicator
                                  actor={viewingActor}
                                  data2023={activeDetailData.data2023}
                                  data2024={activeDetailData.data2024}
                                  data2025={activeDetailData.data2025}
                                  dataBlacklist={activeDetailData.dataBlacklist}
                                />
                              </div>

                              {isCheckingAuxData && allMasterMatches.length === 0 && (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                  <span>Memeriksa kecocokan database...</span>
                                </div>
                              )}

                              {allMasterMatches.length > 0 && (
                                <div className="space-y-4">
                                  {allMasterMatches.map((match, idx) => {
                                    const m = match.item || {};
                                    const matchedBy = m._matchedBy || (
                                      viewingActor.nik && String(m.nik || m.NIK || "") === String(viewingActor.nik) && viewingActor.noKK && String(m.noKK || m.kk || "") === String(viewingActor.noKK)
                                        ? "NIK & Nomor KK"
                                        : viewingActor.nik && String(m.nik || m.NIK || "") === String(viewingActor.nik)
                                        ? "NIK"
                                        : "Nomor KK"
                                    );

                                    const nominalRaw = m.lpjNominal || m.nominal || m.NOM || m.jumlahBantuan;
                                    const nominalFormatted = hasVal(nominalRaw)
                                      ? (!isNaN(Number(nominalRaw)) && Number(nominalRaw) > 0 ? formatCurrency(Number(nominalRaw)) : String(nominalRaw))
                                      : "";

                                    const knownPairs = [
                                      { label: "Nama Terdata", value: m.fullName || m.nama || m.NAMA },
                                      { label: "NIK Terdata", value: m.nik || m.Nik || m.NIK, isMono: true },
                                      { label: "Nomor KK Terdata", value: m.noKK || m.kk || m["NO KK"], isMono: true },
                                      { label: "Jenis Kelamin", value: m.gender || m.jenisKelamin },
                                      { label: "Tempat, Tanggal Lahir", value: m.pobDob || (m.pob && m.dob ? `${m.pob}, ${m.dob}` : m.dob || m.pob) },
                                      { label: "Nomor Telepon", value: m.phone || m.noHp || m.telepon, isMono: true },
                                      { label: "Nama Usaha", value: m.businessName || m.usaha || m.USAHA || m.namaUsaha },
                                      { label: "Kategori Usaha", value: m.businessCategory || m.kategori || m.sektor || m.bidangUsaha },
                                      { label: "Alamat", value: m.address || m.alamat || m.ALAMAT },
                                      { label: "RT / RW", value: m.rtRw || (m.rt && m.rw ? `${m.rt}/${m.rw}` : m.rt) },
                                      { label: "Kelurahan", value: m.kelurahan },
                                      { label: "Kecamatan", value: m.kecamatan },
                                      { label: "Koordinator", value: m.coordinator || m.koordinator },
                                      { label: "Tahun Program", value: m.tahunPengajuan || m.tahun || m.year },
                                      { label: "Nominal Bantuan / LPJ", value: nominalFormatted },
                                      { label: "Status Data", value: m.status || m.STATUS },
                                      { label: "Status LPJ", value: m.statusLpj },
                                      { label: "Kode Registrasi", value: m.registrationCode, isMono: true },
                                      { label: "Petugas Survey", value: m.petugasSurvey },
                                      { label: "Verifikator Dinas", value: m.verifikatorDinas },
                                      { label: "Hasil Verifikasi Dinas", value: m.hasilVerifikasiDinas },
                                      { label: "Keterangan / Alasan", value: m.alasan || m.alasanCancelDinas || m.keterangan || m.reason || m.catatan },
                                    ].filter(p => hasVal(p.value));

                                    const handledKeys = new Set([
                                      "id", "_matchedBy", "_source", "_table",
                                      "fullName", "nama", "NAMA", "nik", "Nik", "NIK", "noKK", "kk", "NO KK",
                                      "gender", "jenisKelamin", "pobDob", "pob", "dob", "phone", "noHp", "telepon",
                                      "businessName", "usaha", "USAHA", "namaUsaha", "businessCategory", "kategori", "sektor", "bidangUsaha",
                                      "address", "alamat", "ALAMAT", "rtRw", "rt", "rw", "kelurahan", "kecamatan",
                                      "coordinator", "koordinator", "tahunPengajuan", "tahun", "year",
                                      "lpjNominal", "nominal", "NOM", "jumlahBantuan", "status", "STATUS", "statusLpj",
                                      "registrationCode", "petugasSurvey", "verifikatorDinas", "hasilVerifikasiDinas",
                                      "alasan", "alasanCancelDinas", "keterangan", "reason", "catatan",
                                      "photoUrl", "fotoUrl", "comparisonPhotoUrl", "surveyData", "createdAt", "uploadedAt"
                                    ]);

                                    const extraPairs = Object.entries(m)
                                      .filter(([k, v]) => !handledKeys.has(k) && (typeof v === "string" || typeof v === "number") && hasVal(v))
                                      .map(([k, v]) => ({
                                        label: k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim(),
                                        value: String(v),
                                        isMono: false
                                      }));

                                    const allPairs = [...knownPairs, ...extraPairs];
                                    const itemPhoto = m.photoUrl || m.fotoUrl || m.comparisonPhotoUrl;

                                    return (
                                      <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 space-y-3.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                            {match.sheetTitle}
                                          </span>
                                          <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                            match.theme === "rose"
                                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                              : match.theme === "amber"
                                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                          )}>
                                            Cocok via {matchedBy}
                                          </span>
                                        </div>

                                        {allPairs.length > 0 && (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                                            {allPairs.map((pair, pIdx) => (
                                              <CleanField
                                                key={pIdx}
                                                label={pair.label}
                                                value={pair.value}
                                                isMono={pair.isMono}
                                              />
                                            ))}
                                          </div>
                                        )}

                                        {hasVal(itemPhoto) && (
                                          <div className="pt-2 space-y-1.5">
                                            <p className="text-xs font-medium text-slate-400">Foto pada Database</p>
                                            <img
                                              src={itemPhoto}
                                              alt={match.sheetTitle}
                                              onClick={() => setPreviewImageModal({ url: itemPhoto, title: `${match.sheetTitle} — ${viewingActor.fullName}` })}
                                              className="max-h-44 rounded-lg border border-slate-200 object-contain bg-white cursor-pointer hover:opacity-90 transition-opacity"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {hasComparisonPhoto && (
                                <div className="pt-2 space-y-2">
                                  <p className="text-xs font-medium text-slate-400">
                                    Fhoto Pembanding (Sheet 3 — Pembanding 2025)
                                  </p>
                                  <img
                                    src={viewingActor.comparisonPhotoUrl}
                                    alt="Fhoto Pembanding Sheet 3"
                                    onClick={() => setPreviewImageModal({ url: viewingActor.comparisonPhotoUrl!, title: `Fhoto Pembanding — ${viewingActor.fullName}` })}
                                    className="max-h-52 rounded-lg border border-slate-200 object-contain bg-white cursor-pointer hover:opacity-90 transition-opacity"
                                  />
                                </div>
                              )}

                              {hasBpjsData && (() => {
                                const sourceFile = bpjsInfo.bpjsItem?.fileName || bpjsInfo.bpjsItem?.sumberFile || (viewingActor as any).bpjsSourceFile;
                                const checkedAt = (viewingActor as any).bpjsCheckedAt || bpjsInfo.bpjsItem?.uploadedAt;
                                const kpjNumber = bpjsInfo.bpjsItem?.kpj || bpjsInfo.bpjsItem?.noKpj || (viewingActor as any).bpjsKpj;
                                const bpjsName = bpjsInfo.bpjsItem?.nama || bpjsInfo.bpjsItem?.fullName;

                                const bpjsFields = [
                                  { label: "Status Verifikasi BPJS", value: bpjsInfo.badgeLabel },
                                  { label: "Kode Status", value: bpjsInfo.statusCode },
                                  { label: "Nomor KPJ BPJS", value: kpjNumber, isMono: true },
                                  { label: "Nama pada Database BPJS", value: bpjsName },
                                  { label: "Keterangan Verifikasi", value: bpjsInfo.note },
                                  { label: "File Acuan BPJS", value: sourceFile, isMono: true },
                                  { label: "Waktu Pengecekan", value: checkedAt ? formatDateTimeIndo(checkedAt) : "" },
                                ].filter(f => hasVal(f.value));

                                return (
                                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 space-y-3">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                        Verifikasi BPJS Ketenagakerjaan
                                      </span>
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setViewingActor(null);
                                            router.push("/settings#bpjs");
                                          }}
                                          className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                                        >
                                          Kelola BPJS
                                        </button>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                                      {bpjsFields.map((bf, bIdx) => (
                                        <CleanField
                                          key={bIdx}
                                          label={bf.label}
                                          value={bf.value}
                                          isMono={bf.isMono}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </section>
                          )}

                          {/* ── 3. DATA KELUARGA ── */}
                          {hasKeluargaGroup && (
                            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs">
                              <h4 className="text-base font-bold text-slate-900 dark:text-white pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                                Data Keluarga
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                {keluargaFields.map((item) => (
                                  <CleanField
                                    key={item.key}
                                    label={item.label}
                                    value={item.value}
                                    isMono={item.isMono}
                                    isCopyable={item.isCopyable}
                                  />
                                ))}
                              </div>

                              {hasKkPhoto && (
                                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                  <p className="text-xs font-medium text-slate-400">Foto / Dokumen Kartu Keluarga</p>
                                  <img
                                    src={viewingActor.kkUri}
                                    alt="Foto KK"
                                    onClick={() => setPreviewImageModal({ url: viewingActor.kkUri!, title: `Foto KK — ${viewingActor.fullName}` })}
                                    className="max-h-48 rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
                                  />
                                </div>
                              )}
                            </section>
                          )}

                          {/* ── 4. DATA USAHA ── */}
                          {hasUsahaGroup && (
                            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs">
                              <h4 className="text-base font-bold text-slate-900 dark:text-white pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                                Data Usaha
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                {usahaFields.map((item) => (
                                  <CleanField
                                    key={item.key}
                                    label={item.label}
                                    value={item.value}
                                    colSpan2={(item as any).colSpan2}
                                  />
                                ))}
                                {hasDriveLink && (
                                  <CleanField
                                    label="Berkas Google Drive"
                                    value={
                                      <a
                                        href={viewingActor.googleDriveLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:underline inline-flex items-center gap-1.5"
                                      >
                                        <span>Buka Folder Google Drive</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    }
                                  />
                                )}
                              </div>

                              {(hasNibPhoto || hasUsahaPhoto) && (
                                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {hasNibPhoto && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-medium text-slate-400">Dokumen NIB / SKU</p>
                                      <img
                                        src={viewingActor.nibUri}
                                        alt="Dokumen NIB"
                                        onClick={() => setPreviewImageModal({ url: viewingActor.nibUri!, title: `Dokumen NIB — ${viewingActor.fullName}` })}
                                        className="max-h-44 rounded-lg border border-slate-200 object-contain bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
                                      />
                                    </div>
                                  )}
                                  {hasUsahaPhoto && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-medium text-slate-400">Foto Tempat / Produk Usaha</p>
                                      <img
                                        src={viewingActor.photoUsahaUri}
                                        alt="Foto Usaha"
                                        onClick={() => setPreviewImageModal({ url: viewingActor.photoUsahaUri!, title: `Foto Usaha — ${viewingActor.fullName}` })}
                                        className="max-h-44 rounded-lg border border-slate-200 object-contain bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </section>
                          )}

                          {/* ── 5. DATA REKENING ── */}
                          {hasRekeningGroup && (
                            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs">
                              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                  Data Rekening
                                </h4>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingBankMode(true)}
                                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                                  >
                                    Ubah Rekening
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                {rekeningFields.map((item) => (
                                  <CleanField
                                    key={item.key}
                                    label={item.label}
                                    value={item.value}
                                    isMono={item.isMono}
                                    isCopyable={item.isCopyable}
                                  />
                                ))}
                              </div>
                            </section>
                          )}

                          {/* ── 6. DATA SURVEY ── */}
                          {hasSurveyGroup && (
                            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
                              <h4 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                                Data Survey
                              </h4>

                              {surveyMainFields.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                  {surveyMainFields.map((item) => (
                                    <CleanField
                                      key={item.key}
                                      label={item.label}
                                      value={item.value}
                                      subValue={(item as any).subValue}
                                      isMono={item.isMono}
                                      colSpan2={item.colSpan2}
                                    />
                                  ))}
                                </div>
                              )}

                              {(gpsPoints.length > 0 || hasBypass) && (
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                  {gpsPoints.map((pt, idx) => (
                                    <CleanField
                                      key={idx}
                                      label={pt.label}
                                      value={
                                        <a
                                          href={`https://www.google.com/maps?q=${pt.lat},${pt.lon}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-600 hover:underline font-mono inline-flex items-center gap-1.5"
                                        >
                                          <span>{pt.lat}, {pt.lon}</span>
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      }
                                    />
                                  ))}
                                  {hasBypass && (
                                    <CleanField
                                      label="Verifikasi Bypass Lokasi"
                                      value={(viewingActor as any).verificationBypass.reason}
                                    />
                                  )}
                                </div>
                              )}

                              {(hasSurveyPhoto || isDetailPhotoLoading || hasTandaTangan) && (
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {(hasSurveyPhoto || isDetailPhotoLoading) && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-medium text-slate-400">Foto Dokumentasi Survey Lapangan</p>
                                      {isDetailPhotoLoading && !hasSurveyPhoto ? (
                                        <div className="h-36 rounded-lg border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-400">
                                          <Loader2 className="w-4 h-4 animate-spin" /> Memuat foto...
                                        </div>
                                      ) : hasSurveyPhoto ? (
                                        <img
                                          src={detailSurveyPhotoUrl!}
                                          alt="Foto Survey Lapangan"
                                          onClick={() => setPreviewImageModal({ url: detailSurveyPhotoUrl!, title: `Foto Survey Lapangan — ${viewingActor.fullName}` })}
                                          className="max-h-52 rounded-lg border border-slate-200 object-contain bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
                                        />
                                      ) : null}
                                    </div>
                                  )}

                                  {hasTandaTangan && (
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-medium text-slate-400">Tanda Tangan Pelaku Usaha</p>
                                      <img
                                        src={sd.tandaTanganPelakuUsaha}
                                        alt="Tanda Tangan Pelaku Usaha"
                                        onClick={() => setPreviewImageModal({ url: sd.tandaTanganPelakuUsaha, title: `Tanda Tangan — ${viewingActor.fullName}` })}
                                        className="max-h-44 rounded-lg border border-slate-200 object-contain bg-white p-2 cursor-pointer"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </section>
                          )}

                          {/* ── RIWAYAT AKTIVITAS TERAKHIR (SAMA SEPERTI SCREENSHOT) ── */}
                          {activityLogs.length > 0 && (
                            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs">
                              <h4 className="text-base font-bold text-slate-900 dark:text-white pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                                Riwayat Aktivitas Terakhir
                              </h4>
                              <div className="relative pl-5 space-y-5 before:content-[''] before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                                {activityLogs.map((log, idx) => (
                                  <div key={idx} className="relative">
                                    <span className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 ring-4 ring-white dark:ring-slate-900" />
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {log.title}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {log.date}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

          {viewingActor && editingBankMode && (
            <div className="flex flex-col gap-4 p-4 sm:p-6 overflow-y-auto max-h-[92vh]">
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
            <div className="flex flex-col gap-4 p-4 sm:p-6 overflow-y-auto max-h-[92vh]">
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
                        <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-200 text-[9px] md:text-[10px] font-black uppercase px-2 py-0.5 whitespace-nowrap dark:bg-teal-950 dark:text-teal-200 dark:border-teal-800">
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

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <ActorMenuBadge actor={actor} asLink />
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
                          <Badge variant="outline" className="text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
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
                              <span className="bg-slate-100 dark:bg-black text-slate-700 dark:text-white px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                Kel. {actor.kelurahan || "-"}
                              </span>
                              <span className="bg-slate-100 dark:bg-black text-slate-700 dark:text-white px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
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
                          <Badge variant="outline" className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                            DATABASE
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="Nama Usaha" value={<span className="text-primary font-black uppercase">{actor.businessName || "-"}</span>} className="sm:col-span-2" />
                          <Field label="Kategori Usaha" value={<Badge variant="secondary" className="font-bold text-[10px] uppercase dark:bg-black dark:text-white dark:border dark:border-slate-800">{actor.businessCategory || "-"}</Badge>} />
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
                              "text-xs font-black uppercase px-2.5 py-0.5 mt-0.5 border",
                              sd.dtks?.masuk 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700" 
                                : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-black dark:text-white dark:border-slate-700"
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
                              "text-xs font-black uppercase px-2.5 py-0.5 mt-0.5 border",
                              sd.hibah?.pernah 
                                ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700" 
                                : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-black dark:text-white dark:border-slate-700"
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
                    className="font-bold px-6 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white dark:border-slate-700"
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
            <div className="w-full flex items-center px-3 py-1.5 border-b border-white/10 mb-2 pr-12">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-teal-300 truncate">
                <Camera className="w-4 h-4 text-teal-400 shrink-0" /> Foto Survey Lapangan &mdash; {surveyViewActor?.fullName}
              </span>
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

      {previewImageModal && (
        <Dialog open={!!previewImageModal} onOpenChange={(open) => !open && setPreviewImageModal(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] p-3 flex flex-col items-center justify-center bg-black/95 border-slate-800 text-white rounded-2xl overflow-hidden">
            <div className="w-full flex items-center px-3 py-1.5 border-b border-white/10 mb-2 pr-12">
              <DialogTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-teal-300 truncate">
                <Camera className="w-4 h-4 text-teal-400 shrink-0" /> {previewImageModal.title}
              </DialogTitle>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden w-full p-2">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.title}
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
