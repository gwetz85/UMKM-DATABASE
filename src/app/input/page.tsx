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
            // Silently ignore
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
      return
    }
    if (targetStep === 2) {
      if (validateStep1()) {
        setCurrentStep(2)
      }
      return
    }
    if (targetStep === 3) {
      if (validateStep1() && validateStep2()) {
        setCurrentStep(3)
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
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-3.5 pb-12 animate-in fade-in duration-300">
      {/* Header Bar Kompak & Stepper Terpadu (Single Slim Row) */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 h-8 w-8 shadow-xs shrink-0" />
          <div>
            <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
              Formulir Pendaftaran UMKM 2026
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Yayasan Tunas Bangsa Kepulauan Riau
            </p>
          </div>
        </div>

        {/* Stepper Wizard Mini */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-stretch sm:self-center justify-center">
          {/* Step 1 Pill */}
          <button
            type="button"
            onClick={() => goToStep(1)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition-all",
              currentStep === 1
                ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                : currentStep > 1
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            )}
          >
            <span className={cn(
              "w-4 h-4 sm:w-5 sm:h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
              currentStep === 1 ? "bg-white/20 text-white" : currentStep > 1 ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            )}>
              {currentStep > 1 ? <Check className="w-3 h-3 stroke-[3]" /> : "1"}
            </span>
            <span>1. Biodata</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700 text-[10px] sm:text-xs">&rarr;</span>

          {/* Step 2 Pill */}
          <button
            type="button"
            onClick={() => goToStep(2)}
            disabled={isFormBlocked}
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition-all",
              currentStep === 2
                ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                : currentStep > 2
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                : isFormBlocked
                ? "bg-rose-50 text-rose-400 cursor-not-allowed border border-rose-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"
            )}
          >
            <span className={cn(
              "w-4 h-4 sm:w-5 sm:h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
              currentStep === 2 ? "bg-white/20 text-white" : currentStep > 2 ? "bg-emerald-600 text-white" : isFormBlocked ? "bg-rose-200 text-rose-700" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            )}>
              {currentStep > 2 ? <Check className="w-3 h-3 stroke-[3]" /> : isFormBlocked ? <Lock className="w-2.5 h-2.5 text-rose-600" /> : "2"}
            </span>
            <span>2. Alamat</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700 text-[10px] sm:text-xs">&rarr;</span>

          {/* Step 3 Pill */}
          <button
            type="button"
            onClick={() => goToStep(3)}
            disabled={isFormBlocked}
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition-all",
              currentStep === 3
                ? "bg-primary text-white shadow-sm ring-2 ring-primary/20"
                : isFormBlocked
                ? "bg-rose-50 text-rose-400 cursor-not-allowed border border-rose-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"
            )}
          >
            <span className={cn(
              "w-4 h-4 sm:w-5 sm:h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
              currentStep === 3 ? "bg-white/20 text-white" : isFormBlocked ? "bg-rose-200 text-rose-700" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            )}>
              {isFormBlocked ? <Lock className="w-2.5 h-2.5 text-rose-600" /> : "3"}
            </span>
            <span>3. Usaha</span>
          </button>
        </div>
      </div>

      {isMonitoring && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-3 py-2 rounded-xl flex items-center gap-2 font-bold text-xs shadow-sm">
          <span>👁️</span>
          <span>MODE MONITORING: Akun Anda dalam mode tinjau dan tidak diizinkan menambahkan atau mengubah data.</span>
        </div>
      )}

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
        className="space-y-4"
      >
        {/* ========================================================
            LANGKAH 1: BIODATA CALON PENERIMA
           ======================================================== */}
        <div className={cn("space-y-4", currentStep !== 1 && "hidden")}>
          <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 py-2.5 px-4 sm:px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      1. Biodata Calon Penerima
                    </CardTitle>
                    <CardDescription className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                      Identitas calon penerima sesuai KTP elektronik dan Kartu Keluarga
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none py-0.5 px-2">
                  Langkah 1 Dari 3
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-5 space-y-3">
              <div className="grid gap-3 sm:gap-3.5 md:grid-cols-2">
                {/* Nama Lengkap */}
                <div className="space-y-1">
                  <Label htmlFor="fullName" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3 h-3 text-primary" />
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="fullName" 
                    name="fullName" 
                    placeholder="Contoh: AHMAD FAUZI" 
                    required 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-xl font-semibold tracking-wide border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                {/* Jenis Kelamin */}
                <div className="space-y-1">
                  <Label htmlFor="gender" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-primary" />
                    Jenis Kelamin <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={gender} onValueChange={setGender} required>
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Jenis Kelamin..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Laki-laki" className="font-semibold text-xs sm:text-sm">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan" className="font-semibold text-xs sm:text-sm">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* NIK */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="nik" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3 h-3 text-primary" />
                      Nomor Induk Kependudukan (NIK) <span className="text-rose-500">*</span>
                    </Label>
                    <span className={cn(
                      "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full",
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
                    className="h-10 text-xs sm:text-sm rounded-xl font-mono font-bold tracking-wider border-slate-200 dark:border-slate-800"
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
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="noKK" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-primary" />
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
                          className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 font-semibold"
                        >
                          <X className="w-3 h-3" /> Bersihkan
                        </button>
                      )}
                      <span className={cn(
                        "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full",
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
                        "h-10 text-xs sm:text-sm rounded-xl font-mono font-bold tracking-wider transition-all",
                        isFormBlocked 
                          ? "border-rose-400 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 focus-visible:ring-rose-400" 
                          : noKK.length === 16 && !isCheckingKk && kkCheckResults.length === 0
                          ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                          : "border-slate-200 dark:border-slate-800"
                      )}
                      onChange={(e) => setNoKK(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                    {isCheckingKk && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      </div>
                    )}
                  </div>

                  {noKK.length > 0 && noKK.length < 16 && (
                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 pl-1">
                      <Info className="w-3 h-3" />
                      Wajib 16 digit angka untuk validasi otomatis.
                    </p>
                  )}

                  {isCheckingKk && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 text-xs text-blue-700 font-semibold animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                      <span>Memvalidasi Nomor KK di basis data pembanding...</span>
                    </div>
                  )}

                  {/* HASIL PENGECEKAN KK */}
                  {!isCheckingKk && noKK.length === 16 && (
                    <div className="space-y-1.5 pt-1 animate-in fade-in">
                      {isFormBlocked && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-xs space-y-2">
                          <div className="flex items-start gap-2.5">
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="font-black text-rose-800 dark:text-rose-200 uppercase text-[11px]">
                                {isKkBlacklisted ? "DATA BLACKLIST (REJECT)" : isKkHold ? "DATA HOLD (PENGAJUAN DITAHAN)" : "SUDAH TERDAFTAR"}
                              </span>
                              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-tight font-semibold">
                                Nomor KK ini dilarang mendaftar. Seluruh isian di bawahnya ditutup otomatis.
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {kkCheckResults.map((res, i) => (
                              <div key={i} className="p-2 rounded-lg bg-white/90 dark:bg-slate-900 border border-rose-200 text-[10px] space-y-0.5">
                                <div className="flex justify-between font-bold text-rose-700">
                                  <span>{res._source}</span>
                                  <span>{res.tahunPengajuan || "-"}</span>
                                </div>
                                <div className="text-slate-600 dark:text-slate-300">
                                  <strong>{res.nama || res.fullName || "-"}</strong> ({res.status || "-"})
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isFormBlocked && kkHistoryResults.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-[11px] text-amber-800 flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-amber-600" />
                            Terdata riwayat tahun sebelumnya. Pendaftaran tetap dapat dilanjutkan.
                          </span>
                        </div>
                      )}

                      {!isFormBlocked && kkCheckResults.length === 0 && (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 font-bold">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Nomor KK Bersih & Valid (Siap lanjut ke Langkah 2).</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tempat Lahir */}
                <div className="space-y-1">
                  <Label htmlFor="pob" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-primary" />
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
                    className="h-10 text-xs sm:text-sm rounded-xl font-semibold tracking-wide border-slate-200 dark:border-slate-800 uppercase disabled:bg-slate-100"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="dob" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-primary" />
                      Tanggal Lahir {isEditingDob ? "(Manual)" : "(Otomatis)"}
                    </Label>
                    {!isFormBlocked && (
                      <button
                        type="button"
                        onClick={() => setIsEditingDob(!isEditingDob)}
                        className="text-[10px] text-primary font-bold hover:underline"
                      >
                        {isEditingDob ? "Kunci" : "Edit Manual"}
                      </button>
                    )}
                  </div>
                  <Input 
                    id="dob" 
                    name="dob" 
                    placeholder="DD-MM-YYYY" 
                    readOnly={!isEditingDob || isFormBlocked}
                    disabled={isFormBlocked || isMonitoring || loading}
                    required 
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={cn(
                      "h-10 text-xs sm:text-sm rounded-xl font-semibold border-slate-200 dark:border-slate-800",
                      !isEditingDob && "bg-slate-50 dark:bg-slate-800/50"
                    )}
                  />
                </div>

                {/* Nomor HP */}
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="phone" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-primary" />
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
                    className="h-10 text-xs sm:text-sm rounded-xl font-semibold border-slate-200 dark:border-slate-800 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Navigasi Footer Langkah 1 */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">
                  {isFormBlocked ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Langkah 2 ditutup karena KK Blacklist/Hold.
                    </span>
                  ) : (
                    "Langkah 1 dari 3: Lengkapi seluruh biodata."
                  )}
                </span>

                <Button
                  type="button"
                  onClick={() => goToStep(2)}
                  disabled={isFormBlocked || isCheckingKk}
                  className={cn(
                    "h-10 text-xs sm:text-sm font-bold shadow-sm rounded-xl px-5 transition-all",
                    isFormBlocked 
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none" 
                      : "bg-primary hover:bg-primary/95 text-white"
                  )}
                >
                  {isFormBlocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                      <span>Langkah 2 Terkunci</span>
                    </>
                  ) : (
                    <>
                      <span>Lanjut ke Langkah 2: Alamat</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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
        <div className={cn("space-y-4", currentStep !== 2 && "hidden")}>
          <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 py-2.5 px-4 sm:px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      2. Alamat & Lokasi Domisili
                    </CardTitle>
                    <CardDescription className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                      Wilayah administrasi domisili tempat tinggal pemohon
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none py-0.5 px-2">
                  Langkah 2 Dari 3
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-5 space-y-3">
              <div className="grid gap-3 sm:gap-3.5 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="address" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-primary" />
                    Alamat Lengkap <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea 
                    id="address" 
                    name="address" 
                    placeholder="Masukkan jalan, gang, atau nomor rumah lengkap..." 
                    required 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="rounded-xl min-h-[68px] text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="rtRw" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    RT / RW <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="rtRw" 
                    name="rtRw" 
                    placeholder="Contoh: 001 / 002" 
                    required 
                    value={rtRw}
                    onChange={(e) => setRtRw(e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="kelurahan" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Kelurahan <span className="text-rose-500">*</span>
                  </Label>
                  <Select 
                    value={kelurahan} 
                    onValueChange={setKelurahan} 
                    required 
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Kelurahan..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[260px] rounded-xl">
                      {kelurahanList.map((k) => (
                        <SelectItem key={k} value={k} className="font-semibold text-xs sm:text-sm">{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="kecamatan" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Kecamatan (Otomatis Sesuai Kelurahan)
                  </Label>
                  <Input 
                    id="kecamatan" 
                    name="kecamatan" 
                    value={kecamatan} 
                    readOnly 
                    placeholder="Terisi otomatis saat kelurahan dipilih"
                    className="h-10 text-xs sm:text-sm rounded-xl font-bold bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200" 
                  />
                </div>
              </div>

              {/* Navigasi Footer Langkah 2 */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep(1)}
                  className="h-10 rounded-xl font-bold border-slate-200 dark:border-slate-800 text-xs sm:text-sm px-4"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  <span>Kembali ke Biodata</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="h-10 text-xs sm:text-sm font-bold shadow-sm rounded-xl bg-primary hover:bg-primary/95 text-white px-5"
                >
                  <span>Lanjut ke Langkah 3: Usaha</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================
            LANGKAH 3: DATA USAHA & USULAN KOORDINATOR
           ======================================================== */}
        <div className={cn("space-y-4", currentStep !== 3 && "hidden")}>
          <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 py-2.5 px-4 sm:px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      3. Data Usaha & Usulan Koordinator
                    </CardTitle>
                    <CardDescription className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                      Legalitas usaha mikro dan pemilihan koordinator pengusul
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none py-0.5 px-2">
                  Langkah 3 Dari 3
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-5 space-y-3">
              <div className="grid gap-3 sm:gap-3.5 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="businessCategory" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="w-3 h-3 text-primary" />
                    Jenis Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={businessCategory} onValueChange={setBusinessCategory} required>
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Jenis Usaha..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Kuliner" className="font-semibold text-xs sm:text-sm">Kuliner</SelectItem>
                      <SelectItem value="Bukan Kuliner" className="font-semibold text-xs sm:text-sm">Bukan Kuliner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="businessName" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Nama Usaha / Produk <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="businessName" 
                    name="businessName" 
                    placeholder="Contoh: KERIPIK PISANG BERKAH" 
                    required 
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="businessLocation" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Lokasi Tempat Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="businessLocation" 
                    name="businessLocation" 
                    placeholder="Contoh: JL. MERDEKA NO. 10 (DEPAN PASAR)" 
                    required 
                    value={businessLocation}
                    onChange={(e) => setBusinessLocation(e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="coordinator" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>USULAN (Koordinator Pendamping) <span className="text-rose-500">*</span></span>
                    <span className="text-[9px] text-slate-400 font-semibold normal-case">Sisa Kuota Terpantau Real-time</span>
                  </Label>
                  <Select 
                    value={selectedCoordinator} 
                    onValueChange={setSelectedCoordinator} 
                    required 
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Usulan Koordinator..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-[260px]">
                      {availableCoordinators.filter(c => c.remaining > 0).map((c) => (
                        <SelectItem 
                          key={c.id} 
                          value={c.name} 
                          className="group focus:bg-primary focus:text-white data-[highlighted]:bg-primary data-[highlighted]:text-white rounded-lg my-0.5 text-xs sm:text-sm"
                        >
                          <div className="flex justify-between items-center w-full min-w-[280px] sm:min-w-[320px] py-0.5">
                            <span className="font-bold group-focus:text-white group-data-[highlighted]:text-white">
                              {c.name}
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-bold bg-primary/10 text-primary group-focus:bg-white/20 group-focus:text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                              Sisa Kuota: {c.remaining}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rangkuman Ringkas Data Calon */}
              <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                  Rangkuman Data Sebelum Disimpan:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[9px] block">Nama Calon:</span>
                    <strong className="truncate block text-slate-800 dark:text-slate-200">{fullName || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] block">NIK:</span>
                    <span className="font-mono font-bold truncate block">{nik || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] block">Kelurahan:</span>
                    <strong className="truncate block">{kelurahan || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] block">Koordinator:</span>
                    <strong className="truncate block text-primary">{selectedCoordinator || "-"}</strong>
                  </div>
                </div>
              </div>

              {/* Navigasi Footer Langkah 3 & Submit Button */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep(2)}
                  className="h-10 sm:h-10.5 rounded-xl font-bold border-slate-200 dark:border-slate-800 text-xs sm:text-sm px-4"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  <span>Kembali ke Alamat</span>
                </Button>

                <Button 
                  type="submit" 
                  disabled={loading || isMonitoring || isFormBlocked} 
                  className={cn(
                    "h-10 sm:h-10.5 min-w-[200px] sm:min-w-[220px] text-xs sm:text-sm font-bold shadow-sm rounded-xl transition-all",
                    isFormBlocked 
                      ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none" 
                      : isMonitoring 
                      ? "bg-slate-400 cursor-not-allowed" 
                      : "bg-primary hover:bg-primary/95 text-white"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : isFormBlocked ? (
                    <>
                      <Lock className="w-4 h-4 mr-1.5 text-rose-500" />
                      <span>Formulir Terkunci</span>
                    </>
                  ) : isMonitoring ? (
                    <span>Akses Monitoring</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1.5" />
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
        <AlertDialogContent className="max-w-[400px] border-none shadow-2xl rounded-3xl p-6 bg-white dark:bg-slate-900">
          <AlertDialogHeader className="items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              DATA BERHASIL DISIMPAN!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
              Data pelaku usaha telah masuk ke sistem SIMPU Tunas Bangsa 2026 dan siap untuk diverifikasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 flex flex-col gap-2 w-full">
            <AlertDialogAction 
              className="w-full h-11 bg-primary hover:bg-primary/90 font-bold text-white rounded-xl shadow-md text-xs sm:text-sm"
              onClick={() => router.push('/verify-actor')}
            >
              Lihat di Daftar Verifikasi
            </AlertDialogAction>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl font-bold border-slate-200 dark:border-slate-800 text-xs sm:text-sm"
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
