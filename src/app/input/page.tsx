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
  ArrowLeft,
  History,
  AlertTriangle
} from "lucide-react"
import { cn, extractDobFromNik, formatCurrency } from "@/lib/utils"
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

function KkDetailCard({ item }: { item: any }) {
  const isBlockedSource =
    item._table === "blacklist_data" ||
    item._table === "master_data_2025" ||
    item._table === "businessActors" ||
    (item._source || "").toUpperCase().includes("BLACKLIST") ||
    (item._source || "").toUpperCase().includes("SHEET 4") ||
    (item._source || "").toUpperCase().includes("SHEET 3") ||
    (item._source || "").toUpperCase().includes("2025") ||
    (item._source || "").toUpperCase().includes("2026") ||
    (item._source || "").toUpperCase().includes("PELAKU USAHA")

  const sourceLabel = item._source || (
    item._table === "blacklist_data" ? "Sheet 4 : Blacklist" :
    item._table === "master_data_2025" ? "Sheet 3 : Pembanding 2025" :
    item._table === "businessActors" ? "Data Pelaku Usaha 2026" :
    item._table === "master_data_2024" ? "Sheet 1 : Pembanding 2024" :
    item._table === "master_data_2023" ? "Sheet 2 : Pembanding 2023" : "Database"
  )

  const name = item.fullName || item.nama || item.NAMA || "-"
  const nik = item.nik || item.Nik || item.NIK || "-"
  const noKK = item.noKK || item.kk || item['NO KK'] || "-"
  const phone = item.phone || item.noHp || item.telepon || "-"
  const gender = item.gender || item.jenisKelamin || "-"
  const pobDob = item.pobDob || (item.pob && item.dob ? `${item.pob}, ${item.dob}` : item.dob || item.pob || "-")
  const businessName = item.businessName || item.usaha || item.USAHA || item.surveyData?.namaUsaha || "-"
  const businessCategory = item.businessCategory || item.kategori || item.sektor || item.surveyData?.bidangUsaha || "-"
  const businessLocation = item.businessLocation || item.alamatUsaha || item.surveyData?.alamatUsaha || "-"
  const address = item.address || item.alamat || item.ALAMAT || "-"
  const rtRw = item.rtRw || (item.rt && item.rw ? `${item.rt} / ${item.rw}` : item.rt || "-")
  const kelurahan = item.kelurahan || "-"
  const kecamatan = item.kecamatan || "-"
  const coordinator = item.coordinator || item.koordinator || "-"
  const status = item.status || item.STATUS || "-"
  const statusLpj = item.statusLpj || "-"
  const registrationCode = item.registrationCode || "-"
  const tahun = item.tahunPengajuan || item.tahun || (item.createdAt ? new Date(item.createdAt).getFullYear().toString() : "-")
  const petugasSurvey = item.petugasSurvey || item.surveyData?.namaPetugas || "-"
  const verifikatorDinas = item.verifikatorDinas || "-"
  const hasilVerifikasiDinas = item.hasilVerifikasiDinas || "-"
  const notes = item.alasan || item.alasanCancelDinas || item.keterangan || item.bpjsCheckNote || ""
  const createdDate = item.createdAt || item.uploadedAt ? new Date(item.createdAt || item.uploadedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : "-"

  const nominalVal = item.lpjNominal || item.nominal || item.NOM
  const nominalStr = nominalVal ? (typeof nominalVal === 'number' ? formatCurrency(nominalVal) : !isNaN(Number(nominalVal)) ? formatCurrency(Number(nominalVal)) : String(nominalVal)) : "-"

  return (
    <div className={cn(
      "rounded-2xl border p-4 sm:p-5 text-xs transition-all shadow-sm space-y-3.5",
      isBlockedSource 
        ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80" 
        : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80"
    )}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/10 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn(
            "font-black text-xs px-2.5 py-1 rounded-xl uppercase tracking-wider shadow-none",
            isBlockedSource
              ? "bg-rose-600 text-white hover:bg-rose-600"
              : "bg-emerald-600 text-white hover:bg-emerald-600"
          )}>
            {sourceLabel}
          </Badge>
          <Badge variant="outline" className={cn(
            "font-bold text-[11px] px-2 py-0.5 rounded-lg uppercase",
            isBlockedSource
              ? "border-rose-400 text-rose-700 dark:text-rose-300 bg-rose-100/50"
              : "border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-emerald-100/50"
          )}>
            {isBlockedSource ? "⛔ Dilarang Mendaftar" : "✅ Riwayat Diizinkan"}
          </Badge>
          <span className="text-[11px] font-bold text-slate-500">
            Tahun: {tahun}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span>Status:</span>
          <span className={cn(
            "font-black px-2 py-0.5 rounded-md uppercase text-[11px]",
            isBlockedSource ? "bg-rose-200/70 text-rose-800" : "bg-emerald-200/70 text-emerald-800"
          )}>
            {status}
          </span>
        </div>
      </div>

      {/* Grid Informasi Lengkap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Nama Lengkap */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Nama Lengkap</span>
          <strong className="text-xs sm:text-sm text-slate-900 dark:text-white block font-black uppercase truncate">{name}</strong>
        </div>

        {/* NIK */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">NIK</span>
          <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">{nik}</span>
        </div>

        {/* Nomor KK */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Nomor KK</span>
          <span className="font-mono font-bold text-xs text-primary block truncate">{noKK}</span>
        </div>

        {/* Nomor HP / WA */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Nomor HP / WhatsApp</span>
          <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">{phone}</span>
        </div>

        {/* Jenis Kelamin & TTL */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gender & TTL</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">{gender} • {pobDob}</span>
        </div>

        {/* Nama Usaha */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Nama Usaha / Produk</span>
          <strong className="text-xs font-bold text-slate-800 dark:text-slate-100 block uppercase truncate">{businessName}</strong>
        </div>

        {/* Kategori Usaha */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Kategori Usaha</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">{businessCategory}</span>
        </div>

        {/* Usulan Koordinator */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Koordinator</span>
          <span className="font-bold text-xs text-primary block truncate">{coordinator}</span>
        </div>

        {/* Alamat Domisili */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5 sm:col-span-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Alamat Lengkap</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block line-clamp-1">{address}</span>
        </div>

        {/* RT / RW & Wilayah */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">RT/RW • Kelurahan</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">RT/RW: {rtRw} • {kelurahan}</span>
        </div>

        {/* Kecamatan */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Kecamatan</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">{kecamatan}</span>
        </div>

        {/* Nominal Bantuan */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Nominal Bantuan / LPJ</span>
          <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 block truncate">{nominalStr}</span>
        </div>

        {/* Status LPJ */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Status LPJ</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">{statusLpj}</span>
        </div>

        {/* Nomor Registrasi (Jika Ada) */}
        {registrationCode !== "-" && (
          <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">No. Registrasi SIMPU</span>
            <span className="font-mono font-bold text-xs text-blue-600 block truncate">{registrationCode}</span>
          </div>
        )}

        {/* Petugas Survey / Verifikator (Jika Ada) */}
        {(petugasSurvey !== "-" || verifikatorDinas !== "-") && (
          <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5 sm:col-span-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Petugas Survey / Dinas</span>
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">
              Surveyor: {petugasSurvey} • Dinas: {verifikatorDinas} ({hasilVerifikasiDinas})
            </span>
          </div>
        )}

        {/* Tanggal Terdata */}
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Tanggal Terdata</span>
          <span className="font-medium text-xs text-slate-600 dark:text-slate-300 block truncate">{createdDate}</span>
        </div>
      </div>

      {/* Catatan / Keterangan Tambahan jika ada */}
      {notes && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
          <span className="font-bold uppercase text-[10px] tracking-wider block">Catatan / Alasan:</span>
          <p className="mt-0.5 font-medium">{notes}</p>
        </div>
      )}
    </div>
  )
}

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
    const cleanKk = noKK.replace(/[^0-9]/g, "").trim()
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
            } else {
              // Cek fallback jika nama field adalah 'kk'
              try {
                const qFallback = query(ref(database, sheetName), orderByChild('kk'), equalTo(cleanKk))
                const snapFallback = await get(qFallback)
                if (snapFallback.exists()) {
                  Object.values(snapFallback.val()).forEach((item: any) => {
                    if (item) {
                      results.push({ ...item, _source: label, _table: sheetName })
                    }
                  })
                }
              } catch (eFallback) {
                // Silently ignore fallback error
              }
            }
          } catch (err) {
            console.warn(`Query index on ${sheetName} failed:`, err)
          }
        }

        // Cek juga di Database Aktif (Data Pelaku Usaha 2026) untuk cegah duplikasi KK
        const checkActiveActors = async () => {
          if (!database) return
          try {
            const q = query(ref(database, 'businessActors'), orderByChild('noKK'), equalTo(cleanKk))
            const snap = await get(q)
            if (snap.exists()) {
              Object.values(snap.val()).forEach((item: any) => {
                if (item) {
                  results.push({ 
                    ...item, 
                    _source: 'Data Pelaku Usaha 2026', 
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
          checkSheet('blacklist_data', 'Sheet 4 : Blacklist'),
          checkSheet('master_data_2025', 'Sheet 3 : Pembanding 2025'),
          checkActiveActors(),
          checkSheet('master_data_2024', 'Sheet 1 : Pembanding 2024'),
          checkSheet('master_data_2023', 'Sheet 2 : Pembanding 2023'),
        ])

        setKkCheckResults(results)
      } catch (error) {
        console.error("Error checking KK:", error)
      } finally {
        setIsCheckingKk(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [noKK, database])

  // Evaluasi Status Blacklist, Hold, dan 2026 dari hasil cek KK
  // Ketentuan:
  // Blokir pendaftaran jika ditemukan di:
  // - Sheet 4 : blacklist
  // - Sheet 3 : pembanding 2025
  // - Data pelaku usaha 2026
  const isKkBlacklisted = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "blacklist_data" || src.includes("BLACKLIST") || src.includes("SHEET 4")
    })
  }, [kkCheckResults])

  const isKkHold = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "master_data_2025" || src.includes("SHEET 3") || src.includes("2025")
    })
  }, [kkCheckResults])

  const isKkAlreadyRegistered = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "businessactors" || src.includes("2026") || src.includes("SUDAH TERDAFTAR")
    })
  }, [kkCheckResults])

  // Penentu apakah formulir isian lainnya akan ditutup otomatis (tidak bisa diisi)
  const isFormBlocked = isKkBlacklisted || isKkHold || isKkAlreadyRegistered

  const blockedSourcesLabel = useMemo(() => {
    const list: string[] = []
    if (isKkBlacklisted) list.push("Sheet 4 : Blacklist")
    if (isKkHold) list.push("Sheet 3 : Pembanding 2025")
    if (isKkAlreadyRegistered) list.push("Data Pelaku Usaha 2026")
    return list.join(" & ") || "Basis Data Terlarang"
  }, [isKkBlacklisted, isKkHold, isKkAlreadyRegistered])

  // Catatan riwayat Sheet 1 (2024) / Sheet 2 (2023) jika tidak ter-blacklist / hold / 2026
  // Jika tidak ditemukan atau hanya ditemukan di Sheet 1 & 2, aplikasi mengizinkan penginputan dilanjutkan
  const kkHistoryResults = useMemo(() => {
    if (isFormBlocked) return []
    return kkCheckResults.filter((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "master_data_2024" || tbl === "master_data_2023" || src.includes("SHEET 1") || src.includes("SHEET 2") || src.includes("2023") || src.includes("2024")
    })
  }, [kkCheckResults, isFormBlocked])

  // Otomatis kembalikan ke Step 1 jika terdeteksi blocked saat sedang berada di step 2 atau 3
  useEffect(() => {
    if (isFormBlocked && currentStep > 1) {
      setCurrentStep(1)
    }
  }, [isFormBlocked, currentStep])

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
    <div className="w-full max-w-5xl lg:max-w-6xl mx-auto space-y-4 sm:space-y-5 pb-16 animate-in fade-in duration-300">
      {/* Header Bar Kompak & Stepper Terpadu (Single Slim Row) */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:px-6 sm:py-3.5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 self-start md:self-center">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 h-8 w-8 sm:h-9 sm:w-9 shadow-xs shrink-0" />
          <div>
            <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug">
              Formulir Pendaftaran UMKM 2026
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-semibold mt-0.5">
              Yayasan Tunas Bangsa Kepulauan Riau
            </p>
          </div>
        </div>

        {/* Stepper Wizard Mini */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-stretch md:self-center justify-center">
          {/* Step 1 Pill */}
          <button
            type="button"
            onClick={() => goToStep(1)}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all",
              currentStep === 1
                ? "bg-primary text-white shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                : currentStep > 1
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            )}
          >
            <span className={cn(
              "w-4 h-4 sm:w-5 sm:h-5 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0",
              currentStep === 1 ? "bg-white/20 text-white" : currentStep > 1 ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            )}>
              {currentStep > 1 ? <Check className="w-3 h-3 stroke-[3]" /> : "1"}
            </span>
            <span>1. Biodata</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700 text-xs sm:text-sm font-bold">&rarr;</span>

          {/* Step 2 Pill */}
          <button
            type="button"
            onClick={() => goToStep(2)}
            disabled={isFormBlocked}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all",
              currentStep === 2
                ? "bg-primary text-white shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                : currentStep > 2
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                : isFormBlocked
                ? "bg-rose-50 text-rose-400 cursor-not-allowed border border-rose-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"
            )}
          >
            <span className={cn(
              "w-4 h-4 sm:w-5 sm:h-5 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0",
              currentStep === 2 ? "bg-white/20 text-white" : currentStep > 2 ? "bg-emerald-600 text-white" : isFormBlocked ? "bg-rose-200 text-rose-700" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            )}>
              {currentStep > 2 ? <Check className="w-3 h-3 stroke-[3]" /> : isFormBlocked ? <Lock className="w-2.5 h-2.5 text-rose-600" /> : "2"}
            </span>
            <span>2. Alamat</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700 text-xs sm:text-sm font-bold">&rarr;</span>

          {/* Step 3 Pill */}
          <button
            type="button"
            onClick={() => goToStep(3)}
            disabled={isFormBlocked}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all",
              currentStep === 3
                ? "bg-primary text-white shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                : isFormBlocked
                ? "bg-rose-50 text-rose-400 cursor-not-allowed border border-rose-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"
            )}
          >
            <span className={cn(
              "w-4 h-4 sm:w-5 sm:h-5 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black shrink-0",
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
          <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-md backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 py-3.5 sm:py-4 px-5 sm:px-7 md:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base md:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      1. Biodata Calon Penerima
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500 font-medium">
                      Identitas calon penerima sesuai KTP elektronik dan Kartu Keluarga
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-black tracking-wider uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none py-1 px-3 rounded-xl">
                  Langkah 1 Dari 3
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-7 md:p-8 space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2">
                {/* Nama Lengkap */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
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
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold tracking-wide border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                {/* Jenis Kelamin */}
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Jenis Kelamin <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={gender} onValueChange={setGender} required>
                    <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Jenis Kelamin..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Laki-laki" className="font-semibold text-xs sm:text-sm">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan" className="font-semibold text-xs sm:text-sm">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* NIK */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="nik" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      Nomor Induk Kependudukan (NIK) <span className="text-rose-500">*</span>
                    </Label>
                    <span className={cn(
                      "text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full",
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
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-mono font-bold tracking-wider border-slate-200 dark:border-slate-800"
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
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="noKK" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
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
                          className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 font-semibold"
                        >
                          <X className="w-3.5 h-3.5" /> Bersihkan
                        </button>
                      )}
                      <span className={cn(
                        "text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full",
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
                        "h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-mono font-bold tracking-wider transition-all",
                        isFormBlocked 
                          ? "border-rose-400 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 focus-visible:ring-rose-400" 
                          : noKK.length === 16 && !isCheckingKk && kkCheckResults.length === 0
                          ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100"
                          : "border-slate-200 dark:border-slate-800"
                      )}
                      onChange={(e) => setNoKK(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                    {isCheckingKk && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-spin" />
                      </div>
                    )}
                  </div>

                  {noKK.length > 0 && noKK.length < 16 && (
                    <p className="text-[11px] sm:text-xs text-slate-400 font-medium flex items-center gap-1 pl-1">
                      <Info className="w-3.5 h-3.5" />
                      Wajib 16 digit angka untuk validasi otomatis.
                    </p>
                  )}

                  {isCheckingKk && (
                    <div className="flex items-center gap-2.5 p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl sm:rounded-2xl border border-blue-200 text-xs sm:text-sm text-blue-700 font-semibold animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                      <span>Memvalidasi Nomor KK di basis data pembanding...</span>
                    </div>
                  )}

                  {/* HASIL PENGECEKAN KK */}
                  {!isCheckingKk && noKK.length === 16 && (
                    <div className="space-y-2 pt-1 animate-in fade-in">
                      {isFormBlocked && (
                        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-xs sm:text-sm">
                          <div className="flex items-start gap-2.5">
                            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="font-black text-rose-800 dark:text-rose-200 uppercase text-xs sm:text-sm block">
                                KESAMAAN NOMOR KK TERDETEKSI: {blockedSourcesLabel}
                              </span>
                              <p className="text-xs sm:text-[13px] text-rose-700 dark:text-rose-300 mt-1 leading-tight font-semibold">
                                Nomor KK ini dilarang mendaftar. Seluruh isian lainnya otomatis ditutup dan rincian lengkap datanya ditampilkan di bawah formulir.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!isFormBlocked && kkHistoryResults.length > 0 && (
                        <div className="p-3.5 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                          <div className="flex items-start gap-2.5">
                            <History className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="font-black text-amber-900 dark:text-amber-100 uppercase text-xs sm:text-sm block">
                                TERDATA RIWAYAT TAHUN SEBELUMNYA (DIIZINKAN LANJUT)
                              </span>
                              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 font-semibold">
                                Nomor KK terdata pada Sheet riwayat tahun 2024 / 2023. Penginputan diizinkan untuk dilanjutkan dan rincian lengkap riwayat dapat dilihat di bagian bawah formulir.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!isFormBlocked && kkCheckResults.length === 0 && (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 font-bold">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Nomor KK Bersih & Valid (Belum pernah terdaftar. Siap lanjut ke Langkah 2).</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* FORMULIR ISIAN LAINNYA DI LANGKAH 1 */}
                {isFormBlocked ? (
                  <div className="md:col-span-2 p-4 sm:p-5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs sm:text-sm uppercase tracking-wide text-rose-800 dark:text-rose-200">
                          Formulir Isian Lainnya Ditutup Otomatis
                        </h4>
                        <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed font-semibold">
                          Penginputan data ditutup karena Nomor KK terdeteksi terdapat kesamaan pada <span className="underline font-black">{blockedSourcesLabel}</span>. Kolom Tempat Lahir, Tanggal Lahir, Nomor HP, Alamat, dan Data Usaha dinonaktifkan dan ditutup.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Tempat Lahir */}
                    <div className="space-y-1.5">
                      <Label htmlFor="pob" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        Tempat Lahir <span className="text-rose-500">*</span>
                      </Label>
                      <Input 
                        id="pob" 
                        name="pob" 
                        placeholder="Contoh: TANJUNGPINANG" 
                        required 
                        value={pob}
                        disabled={isMonitoring || loading}
                        onChange={(e) => setPob(e.target.value)}
                        className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold tracking-wide border-slate-200 dark:border-slate-800 uppercase disabled:bg-slate-100"
                      />
                    </div>

                    {/* Tanggal Lahir */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="dob" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          Tanggal Lahir {isEditingDob ? "(Manual)" : "(Otomatis)"}
                        </Label>
                        <button
                          type="button"
                          onClick={() => setIsEditingDob(!isEditingDob)}
                          className="text-xs text-primary font-bold hover:underline"
                        >
                          {isEditingDob ? "Kunci" : "Edit Manual"}
                        </button>
                      </div>
                      <Input 
                        id="dob" 
                        name="dob" 
                        placeholder="DD-MM-YYYY" 
                        readOnly={!isEditingDob}
                        disabled={isMonitoring || loading}
                        required 
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className={cn(
                          "h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800",
                          !isEditingDob && "bg-slate-50 dark:bg-slate-800/50"
                        )}
                      />
                    </div>

                    {/* Nomor HP */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="phone" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
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
                        disabled={isMonitoring || loading}
                        className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800 disabled:bg-slate-100"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* ========================================================
                  DETAIL LENGKAP KESAMAAN / RIWAYAT DATA NOMOR KK
                 ======================================================== */}
              {kkCheckResults.length > 0 && !isCheckingKk && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3.5 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-sm",
                        isFormBlocked ? "bg-rose-600" : "bg-emerald-600"
                      )}>
                        {isFormBlocked ? <ShieldAlert className="w-5 h-5" /> : <History className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">
                          {isFormBlocked
                            ? `Detail Data Kesamaan Nomor KK (${kkCheckResults.length} Data Ditemukan - Formulir Ditutup)`
                            : `Detail Riwayat Nomor KK (${kkCheckResults.length} Data Ditemukan - Penginputan Diizinkan)`}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {isFormBlocked
                            ? "Nomor KK terdata pada basis data terlarang. Rincian lengkap seluruh datanya ditampilkan di bawah ini:"
                            : "Nomor KK terdata pada riwayat tahun sebelumnya. Penginputan tetap diizinkan dilanjutkan."}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "font-black text-xs uppercase tracking-wider px-3 py-1.5 rounded-xl self-start sm:self-auto shadow-none",
                        isFormBlocked 
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300" 
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                      )}
                    >
                      {isFormBlocked ? "⛔ Formulir Ditutup" : "✅ Penginputan Diizinkan"}
                    </Badge>
                  </div>

                  {/* Daftar Detail Lengkap Setiap Data */}
                  <div className="space-y-4">
                    {kkCheckResults.map((item, idx) => (
                      <KkDetailCard key={idx} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Navigasi Footer Langkah 1 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs sm:text-sm text-slate-500 font-medium">
                  {isFormBlocked ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Pendaftaran ditutup otomatis karena kesamaan Nomor KK ({blockedSourcesLabel}).
                    </span>
                  ) : (
                    "Langkah 1 dari 3: Lengkapi seluruh biodata pemohon."
                  )}
                </span>

                <Button
                  type="button"
                  onClick={() => goToStep(2)}
                  disabled={isFormBlocked || isCheckingKk}
                  className={cn(
                    "h-11 sm:h-12 text-xs sm:text-sm md:text-base font-bold shadow-md rounded-xl sm:rounded-2xl px-6 sm:px-8 transition-all min-w-[220px]",
                    isFormBlocked 
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none" 
                      : "bg-primary hover:bg-primary/95 text-white"
                  )}
                >
                  {isFormBlocked ? (
                    <>
                      <Lock className="w-4 h-4 mr-2 text-rose-500" />
                      <span>Formulir Terkunci (Tidak Dapat Dilanjutkan)</span>
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
        <div className={cn("space-y-4", currentStep !== 2 && "hidden")}>
          <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-md backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 py-3.5 sm:py-4 px-5 sm:px-7 md:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base md:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      2. Alamat & Lokasi Domisili
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500 font-medium">
                      Wilayah administrasi domisili tempat tinggal pemohon
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none py-1 px-3 rounded-xl">
                  Langkah 2 Dari 3
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-7 md:p-8 space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="address" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
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
                    className="rounded-xl sm:rounded-2xl min-h-[85px] sm:min-h-[105px] text-sm sm:text-base font-semibold border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rtRw" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    RT / RW <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="rtRw" 
                    name="rtRw" 
                    placeholder="Contoh: 001 / 002" 
                    required 
                    value={rtRw}
                    onChange={(e) => setRtRw(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="kelurahan" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Kelurahan <span className="text-rose-500">*</span>
                  </Label>
                  <Select 
                    value={kelurahan} 
                    onValueChange={setKelurahan} 
                    required 
                  >
                    <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Kelurahan..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px] rounded-xl">
                      {kelurahanList.map((k) => (
                        <SelectItem key={k} value={k} className="font-semibold text-xs sm:text-sm py-2">{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="kecamatan" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Kecamatan (Otomatis Sesuai Kelurahan)
                  </Label>
                  <Input 
                    id="kecamatan" 
                    name="kecamatan" 
                    value={kecamatan} 
                    readOnly 
                    placeholder="Terisi otomatis saat kelurahan dipilih"
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-bold bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200" 
                  />
                </div>
              </div>

              {/* Navigasi Footer Langkah 2 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep(1)}
                  className="h-11 sm:h-12 rounded-xl sm:rounded-2xl font-bold border-slate-200 dark:border-slate-800 text-xs sm:text-sm md:text-base px-5 sm:px-6 w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Kembali ke Biodata</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="h-11 sm:h-12 text-xs sm:text-sm md:text-base font-bold shadow-md rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/95 text-white px-6 sm:px-8 w-full sm:w-auto min-w-[220px]"
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
        <div className={cn("space-y-4", currentStep !== 3 && "hidden")}>
          <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-md backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 py-3.5 sm:py-4 px-5 sm:px-7 md:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Store className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base md:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      3. Data Usaha & Usulan Koordinator
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500 font-medium">
                      Legalitas usaha mikro dan pemilihan koordinator pengusul
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-black tracking-wider uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none py-1 px-3 rounded-xl">
                  Langkah 3 Dari 3
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-7 md:p-8 space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="businessCategory" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-primary" />
                    Jenis Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={businessCategory} onValueChange={setBusinessCategory} required>
                    <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Jenis Usaha..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Kuliner" className="font-semibold text-xs sm:text-sm py-2">Kuliner</SelectItem>
                      <SelectItem value="Bukan Kuliner" className="font-semibold text-xs sm:text-sm py-2">Bukan Kuliner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="businessName" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Nama Usaha / Produk <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="businessName" 
                    name="businessName" 
                    placeholder="Contoh: KERIPIK PISANG BERKAH" 
                    required 
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="businessLocation" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Lokasi Tempat Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="businessLocation" 
                    name="businessLocation" 
                    placeholder="Contoh: JL. MERDEKA NO. 10 (DEPAN PASAR)" 
                    required 
                    value={businessLocation}
                    onChange={(e) => setBusinessLocation(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="coordinator" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>USULAN (Koordinator Pendamping) <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-semibold normal-case">Sisa Kuota Terpantau Real-time</span>
                  </Label>
                  <Select 
                    value={selectedCoordinator} 
                    onValueChange={setSelectedCoordinator} 
                    required 
                  >
                    <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Usulan Koordinator..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-[280px]">
                      {availableCoordinators.filter(c => c.remaining > 0).map((c) => (
                        <SelectItem 
                          key={c.id} 
                          value={c.name} 
                          className="group focus:bg-primary focus:text-white data-[highlighted]:bg-primary data-[highlighted]:text-white rounded-lg my-0.5 text-xs sm:text-sm py-2"
                        >
                          <div className="flex justify-between items-center w-full min-w-[280px] sm:min-w-[340px] py-0.5">
                            <span className="font-bold group-focus:text-white group-data-[highlighted]:text-white">
                              {c.name}
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold bg-primary/10 text-primary group-focus:bg-white/20 group-focus:text-white px-2.5 py-0.5 rounded-full whitespace-nowrap">
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
              <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Rangkuman Data Sebelum Disimpan:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 text-[10px] sm:text-xs block">Nama Calon:</span>
                    <strong className="truncate block text-slate-800 dark:text-slate-200">{fullName || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] sm:text-xs block">NIK:</span>
                    <span className="font-mono font-bold truncate block">{nik || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] sm:text-xs block">Kelurahan:</span>
                    <strong className="truncate block">{kelurahan || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] sm:text-xs block">Koordinator:</span>
                    <strong className="truncate block text-primary">{selectedCoordinator || "-"}</strong>
                  </div>
                </div>
              </div>

              {/* Navigasi Footer Langkah 3 & Submit Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep(2)}
                  className="h-11 sm:h-12 rounded-xl sm:rounded-2xl font-bold border-slate-200 dark:border-slate-800 text-xs sm:text-sm md:text-base px-5 sm:px-6 w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Kembali ke Alamat</span>
                </Button>

                <Button 
                  type="submit" 
                  disabled={loading || isMonitoring || isFormBlocked} 
                  className={cn(
                    "h-11 sm:h-12 min-w-[220px] sm:min-w-[250px] text-xs sm:text-sm md:text-base font-bold shadow-md rounded-xl sm:rounded-2xl transition-all w-full sm:w-auto",
                    isFormBlocked 
                      ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none" 
                      : isMonitoring 
                      ? "bg-slate-400 cursor-not-allowed" 
                      : "bg-primary hover:bg-primary/95 text-white"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : isFormBlocked ? (
                    <>
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-rose-500" />
                      <span>Formulir Terkunci</span>
                    </>
                  ) : isMonitoring ? (
                    <span>Akses Monitoring</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
