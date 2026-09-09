"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  useUser, 
  useDatabase, 
  useList, 
  useObject, 
  useMemoFirebase, 
  updateDocumentNonBlocking,
  useAuth
} from "@/firebase"
import { ref, update, get, query, orderByChild, equalTo, limitToLast } from "firebase/database"
import { signOut } from "firebase/auth"
import { BusinessActor, PejabatData, SurveyDinasData } from "../lib/types"
import { generateBeritaAcaraPDF, formatTanggalIndonesia } from "@/lib/generate-berita-acara-pdf"
import { ensureVerifikatorUser } from "@/lib/verifikator-service"
import { logActivity, getDeviceType } from "@/lib/logger"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"

import { 
  LogOut, 
  UserCheck, 
  FileSignature, 
  Store, 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  ChevronRight, 
  ChevronDown,
  Search, 
  Phone, 
  CheckCircle2, 
  Clock3, 
  FileDown, 
  Camera, 
  Loader2, 
  Shield, 
  MapPin, 
  Navigation, 
  Save, 
  X, 
  AlertTriangle,
  FileText,
  User,
  Check,
  RotateCcw,
  Ban,
  XCircle
} from "lucide-react"

const IZIN_OPTIONS = ["NIB", "P-IRT", "HALAL", "BPOM", "HAKI", "Belum Ada"]
const STATUS_OPTIONS = ["Kepala Keluarga", "Ibu Rumah Tangga", "Lajang", "Janda", "Duda"]
const BANSOS_OPTIONS = ["PKH", "BPNT", "KIP", "LANSIA", "Lainnya"]
const CANCEL_REASONS = [
  "Usaha Tutup / Tidak Beroperasi",
  "Pindah Domisili / Di Luar Wilayah",
  "Alamat Palsu / Tidak Ditemukan",
  "Menolak Disurvey / Mengundurkan Diri",
  "Penerima Bantuan Serupa / Tidak Layak",
  "Lainnya"
]

