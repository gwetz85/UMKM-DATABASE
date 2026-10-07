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
  X,
  Info,
  Check,
  ArrowRight,
  ArrowLeft,
  History,
  Camera,
  Briefcase,
  HeartHandshake,
  Search
} from "lucide-react"
import {
  cn,
  extractDobFromNik,
  extractGenderFromNik,
  formatCurrency,
  AGAMA_INDONESIA,
  STATUS_KELUARGA_LIST,
  PEKERJAAN_DUKCAPIL
} from "@/lib/utils"
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
  const srcUpper = (item._source || "").toUpperCase()
  const tblLower = (item._table || "").toLowerCase()

  const isLockedSource =
    tblLower === "blacklist_data" ||
    tblLower === "businessactors" ||
    srcUpper.includes("BLACKLIST") ||
    srcUpper.includes("SHEET 4") ||
    srcUpper.includes("2026") ||
    srcUpper.includes("PELAKU USAHA")

  const isSheet3Source =
    !isLockedSource &&
    (tblLower === "master_data_2025" || srcUpper.includes("SHEET 3") || srcUpper.includes("2025"))

  const sourceLabel = item._source || (
    tblLower === "blacklist_data" ? "Sheet 4 : Blacklist" :
    tblLower === "master_data_2025" ? "Sheet 3 : Pembanding 2025" :
    tblLower === "businessactors" ? "Pengajuan Terbaru 2026" :
    tblLower === "master_data_2024" ? "Sheet 1 : Pembanding 2024" :
    tblLower === "master_data_2023" ? "Sheet 2 : Pembanding 2023" : "Database"
  )

  const name = item.fullName || item.nama || item.NAMA || "-"
  const nik = item.nik || item.Nik || item.NIK || "-"
  const noKK = item.noKK || item.kk || item['NO KK'] || "-"
  const phone = item.phone || item.noHp || item.telepon || "-"
  const gender = item.gender || item.jenisKelamin || "-"
  const pobDob = item.pobDob || (item.pob && item.dob ? `${item.pob}, ${item.dob}` : item.dob || item.pob || "-")
  const businessName = item.businessName || item.usaha || item.USAHA || item.surveyData?.namaUsaha || "-"
  const businessCategory = item.businessCategory || item.kategori || item.sektor || item.surveyData?.bidangUsaha || "-"
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
      isLockedSource
        ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80"
        : isSheet3Source
        ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80"
        : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80"
    )}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/10 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn(
            "font-black text-xs px-2.5 py-1 rounded-xl uppercase tracking-wider shadow-none",
            isLockedSource
              ? "bg-rose-600 text-white hover:bg-rose-600"
              : isSheet3Source
              ? "bg-amber-600 text-white hover:bg-amber-600"
              : "bg-emerald-600 text-white hover:bg-emerald-600"
          )}>
            {sourceLabel}
          </Badge>
          <Badge variant="outline" className={cn(
            "font-bold text-[11px] px-2 py-0.5 rounded-lg uppercase",
            isLockedSource
              ? "border-rose-400 text-rose-700 dark:text-rose-300 bg-rose-100/50"
              : isSheet3Source
              ? "border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-100/60"
              : "border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-emerald-100/50"
          )}>
            {isLockedSource
              ? "⛔ Formulir Terkunci"
              : isSheet3Source
              ? "📸 Wajib Fhoto Pembanding"
              : "✅ Riwayat Diizinkan Lanjut"}
          </Badge>
          <span className="text-[11px] font-bold text-slate-500">
            Tahun: {tahun}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span>Status:</span>
          <span className={cn(
            "font-black px-2 py-0.5 rounded-md uppercase text-[11px]",
            isLockedSource
              ? "bg-rose-200/70 text-rose-800"
              : isSheet3Source
              ? "bg-amber-200/70 text-amber-900"
              : "bg-emerald-200/70 text-emerald-800"
          )}>
            {status}
          </span>
        </div>
      </div>

      {/* Grid Informasi Lengkap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Nama Lengkap</span>
          <strong className="text-xs sm:text-sm text-slate-900 dark:text-white block font-black uppercase truncate">{name}</strong>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">NIK</span>
          <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">{nik}</span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Nomor KK</span>
          <span className="font-mono font-bold text-xs text-primary block truncate">{noKK}</span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Nomor HP / WhatsApp</span>
          <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">{phone}</span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gender & TTL</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">{gender} • {pobDob}</span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Nama Usaha / Produk</span>
          <strong className="text-xs font-bold text-slate-800 dark:text-slate-100 block uppercase truncate">{businessName}</strong>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Kategori Usaha</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">{businessCategory}</span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Koordinator</span>
          <span className="font-bold text-xs text-primary block truncate">{coordinator}</span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5 sm:col-span-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Alamat Lengkap</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block line-clamp-1">{address}</span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">RT/RW • Kelurahan</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">RT/RW: {rtRw} • {kelurahan}</span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Kecamatan</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">{kecamatan}</span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Nominal Bantuan / LPJ</span>
          <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 block truncate">{nominalStr}</span>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Status LPJ</span>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">{statusLpj}</span>
        </div>

        {registrationCode !== "-" && (
          <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">No. Registrasi SIMPU</span>
            <span className="font-mono font-bold text-xs text-blue-600 block truncate">{registrationCode}</span>
          </div>
        )}

        {(petugasSurvey !== "-" || verifikatorDinas !== "-") && (
          <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5 sm:col-span-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Petugas Survey / Dinas</span>
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate">
              Surveyor: {petugasSurvey} • Dinas: {verifikatorDinas} ({hasilVerifikasiDinas})
            </span>
          </div>
        )}

        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Tanggal Terdata</span>
          <span className="font-medium text-xs text-slate-600 dark:text-slate-300 block truncate">{createdDate}</span>
        </div>
      </div>

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

  // Multi-step State (Tahapan 1, Tahapan 2, Tahapan 3, Tahapan 4)
  const [currentStep, setCurrentStep] = useState<number>(1)

  // ==========================================================
  // TAHAPAN 1: Nama, NIK, Nomor KK, & Fhoto Pembanding (jika Sheet 3)
  // ==========================================================
  const [fullName, setFullName] = useState("")
  const [nik, setNik] = useState("")
  const [noKK, setNoKK] = useState("")
  const [comparisonPhotoUrl, setComparisonPhotoUrl] = useState("")

  // ==========================================================
  // TAHAPAN 2: Data Pelaku Usaha (1 - 12)
  // ==========================================================
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan' | ''>("")
  const [pob, setPob] = useState("")
  const [dob, setDob] = useState("")
  const [isEditingDob, setIsEditingDob] = useState(false)
  const [phone, setPhone] = useState("")
  const [agama, setAgama] = useState("")
  const [pekerjaan, setPekerjaan] = useState("")
  const [pekerjaanSearch, setPekerjaanSearch] = useState("")
  const [address, setAddress] = useState("")
  const [rtRw, setRtRw] = useState("")
  const [kelurahan, setKelurahan] = useState<string>("")
  const [kecamatan, setKecamatan] = useState<string>("")
  const [tanggalCetakKtp, setTanggalCetakKtp] = useState("")

  // ==========================================================
  // TAHAPAN 3: Data Keluarga (13 - 21)
  // ==========================================================
  const [statusKeluarga, setStatusKeluarga] = useState("")
  const [namaKepalaKeluarga, setNamaKepalaKeluarga] = useState("")
  const [nikKepalaKeluarga, setNikKepalaKeluarga] = useState("")
  const [pobKepalaKeluarga, setPobKepalaKeluarga] = useState("")
  const [dobKepalaKeluarga, setDobKepalaKeluarga] = useState("")
  const [isEditingDobKK, setIsEditingDobKK] = useState(false)
  const [agamaKepalaKeluarga, setAgamaKepalaKeluarga] = useState("")
  const [pekerjaanKepalaKeluarga, setPekerjaanKepalaKeluarga] = useState("")
  const [pekerjaanKKSearch, setPekerjaanKKSearch] = useState("")
  const [tanggalCetakKk, setTanggalCetakKk] = useState("")

  // ==========================================================
  // TAHAPAN 4: Data Usaha (22 - 25)
  // ==========================================================
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

  // Use pre-calculated system_stats for coordinator usage
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

  const filteredPekerjaanPelaku = useMemo(() => {
    const q = pekerjaanSearch.trim().toLowerCase()
    if (!q) return PEKERJAAN_DUKCAPIL
    return PEKERJAAN_DUKCAPIL.filter((p) => p.toLowerCase().includes(q))
  }, [pekerjaanSearch])

  const filteredPekerjaanKK = useMemo(() => {
    const q = pekerjaanKKSearch.trim().toLowerCase()
    if (!q) return PEKERJAAN_DUKCAPIL
    return PEKERJAAN_DUKCAPIL.filter((p) => p.toLowerCase().includes(q))
  }, [pekerjaanKKSearch])

  // Otomatis tentukan Kecamatan berdasarkan Kelurahan (ketentuan form sebelumnya)
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

        // Cek juga di Database Aktif (Pengajuan Terbaru 2026) untuk cegah duplikasi KK
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
                    _source: 'Pengajuan Terbaru 2026',
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

  // Evaluasi Ketentuan Tahapan 1:
  // 1. Jika terdapat kecocokan di Sheet Blacklist dan Pengajuan Terbaru 2026 -> Terkunci (tidak bisa dilanjutkan)
  // 2. Jika terdapat kecocokan dengan Sheet 3 (Pembanding 2025) -> Tampilkan data + wajib isi Fhoto Pembanding sebelum lanjut
  // 3. Jika terdapat kecocokan dengan Sheet 1 (2024) dan Sheet 2 (2023) -> Tampilkan data lengkap dan pengisian bisa dilanjutkan
  const isKkBlacklisted = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "blacklist_data" || src.includes("BLACKLIST") || src.includes("SHEET 4")
    })
  }, [kkCheckResults])

  const isKkAlreadyRegistered = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "businessactors" || src.includes("2026") || src.includes("SUDAH TERDAFTAR")
    })
  }, [kkCheckResults])

  const isKkSheet3Match = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "master_data_2025" || src.includes("SHEET 3") || src.includes("2025")
    })
  }, [kkCheckResults])

  const isKkSheet1Or2Match = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "master_data_2024" || tbl === "master_data_2023" || src.includes("SHEET 1") || src.includes("SHEET 2") || src.includes("2024") || src.includes("2023")
    })
  }, [kkCheckResults])

  // Formulir terkunci HANYA jika cocok di Sheet Blacklist atau Pengajuan Terbaru 2026
  const isFormBlocked = isKkBlacklisted || isKkAlreadyRegistered

  const blockedSourcesLabel = useMemo(() => {
    const list: string[] = []
    if (isKkBlacklisted) list.push("Sheet Blacklist")
    if (isKkAlreadyRegistered) list.push("Pengajuan Terbaru 2026")
    return list.join(" & ") || "Basis Data Terkunci"
  }, [isKkBlacklisted, isKkAlreadyRegistered])

  // Otomatis kembalikan ke Tahapan 1 jika terdeteksi blocked saat sedang berada di tahapan 2/3/4
  useEffect(() => {
    if (isFormBlocked && currentStep > 1) {
      setCurrentStep(1)
    }
  }, [isFormBlocked, currentStep])

  // Handler upload & kompresi Fhoto Pembanding (untuk kecocokan Sheet 3 / 2025)
  const handleComparisonPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setComparisonPhotoUrl("")
      return
    }
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Format Tidak Didukung",
        description: "Harap unggah file gambar (JPG, PNG, WEBP)."
      })
      e.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height
        const MAX_DIM = 900
        if (width > height && width > MAX_DIM) {
          height *= MAX_DIM / width
          width = MAX_DIM
        } else if (height > MAX_DIM) {
          width *= MAX_DIM / height
          height = MAX_DIM
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)
        setComparisonPhotoUrl(canvas.toDataURL("image/jpeg", 0.65))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // ==========================================================
  // VALIDASI TIAP TAHAPAN
  // ==========================================================
  const validateStep1 = () => {
    if (isFormBlocked) {
      toast({
        variant: "destructive",
        title: "FORMULIR TERKUNCI",
        description: `Nomor KK terdaftar pada ${blockedSourcesLabel}. Pendaftaran tidak dapat dilanjutkan.`
      })
      return false
    }

    if (isCheckingKk) {
      toast({
        title: "Memeriksa Nomor KK",
        description: "Mohon tunggu sebentar, sistem sedang memeriksa Nomor KK di database."
      })
      return false
    }

    if (!fullName.trim()) {
      toast({ variant: "destructive", title: "Nama Belum Diisi", description: "Nama lengkap wajib diisi pada Tahapan 1." })
      return false
    }
    if (!nik || nik.length < 16) {
      toast({ variant: "destructive", title: "NIK Belum Lengkap", description: "NIK wajib 16 digit angka." })
      return false
    }
    if (!noKK || noKK.length < 16) {
      toast({ variant: "destructive", title: "Nomor KK Belum Lengkap", description: "Nomor Kartu Keluarga (KK) wajib 16 digit angka." })
      return false
    }
    if (isKkSheet3Match && !comparisonPhotoUrl) {
      toast({
        variant: "destructive",
        title: "Fhoto Pembanding Wajib Diisi",
        description: "Nomor KK terdaftar pada Sheet 3 (Pembanding 2025). Silakan unggah Fhoto Pembanding terlebih dahulu sebelum melanjutkan."
      })
      return false
    }

    return true
  }

  const validateStep2 = () => {
    if (!fullName.trim()) {
      toast({ variant: "destructive", title: "Nama Lengkap Kosong", description: "Nama Lengkap wajib diisi." })
      return false
    }
    if (!nik || nik.length < 16) {
      toast({ variant: "destructive", title: "NIK Belum Lengkap", description: "NIK wajib 16 digit angka." })
      return false
    }
    if (!pob.trim()) {
      toast({ variant: "destructive", title: "Tempat Lahir Belum Diisi", description: "Silakan isi Tempat Lahir pelaku usaha." })
      return false
    }
    if (!dob.trim()) {
      toast({ variant: "destructive", title: "Tanggal Lahir Belum Diisi", description: "Tanggal Lahir wajib terisi." })
      return false
    }
    if (!phone.trim()) {
      toast({ variant: "destructive", title: "Nomor WhatsApp Belum Diisi", description: "Nomor WhatsApp aktif wajib diisi." })
      return false
    }
    if (!agama) {
      toast({ variant: "destructive", title: "Agama Belum Dipilih", description: "Silakan pilih Agama pelaku usaha." })
      return false
    }
    if (!pekerjaan) {
      toast({ variant: "destructive", title: "Pekerjaan Belum Dipilih", description: "Silakan pilih Pekerjaan pelaku usaha." })
      return false
    }
    if (!address.trim()) {
      toast({ variant: "destructive", title: "Alamat Lengkap Belum Diisi", description: "Alamat lengkap domisili wajib diisi." })
      return false
    }
    if (!rtRw.trim()) {
      toast({ variant: "destructive", title: "RT/RW Belum Diisi", description: "Nomor RT/RW wajib diisi." })
      return false
    }
    if (!kelurahan) {
      toast({ variant: "destructive", title: "Kelurahan Belum Dipilih", description: "Silakan pilih Kelurahan domisili." })
      return false
    }
    if (!kecamatan) {
      toast({ variant: "destructive", title: "Kecamatan Belum Terisi", description: "Kecamatan otomatis terisi saat Kelurahan dipilih." })
      return false
    }
    if (!tanggalCetakKtp.trim()) {
      toast({ variant: "destructive", title: "Tanggal Cetak KTP Belum Diisi", description: "Silakan isi Tanggal Cetak KTP." })
      return false
    }

    return true
  }

  const validateStep3 = () => {
    if (!noKK || noKK.length < 16) {
      toast({ variant: "destructive", title: "Nomor KK Belum Lengkap", description: "Nomor KK wajib 16 digit angka." })
      return false
    }
    if (!statusKeluarga) {
      toast({ variant: "destructive", title: "Status Keluarga Belum Dipilih", description: "Pilih Status Keluarga (Kepala Keluarga, Suami, Istri, atau Anak)." })
      return false
    }
    if (!namaKepalaKeluarga.trim()) {
      toast({ variant: "destructive", title: "Nama Kepala Keluarga Belum Diisi", description: "Silakan isi Nama Kepala Keluarga." })
      return false
    }
    if (!nikKepalaKeluarga || nikKepalaKeluarga.length < 16) {
      toast({ variant: "destructive", title: "NIK Kepala Keluarga Belum Lengkap", description: "NIK Kepala Keluarga wajib 16 digit angka." })
      return false
    }
    if (!pobKepalaKeluarga.trim()) {
      toast({ variant: "destructive", title: "Tempat Lahir Kepala Keluarga Belum Diisi", description: "Silakan isi Tempat Lahir Kepala Keluarga." })
      return false
    }
    if (!dobKepalaKeluarga.trim()) {
      toast({ variant: "destructive", title: "Tanggal Lahir Kepala Keluarga Belum Diisi", description: "Tanggal Lahir Kepala Keluarga wajib diisi." })
      return false
    }
    if (!agamaKepalaKeluarga) {
      toast({ variant: "destructive", title: "Agama Kepala Keluarga Belum Dipilih", description: "Silakan pilih Agama Kepala Keluarga." })
      return false
    }
    if (!pekerjaanKepalaKeluarga) {
      toast({ variant: "destructive", title: "Pekerjaan Kepala Keluarga Belum Dipilih", description: "Silakan pilih Pekerjaan Kepala Keluarga." })
      return false
    }
    if (!tanggalCetakKk.trim()) {
      toast({ variant: "destructive", title: "Tanggal Cetak KK Belum Diisi", description: "Silakan isi Tanggal Cetak di Kartu Keluarga." })
      return false
    }

    return true
  }

  const validateStep4 = () => {
    if (!businessCategory) {
      toast({ variant: "destructive", title: "Jenis Usaha Belum Dipilih", description: "Pilih Jenis Usaha (Kuliner atau Non Kuliner)." })
      return false
    }
    if (!businessName.trim()) {
      toast({ variant: "destructive", title: "Nama Usaha Belum Diisi", description: "Nama Usaha wajib diisi." })
      return false
    }
    if (!businessLocation.trim()) {
      toast({ variant: "destructive", title: "Alamat Usaha Belum Diisi", description: "Alamat Usaha wajib diisi." })
      return false
    }
    if (!selectedCoordinator) {
      toast({ variant: "destructive", title: "Usulan Koordinator Belum Dipilih", description: "Silakan pilih Usulan Koordinator yang kuotanya masih tersedia." })
      return false
    }

    return true
  }

  // Navigasi antar Tahapan
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
    if (targetStep === 4) {
      if (validateStep1() && validateStep2() && validateStep3()) {
        setCurrentStep(4)
      }
      return
    }
  }

  // Auto-fill cerdas saat Status Keluarga dipilih "Kepala Keluarga"
  const handleStatusKeluargaChange = (val: string) => {
    setStatusKeluarga(val)
    if (val === "Kepala Keluarga") {
      if (!namaKepalaKeluarga.trim() && fullName.trim()) setNamaKepalaKeluarga(fullName.trim())
      if (!nikKepalaKeluarga && nik.length === 16) setNikKepalaKeluarga(nik)
      if (!pobKepalaKeluarga.trim() && pob.trim()) setPobKepalaKeluarga(pob.trim())
      if (!dobKepalaKeluarga.trim() && dob.trim()) setDobKepalaKeluarga(dob.trim())
      if (!agamaKepalaKeluarga && agama) setAgamaKepalaKeluarga(agama)
      if (!pekerjaanKepalaKeluarga && pekerjaan) setPekerjaanKepalaKeluarga(pekerjaan)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !database) return

    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) {
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
          description: `NIK atau Nomor KK ini sudah terdaftar di Pengajuan 2026 dengan Nomor Registrasi: ${duplicateInActors.registrationCode || '-'} dan Koordinator: ${duplicateInActors.coordinator || '-'}`
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
      const resolvedGender = gender || extractGenderFromNik(nikValue) || "Laki-laki"

      const data: Record<string, any> = {
        ownerId: user.uid,
        createdBy: currentUserProfile?.fullName || user.email?.split('@')[0] || "Unknown",
        fullName: fullName.trim().toUpperCase(),
        nik: nikValue,
        noKK: kkValue,
        registrationCode: registrationCode,
        pobDob: `${pob.trim().toUpperCase()}, ${dob.trim()}`,
        pob: pob.trim().toUpperCase(),
        dob: dob.trim(),
        gender: resolvedGender,
        phone: phone.trim(),
        agama: agama,
        pekerjaan: pekerjaan,
        address: address.trim().toUpperCase(),
        rtRw: rtRw.trim().toUpperCase(),
        kelurahan: kelurahan,
        kecamatan: kecamatan,
        tanggalCetakKtp: tanggalCetakKtp.trim(),
        // Data Keluarga (Tahapan 3)
        statusKeluarga: statusKeluarga,
        namaKepalaKeluarga: namaKepalaKeluarga.trim().toUpperCase(),
        nikKepalaKeluarga: nikKepalaKeluarga.trim(),
        pobKepalaKeluarga: pobKepalaKeluarga.trim().toUpperCase(),
        dobKepalaKeluarga: dobKepalaKeluarga.trim(),
        pobDobKepalaKeluarga: `${pobKepalaKeluarga.trim().toUpperCase()}, ${dobKepalaKeluarga.trim()}`,
        agamaKepalaKeluarga: agamaKepalaKeluarga,
        pekerjaanKepalaKeluarga: pekerjaanKepalaKeluarga,
        tanggalCetakKk: tanggalCetakKk.trim(),
        // Data Usaha (Tahapan 4)
        businessCategory: businessCategory,
        businessName: businessName.trim().toUpperCase(),
        businessLocation: businessLocation.trim().toUpperCase(),
        coordinator: finalCoordinator,
        comparisonPhotoUrl: comparisonPhotoUrl || null,
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

      // Reset seluruh state
      setFullName("")
      setGender("")
      setNik("")
      setNoKK("")
      setComparisonPhotoUrl("")
      setPob("")
      setDob("")
      setIsEditingDob(false)
      setPhone("")
      setAgama("")
      setPekerjaan("")
      setAddress("")
      setRtRw("")
      setKelurahan("")
      setKecamatan("")
      setTanggalCetakKtp("")
      setStatusKeluarga("")
      setNamaKepalaKeluarga("")
      setNikKepalaKeluarga("")
      setPobKepalaKeluarga("")
      setDobKepalaKeluarga("")
      setIsEditingDobKK(false)
      setAgamaKepalaKeluarga("")
      setPekerjaanKepalaKeluarga("")
      setTanggalCetakKk("")
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

  const stepsInfo = [
    { step: 1, title: "Tahapan 1", subtitle: "Cek KK & NIK" },
    { step: 2, title: "Tahapan 2", subtitle: "Data Pelaku Usaha" },
    { step: 3, title: "Tahapan 3", subtitle: "Data Keluarga" },
    { step: 4, title: "Tahapan 4", subtitle: "Data Usaha" },
  ]

  return (
    <div className="w-full max-w-5xl lg:max-w-6xl mx-auto space-y-4 sm:space-y-5 pb-16 animate-in fade-in duration-300">
      {/* Header Bar & 4-Step Wizard */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:px-6 sm:py-4 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 h-8 w-8 sm:h-9 sm:w-9 shadow-xs shrink-0" />
          <div>
            <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug">
              Formulir Pendaftaran UMKM 2026
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-semibold mt-0.5">
              4 Tahapan Verifikasi & Pengisian Data Pelaku Usaha
            </p>
          </div>
        </div>

        {/* Stepper Wizard 4 Tahapan */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto">
          {stepsInfo.map((s, idx) => {
            const isActive = currentStep === s.step
            const isCompleted = currentStep > s.step
            const isLocked = s.step > 1 && (isFormBlocked || (isKkSheet3Match && !comparisonPhotoUrl))

            return (
              <div key={s.step} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToStep(s.step)}
                  disabled={s.step > 1 && isFormBlocked}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl sm:rounded-2xl font-bold text-xs transition-all w-full sm:w-auto text-left",
                    isActive
                      ? "bg-primary text-white shadow-sm ring-2 ring-primary/20 scale-[1.01]"
                      : isCompleted
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                      : isLocked
                      ? "bg-rose-50 dark:bg-rose-950/30 text-rose-400 cursor-not-allowed border border-rose-200 dark:border-rose-800"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200/80"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                    isActive
                      ? "bg-white/20 text-white"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : isLocked
                      ? "bg-rose-200 dark:bg-rose-900 text-rose-700 dark:text-rose-200"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  )}>
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : isLocked ? <Lock className="w-2.5 h-2.5" /> : s.step}
                  </span>
                  <div className="leading-tight">
                    <span className="block text-[10px] uppercase tracking-wider opacity-80">{s.title}</span>
                    <span className="block text-[11px] font-black truncate">{s.subtitle}</span>
                  </div>
                </button>
                {idx < stepsInfo.length - 1 && (
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-700 text-xs font-bold">&rarr;</span>
                )}
              </div>
            )
          })}
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
          if (e.key === "Enter" && currentStep < 4) {
            e.preventDefault()
            goToStep(currentStep + 1)
          }
        }}
        className="space-y-4"
      >
        {/* ========================================================
            TAHAPAN 1: INPUT NAMA, NIK, NOMOR KK & CEK DATABASE
           ======================================================== */}
        <div className={cn("space-y-4", currentStep !== 1 && "hidden")}>
          <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-md backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 py-3.5 sm:py-4 px-5 sm:px-7 md:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base md:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
                      Tahapan 1: Pengecekan Identitas & Nomor KK
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500 font-medium">
                      Input Nama, NIK, dan Nomor Kartu Keluarga (KK) untuk pengecekan otomatis di Sheet Pembanding & Pengajuan 2026
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-black tracking-wider uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none py-1 px-3 rounded-xl">
                  Tahapan 1 Dari 4
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-7 md:p-8 space-y-5 sm:space-y-6">
              <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2">
                {/* Nama Lengkap */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="fullName" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="Masukkan Nama Lengkap Sesuai KTP..."
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold tracking-wide border-slate-200 dark:border-slate-800 uppercase"
                  />
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
                        const extractedDob = extractDobFromNik(cleanNik)
                        if (extractedDob && !isEditingDob) {
                          setDob(extractedDob)
                        }
                        const extractedGender = extractGenderFromNik(cleanNik)
                        if (extractedGender) {
                          setGender(extractedGender)
                        }
                      } else if (!isEditingDob) {
                        setDob("")
                      }
                    }}
                  />
                </div>

                {/* Nomor KK + Pengecekan Otomatis */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="noKK" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Nomor Kartu Keluarga (Nomor KK) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      {noKK.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNoKK("")
                            setKkCheckResults([])
                            setComparisonPhotoUrl("")
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
                          : isKkSheet3Match
                          ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100"
                          : noKK.length === 16 && !isCheckingKk
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
                </div>
              </div>

              {/* Status Pengecekan Nomor KK */}
              {noKK.length > 0 && noKK.length < 16 && (
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium flex items-center gap-1 pl-1">
                  <Info className="w-3.5 h-3.5" />
                  Masukkan 16 digit Nomor KK untuk melakukan pengecekan database otomatis.
                </p>
              )}

              {isCheckingKk && (
                <div className="flex items-center gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 text-xs sm:text-sm text-blue-700 font-semibold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                  <span>Memeriksa Nomor KK di Sheet 1, Sheet 2, Sheet 3, Blacklist, dan Pengajuan 2026...</span>
                </div>
              )}

              {!isCheckingKk && noKK.length === 16 && (
                <div className="space-y-4 pt-1 animate-in fade-in">
                  {/* KONDISI 1: Cocok di Sheet Blacklist atau Pengajuan Terbaru 2026 -> Terkunci */}
                  {isFormBlocked && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-xs sm:text-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-black text-rose-800 dark:text-rose-200 uppercase text-xs sm:text-sm block">
                            FORMULIR TERKUNCI — DITEMUKAN PADA: {blockedSourcesLabel}
                          </span>
                          <p className="text-xs sm:text-[13px] text-rose-700 dark:text-rose-300 mt-1 leading-relaxed font-semibold">
                            Sesuai ketentuan, Nomor Kartu Keluarga (KK) yang terdaftar di <strong>Sheet Blacklist</strong> atau <strong>Pengajuan Terbaru 2026</strong> tidak dapat dilanjutkan ke tahapan berikutnya.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KONDISI 2: Cocok di Sheet 3 (Pembanding 2025) -> Tampilkan Data + Wajib Input Fhoto Pembanding */}
                  {!isFormBlocked && isKkSheet3Match && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          <Camera className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-black text-amber-900 dark:text-amber-100 uppercase text-xs sm:text-sm block">
                            TERDETEKSI PADA SHEET 3 (PEMBANDING 2025) — WAJIB UPLOAD FHOTO PEMBANDING
                          </span>
                          <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed font-semibold">
                            Nomor KK ini terdaftar pada Sheet 3 (Pembanding 2025). Silakan periksa rincian data di bawah dan <strong>unggah Fhoto Pembanding</strong> terlebih dahulu sebelum melanjutkan ke Tahapan 2.
                          </p>
                        </div>
                      </div>

                      {/* Form Penginputan Fhoto Pembanding */}
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800/80 space-y-3">
                        <Label className="text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <Camera className="w-4 h-4 text-amber-600" />
                          Upload Fhoto Pembanding (Wajib Sebelum Lanjut) <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleComparisonPhotoChange}
                          className="h-11 bg-slate-50 dark:bg-slate-800 border-amber-300 dark:border-amber-700 cursor-pointer"
                        />
                        {comparisonPhotoUrl ? (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={comparisonPhotoUrl}
                                alt="Preview Fhoto Pembanding"
                                className="w-16 h-16 object-cover rounded-lg border-2 border-emerald-300 shadow-sm"
                              />
                              <div>
                                <span className="text-xs font-black text-emerald-800 dark:text-emerald-200 uppercase block">
                                  ✅ Fhoto Pembanding Berhasil Diunggah
                                </span>
                                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                  Anda sekarang dapat melanjutkan pengisian ke Tahapan 2.
                                </span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setComparisonPhotoUrl("")}
                              className="text-xs border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl"
                            >
                              Hapus Foto
                            </Button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                            ⚠️ Tombol lanjut ke Tahapan 2 akan terbuka setelah Fhoto Pembanding diunggah.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* KONDISI 3: Cocok di Sheet 1 & Sheet 2 -> Tampilkan Data Lengkap & Bisa Lanjut */}
                  {!isFormBlocked && !isKkSheet3Match && isKkSheet1Or2Match && (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs sm:text-sm text-emerald-900 dark:text-emerald-100">
                      <div className="flex items-start gap-2.5">
                        <History className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="font-black uppercase text-xs sm:text-sm block">
                            TERDATA PADA SHEET 1 / SHEET 2 (DIIZINKAN LANJUT)
                          </span>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5 font-semibold">
                            Data riwayat ditemukan pada Sheet 1 (2024) / Sheet 2 (2023) dan ditampilkan lengkap di bawah ini. Pengisian formulir dapat dilanjutkan ke Tahapan 2.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KONDISI 4: Bersih / Tidak Ditemukan di Sheet Manapun */}
                  {!isFormBlocked && kkCheckResults.length === 0 && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 font-bold">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Nomor KK Bersih & Valid (Tidak ditemukan di Sheet Pembanding maupun Pengajuan 2026. Siap lanjut ke Tahapan 2).</span>
                    </div>
                  )}

                  {/* TAMPILKAN DATA LENGKAP JIKA DITEMUKAN DI DATABASE */}
                  {kkCheckResults.length > 0 && (
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2.5">
                          <History className="w-5 h-5 text-primary shrink-0" />
                          <div>
                            <h3 className="text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-white">
                              Hasil Pengecekan Database Nomor KK ({kkCheckResults.length} Data Ditemukan)
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Rincian lengkap data yang cocok berdasarkan Nomor Kartu Keluarga (KK):
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3.5">
                        {kkCheckResults.map((item, idx) => (
                          <KkDetailCard key={idx} item={item} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Navigasi Tahapan 1 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs sm:text-sm text-slate-500 font-medium">
                  {isFormBlocked ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Formulir terkunci karena ditemukan pada {blockedSourcesLabel}.
                    </span>
                  ) : isKkSheet3Match && !comparisonPhotoUrl ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Unggah Fhoto Pembanding terlebih dahulu untuk melanjutkan.
                    </span>
                  ) : (
                    "Tahapan 1 dari 4: Pastikan Nama, NIK, dan Nomor KK sudah benar."
                  )}
                </span>

                <Button
                  type="button"
                  onClick={() => goToStep(2)}
                  disabled={isFormBlocked || isCheckingKk || (isKkSheet3Match && !comparisonPhotoUrl)}
                  className={cn(
                    "h-11 sm:h-12 text-xs sm:text-sm font-bold shadow-md rounded-xl sm:rounded-2xl px-6 sm:px-8 transition-all min-w-[240px]",
                    isFormBlocked || (isKkSheet3Match && !comparisonPhotoUrl)
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-primary hover:bg-primary/95 text-white"
                  )}
                >
                  {isFormBlocked ? (
                    <>
                      <Lock className="w-4 h-4 mr-2 text-rose-500" />
                      <span>Formulir Terkunci</span>
                    </>
                  ) : isKkSheet3Match && !comparisonPhotoUrl ? (
                    <>
                      <Camera className="w-4 h-4 mr-2 text-amber-500" />
                      <span>Wajib Upload Fhoto Pembanding</span>
                    </>
                  ) : (
                    <>
                      <span>Lanjut ke Tahapan 2: Data Pelaku Usaha</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================
            TAHAPAN 2: PENGISIAN DATA PELAKU USAHA (1 - 12)
           ======================================================== */}
        <div className={cn("space-y-4", currentStep !== 2 && "hidden")}>
          <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-md backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 py-3.5 sm:py-4 px-5 sm:px-7 md:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base md:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
                      Tahapan 2: Pengisian Data Pelaku Usaha
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500 font-medium">
                      Lengkapi seluruh data identitas KTP dan domisili pelaku usaha (Poin 1 s/d 12 wajib diisi)
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none py-1 px-3 rounded-xl">
                  Tahapan 2 Dari 4
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-7 md:p-8 space-y-5 sm:space-y-6">
              <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2">
                {/* 1. Nama Lengkap (menampilkan yang diisikan di Tahapan 1) */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">1</span>
                    Nama Lengkap (Dari Tahapan 1) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-bold bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                {/* 2. Nomor Induk Kependudukan (menampilkan yang diisikan di Tahapan 1) */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">2</span>
                    Nomor Induk Kependudukan / NIK (Dari Tahapan 1) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={nik}
                    readOnly
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-mono font-bold bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* 3. Tempat Lahir */}
                <div className="space-y-1.5">
                  <Label htmlFor="pob" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">3</span>
                    Tempat Lahir <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="pob"
                    placeholder="Contoh: TANJUNGPINANG"
                    value={pob}
                    onChange={(e) => setPob(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                {/* 4. Tanggal Lahir (Generated otomatis dan Edit Manual) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="dob" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">4</span>
                      Tanggal Lahir {isEditingDob ? "(Edit Manual)" : "(Otomatis dari NIK)"} <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsEditingDob(!isEditingDob)}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      {isEditingDob ? "Kunci Otomatis" : "Edit Manual"}
                    </button>
                  </div>
                  <Input
                    id="dob"
                    placeholder="DD-MM-YYYY"
                    readOnly={!isEditingDob}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={cn(
                      "h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800",
                      !isEditingDob && "bg-slate-100 dark:bg-slate-800/70"
                    )}
                  />
                </div>

                {/* 5. Nomor Whatsapp */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">5</span>
                    Nomor WhatsApp <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="Contoh: 081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-mono font-bold border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* 6. Agama */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">6</span>
                    Agama <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={agama} onValueChange={setAgama}>
                    <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Agama..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {AGAMA_INDONESIA.map((ag) => (
                        <SelectItem key={ag} value={ag} className="font-semibold text-xs sm:text-sm py-2">
                          {ag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 7. Pekerjaan (Seluruh Pekerjaan Data Kependudukan Indonesia) */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">7</span>
                    Pekerjaan (Sesuai KTP / Data Kependudukan Indonesia) <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={pekerjaan} onValueChange={setPekerjaan}>
                    <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Pekerjaan Sesuai KTP..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] rounded-xl">
                      <div className="p-2 sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            placeholder="Cari pekerjaan..."
                            value={pekerjaanSearch}
                            onChange={(e) => setPekerjaanSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="h-8 pl-8 text-xs rounded-lg"
                          />
                        </div>
                      </div>
                      {filteredPekerjaanPelaku.map((pk) => (
                        <SelectItem key={pk} value={pk} className="font-semibold text-xs sm:text-sm py-2">
                          {pk}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 8. Alamat Lengkap */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="address" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">8</span>
                    Alamat Lengkap <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Masukkan jalan, gang, atau nomor rumah lengkap sesuai KTP..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="rounded-xl sm:rounded-2xl min-h-[80px] text-sm sm:text-base font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                {/* 9. RT/RW */}
                <div className="space-y-1.5">
                  <Label htmlFor="rtRw" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">9</span>
                    RT / RW <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="rtRw"
                    placeholder="Contoh: 001 / 002"
                    value={rtRw}
                    onChange={(e) => setRtRw(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                {/* 10. Kelurahan */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">10</span>
                    Kelurahan <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={kelurahan} onValueChange={setKelurahan}>
                    <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Kelurahan..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px] rounded-xl">
                      {kelurahanList.map((k) => (
                        <SelectItem key={k} value={k} className="font-semibold text-xs sm:text-sm py-2">
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 11. Kecamatan (Otomatis Sesuai Kelurahan) */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">11</span>
                    Kecamatan (Otomatis Sesuai Kelurahan) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={kecamatan}
                    readOnly
                    placeholder="Terisi otomatis saat Kelurahan dipilih"
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-primary"
                  />
                </div>

                {/* 12. Tanggal Cetak KTP */}
                <div className="space-y-1.5">
                  <Label htmlFor="tanggalCetakKtp" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">12</span>
                    Tanggal Cetak KTP <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="tanggalCetakKtp"
                    type="date"
                    value={tanggalCetakKtp}
                    onChange={(e) => setTanggalCetakKtp(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Footer Navigasi Tahapan 2 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep(1)}
                  className="h-11 sm:h-12 rounded-xl sm:rounded-2xl font-bold border-slate-200 dark:border-slate-800 text-xs sm:text-sm px-5 sm:px-6 w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Kembali ke Tahapan 1</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="h-11 sm:h-12 text-xs sm:text-sm font-bold shadow-md rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/95 text-white px-6 sm:px-8 w-full sm:w-auto min-w-[240px]"
                >
                  <span>Lanjut ke Tahapan 3: Data Keluarga</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================
            TAHAPAN 3: PENGISIAN DATA KELUARGA (13 - 21)
           ======================================================== */}
        <div className={cn("space-y-4", currentStep !== 3 && "hidden")}>
          <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-md backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 py-3.5 sm:py-4 px-5 sm:px-7 md:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base md:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
                      Tahapan 3: Pengisian Data Keluarga
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500 font-medium">
                      Lengkapi data Kartu Keluarga (KK) dan identitas Kepala Keluarga (Poin 13 s/d 21 wajib diisi)
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-black tracking-wider uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border-none py-1 px-3 rounded-xl">
                  Tahapan 3 Dari 4
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-7 md:p-8 space-y-5 sm:space-y-6">
              <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2">
                {/* 13. Nomor Kartu Keluarga (menampilkan data di Tahapan 1) */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">13</span>
                    Nomor Kartu Keluarga / Nomor KK (Dari Tahapan 1) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={noKK}
                    readOnly
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-mono font-bold bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-primary"
                  />
                </div>

                {/* 14. Status Keluarga */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">14</span>
                    Status Keluarga <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={statusKeluarga} onValueChange={handleStatusKeluargaChange}>
                    <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Status Keluarga..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {STATUS_KELUARGA_LIST.map((st) => (
                        <SelectItem key={st} value={st} className="font-semibold text-xs sm:text-sm py-2">
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 15. Nama Kepala Keluarga */}
                <div className="space-y-1.5">
                  <Label htmlFor="namaKepalaKeluarga" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">15</span>
                    Nama Kepala Keluarga <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="namaKepalaKeluarga"
                    placeholder="Masukkan Nama Kepala Keluarga..."
                    value={namaKepalaKeluarga}
                    onChange={(e) => setNamaKepalaKeluarga(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                {/* 16. Nomor Induk Kependudukan (Kepala Keluarga) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="nikKepalaKeluarga" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">16</span>
                      NIK (Kepala Keluarga) <span className="text-rose-500">*</span>
                    </Label>
                    <span className={cn(
                      "text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full",
                      nikKepalaKeluarga.length === 16 ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      {nikKepalaKeluarga.length} / 16 DIGIT
                    </span>
                  </div>
                  <Input
                    id="nikKepalaKeluarga"
                    maxLength={16}
                    placeholder="Masukkan 16 digit NIK Kepala Keluarga..."
                    value={nikKepalaKeluarga}
                    onChange={(e) => {
                      const cleanNikKK = e.target.value.replace(/[^0-9]/g, "")
                      setNikKepalaKeluarga(cleanNikKK)
                      if (cleanNikKK.length >= 12) {
                        const extracted = extractDobFromNik(cleanNikKK)
                        if (extracted && !isEditingDobKK) {
                          setDobKepalaKeluarga(extracted)
                        }
                      } else if (!isEditingDobKK) {
                        setDobKepalaKeluarga("")
                      }
                    }}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-mono font-bold tracking-wider border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* 17. Tempat Lahir (Kepala Keluarga) */}
                <div className="space-y-1.5">
                  <Label htmlFor="pobKepalaKeluarga" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">17</span>
                    Tempat Lahir (Kepala Keluarga) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="pobKepalaKeluarga"
                    placeholder="Contoh: TANJUNGPINANG"
                    value={pobKepalaKeluarga}
                    onChange={(e) => setPobKepalaKeluarga(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                {/* 18. Tanggal Lahir (Kepala Keluarga) - Generated otomatis dan Edit Manual */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="dobKepalaKeluarga" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">18</span>
                      Tanggal Lahir (Kepala Keluarga) {isEditingDobKK ? "(Edit Manual)" : "(Otomatis)"} <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsEditingDobKK(!isEditingDobKK)}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      {isEditingDobKK ? "Kunci Otomatis" : "Edit Manual"}
                    </button>
                  </div>
                  <Input
                    id="dobKepalaKeluarga"
                    placeholder="DD-MM-YYYY"
                    readOnly={!isEditingDobKK}
                    value={dobKepalaKeluarga}
                    onChange={(e) => setDobKepalaKeluarga(e.target.value)}
                    className={cn(
                      "h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800",
                      !isEditingDobKK && "bg-slate-100 dark:bg-slate-800/70"
                    )}
                  />
                </div>

                {/* 19. Agama (Kepala Keluarga) */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">19</span>
                    Agama (Kepala Keluarga) <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={agamaKepalaKeluarga} onValueChange={setAgamaKepalaKeluarga}>
                    <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Agama Kepala Keluarga..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {AGAMA_INDONESIA.map((ag) => (
                        <SelectItem key={ag} value={ag} className="font-semibold text-xs sm:text-sm py-2">
                          {ag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 20. Pekerjaan Kepala Keluarga */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">20</span>
                    Pekerjaan Kepala Keluarga <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={pekerjaanKepalaKeluarga} onValueChange={setPekerjaanKepalaKeluarga}>
                    <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Pekerjaan Kepala Keluarga..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] rounded-xl">
                      <div className="p-2 sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            placeholder="Cari pekerjaan..."
                            value={pekerjaanKKSearch}
                            onChange={(e) => setPekerjaanKKSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="h-8 pl-8 text-xs rounded-lg"
                          />
                        </div>
                      </div>
                      {filteredPekerjaanKK.map((pk) => (
                        <SelectItem key={pk} value={pk} className="font-semibold text-xs sm:text-sm py-2">
                          {pk}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 21. Tanggal Cetak di Kartu Keluarga */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="tanggalCetakKk" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">21</span>
                    Tanggal Cetak di Kartu Keluarga <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="tanggalCetakKk"
                    type="date"
                    value={tanggalCetakKk}
                    onChange={(e) => setTanggalCetakKk(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Footer Navigasi Tahapan 3 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep(2)}
                  className="h-11 sm:h-12 rounded-xl sm:rounded-2xl font-bold border-slate-200 dark:border-slate-800 text-xs sm:text-sm px-5 sm:px-6 w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Kembali ke Tahapan 2</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="h-11 sm:h-12 text-xs sm:text-sm font-bold shadow-md rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/95 text-white px-6 sm:px-8 w-full sm:w-auto min-w-[240px]"
                >
                  <span>Lanjut ke Tahapan 4: Data Usaha</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================
            TAHAPAN 4: PENGISIAN DATA USAHA (22 - 25)
           ======================================================== */}
        <div className={cn("space-y-4", currentStep !== 4 && "hidden")}>
          <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-md backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 py-3.5 sm:py-4 px-5 sm:px-7 md:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Store className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base md:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
                      Tahapan 4: Pengisian Data Usaha
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500 font-medium">
                      Lengkapi Jenis Usaha, Nama Usaha, Alamat Usaha, dan Usulan Koordinator (Poin 22 s/d 25 wajib diisi)
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-black tracking-wider uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none py-1 px-3 rounded-xl">
                  Tahapan 4 Dari 4
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-7 md:p-8 space-y-5 sm:space-y-6">
              <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2">
                {/* 22. Jenis Usaha : Drop menu : Kuliner atau Non Kuliner */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">22</span>
                    Jenis Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={businessCategory} onValueChange={setBusinessCategory}>
                    <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih Jenis Usaha..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Kuliner" className="font-semibold text-xs sm:text-sm py-2">Kuliner</SelectItem>
                      <SelectItem value="Non Kuliner" className="font-semibold text-xs sm:text-sm py-2">Non Kuliner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 23. Nama Usaha */}
                <div className="space-y-1.5">
                  <Label htmlFor="businessName" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">23</span>
                    Nama Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="Contoh: KERIPIK PISANG BERKAH"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                {/* 24. Alamat Usaha */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="businessLocation" className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">24</span>
                    Alamat Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="businessLocation"
                    placeholder="Contoh: JL. MERDEKA NO. 10 (DEPAN PASAR)"
                    value={businessLocation}
                    onChange={(e) => setBusinessLocation(e.target.value)}
                    className="h-11 sm:h-12 text-sm sm:text-base rounded-xl sm:rounded-2xl font-semibold border-slate-200 dark:border-slate-800 uppercase"
                  />
                </div>

                {/* 25. Usulan : menampilkan nama koordinator yang kuotanya masih ada sisa */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black">25</span>
                      Usulan (Koordinator Pendamping) <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-semibold normal-case">
                      Menampilkan Koordinator dengan Sisa Kuota Tersedia
                    </span>
                  </Label>
                  <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator}>
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

              {/* Ringkasan Sebelum Submit */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Ringkasan Pendaftaran Sebelum Disimpan ke Verifikasi Admin:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Nama Pelaku:</span>
                    <strong className="truncate block text-slate-800 dark:text-slate-200 uppercase">{fullName || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">NIK:</span>
                    <span className="font-mono font-bold truncate block">{nik || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Nomor KK:</span>
                    <span className="font-mono font-bold truncate block">{noKK || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Kepala Keluarga:</span>
                    <strong className="truncate block uppercase">{namaKepalaKeluarga || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Kelurahan:</span>
                    <strong className="truncate block">{kelurahan || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Usulan:</span>
                    <strong className="truncate block text-primary">{selectedCoordinator || "-"}</strong>
                  </div>
                </div>
              </div>

              {/* Navigasi Footer Tahapan 4 & Tombol Submit */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep(3)}
                  className="h-11 sm:h-12 rounded-xl sm:rounded-2xl font-bold border-slate-200 dark:border-slate-800 text-xs sm:text-sm px-5 sm:px-6 w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Kembali ke Tahapan 3</span>
                </Button>

                <Button
                  type="submit"
                  disabled={loading || isMonitoring || isFormBlocked}
                  className={cn(
                    "h-11 sm:h-12 min-w-[240px] sm:min-w-[270px] text-xs sm:text-sm font-bold shadow-md rounded-xl sm:rounded-2xl transition-all w-full sm:w-auto",
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
                      <span>Simpan & Lanjutkan ke Verifikasi Admin</span>
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
              Data pelaku usaha telah masuk ke sistem SIMPU Tunas Bangsa 2026 dan siap dilanjutkan ke tahapan Verifikasi Admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 flex flex-col gap-2 w-full">
            <AlertDialogAction
              className="w-full h-11 bg-primary hover:bg-primary/90 font-bold text-white rounded-xl shadow-md text-xs sm:text-sm"
              onClick={() => router.push('/verify-actor')}
            >
              Lanjut ke Verifikasi Admin
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
