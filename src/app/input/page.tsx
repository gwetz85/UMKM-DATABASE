"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useDatabase, useUser, addDocumentNonBlocking, useMemoFirebase, useList, useObject } from "@/firebase"
import { ref, query, equalTo, get, limitToFirst, orderByChild } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  Save,
  CheckCircle2,
  ShieldAlert,
  Lock,
  User,
  Users,
  CreditCard,
  FileText,
  Calendar,
  MapPin,
  Phone,
  Store,
  XCircle,
  X,
  Info,
  Check,
  ArrowRight,
  ArrowLeft
} from "lucide-react"
import { cn, extractDobFromNik } from "@/lib/utils"
import { normalizeCoordinator } from "@/lib/coordinator-utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { logActivity, getDeviceType } from "@/lib/logger"

export default function InputDataPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { user, userProfile: currentUserProfile } = useUser()
  const database = useDatabase()
  const [loading, setLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  // Multi-step State (Langkah 1, Langkah 2, Langkah 3)
  const [currentStep, setCurrentStep] = useState<number>(1)

  // Form Fields State
  const [fullName, setFullName] = useState("")
  const [gender, setGender] = useState("")
  const [nik, setNik] = useState("")
  const [noKK, setNoKK] = useState("")
  const [pob, setPob] = useState("")
  const [dob, setDob] = useState("")
  const [isEditingDob, setIsEditingDob] = useState(false)
  const [phone, setPhone] = useState("")

  const [address, setAddress] = useState("")
  const [rtRw, setRtRw] = useState("")
  const [kelurahan, setKelurahan] = useState<string>("")
  const [kecamatan, setKecamatan] = useState<string>("")

  const [businessCategory, setBusinessCategory] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [businessLocation, setBusinessLocation] = useState("")
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("")

  const [formKey, setFormKey] = useState(0)
  
  const [kkCheckResults, setKkCheckResults] = useState<any[]>([])
  const [isCheckingKk, setIsCheckingKk] = useState(false)

  // Fetch Quotas
  const quotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const { data: rawQuotaData } = useList<any>(quotaRef)

  // Use pre-calculated system_stats for coordinator usage (ultra-fast, 1KB)
  const statsRef = useMemoFirebase(() => database ? ref(database, 'system_stats') : null, [database])
  const { data: systemStats } = useObject(statsRef)

  const availableCoordinators = useMemo(() => {
    if (!rawQuotaData) return []
    
    const achievedMap = systemStats?.coordinator || {}

    return rawQuotaData
      .map((q: any) => {
        const nameUpper = (q.name || "").toUpperCase().trim()
        const used = achievedMap[nameUpper] || 0
        const rawQuota = parseInt(String(q.quota)) || 0
        const remaining = rawQuota - used
        return { ...q, remaining: Math.max(0, remaining) }
      })
      .filter((q: any) => {
        const nameUpper = (q.name || "").toUpperCase()
        return !nameUpper.includes('( PERBAIKKAN )') && 
               !nameUpper.includes('( PERBAIKAN )') && 
               !nameUpper.includes('( DIHAPUS )')
      })
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [rawQuotaData, systemStats])

  const isMonitoring = currentUserProfile?.role === 'monitoring'

  // Otomatis tentukan Kecamatan berdasarkan Kelurahan
  useEffect(() => {
    if (!kelurahan) {
      setKecamatan("")
      return
    }

    const groupKota = ["Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat"]
    const groupBarat = ["Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru"]
    const groupTimur = ["Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana", "Air Raja"]
    const groupBestari = ["Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"]

    if (groupKota.includes(kelurahan)) {
      setKecamatan("Tanjungpinang Kota")
    } else if (groupBarat.includes(kelurahan)) {
      setKecamatan("Tanjungpinang Barat")
    } else if (groupTimur.includes(kelurahan)) {
      setKecamatan("Tanjungpinang Timur")
    } else if (groupBestari.includes(kelurahan)) {
      setKecamatan("Bukit Bestari")
    } else {
      setKecamatan("")
    }
  }, [kelurahan])

  // Pengecekan Nomor KK Otomatis Real-time
  useEffect(() => {
    const cleanKk = noKK.trim()
    if (!cleanKk || cleanKk.length < 16) {
      setKkCheckResults([])
      setIsCheckingKk(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsCheckingKk(true)
      try {
        const results: any[] = []
        
        const checkSheet = async (sheetName: string, label: string) => {
          if (!database) return
          try {
            const q = query(ref(database, sheetName), orderByChild('noKK'), equalTo(cleanKk))
            const snap = await get(q)
            if (snap.exists()) {
              Object.values(snap.val()).forEach((item: any) => {
                if (item) {
                  results.push({ ...item, _source: label, _table: sheetName })
                }
              })
            }
          } catch (err) {
            console.warn(`Query index on ${sheetName} failed:`, err)
          }
        }

        // Cek juga di Database Aktif (SIMPU 2026) untuk cegah duplikasi KK
        const checkActiveActors = async () => {
          if (!database) return
          try {
            const q = query(ref(database, 'businessActors'), orderByChild('noKK'), equalTo(cleanKk), limitToFirst(1))
            const snap = await get(q)
            if (snap.exists()) {
              Object.values(snap.val()).forEach((item: any) => {
                if (item) {
                  results.push({ 
                    ...item, 
                    _source: 'SIMPU 2026 (SUDAH TERDAFTAR)', 
                    _table: 'businessActors',
                    status: item.status || 'Terdaftar'
                  })
                }
              })
            }
          } catch (e) {
            // Silently ignore index issues for live check
          }
        }

        await Promise.all([
          checkSheet('blacklist_data', 'DATA BLACKLIST (REJECT)'),
          checkSheet('master_data_2025', 'SHEET 3 (2025 - HOLD)'),
          checkSheet('master_data_2024', 'SHEET 1 (2024)'),
          checkSheet('master_data_2023', 'SHEET 2 (2023)'),
          checkActiveActors()
        ])

        setKkCheckResults(results)
      } catch (error) {
        console.error("Error checking KK:", error)
      } finally {
        setIsCheckingKk(false)
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [noKK, database])

  // Evaluasi Status Blacklist & Hold dari hasil cek KK
  const isKkBlacklisted = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const st = (res.status || "").toUpperCase()
      const kat = (res.kategori || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return (
        tbl === "blacklist_data" ||
        src.includes("BLACKLIST") ||
        src.includes("REJECT") ||
        src.includes("DITOLAK") ||
        st.includes("BLACKLIST") ||
        st.includes("REJECT") ||
        st.includes("DITOLAK") ||
        kat.includes("BLACKLIST")
      )
    })
  }, [kkCheckResults])

  const isKkHold = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const st = (res.status || "").toUpperCase()
      const kat = (res.kategori || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return (
        tbl === "master_data_2025" ||
        src.includes("HOLD") ||
        src.includes("2025") ||
        st.includes("HOLD") ||
        kat.includes("HOLD")
      )
    })
  }, [kkCheckResults])

  const isKkAlreadyRegistered = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "businessactors" || src.includes("SUDAH TERDAFTAR") || src.includes("SIMPU 2026")
    })
  }, [kkCheckResults])

  // Penentu apakah isian di bawah akan ditutup otomatis (tidak bisa diisi)
  const isFormBlocked = isKkBlacklisted || isKkHold || isKkAlreadyRegistered

  // Catatan riwayat 2023/2024 jika tidak ter-blacklist / hold
  const kkHistoryResults = useMemo(() => {
    if (isFormBlocked) return []
    return kkCheckResults.filter((res) => {
      const src = (res._source || "").toUpperCase()
      return src.includes("2023") || src.includes("2024")
    })
  }, [kkCheckResults, isFormBlocked])

  // Validasi Step 1 sebelum lanjut ke Step 2
  const validateStep1 = () => {
    if (isFormBlocked) {
      toast({
        variant: "destructive",
        title: "AKSES DITUTUP",
        description: "Nomor KK berstatus Blacklist atau Hold. Pendaftaran tidak dapat dilanjutkan ke langkah berikutnya."
      })
      return false
    }

    if (isCheckingKk) {
      toast({
        title: "Memeriksa Nomor KK",
        description: "Mohon tunggu sebentar, sistem sedang memverifikasi Nomor KK."
      })
      return false
    }

    if (!fullName.trim()) {
      toast({ variant: "destructive", title: "Nama Belum Diisi", description: "Nama Lengkap wajib diisi sesuai KTP." })
      return false
    }
    if (!gender) {
      toast({ variant: "destructive", title: "Jenis Kelamin Belum Dipilih", description: "Silakan pilih jenis kelamin calon penerima." })
      return false
    }
    if (!nik || nik.length < 16) {
      toast({ variant: "destructive", title: "NIK Belum Lengkap", description: "NIK wajib 16 digit angka." })
      return false
    }
    if (!noKK || noKK.length < 16) {
      toast({ variant: "destructive", title: "Nomor KK Belum Lengkap", description: "Nomor KK wajib 16 digit angka." })
      return false
    }
    if (!pob.trim()) {
      toast({ variant: "destructive", title: "Tempat Lahir Belum Diisi", description: "Silakan isi tempat lahir pemohon." })
      return false
    }
    if (!dob.trim()) {
      toast({ variant: "destructive", title: "Tanggal Lahir Belum Lengkap", description: "Tanggal lahir wajib diisi atau diekstrak dari NIK." })
      return false
    }
    if (!phone.trim()) {
      toast({ variant: "destructive", title: "Nomor HP Belum Diisi", description: "Nomor HP / WhatsApp aktif wajib diisi." })
      return false
    }

    return true
  }

  // Validasi Step 2 sebelum lanjut ke Step 3
  const validateStep2 = () => {
    if (!address.trim()) {
      toast({ variant: "destructive", title: "Alamat Belum Diisi", description: "Alamat lengkap domisili wajib diisi." })
      return false
    }
    if (!rtRw.trim()) {
      toast({ variant: "destructive", title: "RT / RW Belum Diisi", description: "Nomor RT / RW wajib diisi." })
      return false
    }
    if (!kelurahan) {
      toast({ variant: "destructive", title: "Kelurahan Belum Dipilih", description: "Silakan pilih kelurahan domisili pemohon." })
      return false
    }

    return true
  }

  // Fungsi navigasi antar langkah
  const goToStep = (targetStep: number) => {
    if (targetStep === 1) {
      setCurrentStep(1)
      window.scrollTo({ top: 120, behavior: "smooth" })
      return
    }
    if (targetStep === 2) {
      if (validateStep1()) {
        setCurrentStep(2)
        window.scrollTo({ top: 120, behavior: "smooth" })
      }
      return
    }
    if (targetStep === 3) {
      if (validateStep1() && validateStep2()) {
        setCurrentStep(3)
        window.scrollTo({ top: 120, behavior: "smooth" })
      }
      return
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !database) return

    if (isFormBlocked) {
      toast({
        variant: "destructive",
        title: "FORMULIR DITUTUP",
        description: "Nomor KK berstatus Blacklist, Hold, atau Sudah Terdaftar. Pendaftaran tidak dapat diproses."
      })
      return
    }

    // Pastikan seluruh langkah telah valid
    if (!validateStep1() || !validateStep2()) {
      return
    }

    if (!businessCategory) {
      toast({ variant: "destructive", title: "Jenis Usaha Belum Dipilih", description: "Pilih kategori Jenis Usaha." })
      return
    }
    if (!businessName.trim()) {
      toast({ variant: "destructive", title: "Nama Usaha Belum Diisi", description: "Nama Usaha / Produk wajib diisi." })
      return
    }
    if (!businessLocation.trim()) {
      toast({ variant: "destructive", title: "Lokasi Usaha Belum Diisi", description: "Lokasi tempat usaha wajib diisi." })
      return
    }
    if (!selectedCoordinator) {
      toast({ variant: "destructive", title: "Koordinator Belum Dipilih", description: "Silakan pilih usulan koordinator pendamping." })
      return
    }

    setLoading(true)
    const nikValue = nik.trim()
    const kkValue = noKK.trim()

    try {
      const actorsRef = ref(database, 'businessActors')
      
      // Tahap 1: Cek duplikasi NIK & noKK via indexed query dengan fallback
      const checkDuplicateByField = async (field: 'nik' | 'noKK', value: string) => {
        if (!value) return null
        try {
          const q = query(actorsRef, orderByChild(field), equalTo(value), limitToFirst(1))
          const snap = await get(q)
          if (snap.exists()) {
            const found = Object.values(snap.val())[0] as any
            return found
          }
          return null
        } catch (err: any) {
          console.warn(`Query index on ${field} failed, fallback to direct search:`, err)
          try {
            const snap = await get(actorsRef)
            if (snap.exists()) {
              const allActors = Object.values(snap.val()) as any[]
              return allActors.find((a: any) => a && a[field] === value) || null
            }
          } catch (fallbackErr) {
            console.error("Fallback search failed:", fallbackErr)
          }
          return null
        }
      }

      const [dupByNik, dupByKK] = await Promise.all([
        checkDuplicateByField('nik', nikValue),
        checkDuplicateByField('noKK', kkValue),
      ])
      const duplicateInActors = dupByNik || dupByKK

      if (duplicateInActors) {
        toast({ 
          variant: "destructive", 
          title: "DATA TELAH DI INPUT", 
          description: `NIK atau Nomor KK ini sudah terdaftar dengan Nomor Registrasi: ${duplicateInActors.registrationCode || '-'} dan Koordinator: ${duplicateInActors.coordinator || '-'}` 
        })
        setLoading(false)
        return
      }

      // Coordinator Quota Check (Safeguard)
      const finalCoordinator = normalizeCoordinator(selectedCoordinator)
      if (finalCoordinator) {
        const quotaItem = rawQuotaData?.find((q: any) => normalizeCoordinator(q.name) === finalCoordinator)
        const achievedMap = (systemStats as any)?.coordinator || {}
        const currentCoordCount = achievedMap[(finalCoordinator || "").toUpperCase().trim()] || 0
        if (quotaItem && currentCoordCount >= quotaItem.quota) {
          toast({
            variant: "destructive",
            title: "KUOTA HABIS",
            description: "DATA TIDAK BISA DIINPUT, DIKARENAKAN KUOTA KOORDINATOR TELAH HABIS"
          })
          setLoading(false)
          return
        }
      }

      const registrationCode = Math.floor(10000000 + Math.random() * 90000000).toString()

      const data = {
        ownerId: user.uid,
        createdBy: currentUserProfile?.fullName || user.email?.split('@')[0] || "Unknown",
        fullName: fullName.trim(),
        nik: nikValue,
        noKK: kkValue,
        registrationCode: registrationCode,
        pobDob: `${pob.trim()}, ${dob.trim()}`,
        pob: pob.trim(),
        dob: dob.trim(),
        gender: gender,
        phone: phone.trim(),
        address: address.trim(),
        rtRw: rtRw.trim(),
        kelurahan: kelurahan,
        kecamatan: kecamatan,
        businessCategory: businessCategory,
        businessName: businessName.trim(),
        businessLocation: businessLocation.trim(),
        coordinator: finalCoordinator,
        status: "pending",
        createdAt: new Date().toISOString(),
      }

      await addDocumentNonBlocking(actorsRef, data)
      
      // Update global stats
      import("@/lib/stats-service").then(({ updateStatsOnNewActor }) => {
        updateStatsOnNewActor(database, data).catch(err => console.error("Stats update error:", err))
      })
      
      // Log Activity
      logActivity({
        query: `INPUT: ${data.fullName} (${nikValue})`,
        results: "Berhasil Simpan",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'INPUT DATA',
        userId: data.createdBy
      }, database).catch(err => console.error("Log error:", err))

      // Reset Form & Stepper
      setFullName("")
      setGender("")
      setNik("")
      setNoKK("")
      setPob("")
      setDob("")
      setPhone("")
      setAddress("")
      setRtRw("")
      setKelurahan("")
      setKecamatan("")
      setBusinessCategory("")
      setBusinessName("")
      setBusinessLocation("")
      setSelectedCoordinator("")
      setKkCheckResults([])
      setCurrentStep(1)
      setFormKey(prev => prev + 1)

      // Pop Out Sukses
      setShowSuccessDialog(true)
    } catch (error: any) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Terjadi Kesalahan",
        description: `Gagal menyimpan data: ${error.message || "Silakan coba lagi."}`
      })
    } finally {
      setLoading(false)
    }
  }

  const kelurahanList = [
    "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
    "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
    "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
    "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
  ]

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">


      {/* Stepper Indikator Langkah Bertahap (Step 1, Step 2, Step 3) */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg shadow-slate-200/40 dark:shadow-none">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative px-2 sm:px-6">
          {/* Garis Penghubung Latar Belakang */}
          <div className="absolute top-1/2 left-8 sm:left-14 right-8 sm:right-14 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 -z-0 rounded-full" />
          
          {/* Garis Progres Aktif */}
          <div 
            className="absolute top-1/2 left-8 sm:left-14 -translate-y-1/2 h-1 bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-500 -z-0"
            style={{
              width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "calc(100% - 4rem)"
            }}
          />

          {/* Tombol Step 1 */}
          <button
            type="button"
            onClick={() => goToStep(1)}
            className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <div className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-300 shadow-md",
              currentStep === 1 
                ? "bg-primary text-white ring-4 ring-primary/20 scale-110 shadow-primary/30" 
                : currentStep > 1 
                ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            )}>
              {currentStep > 1 ? <Check className="w-5 h-5 stroke-[3]" /> : "1"}
            </div>
            <div className="text-center">
              <span className={cn(
                "text-xs font-bold block tracking-tight",
                currentStep === 1 ? "text-primary dark:text-blue-400" : currentStep > 1 ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
              )}>
                Biodata Calon
              </span>
              <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">Langkah 1</span>
            </div>
          </button>

          {/* Tombol Step 2 */}
          <button
            type="button"
            onClick={() => goToStep(2)}
            disabled={isFormBlocked}
            className={cn(
              "relative z-10 flex flex-col items-center gap-2 group focus:outline-none",
              isFormBlocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            <div className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-300 shadow-md",
              currentStep === 2 
                ? "bg-primary text-white ring-4 ring-primary/20 scale-110 shadow-primary/30" 
                : currentStep > 2 
                ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                : isFormBlocked
                ? "bg-rose-100 dark:bg-rose-950 text-rose-500 border border-rose-300"
                : "bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400"
            )}>
              {currentStep > 2 ? <Check className="w-5 h-5 stroke-[3]" /> : isFormBlocked ? <Lock className="w-4 h-4 text-rose-500" /> : "2"}
            </div>
            <div className="text-center">
              <span className={cn(
                "text-xs font-bold block tracking-tight",
                currentStep === 2 ? "text-primary dark:text-blue-400" : currentStep > 2 ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
              )}>
                Alamat & Lokasi
              </span>
              <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">Langkah 2</span>
            </div>
          </button>

          {/* Tombol Step 3 */}
          <button
            type="button"
            onClick={() => goToStep(3)}
            disabled={isFormBlocked}
            className={cn(
              "relative z-10 flex flex-col items-center gap-2 group focus:outline-none",
              isFormBlocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            <div className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-300 shadow-md",
              currentStep === 3 
                ? "bg-primary text-white ring-4 ring-primary/20 scale-110 shadow-primary/30" 
                : isFormBlocked
                ? "bg-rose-100 dark:bg-rose-950 text-rose-500 border border-rose-300"
                : "bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400"
            )}>
              {isFormBlocked ? <Lock className="w-4 h-4 text-rose-500" /> : "3"}
            </div>
            <div className="text-center">
              <span className={cn(
                "text-xs font-bold block tracking-tight",
                currentStep === 3 ? "text-primary dark:text-blue-400" : "text-slate-400"
              )}>
                Usaha & Usulan
              </span>
              <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">Langkah 3</span>
            </div>
          </button>
        </div>
      </div>

      {/* Subheader & Monitoring Mode Alert */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors rounded-xl border border-slate-200 dark:border-slate-800 p-2 h-10 w-10 shadow-sm" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {currentStep === 1 && "Langkah 1: Biodata Calon Penerima"}
              {currentStep === 2 && "Langkah 2: Alamat & Lokasi Domisili"}
              {currentStep === 3 && "Langkah 3: Data Usaha & Usulan Koordinator"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {currentStep === 1 && "Lengkapi identitas diri pemohon sesuai KTP dan lakukan verifikasi Nomor KK."}
              {currentStep === 2 && "Masukkan alamat domisili tempat tinggal pemohon di wilayah Kepulauan Riau."}
              {currentStep === 3 && "Lengkapi data legalitas kegiatan usaha dan tentukan koordinator pengusul."}
            </p>
          </div>
        </div>

        {isMonitoring && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-4 py-3 rounded-2xl flex items-center gap-3 font-bold text-xs sm:text-sm shadow-sm animate-pulse mt-2">
            <span className="text-xl">👁️</span>
            <span>MODE MONITORING: Akun Anda dalam mode tinjau dan tidak diizinkan menambahkan atau mengubah data.</span>
          </div>
        )}
      </div>

      <form 
        key={formKey} 
        onSubmit={handleSubmit} 
        onKeyDown={(e) => {
          if (e.key === "Enter" && currentStep < 3) {
            e.preventDefault()
            if (currentStep === 1) goToStep(2)
            else if (currentStep === 2) goToStep(3)
          }
        }}
        className="space-y-6"
      >
        {/* ========================================================
            LANGKAH 1: BIODATA PRIBADI
           ======================================================== */}
        <div className={cn("space-y-6", currentStep !== 1 && "hidden")}>
          <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden backdrop-blur-xl">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-sm">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      1. Biodata Calon Penerima
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Identitas kependudukan calon penerima sesuai KTP elektronik dan Kartu Keluarga
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none">
                  Langkah 1 Dari 3
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                {/* Nama Lengkap */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="fullName" 
                    name="fullName" 
                    placeholder="Contoh: AHMAD FAUZI" 
                    required 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 rounded-xl text-sm font-semibold tracking-wide border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-primary/20 uppercase"
                  />
                </div>

                {/* Jenis Kelamin */}
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Jenis Kelamin <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={gender} onValueChange={setGender} required>
                    <SelectTrigger className="h-12 rounded-xl text-sm font-semibold border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Pilih Jenis Kelamin..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Laki-laki" className="font-semibold">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan" className="font-semibold">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* NIK */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="nik" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      Nomor Induk Kependudukan (NIK) <span className="text-rose-500">*</span>
                    </Label>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
                      nik.length === 16 ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      {nik.length} / 16 DIGIT
                    </span>
                  </div>
                  <Input 
                    id="nik" 
                    name="nik" 
                    maxLength={16} 
                    placeholder="Masukkan 16 digit NIK..." 
                    required 
                    value={nik}
                    className="h-12 rounded-xl text-sm font-mono font-bold tracking-wider border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-primary/20"
                    onChange={(e) => {
                      const cleanNik = e.target.value.replace(/[^0-9]/g, "")
                      setNik(cleanNik)
                      if (cleanNik.length >= 12) {
                        const extracted = extractDobFromNik(cleanNik)
                        if (extracted) {
                          setDob(extracted)
                        }
                      } else {
                        setDob("")
                      }
                    }}
                  />
                </div>

                {/* Nomor KK + PENGECEKKAN OTOMATIS */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="noKK" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Nomor Kartu Keluarga (KK) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      {noKK.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNoKK("")
                            setKkCheckResults([])
                          }}
                          className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-0.5 font-semibold"
                          title="Hapus Nomor KK"
                        >
                          <X className="w-3 h-3" /> Bersihkan
                        </button>
                      )}
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
                        noKK.length === 16 ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      )}>
                        {noKK.length} / 16 DIGIT
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <Input 
                      id="noKK" 
                      name="noKK" 
                      maxLength={16} 
                      placeholder="Masukkan 16 digit Nomor KK..." 
                      required 
                      value={noKK}
                      className={cn(
                        "h-12 rounded-xl text-sm font-mono font-bold tracking-wider transition-all",
                        isFormBlocked 
                          ? "border-rose-400 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 focus-visible:ring-rose-400" 
                          : noKK.length === 16 && !isCheckingKk && kkCheckResults.length === 0
                          ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                          : "border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-primary/20"
                      )}
                      onChange={(e) => setNoKK(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                    {isCheckingKk && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* HELPER TEXT KETIKA MASIH MENGETIK (< 16 DIGIT) */}
                  {noKK.length > 0 && noKK.length < 16 && (
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 pl-1">
                      <Info className="w-3 h-3 text-slate-400" />
                      Masukkan 16 digit lengkap. Sistem akan otomatis memvalidasi ke basis data pembanding.
                    </p>
                  )}

                  {/* LOADING CHECKER INDICATOR */}
                  {isCheckingKk && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300 font-semibold animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                      <span>Sedang memvalidasi Nomor KK di seluruh basis data pembanding...</span>
                    </div>
                  )}

                  {/* ========================================================
                      HASIL PENGECEKAN NOMOR KK OTOMATIS
                     ======================================================== */}
                  {!isCheckingKk && noKK.length === 16 && (
                    <div className="space-y-2 mt-2 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* KASUS 1: TERDETEKSI BLACKLIST / HOLD / DUPLIKAT (FORM DITUTUP!) */}
                      {isFormBlocked && (
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 via-rose-100/70 to-red-50 dark:from-rose-950/60 dark:via-red-950/40 dark:to-rose-900/40 border-2 border-rose-400 dark:border-rose-600/80 shadow-lg shadow-rose-500/10 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
                              <ShieldAlert className="w-5 h-5 animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-rose-800 dark:text-rose-200 uppercase tracking-tight">
                                  PENGECEKAN KK: {isKkBlacklisted ? "DATA BLACKLIST (REJECT)" : isKkHold ? "DATA HOLD (PENGAJUAN DITAHAN)" : "SUDAH TERDAFTAR"}
                                </span>
                                <Badge variant="destructive" className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
                                  AKSES DITUTUP
                                </Badge>
                              </div>
                              <p className="text-xs font-bold text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                                Nomor KK ini terdeteksi dalam database {isKkBlacklisted ? "BLACKLIST" : isKkHold ? "HOLD (PENGAJUAN DITAHAN)" : "SIMPU 2026"}. Seluruh isian formulir di bawah ini <u>ditutup otomatis</u> dan tidak dapat diisi.
                              </p>
                            </div>
                          </div>

                          {/* Rincian Data yang Terdeteksi */}
                          <div className="space-y-2 pt-1">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800/80 dark:text-rose-300/80 flex items-center gap-1.5">
                              <FileText className="w-3 h-3" />
                              Ditemukan {kkCheckResults.length} Catatan Terkait Nomor KK ini:
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {kkCheckResults.map((res, i) => (
                                <div 
                                  key={i} 
                                  className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-rose-300 dark:border-rose-800/70 shadow-sm text-xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between border-b pb-1.5 border-slate-100 dark:border-slate-800">
                                    <span className="font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                                      <XCircle className="w-3.5 h-3.5" />
                                      {res._source}
                                    </span>
                                    <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded-full">
                                      {res.tahunPengajuan || res.createdAt?.substring(0, 4) || "-"}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300 pt-0.5">
                                    <div>
                                      <span className="text-slate-400 font-medium">Nama:</span>
                                      <p className="font-bold uppercase truncate">{res.nama || res.fullName || "-"}</p>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 font-medium">Status:</span>
                                      <p className="font-bold uppercase truncate text-rose-600 dark:text-rose-400">{res.status || "-"}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-slate-400 font-medium">Usaha / Produk:</span>
                                      <p className="font-semibold truncate">{res.usaha || res.businessName || "-"}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-1 flex items-center justify-between border-t border-rose-200 dark:border-rose-900/60">
                            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Isian formulir di bawah terkunci
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setNoKK("")
                                setKkCheckResults([])
                              }}
                              className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline inline-flex items-center gap-1"
                            >
                              Ganti / Perbaiki Nomor KK &rarr;
                            </button>
                          </div>
                        </div>
                      )}

                      {/* KASUS 2: DITEMUKAN RIWAYAT 2023/2024 (BUKAN BLACKLIST/HOLD) */}
                      {!isFormBlocked && kkHistoryResults.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 uppercase text-[11px]">
                              <Info className="w-3.5 h-3.5 text-amber-600" />
                              Catatan Riwayat Terdaftar (Tahun Sebelumnya)
                            </span>
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                              Pengajuan 2026 Dapat Dilanjutkan
                            </Badge>
                          </div>
                          <div className="space-y-1.5">
                            {kkHistoryResults.map((res, i) => (
                              <div key={i} className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/80 text-[11px] flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{res.nama || res.fullName || "-"}</span>
                                  <span className="text-slate-400 mx-1.5">•</span>
                                  <span className="text-slate-600 dark:text-slate-400">{res._source}</span>
                                </div>
                                <span className="font-bold text-slate-500">{res.status || "Terdaftar"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* KASUS 3: NOMOR KK BERSIH & AMAN */}
                      {!isFormBlocked && kkCheckResults.length === 0 && (
                        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-tight">
                              NOMOR KK BERSIH & VALID
                            </div>
                            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                              Tidak ditemukan di database blacklist ataupun data hold. Isian formulir di bawah siap diisi.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tempat Lahir */}
                <div className="space-y-2">
                  <Label htmlFor="pob" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Tempat Lahir <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="pob" 
                    name="pob" 
                    placeholder="Contoh: TANJUNGPINANG" 
                    required 
                    value={pob}
                    disabled={isFormBlocked || isMonitoring || loading}
                    onChange={(e) => setPob(e.target.value)}
                    className="h-12 rounded-xl text-sm font-semibold tracking-wide border-slate-200 dark:border-slate-800 uppercase focus-visible:ring-2 focus-visible:ring-primary/20 disabled:bg-slate-100 disabled:dark:bg-slate-800/60 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="dob" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Tanggal Lahir {isEditingDob ? "(Manual)" : "(Otomatis dari NIK)"}
                    </Label>
                    {!isFormBlocked && (
                      <button
                        type="button"
                        onClick={() => setIsEditingDob(!isEditingDob)}
                        className="text-xs text-primary font-bold hover:underline"
                      >
                        {isEditingDob ? "Kunci Otomatis" : "Edit Manual"}
                      </button>
                    )}
                  </div>
                  <Input 
                    id="dob" 
                    name="dob" 
                    placeholder="Terisi otomatis dari NIK (DD-MM-YYYY)" 
                    readOnly={!isEditingDob || isFormBlocked}
                    disabled={isFormBlocked || isMonitoring || loading}
                    required 
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={cn(
                      "h-12 rounded-xl text-sm font-semibold tracking-wide border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-primary/20",
                      !isEditingDob && "bg-slate-50 dark:bg-slate-800/50",
                      isFormBlocked && "disabled:bg-slate-100 disabled:dark:bg-slate-800/60 disabled:cursor-not-allowed"
                    )}
                  />
                </div>

                {/* Nomor HP */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    Nomor HP / WhatsApp Aktif <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    placeholder="Contoh: 081234567890" 
                    required 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isFormBlocked || isMonitoring || loading}
                    className="h-12 rounded-xl text-sm font-semibold tracking-wide border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:bg-slate-100 disabled:dark:bg-slate-800/60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Navigasi Footer Langkah 1 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 font-medium">
                  {isFormBlocked ? (
                    <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                      <Lock className="w-4 h-4" /> Langkah 2 ditutup karena Nomor KK berstatus Blacklist/Hold.
                    </span>
                  ) : (
                    <span>Langkah 1 dari 3: Lengkapi seluruh identitas calon penerima.</span>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={() => goToStep(2)}
                  disabled={isFormBlocked || isCheckingKk}
                  className={cn(
                    "w-full sm:w-auto min-w-[240px] h-13 text-sm font-bold shadow-lg rounded-2xl transition-all duration-200",
                    isFormBlocked 
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none" 
                      : "bg-primary hover:bg-primary/95 text-white shadow-primary/25"
                  )}
                >
                  {isFormBlocked ? (
                    <>
                      <Lock className="w-4 h-4 mr-2 text-rose-500" />
                      <span>Langkah 2 Terkunci</span>
                    </>
                  ) : (
                    <>
                      <span>Lanjut ke Langkah 2: Alamat</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================
            LANGKAH 2: ALAMAT & LOKASI DOMISILI
           ======================================================== */}
        <div className={cn("space-y-6", currentStep !== 2 && "hidden")}>
          <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden backdrop-blur-xl">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-sm">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      2. Alamat & Lokasi Domisili
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Wilayah administrasi kependudukan dan alamat tempat tinggal pemohon
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none">
                  Langkah 2 Dari 3
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Alamat Lengkap <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea 
                    id="address" 
                    name="address" 
                    placeholder="Masukkan jalan, gang, atau nomor rumah lengkap..." 
                    required 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="rounded-xl min-h-[90px] text-sm font-semibold tracking-wide border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rtRw" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    RT / RW <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="rtRw" 
                    name="rtRw" 
                    placeholder="Contoh: 001 / 002" 
                    required 
                    value={rtRw}
                    onChange={(e) => setRtRw(e.target.value)}
                    className="h-12 rounded-xl text-sm font-semibold tracking-wide border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-primary/20 uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kelurahan" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Kelurahan <span className="text-rose-500">*</span>
                  </Label>
                  <Select 
                    value={kelurahan} 
                    onValueChange={setKelurahan} 
                    required 
                  >
                    <SelectTrigger className="h-12 rounded-xl text-sm font-semibold border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Pilih Kelurahan..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] rounded-xl">
                      {kelurahanList.map((k) => (
                        <SelectItem key={k} value={k} className="font-semibold">{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="kecamatan" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Kecamatan (Otomatis Sesuai Kelurahan)
                  </Label>
                  <Input 
                    id="kecamatan" 
                    name="kecamatan" 
                    value={kecamatan} 
                    readOnly 
                    placeholder="Terisi otomatis saat kelurahan dipilih"
                    className="h-12 rounded-xl text-sm font-bold tracking-wide bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200" 
                  />
                </div>
              </div>

              {/* Navigasi Footer Langkah 2 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep(1)}
                  className="w-full sm:w-auto h-13 rounded-2xl font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Kembali ke Biodata</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="w-full sm:w-auto min-w-[240px] h-13 text-sm font-bold shadow-lg rounded-2xl bg-primary hover:bg-primary/95 text-white shadow-primary/25"
                >
                  <span>Lanjut ke Langkah 3: Usaha</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================
            LANGKAH 3: DATA USAHA & USULAN KOORDINATOR
           ======================================================== */}
        <div className={cn("space-y-6", currentStep !== 3 && "hidden")}>
          <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden backdrop-blur-xl">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-sm">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      3. Data Usaha & Usulan Koordinator
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Detail profil kegiatan usaha pelaku usaha dan koordinator pendamping
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none">
                  Langkah 3 Dari 3
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessCategory" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-primary" />
                    Jenis Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={businessCategory} onValueChange={setBusinessCategory} required>
                    <SelectTrigger className="h-12 rounded-xl text-sm font-semibold border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Pilih Jenis Usaha..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Kuliner" className="font-semibold">Kuliner</SelectItem>
                      <SelectItem value="Bukan Kuliner" className="font-semibold">Bukan Kuliner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Nama Usaha / Produk <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="businessName" 
                    name="businessName" 
                    placeholder="Contoh: KERIPIK PISANG BERKAH" 
                    required 
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="h-12 rounded-xl text-sm font-semibold tracking-wide border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-primary/20 uppercase"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="businessLocation" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Lokasi Tempat Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="businessLocation" 
                    name="businessLocation" 
                    placeholder="Contoh: JL. MERDEKA NO. 10 (DEPAN PASAR)" 
                    required 
                    value={businessLocation}
                    onChange={(e) => setBusinessLocation(e.target.value)}
                    className="h-12 rounded-xl text-sm font-semibold tracking-wide border-slate-200 dark:border-slate-800 focus-visible:ring-2 focus-visible:ring-primary/20 uppercase"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="coordinator" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>USULAN (Koordinator Pendamping) <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-slate-400 font-semibold normal-case">Tersedia kuota real-time</span>
                  </Label>
                  <Select 
                    value={selectedCoordinator} 
                    onValueChange={setSelectedCoordinator} 
                    required 
                  >
                    <SelectTrigger className="h-12 rounded-xl text-sm font-semibold border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Pilih Usulan Koordinator..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-[320px]">
                      {availableCoordinators.filter(c => c.remaining > 0).map((c) => (
                        <SelectItem 
                          key={c.id} 
                          value={c.name} 
                          className="group focus:bg-primary focus:text-white data-[highlighted]:bg-primary data-[highlighted]:text-white rounded-lg my-0.5"
                        >
                          <div className="flex justify-between items-center w-full min-w-[320px] py-0.5">
                            <span className="font-bold group-focus:text-white group-data-[highlighted]:text-white">
                              {c.name}
                            </span>
                            <span className="text-[10px] font-bold bg-primary/10 text-primary group-focus:bg-white/20 group-focus:text-white group-data-[highlighted]:bg-white/20 group-data-[highlighted]:text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                              Sisa Kuota: {c.remaining}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rangkuman Ringkas Data Calon Sebelum Disimpan */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  Rangkuman Pengajuan Bantuan 2026:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px]">Nama Calon:</span>
                    <p className="font-bold truncate text-slate-800 dark:text-slate-200">{fullName || "-"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">NIK / KK:</span>
                    <p className="font-mono font-bold truncate text-slate-800 dark:text-slate-200">{nik || "-"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Wilayah:</span>
                    <p className="font-bold truncate text-slate-800 dark:text-slate-200">{kelurahan || "-"}, {kecamatan || "-"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Koordinator:</span>
                    <p className="font-bold truncate text-primary">{selectedCoordinator || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Navigasi Footer Langkah 3 & Submit Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep(2)}
                  className="w-full sm:w-auto h-14 rounded-2xl font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Kembali ke Alamat</span>
                </Button>

                <Button 
                  type="submit" 
                  disabled={loading || isMonitoring || isFormBlocked} 
                  className={cn(
                    "w-full sm:w-auto min-w-[260px] h-14 text-base font-bold shadow-xl rounded-2xl transition-all duration-200 active:scale-[0.98]",
                    isFormBlocked 
                      ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none" 
                      : isMonitoring 
                      ? "bg-slate-400 cursor-not-allowed" 
                      : "bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-600/95 text-white shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      <span>Menyimpan Data...</span>
                    </>
                  ) : isFormBlocked ? (
                    <>
                      <Lock className="w-5 h-5 mr-2 text-rose-500" />
                      <span>Formulir Ditutup (Terkunci)</span>
                    </>
                  ) : isMonitoring ? (
                    <span>Akses Mode Monitoring</span>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      <span>Simpan Data Pendaftaran</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Pop Out Sukses */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="max-w-[420px] border-none shadow-2xl rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900">
          <AlertDialogHeader className="items-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-headline">
              DATA BERHASIL DISIMPAN!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
              Data pelaku usaha telah berhasil dimasukkan ke sistem SIMPU Tunas Bangsa 2026 dan siap untuk diverifikasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col gap-2 w-full">
            <AlertDialogAction 
              className="w-full h-12 bg-primary hover:bg-primary/90 font-bold text-white rounded-2xl shadow-lg shadow-primary/20"
              onClick={() => router.push('/verify-actor')}
            >
              Lihat di Daftar Verifikasi
            </AlertDialogAction>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-2xl font-bold border-slate-200 dark:border-slate-800"
              onClick={() => setShowSuccessDialog(false)}
            >
              Input Data Baru Lagi
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