export default function PortalSurveyPage() {
  const { user, userProfile, isUserLoading } = useUser()
  const database = useDatabase()
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const surveyPhotoInputRef = useRef<HTMLInputElement>(null)

  // Realtime clock states
  const [currentDateTime, setCurrentDateTime] = useState<{ date: string; time: string }>({
    date: "",
    time: ""
  })

  // Modal States
  const [activeModal, setActiveModal] = useState<'pejabat' | 'pelaku-usaha' | 'rekapan' | null>(null)
  const [isSavingPejabat, setIsSavingPejabat] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)

  // Search queries & pagination limits (for ultra-fast mobile rendering)
  const [searchPelakuQuery, setSearchPelakuQuery] = useState("")
  const [searchRekapanQuery, setSearchRekapanQuery] = useState("")
  const [displayLimitPelaku, setDisplayLimitPelaku] = useState(25)
  const [displayLimitRekapan, setDisplayLimitRekapan] = useState(25)

  // Reset pagination limit when opening dialogs
  useEffect(() => {
    if (activeModal === 'pelaku-usaha') {
      setDisplayLimitPelaku(25)
    } else if (activeModal === 'rekapan') {
      setDisplayLimitRekapan(25)
    }
  }, [activeModal])

  // ==========================================
  // IN-PORTAL SURVEY STATE (PROSES LANGSUNG)
  // ==========================================
  const [surveyingActor, setSurveyingActor] = useState<BusinessActor | null>(null)
  const [surveyData, setSurveyData] = useState<Partial<SurveyDinasData>>({})
  const [surveyLocation, setSurveyLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [surveyPhotoPreview, setSurveyPhotoPreview] = useState<string | null>(null)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false)
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false)

  // ==========================================
  // CANCEL DINAS STATE (FUNGSI BATAL SURVEY)
  // ==========================================
  const [cancelTargetActor, setCancelTargetActor] = useState<BusinessActor | null>(null)
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string>("Usaha Tutup / Tidak Beroperasi")
  const [customCancelReason, setCustomCancelReason] = useState<string>("")
  const [cancelPhotoProof, setCancelPhotoProof] = useState<string | null>(null)
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false)
  const cancelFileInputRef = useRef<HTMLInputElement>(null)

  // Format Rupiah Helper
  const formatRupiah = (value: string) => {
    const numberString = value.replace(/[^,\d]/g, '').toString();
    const split = numberString.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    if (ribuan) {
      const separator = sisa ? '.' : '';
      rupiah += separator + ribuan.join('.');
    }
    return split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
  };

  // Pejabat form state
  const [pejabatForm, setPejabatForm] = useState({
    verifikatorNama: "",
    verifikatorNipppk: "",
    verifikatorPangkat: "",
    verifikatorJabatan: "",
    petugasNama: "",
    petugasNipppk: "",
    petugasPangkat: "",
    petugasJabatan: ""
  })

  // Realtime clock interval
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }
      setCurrentDateTime({
        date: now.toLocaleDateString('id-ID', options),
        time: `${hours}.${minutes}.${seconds}`
      })
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Check login
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  // Load Pejabat Data
  useEffect(() => {
    if (userProfile) {
      const pd = (userProfile as any).pejabatData as PejabatData | undefined
      const cached = typeof window !== 'undefined' 
        ? ((user?.uid ? localStorage.getItem(`pejabatData_${user.uid}`) : null) || localStorage.getItem('pejabatData')) 
        : null
      const cachedPd = cached ? JSON.parse(cached) : null
      const activePd = pd || cachedPd

      if (activePd?.verifikator?.nama || activePd?.petugas?.nama) {
        setPejabatForm({
          verifikatorNama: activePd.verifikator?.nama || "",
          verifikatorNipppk: activePd.verifikator?.nipppk || "",
          verifikatorPangkat: activePd.verifikator?.pangkat || "",
          verifikatorJabatan: activePd.verifikator?.jabatan || "",
          petugasNama: activePd.petugas?.nama || userProfile.fullName || "",
          petugasNipppk: activePd.petugas?.nipppk || (userProfile as any)?.nipppk || "",
          petugasPangkat: activePd.petugas?.pangkat || (userProfile as any)?.pangkat || "",
          petugasJabatan: activePd.petugas?.jabatan || (userProfile as any)?.jabatan || ""
        })
      } else {
        setPejabatForm(prev => ({
          ...prev,
          petugasNama: userProfile.fullName || "",
          petugasNipppk: (userProfile as any)?.nipppk || "",
          petugasPangkat: (userProfile as any)?.pangkat || "",
          petugasJabatan: (userProfile as any)?.jabatan || "Petugas Survey Lapangan"
        }))
      }
    }
  }, [userProfile, user?.uid])

  // =========================================================================
  // FAST & LIGHTWEIGHT DATA LOADING (Server-side Indexed Query on petugasSurvey)
  // =========================================================================
  
  // 1. Instant Profile resolution (from React context or localStorage cache for 0ms initial render)
  const cachedProfile = useMemo(() => {
    if (typeof window === 'undefined') return null
    try {
      const p = localStorage.getItem('simpu_cached_profile')
      return p ? JSON.parse(p) : null
    } catch {
      return null
    }
  }, [])

  const activeProfile = userProfile || cachedProfile

  const officerNameUpper = useMemo(() => {
    return (activeProfile?.fullName || "").toUpperCase().trim().replace(/\s+/g, ' ')
  }, [activeProfile?.fullName])

  const officerUsernameUpper = useMemo(() => {
    return (activeProfile?.username || "").toUpperCase().trim()
  }, [activeProfile?.username])

  const isAdmin = Boolean(activeProfile?.role === 'admin' || activeProfile?.role === 'superadmin')

  // 2. Primary Query: Fast & Lightweight server-indexed query (petugasSurvey is indexed in database.rules.json)
  const primaryQuery = useMemoFirebase(() => {
    if (!database) return null
    if (officerNameUpper) {
      return query(
        ref(database, 'businessActors'),
        orderByChild('petugasSurvey'),
        equalTo(officerNameUpper)
      )
    }
    if (isAdmin) {
      // For Admin preview: light query of latest 50 records to keep it ultra fast and avoid downloading 30MB
      return query(ref(database, 'businessActors'), limitToLast(50))
    }
    return null
  }, [database, officerNameUpper, isAdmin])

  const { data: primaryActorsList, isLoading: isPrimaryLoading } = useList<BusinessActor>(primaryQuery)

  // 3. Secondary Query: if username differs from full name and exists (covers legacy username-assigned data)
  const secondaryQuery = useMemoFirebase(() => {
    if (!database || !officerUsernameUpper || officerUsernameUpper === officerNameUpper || isAdmin) {
      return null
    }
    return query(
      ref(database, 'businessActors'),
      orderByChild('petugasSurvey'),
      equalTo(officerUsernameUpper)
    )
  }, [database, officerUsernameUpper, officerNameUpper, isAdmin])

  const { data: secondaryActorsList } = useList<BusinessActor>(secondaryQuery)

  // 4. Ultra-fast deduplication of server-indexed actor list
  const rawActorsList = useMemo(() => {
    if (!primaryActorsList && !secondaryActorsList) return null
    const map = new Map<string, BusinessActor>()
    if (primaryActorsList) {
      for (const a of primaryActorsList) {
        if (a && a.id) map.set(a.id, a)
      }
    }
    if (secondaryActorsList) {
      for (const a of secondaryActorsList) {
        if (a && a.id && !map.has(a.id)) map.set(a.id, a)
      }
    }
    return Array.from(map.values())
  }, [primaryActorsList, secondaryActorsList])

  const isActorsLoading = isPrimaryLoading && !rawActorsList

  // Fast Filter: data is already filtered server-side by Firebase!
  const myActors = useMemo(() => {
    if (!rawActorsList) return []
    return rawActorsList
  }, [rawActorsList])

  // =========================================================================
  // RULE USER: Menu 2 HANYA menampilkan data yang BELUM disurvey!
  // Cancel Dinas / Tidak Lolos / Selesai langsung menghilang dari daftar ini!
  // =========================================================================
  const uncompletedMyActors = useMemo(() => {
    return myActors.filter(a => {
      const isCancelled = Boolean(a.alasanCancelDinas) || 
                          a.hasilVerifikasiDinas === 'Tidak Lolos' || 
                          a.status === 'rejected';
      const isDone = a.status === 'verified_dinas' || 
                     a.status === 'finish' || 
                     Boolean(a.surveyData?.hasilSurvey) ||
                     Boolean(a.verifiedDinasAt);
      return !isDone && !isCancelled;
    })
  }, [myActors])

  // Filtered list for Menu 2 search
  const filteredUncompletedActors = useMemo(() => {
    if (!searchPelakuQuery.trim()) return uncompletedMyActors
    const q = searchPelakuQuery.toLowerCase().trim()
    return uncompletedMyActors.filter(a => 
      (a.fullName && a.fullName.toLowerCase().includes(q)) ||
      (a.nik && a.nik.includes(q)) ||
      (a.businessName && a.businessName.toLowerCase().includes(q)) ||
      (a.kelurahan && a.kelurahan.toLowerCase().includes(q))
    )
  }, [uncompletedMyActors, searchPelakuQuery])

  // Paginated display slice for 60fps instant dialog rendering
  const displayedUncompletedActors = useMemo(() => {
    if (searchPelakuQuery.trim()) {
      return filteredUncompletedActors.slice(0, 100)
    }
    return filteredUncompletedActors.slice(0, displayLimitPelaku)
  }, [filteredUncompletedActors, searchPelakuQuery, displayLimitPelaku])

  // =========================================================================
  // Menu 3: Rekapan Berita Acara (Yang SUDAH disurvey dari awal s/d akhir)
  // Hanya survey lolos yang memiliki Berita Acara (Cancel Dinas tidak masuk)
  // =========================================================================
  const completedBeritaAcaraList = useMemo(() => {
    const list = myActors.filter(a => {
      if (a.hasilVerifikasiDinas === 'Tidak Lolos' || Boolean(a.alasanCancelDinas) || a.status === 'rejected') {
        return false
      }
      return (a.status === 'verified_dinas' || a.status === 'finish') &&
             (Boolean(a.surveyData?.hasilSurvey) || Boolean(a.verifiedDinasAt))
    })

    if (!searchRekapanQuery.trim()) return list
    const q = searchRekapanQuery.toLowerCase().trim()
    return list.filter(a =>
      (a.fullName && a.fullName.toLowerCase().includes(q)) ||
      (a.nik && a.nik.includes(q)) ||
      (a.businessName && a.businessName.toLowerCase().includes(q)) ||
      (a.kelurahan && a.kelurahan.toLowerCase().includes(q))
    )
  }, [myActors, searchRekapanQuery])

  // Paginated display slice for Rekapan dialog
  const displayedCompletedActors = useMemo(() => {
    if (searchRekapanQuery.trim()) {
      return completedBeritaAcaraList.slice(0, 100)
    }
    return completedBeritaAcaraList.slice(0, displayLimitRekapan)
  }, [completedBeritaAcaraList, searchRekapanQuery, displayLimitRekapan])

  // Count statistics
  const totalAssigned = myActors.length
  const totalUncompleted = uncompletedMyActors.length
  const totalCompleted = completedBeritaAcaraList.length

  const isPejabatComplete = Boolean(
    pejabatForm.verifikatorNama && 
    pejabatForm.verifikatorNipppk && 
    pejabatForm.petugasNama && 
    pejabatForm.petugasNipppk
  )

  // =========================================================================
  // IN-PORTAL SURVEY FUNCTIONS
  // =========================================================================
  const openInPortalSurvey = (actor: BusinessActor) => {
    setSurveyingActor(actor)
    
    // Existing location or null
    const existingLoc = actor.verificationLocationDinas || (actor.surveyData as any)?.location || null
    setSurveyLocation(existingLoc)

    // Existing photo
    const existingPhoto = actor.surveyData?.fotoSurveyUrl || null
    setSurveyPhotoPreview(existingPhoto)

    const todayStr = new Date().toISOString().split('T')[0]
    const existing = actor.surveyData || {} as Partial<SurveyDinasData>

    let defaultGender = ''
    if (existing.jenisKelamin) {
      defaultGender = existing.jenisKelamin
    } else if (actor.gender) {
      defaultGender = actor.gender.toLowerCase().includes('perempuan') ? 'Perempuan' : 'Laki-Laki'
    }

    setSurveyData({
      tanggalSurvey: existing.tanggalSurvey || todayStr,
      namaUsaha: existing.namaUsaha || actor.businessName || '',
      namaPemilik: existing.namaPemilik || actor.fullName || '',
      jenisKelamin: defaultGender,
      status: existing.status || '',
      alamatRumah: existing.alamatRumah || actor.address || '',
      noHp: existing.noHp || actor.phone || '',
      email: existing.email || '',
      sosmed: existing.sosmed || '',
      bidangUsaha: existing.bidangUsaha || actor.businessCategory || '',
      peralatan: existing.peralatan || '',
      tahunBerdiri: existing.tahunBerdiri || '',
      modalUsaha: existing.modalUsaha || '',
      omset: existing.omset || '',
      rencanaPenggunaan: existing.rencanaPenggunaan || '',
      hasilSurvey: existing.hasilSurvey || 'Lolos',
      dtks: existing.dtks || { masuk: false },
      hibah: existing.hibah || { pernah: false },
      izin: existing.izin || [],
      fotoSurveyUrl: existingPhoto || undefined
    })
  }

  // Survey Progress Calculation
  const surveyProgress = useMemo(() => {
    if (!surveyingActor) return 0
    let requiredFields = 16
    let filled = 0
    if (surveyData.tanggalSurvey) filled++
    if (surveyData.namaUsaha) filled++
    if (surveyData.namaPemilik) filled++
    if (surveyData.jenisKelamin) filled++
    if (surveyData.status) filled++
    if (surveyData.alamatRumah) filled++
    if (surveyData.noHp) filled++
    if (surveyData.dtks?.masuk !== undefined) {
      filled++
      if (surveyData.dtks.masuk && surveyData.dtks.jenis) filled++
    }
    if (surveyData.bidangUsaha) filled++
    if (surveyData.peralatan) filled++
    if (surveyData.tahunBerdiri) filled++
    if (surveyData.modalUsaha) filled++
    if (surveyData.omset) filled++
    if (surveyData.rencanaPenggunaan) filled++
    if (surveyLocation) filled++
    if (surveyPhotoPreview) filled++
    return Math.min(100, Math.round((filled / requiredFields) * 100))
  }, [surveyData, surveyLocation, surveyPhotoPreview, surveyingActor])

  // Location GPS Capture
  const handleCaptureLocation = () => {
    setIsFetchingLocation(true)
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "GPS Tidak Didukung",
        description: "Browser atau perangkat Anda tidak mendukung akses GPS."
      })
      setIsFetchingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSurveyLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        })
        setIsFetchingLocation(false)
        toast({
          title: "🎯 Lokasi GPS Berhasil Diambil",
          description: `Koordinat: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`
        })
      },
      (err) => {
        setIsFetchingLocation(false)
        toast({
          variant: "destructive",
          title: "Gagal Mengambil Lokasi",
          description: "Pastikan GPS/Lokasi HP Anda aktif dan beri izin akses pada browser."
        })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  // Survey Photo Capture / Upload
  const handleSurveyPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const rawResult = event.target?.result as string
      const img = new Image()
      img.src = rawResult
      img.onload = () => {
        try {
          const MAX_B64_BYTES = 1_398_101 // max 1MB
          const canvas = document.createElement('canvas')
          const MAX_DIM = 1200
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width)
              width = MAX_DIM
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height)
              height = MAX_DIM
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          let result = ''
          for (const q of [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]) {
            result = canvas.toDataURL('image/jpeg', q)
            if (result.length <= MAX_B64_BYTES) break
          }
          setSurveyPhotoPreview(result)
          toast({
            title: "Foto Berhasil Dimuat",
            description: "Foto survey lapangan siap disimpan."
          })
        } catch {
          setSurveyPhotoPreview(rawResult)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // Save Final Survey in Portal
  const handleCompleteSurveyInPortal = async () => {
    if (!surveyingActor || !database || !userProfile) return

    if (!surveyLocation) {
      toast({
        variant: "destructive",
        title: "Titik GPS Belum Diambil",
        description: "Harap klik tombol 'Ambil Lokasi GPS' terlebih dahulu."
      })
      return
    }

    if (!surveyPhotoPreview) {
      toast({
        variant: "destructive",
        title: "Foto Survey Belum Diupload",
        description: "Harap ambil atau upload foto survei tempat usaha."
      })
      return
    }

    setIsSubmittingSurvey(true)
    try {
      const activePejabat: PejabatData = {
        verifikator: {
          nama: pejabatForm.verifikatorNama || "Dinas Koperasi & UKM",
          nipppk: pejabatForm.verifikatorNipppk || "-",
          pangkat: pejabatForm.verifikatorPangkat || "-",
          jabatan: pejabatForm.verifikatorJabatan || "Verifikator Dinas"
        },
        petugas: {
          nama: pejabatForm.petugasNama || userProfile.fullName || "-",
          nipppk: pejabatForm.petugasNipppk || (userProfile as any)?.nipppk || "-",
          pangkat: pejabatForm.petugasPangkat || (userProfile as any)?.pangkat || "-",
          jabatan: pejabatForm.petugasJabatan || (userProfile as any)?.jabatan || "Petugas Survey Lapangan"
        },
        updatedAt: new Date().toISOString()
      }

      const finalSurveyData: any = {
        ...surveyData,
        fotoSurveyUrl: surveyPhotoPreview,
        location: surveyLocation,
        pejabatData: activePejabat,
        hasilSurvey: "Lolos"
      }

      const actorRef = ref(database, `businessActors/${surveyingActor.id}`)
      const updateData: any = {
        status: 'verified_dinas',
        hasilVerifikasiDinas: 'Lolos',
        surveyData: finalSurveyData,
        surveyProgress: 100,
        verificationLocationDinas: surveyLocation,
        verifiedDinasAt: new Date().toISOString(),
        verifiedDinasBy: userProfile.fullName || user?.email || "Petugas Survey",
        verifikatorDinas: activePejabat.verifikator.nama,
        pejabatData: activePejabat
      }

      await update(actorRef, updateData)

      logActivity({
        query: `SURVEY DINAS PORTAL: ${surveyingActor.fullName} - LOLOS`,
        results: "Berhasil Selesai",
        device: getDeviceType(navigator.userAgent),
        source: "Web",
        method: "SURVEY PORTAL",
        userId: user?.email || userProfile.fullName
      }, database)

      toast({
        title: "🎉 Survey Selesai & Lolos",
        description: `${surveyingActor.fullName} telah selesai disurvey dan otomatis dipindahkan ke Rekapan Berita Acara.`
      })

      setSurveyingActor(null)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan Survey",
        description: err.message
      })
    } finally {
      setIsSubmittingSurvey(false)
    }
  }

  // Save Draft in Portal
  const handleSaveDraftInPortal = async () => {
    if (!surveyingActor || !database || !userProfile) return
    setIsSubmittingDraft(true)
    try {
      const draftSurveyData: any = {
        ...surveyData,
        fotoSurveyUrl: surveyPhotoPreview || null,
        location: surveyLocation || null
      }

      const actorRef = ref(database, `businessActors/${surveyingActor.id}`)
      const updateData: any = {
        surveyData: draftSurveyData,
        lastDraftAt: new Date().toISOString(),
        lastDraftBy: userProfile.fullName || "Petugas Survey"
      }
      if (surveyLocation) {
        updateData.verificationLocationDinas = surveyLocation
      }

      await update(actorRef, updateData)

      toast({
        title: "💾 Draft Berhasil Disimpan",
        description: `Perubahan survey sementara untuk ${surveyingActor.fullName} tersimpan.`
      })
      setSurveyingActor(null)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan Draft",
        description: err.message
      })
    } finally {
      setIsSubmittingDraft(false)
    }
  }

  // ==========================================
  // CANCEL DINAS HANDLERS
  // ==========================================
  const handleCancelPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const rawResult = event.target?.result as string
      const img = new Image()
      img.src = rawResult
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const MAX_DIM = 800
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width)
              width = MAX_DIM
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height)
              width = MAX_DIM
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          const base64 = canvas.toDataURL('image/jpeg', 0.7)
          setCancelPhotoProof(base64)
        } catch (err) {
          console.error("Gagal kompres foto bukti cancel:", err)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  const handleConfirmCancelDinas = async () => {
    if (!cancelTargetActor || !database) return
    
    const finalReason = cancelReasonPreset === "Lainnya" 
      ? customCancelReason.trim() 
      : customCancelReason.trim() 
        ? `${cancelReasonPreset} - ${customCancelReason.trim()}`
        : cancelReasonPreset

    if (!finalReason) {
      toast({
        variant: "destructive",
        title: "Alasan Wajib Diisi",
        description: "Silakan pilih atau tulis alasan pembatalan survey."
      })
      return
    }

    setIsSubmittingCancel(true)
    try {
      const actorId = cancelTargetActor.id
      const actorRef = ref(database, `businessActors/${actorId}`)
      const officerName = userProfile?.fullName || activeProfile?.fullName || 'Petugas Survey'

      const cancelUpdates: any = {
        status: 'verified_dinas',
        hasilVerifikasiDinas: 'Tidak Lolos',
        alasanCancelDinas: finalReason,
        cancelDinasPhotoUrl: cancelPhotoProof || null,
        cancelDinasAt: new Date().toISOString(),
        cancelDinasBy: officerName
      }

      await update(actorRef, cancelUpdates)

      // Sync global stats
      try {
        const { updateStatsOnStatusChange } = await import("@/lib/stats-service")
        await updateStatsOnStatusChange(database, cancelTargetActor.status || 'lpj_pending', 'rejected', {
          ...cancelTargetActor,
          ...cancelUpdates
        })
      } catch (e) {
        console.error("Error updating stats on cancel:", e)
      }

      // Log activity
      logActivity({
        query: `CANCEL SURVEY DINAS: ${cancelTargetActor.fullName} (${cancelTargetActor.businessName || 'UMKM'}) - ${finalReason}`,
        results: "Berhasil di-cancel dan dikeluarkan dari antrean survey",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'CANCEL DINAS',
        userId: officerName
      })

      toast({
        title: "🚫 Survey Dibatalkan (Cancel Dinas)",
        description: `Data ${cancelTargetActor.fullName} berhasil di-cancel dan dikeluarkan dari antrean tugas.`
      })

      // Reset state & close modal
      setCancelTargetActor(null)
      setCustomCancelReason("")
      setCancelPhotoProof(null)
      setCancelReasonPreset("Usaha Tutup / Tidak Beroperasi")
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Membatalkan",
        description: err.message || "Terjadi kesalahan saat membatalkan survey."
      })
    } finally {
      setIsSubmittingCancel(false)
    }
  }

  // Logout handler
  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari SIMPU?")) {
      try {
        if (database && userProfile?.id) {
          await update(ref(database, `system_users/${userProfile.id}`), {
            isOnline: false,
            lastSeen: Date.now()
          }).catch(console.error)
        }
        await signOut(auth)
        toast({ title: "Berhasil Keluar", description: "Sesi Anda telah diakhiri." })
        router.push("/login")
      } catch (err: any) {
        toast({ variant: "destructive", title: "Gagal Keluar", description: err.message })
      }
    }
  }

  // Pejabat Save Handler
  const handleSavePejabat = async () => {
    if (!user || !database) return
    const { 
      verifikatorNama, verifikatorNipppk, verifikatorPangkat, verifikatorJabatan,
      petugasNama, petugasNipppk, petugasPangkat, petugasJabatan 
    } = pejabatForm

    if (!verifikatorNama.trim() || !verifikatorNipppk.trim() || !petugasNama.trim() || !petugasNipppk.trim()) {
      toast({
        variant: "destructive",
        title: "Kolom Belum Lengkap",
        description: "Nama dan NIP/NIPPPK untuk Petugas & Verifikator wajib diisi."
      })
      return
    }

    setIsSavingPejabat(true)
    try {
      const activePejabatData: PejabatData = {
        verifikator: { 
          nama: verifikatorNama.trim(), 
          nipppk: verifikatorNipppk.trim(), 
          pangkat: verifikatorPangkat.trim(), 
          jabatan: verifikatorJabatan.trim() || "Verifikator Dinas"
        },
        petugas: { 
          nama: petugasNama.trim(), 
          nipppk: petugasNipppk.trim(), 
          pangkat: petugasPangkat.trim(), 
          jabatan: petugasJabatan.trim() || "Petugas Survey Lapangan"
        },
        updatedAt: new Date().toISOString()
      }

      if (userProfile?.id) {
        await update(ref(database, `system_users/${userProfile.id}`), {
          pejabatData: activePejabatData,
          nipppk: activePejabatData.petugas.nipppk,
          pangkat: activePejabatData.petugas.pangkat,
          jabatan: activePejabatData.petugas.jabatan
        })
      }

      if (user.uid && user.uid !== userProfile?.id) {
        await update(ref(database, `system_users/${user.uid}`), {
          pejabatData: activePejabatData
        }).catch(() => null)
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(`pejabatData_${user.uid}`, JSON.stringify(activePejabatData))
        localStorage.setItem('pejabatData', JSON.stringify(activePejabatData))
      }

      ensureVerifikatorUser(database, activePejabatData.verifikator).catch(console.error)

      toast({
        title: "✅ Data Pejabat Disimpan",
        description: "Data Petugas Survey & Verifikator berhasil diperbarui."
      })
      setActiveModal(null)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: err.message || "Terjadi kesalahan saat menyimpan data."
      })
    } finally {
      setIsSavingPejabat(false)
    }
  }

  // Photo Upload Handler (Hero Avatar)
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !database || !userProfile?.id) return

    setIsUploadingPhoto(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const rawResult = event.target?.result as string
      const img = new Image()
      img.src = rawResult
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas')
          const MAX_DIM = 400
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width)
              width = MAX_DIM
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height)
              height = MAX_DIM
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          const base64 = canvas.toDataURL('image/jpeg', 0.8)

          await update(ref(database, `system_users/${userProfile.id}`), {
            photoURL: base64
          })

          toast({
            title: "Foto Profil Diperbarui",
            description: "Foto petugas survey berhasil disimpan."
          })
        } catch (err: any) {
          toast({
            variant: "destructive",
            title: "Gagal Menyimpan Foto",
            description: err.message
          })
        } finally {
          setIsUploadingPhoto(false)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // PDF Berita Acara Generator
  const handlePrintBeritaAcara = async (actor: BusinessActor, customSurveyData?: Partial<SurveyDinasData>) => {
    setGeneratingPdfId(actor.id)
    try {
      const activePejabat: PejabatData = {
        verifikator: {
          nama: pejabatForm.verifikatorNama || actor.surveyData?.pejabatData?.verifikator?.nama || "Dinas Koperasi & UKM",
          nipppk: pejabatForm.verifikatorNipppk || actor.surveyData?.pejabatData?.verifikator?.nipppk || "-",
          pangkat: pejabatForm.verifikatorPangkat || actor.surveyData?.pejabatData?.verifikator?.pangkat || "-",
          jabatan: pejabatForm.verifikatorJabatan || actor.surveyData?.pejabatData?.verifikator?.jabatan || "Verifikator Dinas"
        },
        petugas: {
          nama: pejabatForm.petugasNama || userProfile?.fullName || actor.petugasSurvey || "-",
          nipppk: pejabatForm.petugasNipppk || (userProfile as any)?.nipppk || "-",
          pangkat: pejabatForm.petugasPangkat || (userProfile as any)?.pangkat || "-",
          jabatan: pejabatForm.petugasJabatan || (userProfile as any)?.jabatan || "Petugas Survey Lapangan"
        },
        updatedAt: new Date().toISOString()
      }

      const baseSurvey: Partial<SurveyDinasData> = customSurveyData || actor.surveyData || {}

      let defaultGender = 'Laki-Laki'
      if (baseSurvey.jenisKelamin) {
        defaultGender = baseSurvey.jenisKelamin
      } else if (actor.gender) {
        defaultGender = actor.gender.toLowerCase().includes('perempuan') ? 'Perempuan' : 'Laki-Laki'
      }

      // Pastikan objek SurveyDinasData terisi lengkap agar dokumen PDF Berita Acara resmi terbentuk sempurna
      const effectiveSurveyData: SurveyDinasData = {
        namaUsaha: baseSurvey.namaUsaha || actor.businessName || '-',
        namaPemilik: baseSurvey.namaPemilik || actor.fullName || '-',
        jenisKelamin: defaultGender,
        status: baseSurvey.status || 'Kepala Keluarga',
        alamatRumah: baseSurvey.alamatRumah || actor.address || `Kel. ${actor.kelurahan || '-'}, Kec. ${actor.kecamatan || '-'}`,
        noHp: baseSurvey.noHp || actor.phone || '-',
        email: baseSurvey.email || '-',
        sosmed: baseSurvey.sosmed || '-',
        dtks: baseSurvey.dtks || { masuk: false },
        bidangUsaha: baseSurvey.bidangUsaha || actor.businessCategory || '-',
        peralatan: baseSurvey.peralatan || 'Standar Operasional Usaha',
        tahunBerdiri: baseSurvey.tahunBerdiri || '2020',
        izin: baseSurvey.izin && baseSurvey.izin.length > 0 ? baseSurvey.izin : ['NIB'],
        modalUsaha: baseSurvey.modalUsaha || 'Rp 5.000.000',
        omset: baseSurvey.omset || 'Rp 3.000.000',
        hibah: baseSurvey.hibah || { pernah: false },
        rencanaPenggunaan: baseSurvey.rencanaPenggunaan || 'Pengembangan Usaha & Modal Kerja',
        hasilSurvey: baseSurvey.hasilSurvey || 'Layak',
        fotoSurveyUrl: baseSurvey.fotoSurveyUrl || (actor.id === surveyingActor?.id ? surveyPhotoPreview : null) || actor.photoUsahaUri || undefined,
        tanggalSurvey: baseSurvey.tanggalSurvey || new Date().toISOString().split('T')[0],
        pejabatData: activePejabat
      }

      const targetDate = effectiveSurveyData.tanggalSurvey || new Date().toISOString().split('T')[0]
      await generateBeritaAcaraPDF(actor, effectiveSurveyData, activePejabat, targetDate)
      toast({
        title: "✅ Berita Acara Diunduh",
        description: `Dokumen PDF Berita Acara untuk ${actor.fullName} berhasil dibuat.`
      })
    } catch (err: any) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Gagal Membuat PDF",
        description: err.message || "Terjadi kesalahan saat memproses dokumen."
      })
    } finally {
      setGeneratingPdfId(null)
    }
  }

  // WhatsApp Contact Helper
  const handleOpenWhatsApp = (actor: BusinessActor) => {
    if (!actor.phone || actor.phone.trim() === "" || actor.phone === "-") {
      toast({
        variant: "destructive",
        title: "Nomor WhatsApp Kosong",
        description: `Pelaku usaha ${actor.fullName} belum memiliki nomor HP/WA.`
      })
      return
    }
    let clean = actor.phone.replace(/\D/g, "")
    if (clean.startsWith("0")) clean = "62" + clean.slice(1)
    else if (!clean.startsWith("62")) clean = "62" + clean

    const namaPetugas = userProfile?.fullName || pejabatForm.petugasNama || "Petugas Survey"
    const message = `Selamat pagi, perkenalkan saya ${namaPetugas} dari Dinas Koperasi Usaha Kecil Menengah Provinsi Kepulauan Riau.\n\nPada kesempatan ini saya ditugaskan untuk melaksanakan Survey Lapangan ketempat usaha Bapak/Ibu ${actor.fullName} (${actor.businessName}) sebagai Calon Penerima Bantuan Penguatan Modal Usaha Provinsi Kepulauan Riau.\n\nMohon konfirmasi kesediaan dan waktu kehadiran Bapak/Ibu. Terima kasih.`

    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank")
  }

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Memuat Portal SIMPU...</p>
        </div>
      </div>
    )
  }

  const officerCode = (userProfile?.id || userProfile?.username || "KTK2026001").toUpperCase()

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 antialiased flex justify-center py-0 sm:py-6 overflow-x-hidden">
      
      {/* Hidden File Input for Avatar Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleAvatarUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Hidden File Input for Survey Photo (supports mobile camera) */}
      <input 
        type="file" 
        ref={surveyPhotoInputRef} 
        onChange={handleSurveyPhotoUpload} 
        accept="image/*" 
        capture="environment"
        className="hidden" 
      />

      {/* Main Container Mockup (Persis Gambar 2: edge-to-edge mobile, max-w-md on desktop) */}
      <div className="w-full max-w-md bg-[#f1f5f9] min-h-screen flex flex-col px-3.5 sm:px-4 pt-7 sm:pt-4 pb-28 sm:pb-20 space-y-3.5 box-border overflow-x-hidden">
        
        {/* ================= TOP HEADER BAR (Sesuai Gambar 2) ================= */}
        <header className="flex items-center justify-between pt-1 pb-1">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
              SIMPU
            </h1>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              Pendataan Bantuan Dana Hibah UMKM
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sync / Refresh Button */}
            <button 
              onClick={() => {
                toast({
                  title: "Sinkronisasi Realtime",
                  description: "Data tugas survey terhubung secara live ke server database."
                })
              }}
              title="Sinkronisasi Data" 
              className="w-8 h-8 rounded-full bg-white text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors shadow-2xs border border-slate-200/80 active:scale-95"
            >
              <RotateCcw className={cn("w-3.5 h-3.5", isActorsLoading && "animate-spin text-blue-600")} />
            </button>

            {/* Shield ID Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-200/90 rounded-full text-sky-700 text-xs font-bold shadow-2xs">
              <Shield className="w-3.5 h-3.5 text-sky-600" />
              <span className="font-mono">{officerCode}</span>
              <span className="text-[10px] font-medium text-sky-500">(Petugas)</span>
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              title="Keluar / Logout" 
              className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors shadow-2xs border border-rose-100 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ================= HERO PROFILE CARD (Persis Gambar 2) ================= */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative">
          
          {/* Banner Header Gradient */}
          <div className="h-24 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-3.5 flex justify-end items-start relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)]"></div>
            <span className="relative z-10 px-3 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-wider border border-white/25 shadow-2xs">
              DKUKM KEPRI
            </span>
          </div>

          {/* Avatar & Identity Info */}
          <div className="px-5 pb-5 pt-0 -mt-12 flex flex-col items-center text-center relative z-10">
            
            {/* Avatar Frame with Click-to-Upload Photo */}
            <div className="relative mb-2.5 group">
              <div 
                onClick={() => fileInputRef.current?.click()}
                title="Klik untuk mengubah foto profil"
                className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white text-3xl font-black overflow-hidden cursor-pointer relative"
              >
                {userProfile?.photoURL ? (
                  <img 
                    src={userProfile.photoURL} 
                    alt="Foto Petugas" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="uppercase">
                    {(userProfile?.fullName || "PS").slice(0, 2)}
                  </span>
                )}

                {/* Hover Overlay Camera */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Ubah</span>
                    </>
                  )}
                </div>
              </div>

              {/* Online status indicator dot */}
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              </span>
            </div>

            {/* Petugas Full Name */}
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              {userProfile?.fullName || "PETUGAS SURVEY"}
            </h2>
            
            {/* Subtitle / Role Badge Pill (Persis Gambar 2) */}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-xs">
              <span className="px-3 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-full text-[11px]">
                PETUGAS SURVEY LAPANGAN
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-medium text-[11px]">
                {pejabatForm.petugasJabatan || "Penata Layanan Operasional"}
              </span>
            </div>

            {/* Detailed Data Box: Petugas & Verifikator (Persis Gambar 2) */}
            <div className="w-full mt-4 bg-[#f8fafc] rounded-2xl p-4 border border-slate-100/90 text-left space-y-3">
              
              {/* Row 1: NIP / NIPPPK & Status */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  <span>NIP / NIPPPK</span>
                  <span className="text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full font-bold flex items-center gap-1.5 text-[10px]">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span> Petugas Survey
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {pejabatForm.petugasNipppk || (userProfile as any)?.nipppk || "198301162025212006"}
                  </span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                    {pejabatForm.petugasPangkat || (userProfile as any)?.pangkat || "Golongan IX"}
                  </span>
                </div>
              </div>

              {/* Row 2: Data Petugas Verifikator */}
              <div className="border-t border-slate-200/60 pt-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  <span className="flex items-center gap-1 text-slate-600 font-bold">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-500 inline" /> PETUGAS VERIFIKATOR
                  </span>
                  <span className="text-[10px] text-slate-400">PEMERIKSA BERKAS</span>
                </div>
                
                <div className="bg-white rounded-xl p-2.5 border border-slate-200/70 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800">
                      {pejabatForm.verifikatorNama || "WELLY MAWA, S.T."}
                    </span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                      {pejabatForm.verifikatorJabatan || "Pengawas Koperasi Ahli Muda"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>NIP: {pejabatForm.verifikatorNipppk || "197312022003121002"}</span>
                    <span>{pejabatForm.verifikatorPangkat || "Penata Tk.I / IIId"}</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Extra Details like Nomor Kontak & Wilayah */}
              <div className="border-t border-slate-200/60 pt-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1 text-slate-400 font-semibold text-[11px]">
                    <Phone className="w-3 h-3 text-emerald-500" /> NOMOR KONTAK
                  </span>
                  <span className="font-mono font-bold text-slate-700">
                    {(userProfile as any)?.phone || "0817319885"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1 text-slate-400 font-semibold text-[11px]">
                    <MapPin className="w-3 h-3 text-rose-500" /> WILAYAH TUGAS
                  </span>
                  <span className="font-bold text-slate-700 truncate max-w-[170px]">
                    {(userProfile as any)?.address || "KOTA TANJUNGPINANG"}
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* ================= 3 MENU UTAMA (GRID 3 KOLOM PERSIS GAMBAR 2) ================= */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">

          {/* MENU 1: PEJABAT BA */}
          <div 
            onClick={() => setActiveModal('pejabat')}
            className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group"
          >
            <div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 mb-2.5 group-hover:scale-105 transition-transform">
                <FileSignature className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider block">
                MENU UTAMA
              </span>
              <h3 className="text-xs font-black text-slate-800 leading-tight mt-0.5">
                PEJABAT BA
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                Data & TTD
              </p>
            </div>

            <div className="mt-3 py-1 px-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-bold flex items-center justify-between">
              <span>{isPejabatComplete ? "Lengkap" : "Isi Data"}</span>
              <ChevronRight className="w-3 h-3 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* MENU 2: DATA PELAKU USAHA (HANYA YANG BELUM DI SURVEY) */}
          <div 
            onClick={() => setActiveModal('pelaku-usaha')}
            className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group"
          >
            <div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 mb-2.5 group-hover:scale-105 transition-transform">
                <Store className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black text-orange-600 uppercase tracking-wider block">
                TUGAS UMKM
              </span>
              <h3 className="text-xs font-black text-slate-800 leading-tight mt-0.5">
                DATA UMKM
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                Belum Survey
              </p>
            </div>

            <div className="mt-3 py-1 px-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-[10px] font-bold flex items-center justify-between">
              <span>{isActorsLoading ? "Memuat..." : `${totalUncompleted} Data`}</span>
              <ChevronRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* MENU 3: REKAPAN BERITA ACARA (SUDAH DIKERJAKAN AWAL S/D AKHIR) */}
          <div 
            onClick={() => setActiveModal('rekapan')}
            className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group"
          >
            <div>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 mb-2.5 group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">
                ARSIP DOKUMEN
              </span>
              <h3 className="text-xs font-black text-slate-800 leading-tight mt-0.5">
                REKAPAN BA
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                Awal s/d Akhir
              </p>
            </div>

            <div className="mt-3 py-1 px-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-bold flex items-center justify-between">
              <span>{isActorsLoading ? "Memuat..." : `${totalCompleted} Selesai`}</span>
              <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

        </div>

        {/* ================= FOOTER REALTIME WIDGET (Persis Gambar 2) ================= */}
        <div className="bg-[#0b1329] text-white rounded-[1.75rem] p-4 shadow-xl flex items-center justify-between border border-slate-800/80">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 tracking-wider uppercase">
              <Calendar className="w-3 h-3 text-sky-400 inline" />
              <span>WAKTU & TANGGAL REALTIME</span>
            </div>
            <p className="text-sm font-black text-slate-100">
              {currentDateTime.date || "Selasa, 8 September 2026"}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">Waktu Lokal Indonesia</p>
          </div>

          <div className="bg-[#132247] border border-[#1e346b] px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-mono text-sm font-black text-sky-300 tracking-wider">
              {currentDateTime.time || "22.11.10"}
            </span>
            <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-sm uppercase tracking-wider animate-pulse">
              LIVE
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DIALOG 1: INPUT DATA PEJABAT BERITA ACARA                                 */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === 'pejabat'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-blue-600" />
              Data Pejabat Berita Acara
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Lengkapi data Petugas Verifikator & Petugas Survey untuk lembar Berita Acara Survey (GBAS).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Box Petugas Verifikator */}
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-purple-900 font-bold border-b border-purple-200 pb-1.5">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>DATA PETUGAS VERIFIKATOR (Dinas)</span>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Nama Lengkap & Gelar Verifikator</Label>
                <Input 
                  placeholder="Contoh: WELLY MAWA, S.T."
                  value={pejabatForm.verifikatorNama}
                  onChange={(e) => setPejabatForm(prev => ({ ...prev, verifikatorNama: e.target.value }))}
                  className="bg-white rounded-xl text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">NIP / NIPPPK Verifikator</Label>
                <Input 
                  placeholder="Contoh: 197312022003121002"
                  value={pejabatForm.verifikatorNipppk}
                  onChange={(e) => setPejabatForm(prev => ({ ...prev, verifikatorNipppk: e.target.value }))}
                  className="bg-white rounded-xl text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Pangkat / Golongan</Label>
                  <Input 
                    placeholder="Contoh: Penata Tk.I / IIId"
                    value={pejabatForm.verifikatorPangkat}
                    onChange={(e) => setPejabatForm(prev => ({ ...prev, verifikatorPangkat: e.target.value }))}
                    className="bg-white rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Jabatan</Label>
                  <Input 
                    placeholder="Contoh: Pengawas Koperasi Ahli Muda"
                    value={pejabatForm.verifikatorJabatan}
                    onChange={(e) => setPejabatForm(prev => ({ ...prev, verifikatorJabatan: e.target.value }))}
                    className="bg-white rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Box Petugas Survey */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-blue-900 font-bold border-b border-blue-200 pb-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>DATA PETUGAS SURVEY (Anda)</span>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Nama Lengkap Petugas</Label>
                <Input 
                  placeholder="Nama Lengkap Petugas Survey"
                  value={pejabatForm.petugasNama}
                  onChange={(e) => setPejabatForm(prev => ({ ...prev, petugasNama: e.target.value }))}
                  className="bg-white rounded-xl text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">NIP / NIPPPK Petugas</Label>
                <Input 
                  placeholder="Contoh: 198301162025212006"
                  value={pejabatForm.petugasNipppk}
                  onChange={(e) => setPejabatForm(prev => ({ ...prev, petugasNipppk: e.target.value }))}
                  className="bg-white rounded-xl text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Pangkat / Golongan</Label>
                  <Input 
                    placeholder="Contoh: Golongan IX"
                    value={pejabatForm.petugasPangkat}
                    onChange={(e) => setPejabatForm(prev => ({ ...prev, petugasPangkat: e.target.value }))}
                    className="bg-white rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Jabatan</Label>
                  <Input 
                    placeholder="Contoh: Penata Layanan Operasional"
                    value={pejabatForm.petugasJabatan}
                    onChange={(e) => setPejabatForm(prev => ({ ...prev, petugasJabatan: e.target.value }))}
                    className="bg-white rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setActiveModal(null)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button 
              onClick={handleSavePejabat}
              disabled={isSavingPejabat}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md"
            >
              {isSavingPejabat ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: DATA PELAKU USAHA (HANYA YANG BELUM DISURVEY)                  */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === 'pelaku-usaha'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl w-[95vw] rounded-3xl p-5 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-500" />
                Antrean Survey UMKM
              </DialogTitle>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold">
                {uncompletedMyActors.length} Belum Survey
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Daftar tugas pelaku usaha yang <strong>belum disurvey</strong> atas nama <strong>{userProfile?.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="my-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input 
                placeholder="Cari nama pelaku, NIK, usaha, atau kelurahan..."
                value={searchPelakuQuery}
                onChange={(e) => setSearchPelakuQuery(e.target.value)}
                className="pl-9 bg-slate-50 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Actor Items Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredUncompletedActors.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/70" />
                <p className="font-bold text-slate-700">Semua Tugas Survey Telah Selesai!</p>
                <p className="text-[11px] text-slate-400 mt-1">Tidak ada data UMKM yang tertunda. Silakan cek Menu Rekapan BA.</p>
              </div>
            ) : (
              <>
                {displayedUncompletedActors.map((actor, idx) => {
                  return (
                    <div 
                      key={actor.id}
                      className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:border-orange-300 transition-all space-y-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-black text-slate-800 text-xs">{actor.fullName}</h4>
                              <span className="text-[10px] px-2 py-0.2 bg-slate-100 text-slate-600 rounded-md font-semibold">
                                {actor.businessCategory || "UMKM"}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-orange-600">{actor.businessName || "Usaha Mandiri"}</p>
                            <p className="text-[10px] text-slate-400 font-mono">NIK: {actor.nik || "-"}</p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <Clock3 className="w-3 h-3" /> Belum Survey
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-xl flex justify-between items-center">
                        <span className="truncate max-w-[200px]">📍 Kel. {actor.kelurahan || "-"}, {actor.kecamatan || "-"}</span>
                        <span className="font-mono">{actor.phone || "-"}</span>
                      </div>

                      {/* Tombol aksi tersusun rapi di bagian bawah: Hubungi WA, Cancell, Mulai Survey Lapangan, Download BA */}
                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                        {/* 1. Hubungi WA */}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleOpenWhatsApp(actor)}
                          disabled={!actor.phone || actor.phone.trim() === "" || actor.phone === "-"}
                          className="h-8 px-2 rounded-xl text-[11px] font-semibold border-emerald-300 text-emerald-700 bg-emerald-50/40 hover:bg-emerald-100/60 w-full justify-center disabled:opacity-40 transition-all"
                        >
                          <Phone className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />
                          <span className="truncate">Hubungi WA</span>
                        </Button>

                        {/* 2. Cancell */}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setCancelTargetActor(actor)
                            setCancelReasonPreset("Usaha Tutup / Tidak Beroperasi")
                            setCustomCancelReason("")
                            setCancelPhotoProof(null)
                          }}
                          className="h-8 px-2 rounded-xl text-[11px] font-semibold border-rose-200 text-rose-600 bg-rose-50/40 hover:bg-rose-100/60 w-full justify-center transition-all"
                        >
                          <Ban className="w-3.5 h-3.5 mr-1 text-rose-500 shrink-0" />
                          <span className="truncate">Cancell</span>
                        </Button>

                        {/* 3. Mulai Survey Lapangan */}
                        <Button 
                          size="sm" 
                          onClick={() => openInPortalSurvey(actor)}
                          className="h-8 px-2 rounded-xl text-[11px] font-bold shadow-xs bg-orange-600 hover:bg-orange-700 text-white w-full justify-center transition-all"
                        >
                          <Store className="w-3.5 h-3.5 mr-1 shrink-0" />
                          <span className="truncate">Mulai Survey Lapangan</span>
                        </Button>

                        {/* 4. Download BA */}
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={generatingPdfId === actor.id}
                          onClick={() => handlePrintBeritaAcara(actor)}
                          className="h-8 px-2 rounded-xl text-[11px] font-bold border-blue-200 text-blue-700 bg-blue-50/40 hover:bg-blue-100/60 w-full justify-center transition-all"
                        >
                          {generatingPdfId === actor.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-blue-600 shrink-0" />
                              <span className="truncate">Mengunduh...</span>
                            </>
                          ) : (
                            <>
                              <FileDown className="w-3.5 h-3.5 mr-1 text-blue-600 shrink-0" />
                              <span className="truncate">Download BA</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {/* Load More Button if items exceed display limit */}
                {!searchPelakuQuery.trim() && filteredUncompletedActors.length > displayLimitPelaku && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDisplayLimitPelaku(prev => prev + 25)}
                    className="w-full py-2.5 my-1 bg-orange-50/70 hover:bg-orange-100 text-orange-700 font-bold border border-orange-200/80 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Tampilkan Lebih Banyak ({filteredUncompletedActors.length - displayLimitPelaku} data lagi)</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                )}
              </>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => setActiveModal(null)} 
              className="w-full rounded-xl text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL / FORM SURVEY LANGSUNG DI PORTAL (TANPA BUKA TAMPILAN LAMA)         */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(surveyingActor)} onOpenChange={(open) => !open && setSurveyingActor(null)}>
        <DialogContent className="max-w-2xl w-[96vw] rounded-3xl p-5 max-h-[92vh] flex flex-col">
          <DialogHeader className="shrink-0 border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">
                  SURVEY LAPANGAN
                </span>
                <DialogTitle className="text-base font-black text-slate-800">
                  {surveyingActor?.fullName}
                </DialogTitle>
                <p className="text-xs font-bold text-slate-500">
                  {surveyingActor?.businessName} • NIK: <span className="font-mono">{surveyingActor?.nik}</span>
                </p>
              </div>

              {/* Progress Bar */}
              <div className="text-right">
                <span className="text-xs font-black text-blue-700">{surveyProgress}%</span>
                <Progress value={surveyProgress} className="w-20 h-2 mt-1" />
              </div>
            </div>
          </DialogHeader>

          {/* Form Content Scrollable */}
          <div className="flex-1 overflow-y-auto space-y-4 py-3 text-xs pr-1 custom-scrollbar">

            {/* SEKSI 1: TANGGAL & DATA PELAKU */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-3">
              <h4 className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                1. Data Pelaku Usaha & Identitas
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Tanggal Survey</Label>
                  <Input 
                    type="date"
                    value={surveyData.tanggalSurvey || ""}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, tanggalSurvey: e.target.value }))}
                    className="bg-white rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Nama Pemilik Usaha</Label>
                  <Input 
                    value={surveyData.namaPemilik || ""}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, namaPemilik: e.target.value }))}
                    className="bg-white rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Jenis Kelamin</Label>
                  <RadioGroup 
                    value={surveyData.jenisKelamin || ""}
                    onValueChange={(val) => setSurveyData(prev => ({ ...prev, jenisKelamin: val }))}
                    className="flex gap-4 pt-1"
                  >
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="Laki-Laki" id="r-laki" />
                      <Label htmlFor="r-laki" className="text-xs cursor-pointer">Laki-Laki</Label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="Perempuan" id="r-perempuan" />
                      <Label htmlFor="r-perempuan" className="text-xs cursor-pointer">Perempuan</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Status Perkawinan / Keluarga</Label>
                  <select 
                    value={surveyData.status || ""}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium"
                  >
                    <option value="">-- Pilih Status --</option>
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Alamat Rumah Lengkap</Label>
                <Input 
                  value={surveyData.alamatRumah || ""}
                  onChange={(e) => setSurveyData(prev => ({ ...prev, alamatRumah: e.target.value }))}
                  className="bg-white rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Nomor HP / WhatsApp</Label>
                  <Input 
                    value={surveyData.noHp || ""}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, noHp: e.target.value }))}
                    className="bg-white rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Media Sosial / Akun Usaha (Opsional)</Label>
                  <Input 
                    placeholder="Instagram / Facebook / TikTok / Tidak Ada"
                    value={surveyData.sosmed || ""}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, sosmed: e.target.value }))}
                    className="bg-white rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* SEKSI 2: DATA DTKS / BANSOS */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-3">
              <h4 className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-600" />
                2. Status DTKS & Penerima Bantuan Sosial
              </h4>

              <div className="flex items-center gap-4">
                <Label className="text-[11px] font-semibold text-slate-600">Terdaftar di DTKS?</Label>
                <RadioGroup 
                  value={surveyData.dtks?.masuk ? "YA" : "TIDAK"}
                  onValueChange={(val) => setSurveyData(prev => ({
                    ...prev,
                    dtks: { ...prev.dtks, masuk: val === "YA" }
                  }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="YA" id="dtks-ya" />
                    <Label htmlFor="dtks-ya" className="text-xs cursor-pointer">Ya</Label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="TIDAK" id="dtks-tidak" />
                    <Label htmlFor="dtks-tidak" className="text-xs cursor-pointer">Tidak</Label>
                  </div>
                </RadioGroup>
              </div>

              {surveyData.dtks?.masuk && (
                <div className="space-y-1 pt-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Jenis Bansos yang Diterima</Label>
                  <div className="flex flex-wrap gap-2">
                    {BANSOS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSurveyData(prev => ({
                          ...prev,
                          dtks: { ...prev.dtks, masuk: true, jenis: opt }
                        }))}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                          surveyData.dtks?.jenis === opt
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SEKSI 3: USAHA & KEUANGAN */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-3">
              <h4 className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                <Store className="w-4 h-4 text-orange-600" />
                3. Profil Usaha, Modal & Omset
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Nama Usaha</Label>
                  <Input 
                    value={surveyData.namaUsaha || ""}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, namaUsaha: e.target.value }))}
                    className="bg-white rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Bidang Usaha</Label>
                  <Input 
                    placeholder="Contoh: Kuliner, Jahit, Perikanan, dsb."
                    value={surveyData.bidangUsaha || ""}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, bidangUsaha: e.target.value }))}
                    className="bg-white rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Peralatan yang Digunakan Saat Ini</Label>
                <Input 
                  placeholder="Contoh: Kompor gas, Blender, Wajan, Mesin Jahit, dsb."
                  value={surveyData.peralatan || ""}
                  onChange={(e) => setSurveyData(prev => ({ ...prev, peralatan: e.target.value }))}
                  className="bg-white rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Tahun Berdiri</Label>
                  <Input 
                    placeholder="Contoh: 2021"
                    value={surveyData.tahunBerdiri || ""}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, tahunBerdiri: e.target.value }))}
                    className="bg-white rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Modal Usaha (Rp)</Label>
                  <Input 
                    placeholder="Contoh: 5.000.000"
                    value={surveyData.modalUsaha || ""}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, modalUsaha: formatRupiah(e.target.value) }))}
                    className="bg-white rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Omset per Bulan (Rp)</Label>
                  <Input 
                    placeholder="Contoh: 3.000.000"
                    value={surveyData.omset || ""}
                    onChange={(e) => setSurveyData(prev => ({ ...prev, omset: formatRupiah(e.target.value) }))}
                    className="bg-white rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-600">Legalitas / Izin Usaha yang Dimiliki</Label>
                <div className="flex flex-wrap gap-2">
                  {IZIN_OPTIONS.map(izinName => {
                    const isChecked = (surveyData.izin || []).includes(izinName)
                    return (
                      <button
                        key={izinName}
                        type="button"
                        onClick={() => {
                          const current = surveyData.izin || []
                          let updated = []
                          if (izinName === "Belum Ada") {
                            updated = isChecked ? [] : ["Belum Ada"]
                          } else {
                            const withoutBelumAda = current.filter(x => x !== "Belum Ada")
                            updated = isChecked ? withoutBelumAda.filter(x => x !== izinName) : [...withoutBelumAda, izinName]
                          }
                          setSurveyData(prev => ({ ...prev, izin: updated }))
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                          isChecked
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200"
                        )}
                      >
                        {izinName}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Rencana Penggunaan Modal Bantuan Hibah</Label>
                <Textarea 
                  placeholder="Jelaskan rencana pembelian barang/peralatan/bahan baku jika bantuan disetujui..."
                  value={surveyData.rencanaPenggunaan || ""}
                  onChange={(e) => setSurveyData(prev => ({ ...prev, rencanaPenggunaan: e.target.value }))}
                  className="bg-white rounded-xl text-xs min-h-[60px]"
                />
              </div>
            </div>

            {/* SEKSI 4: LOKASI GPS & FOTO SURVEY */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-3">
              <h4 className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-emerald-600" />
                4. Titik GPS Lokasi & Foto Survey Lapangan
              </h4>

              {/* GPS Lokasi Button & Display */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Titik Koordinat Lokasi Usaha:</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCaptureLocation}
                    disabled={isFetchingLocation}
                    className="h-8 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    {isFetchingLocation ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        Mencari GPS...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3.5 h-3.5 mr-1" />
                        Ambil Titik GPS Sekarang
                      </>
                    )}
                  </Button>
                </div>

                {surveyLocation ? (
                  <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg text-xs font-mono font-bold flex justify-between items-center border border-emerald-200">
                    <span>📍 Lat: {surveyLocation.lat.toFixed(6)}, Lon: {surveyLocation.lon.toFixed(6)}</span>
                    <a 
                      href={`https://www.google.com/maps?q=${surveyLocation.lat},${surveyLocation.lon}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-blue-600 underline font-sans"
                    >
                      Buka di Maps
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Belum ada titik koordinat GPS. Klik tombol di atas saat berada di lokasi usaha.</p>
                )}
              </div>

              {/* Upload Foto Survey */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Foto Survey Tempat Usaha:</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => surveyPhotoInputRef.current?.click()}
                    className="h-8 rounded-xl text-xs font-bold border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1" />
                    Ambil / Upload Foto
                  </Button>
                </div>

                {surveyPhotoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video max-h-48 bg-slate-100 flex items-center justify-center">
                    <img 
                      src={surveyPhotoPreview} 
                      alt="Preview Foto Survey" 
                      className="w-full h-full object-cover" 
                    />
                    <button 
                      type="button"
                      onClick={() => setSurveyPhotoPreview(null)}
                      className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full shadow-md hover:bg-rose-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => surveyPhotoInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    <Camera className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <p className="text-xs text-slate-500 font-semibold">Klik untuk mengambil foto survei lapangan</p>
                    <p className="text-[10px] text-slate-400">Bisa menggunakan kamera HP langsung (auto kompres max 1MB)</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <DialogFooter className="pt-3 border-t border-slate-100 gap-2 flex-wrap sm:flex-nowrap justify-end">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setSurveyingActor(null)} 
              className="rounded-xl text-xs"
            >
              Tutup
            </Button>
            <Button 
              type="button"
              variant="outline" 
              disabled={!surveyingActor || generatingPdfId === surveyingActor.id}
              onClick={() => {
                if (surveyingActor) {
                  handlePrintBeritaAcara(surveyingActor, { ...surveyData, fotoSurveyUrl: surveyPhotoPreview || undefined })
                }
              }}
              className="rounded-xl text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
            >
              {surveyingActor && generatingPdfId === surveyingActor.id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-blue-600" />
                  Mengunduh...
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Unduh Berita Acara
                </>
              )}
            </Button>
            <Button 
              type="button"
              variant="outline"
              disabled={isSubmittingDraft || isSubmittingSurvey}
              onClick={handleSaveDraftInPortal}
              className="rounded-xl text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              {isSubmittingDraft ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Menyimpan Draft...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Simpan Draft
                </>
              )}
            </Button>
            <Button 
              type="button"
              disabled={isSubmittingSurvey || isSubmittingDraft}
              onClick={handleCompleteSurveyInPortal}
              className="rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              {isSubmittingSurvey ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Selesai & Loloskan Survey
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: REKAPAN BERITA ACARA (PER PETUGAS SURVEY DARI AWAL S/D AKHIR)   */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === 'rekapan'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl w-[95vw] rounded-3xl p-5 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                Rekapan Berita Acara Survey
              </DialogTitle>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                {completedBeritaAcaraList.length} Dokumen Selesai
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Riwayat Berita Acara Survey (GBAS) yang telah Anda selesaikan dari awal hingga akhir.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar */}
          <div className="my-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input 
                placeholder="Cari nama pelaku usaha, NIK, atau kelurahan..."
                value={searchRekapanQuery}
                onChange={(e) => setSearchRekapanQuery(e.target.value)}
                className="pl-9 bg-slate-50 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Completed Actors List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {completedBeritaAcaraList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Belum ada rekapan Berita Acara yang diselesaikan.</p>
              </div>
            ) : (
              <>
                {displayedCompletedActors.map((actor, idx) => {
                  const isGenerating = generatingPdfId === actor.id
                  return (
                    <div 
                      key={actor.id}
                      className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:border-emerald-400 transition-all flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-black text-slate-800 text-xs">{actor.fullName}</h4>
                            <p className="text-[11px] font-bold text-slate-600">{actor.businessName || "Usaha Mandiri"}</p>
                            <p className="text-[10px] text-slate-400 font-mono">NIK: {actor.nik || "-"}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold inline-block">
                            {actor.status === 'verified_dinas' ? 'Lolos Dinas' : 'Selesai Survey'}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">
                            📅 {actor.surveyData?.tanggalSurvey || "Sudah Disurvey"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-500 flex justify-between items-center">
                        <span>Kelurahan: <strong>{actor.kelurahan || "-"}</strong></span>
                        <span>Verifikator: <strong>{actor.surveyData?.pejabatData?.verifikator?.nama || pejabatForm.verifikatorNama || "-"}</strong></span>
                      </div>

                      {/* Action buttons: Edit Survey / Download PDF */}
                      <div className="flex justify-end items-center gap-2 pt-1">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => openInPortalSurvey(actor)}
                          className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          Tinjau / Edit
                        </Button>

                        <Button 
                          size="sm"
                          disabled={isGenerating}
                          onClick={() => handlePrintBeritaAcara(actor)}
                          className="h-8 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              Memproses PDF...
                            </>
                          ) : (
                            <>
                              <FileDown className="w-3.5 h-3.5 mr-1.5" />
                              Unduh Berita Acara PDF
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {/* Load More Button if items exceed display limit */}
                {!searchRekapanQuery.trim() && completedBeritaAcaraList.length > displayLimitRekapan && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDisplayLimitRekapan(prev => prev + 25)}
                    className="w-full py-2.5 my-1 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200/80 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Tampilkan Lebih Banyak ({completedBeritaAcaraList.length - displayLimitRekapan} data lagi)</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                )}
              </>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => setActiveModal(null)} 
              className="w-full rounded-xl text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG CANCEL DINAS (DATA LANGSUNG MENGHILANG DARI ANTREAN SURVEY)        */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(cancelTargetActor)} onOpenChange={(open) => !open && setCancelTargetActor(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-rose-600 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              Batalkan Survey (Cancel Dinas)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pelaku usaha yang di-cancel akan <strong>langsung menghilang</strong> dari antrean tugas survey Anda.
            </DialogDescription>
          </DialogHeader>

          {cancelTargetActor && (
            <div className="space-y-3.5 py-2 text-xs">
              {/* Target Actor Card */}
              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-1">
                <h4 className="font-black text-slate-800 text-sm">{cancelTargetActor.fullName}</h4>
                <p className="font-bold text-rose-700">{cancelTargetActor.businessName || "Usaha Mandiri"}</p>
                <div className="flex justify-between text-[10.5px] text-slate-500 pt-1 border-t border-rose-100">
                  <span>NIK: {cancelTargetActor.nik || "-"}</span>
                  <span>Kel. {cancelTargetActor.kelurahan || "-"}</span>
                </div>
              </div>

              {/* Reason Presets */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-700">Pilih Alasan Pembatalan:</Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {CANCEL_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setCancelReasonPreset(reason)}
                      className={cn(
                        "text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between",
                        cancelReasonPreset === reason
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <span>{reason}</span>
                      {cancelReasonPreset === reason && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Reason Textarea */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  {cancelReasonPreset === "Lainnya" ? "Tulis Alasan Pembatalan (Wajib):" : "Catatan Tambahan (Opsional):"}
                </Label>
                <Textarea
                  placeholder={cancelReasonPreset === "Lainnya" ? "Tulis alasan spesifik pembatalan..." : "Tambahkan catatan keterangan kondisi di lapangan..."}
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  className="rounded-xl text-xs bg-slate-50 min-h-[70px]"
                />
              </div>

              {/* Optional Photo Proof */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-[11px] font-bold text-slate-700">Foto Bukti Lapangan (Opsional):</Label>
                <input 
                  type="file"
                  ref={cancelFileInputRef}
                  onChange={handleCancelPhotoUpload}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                {cancelPhotoProof ? (
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden border-2 border-rose-200 bg-slate-100">
                    <img src={cancelPhotoProof} alt="Bukti Cancel" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCancelPhotoProof(null)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cancelFileInputRef.current?.click()}
                    className="w-full py-3 h-auto rounded-xl border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 text-xs"
                  >
                    <Camera className="w-4 h-4 text-slate-400" />
                    <span>Ambil Foto Rumah / Toko Tutup</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmittingCancel}
              onClick={() => setCancelTargetActor(null)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={isSubmittingCancel}
              onClick={handleConfirmCancelDinas}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-md"
            >
              {isSubmittingCancel ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Membatalkan...
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5 mr-1.5" />
                  Konfirmasi Cancel Dinas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
