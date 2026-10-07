"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { useDatabase, useMemoFirebase, useList, useObject } from "@/firebase"
import { ref, query, equalTo, get, orderByChild } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  Save,
  CheckCircle2,
  ShieldAlert,
  Building2,
  User,
  Users,
  MapPin,
  Store,
  SearchCheck,
  Printer,
  Copy,
  Check,
  Lock,
  History,
  AlertTriangle,
  Camera,
  ChevronRight,
  ChevronLeft,
  Search,
} from "lucide-react"
import {
  cn,
  extractDobFromNik,
  extractGenderFromNik,
  formatCurrency,
  AGAMA_INDONESIA,
  STATUS_KELUARGA_LIST,
  PEKERJAAN_DUKCAPIL,
} from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

function KkDetailCard({ item }: { item: any }) {
  const isHardBlocked =
    item._table === "blacklist_data" ||
    item._table === "businessActors" ||
    (item._source || "").toUpperCase().includes("BLACKLIST") ||
    (item._source || "").toUpperCase().includes("SHEET 4") ||
    (item._source || "").toUpperCase().includes("2026") ||
    (item._source || "").toUpperCase().includes("PELAKU USAHA")

  const isSheet3 =
    item._table === "master_data_2025" ||
    (item._source || "").toUpperCase().includes("SHEET 3") ||
    (item._source || "").toUpperCase().includes("2025")

  const sourceLabel = item._source || (
    item._table === "blacklist_data" ? "Sheet 4 : Blacklist" :
    item._table === "master_data_2025" ? "Sheet 3 : Pembanding 2025" :
    item._table === "businessActors" ? "Pengajuan Terbaru 2026" :
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
  const notes = item.alasan || item.alasanCancelDinas || item.keterangan || item.catatan || item.bpjsCheckNote || ""
  const createdDate = item.createdAt || item.uploadedAt ? new Date(item.createdAt || item.uploadedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : "-"

  const nominalVal = item.lpjNominal || item.nominal || item.NOM
  const nominalStr = nominalVal ? (typeof nominalVal === 'number' ? formatCurrency(nominalVal) : !isNaN(Number(nominalVal)) ? formatCurrency(Number(nominalVal)) : String(nominalVal)) : "-"

  return (
    <div className={cn(
      "rounded-2xl border p-4 sm:p-5 text-xs transition-all shadow-sm space-y-3.5",
      isHardBlocked
        ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80"
        : isSheet3
        ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80"
        : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80"
    )}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/10 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn(
            "font-black text-xs px-2.5 py-1 rounded-xl uppercase tracking-wider shadow-none",
            isHardBlocked
              ? "bg-rose-600 text-white hover:bg-rose-600"
              : isSheet3
              ? "bg-amber-600 text-white hover:bg-amber-600"
              : "bg-emerald-600 text-white hover:bg-emerald-600"
          )}>
            {sourceLabel}
          </Badge>
          <Badge variant="outline" className={cn(
            "font-bold text-[11px] px-2 py-0.5 rounded-lg uppercase",
            isHardBlocked
              ? "border-rose-400 text-rose-700 dark:text-rose-300 bg-rose-100/50"
              : isSheet3
              ? "border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-100/50"
              : "border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-emerald-100/50"
          )}>
            {isHardBlocked
              ? "⛔ Form Terkunci"
              : isSheet3
              ? "📷 Wajib Fhoto Pembanding"
              : "✅ Dapat Dilanjutkan"}
          </Badge>
          <span className="text-[11px] font-bold text-slate-500">
            Tahun: {tahun}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span>Status:</span>
          <span className={cn(
            "font-black px-2 py-0.5 rounded-md uppercase text-[11px]",
            isHardBlocked
              ? "bg-rose-200/70 text-rose-800"
              : isSheet3
              ? "bg-amber-200/70 text-amber-900"
              : "bg-emerald-200/70 text-emerald-800"
          )}>
            {status}
          </span>
        </div>
      </div>

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

function PekerjaanSelect({
  value,
  onValueChange,
  placeholder = "Pilih Pekerjaan...",
}: {
  value: string
  onValueChange: (val: string) => void
  placeholder?: string
}) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return PEKERJAAN_DUKCAPIL
    return PEKERJAAN_DUKCAPIL.filter((item) => item.toLowerCase().includes(q))
  }, [searchTerm])

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-11 rounded-xl font-bold border-slate-300">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] rounded-xl">
        <div
          className="sticky top-0 z-10 bg-popover p-2 border-b"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari pekerjaan (89 jenis)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs rounded-lg"
            />
          </div>
        </div>
        {filteredList.length > 0 ? (
          filteredList.map((job) => (
            <SelectItem key={job} value={job} className="font-semibold text-xs">
              {job}
            </SelectItem>
          ))
        ) : (
          <div className="p-3 text-center text-xs text-muted-foreground">
            Pekerjaan tidak ditemukan
          </div>
        )}
      </SelectContent>
    </Select>
  )
}

export default function PendaftaranPage() {
  const { toast } = useToast()
  const database = useDatabase()

  const [currentStep, setCurrentStep] = useState<number>(1)
  const [loading, setLoading] = useState(false)

  // Tahapan 1
  const [fullName, setFullName] = useState("")
  const [nik, setNik] = useState("")
  const [noKK, setNoKK] = useState("")
  const [comparisonPhotoUrl, setComparisonPhotoUrl] = useState<string>("")
  const [kkCheckResults, setKkCheckResults] = useState<any[]>([])
  const [isCheckingKk, setIsCheckingKk] = useState(false)

  // Tahapan 2
  const [pob, setPob] = useState("")
  const [dob, setDob] = useState("")
  const [isEditingDob, setIsEditingDob] = useState(false)
  const [phone, setPhone] = useState("")
  const [agama, setAgama] = useState("")
  const [pekerjaan, setPekerjaan] = useState("")
  const [address, setAddress] = useState("")
  const [rtRw, setRtRw] = useState("")
  const [kelurahan, setKelurahan] = useState<string>("")
  const [kecamatan, setKecamatan] = useState<string>("")
  const [tanggalCetakKtp, setTanggalCetakKtp] = useState("")

  // Tahapan 3
  const [statusKeluarga, setStatusKeluarga] = useState("")
  const [namaKepalaKeluarga, setNamaKepalaKeluarga] = useState("")
  const [nikKepalaKeluarga, setNikKepalaKeluarga] = useState("")
  const [pobKepalaKeluarga, setPobKepalaKeluarga] = useState("")
  const [dobKepalaKeluarga, setDobKepalaKeluarga] = useState("")
  const [isEditingDobKk, setIsEditingDobKk] = useState(false)
  const [agamaKepalaKeluarga, setAgamaKepalaKeluarga] = useState("")
  const [pekerjaanKepalaKeluarga, setPekerjaanKepalaKeluarga] = useState("")
  const [tanggalCetakKk, setTanggalCetakKk] = useState("")

  // Tahapan 4
  const [businessCategory, setBusinessCategory] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [businessLocation, setBusinessLocation] = useState("")
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("")

  // Success & Print States
  const [successData, setSuccessData] = useState<any | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [hasCopiedCode, setHasCopiedCode] = useState(false)
  const printReceiptRef = useRef<HTMLDivElement>(null)

  const quotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const { data: rawQuotaData, isLoading: isQuotaLoading } = useList<any>(quotaRef)

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

  useEffect(() => {
    if (statusKeluarga === "Kepala Keluarga") {
      setNamaKepalaKeluarga(fullName)
      setNikKepalaKeluarga(nik)
      setPobKepalaKeluarga(pob)
      setDobKepalaKeluarga(dob)
      setAgamaKepalaKeluarga(agama)
      setPekerjaanKepalaKeluarga(pekerjaan)
    }
  }, [statusKeluarga, fullName, nik, pob, dob, agama, pekerjaan])

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
                results.push({ ...item, _source: label, _table: sheetName })
              })
            } else {
              try {
                const qFallback = query(ref(database, sheetName), orderByChild('kk'), equalTo(cleanKk))
                const snapFallback = await get(qFallback)
                if (snapFallback.exists()) {
                  Object.values(snapFallback.val()).forEach((item: any) => {
                    results.push({ ...item, _source: label, _table: sheetName })
                  })
                }
              } catch (eFallback) {}
            }
          } catch (e) {}
        }

        const checkActiveActors = async () => {
          if (!database) return
          try {
            const q = query(ref(database, 'businessActors'), orderByChild('noKK'), equalTo(cleanKk))
            const snap = await get(q)
            if (snap.exists()) {
              Object.values(snap.val()).forEach((item: any) => {
                results.push({
                  ...item,
                  _source: 'Pengajuan Terbaru 2026',
                  _table: 'businessActors',
                  status: item.status || 'Terdaftar'
                })
              })
            }
          } catch (e) {}
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

  const isKkBlacklisted = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "blacklist_data" || src.includes("BLACKLIST") || src.includes("SHEET 4")
    })
  }, [kkCheckResults])

  const isKkSheet3 = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "master_data_2025" || src.includes("SHEET 3") || src.includes("2025")
    })
  }, [kkCheckResults])

  const isKkAlreadyRegistered2026 = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "businessactors" || src.includes("2026") || src.includes("SUDAH TERDAFTAR")
    })
  }, [kkCheckResults])

  const isKkSheet1Or2 = useMemo(() => {
    return kkCheckResults.some((res) => {
      const src = (res._source || "").toUpperCase()
      const tbl = (res._table || "").toLowerCase()
      return tbl === "master_data_2024" || tbl === "master_data_2023" || src.includes("SHEET 1") || src.includes("SHEET 2")
    })
  }, [kkCheckResults])

  const isHardLocked = isKkBlacklisted || isKkAlreadyRegistered2026
  const requiresComparisonPhoto = !isHardLocked && isKkSheet3

  const blockedSourcesLabel = useMemo(() => {
    const list: string[] = []
    if (isKkBlacklisted) list.push("Sheet Blacklist")
    if (isKkAlreadyRegistered2026) list.push("Pengajuan Terbaru 2026")
    return list.join(" & ") || "Basis Data Terkunci"
  }, [isKkBlacklisted, isKkAlreadyRegistered2026])

  const handleComparisonPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setComparisonPhotoUrl("")
      return
    }
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Format tidak didukung",
        description: "Harap pilih file gambar (JPG, PNG, WEBP)."
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
        const MAX_DIM = 800
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

  const validateStep1 = (): boolean => {
    if (!fullName.trim()) {
      toast({ variant: "destructive", title: "Data Belum Lengkap", description: "Nama Lengkap wajib diisi." })
      return false
    }
    if (nik.trim().length !== 16) {
      toast({ variant: "destructive", title: "NIK Tidak Valid", description: "Nomor Induk Kependudukan (NIK) harus 16 digit angka." })
      return false
    }
    if (noKK.trim().length !== 16) {
      toast({ variant: "destructive", title: "Nomor KK Tidak Valid", description: "Nomor Kartu Keluarga (Nomor KK) harus 16 digit angka." })
      return false
    }
    if (isCheckingKk) {
      toast({ variant: "destructive", title: "Harap Tunggu", description: "Sedang memeriksa Nomor KK pada database..." })
      return false
    }
    if (isHardLocked) {
      toast({
        variant: "destructive",
        title: "Form Terkunci",
        description: `Nomor KK terdaftar pada ${blockedSourcesLabel}. Pendaftaran tidak dapat dilanjutkan.`
      })
      return false
    }
    if (requiresComparisonPhoto && !comparisonPhotoUrl) {
      toast({
        variant: "destructive",
        title: "Fhoto Pembanding Wajib Diupload",
        description: "Nomor KK terdeteksi di Sheet 3 (Pembanding 2025). Silakan upload Fhoto Pembanding terlebih dahulu sebelum melanjutkan."
      })
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    if (
      !fullName.trim() ||
      nik.trim().length !== 16 ||
      !pob.trim() ||
      !dob.trim() ||
      !phone.trim() ||
      !agama ||
      !pekerjaan ||
      !address.trim() ||
      !rtRw.trim() ||
      !kelurahan ||
      !kecamatan ||
      !tanggalCetakKtp
    ) {
      toast({
        variant: "destructive",
        title: "Tahapan 2 Belum Lengkap",
        description: "Semua kolom Data Pelaku Usaha (1 s/d 12) wajib diisi lengkap sebelum melanjutkan."
      })
      return false
    }
    return true
  }

  const validateStep3 = (): boolean => {
    if (
      noKK.trim().length !== 16 ||
      !statusKeluarga ||
      !namaKepalaKeluarga.trim() ||
      nikKepalaKeluarga.trim().length !== 16 ||
      !pobKepalaKeluarga.trim() ||
      !dobKepalaKeluarga.trim() ||
      !agamaKepalaKeluarga ||
      !pekerjaanKepalaKeluarga ||
      !tanggalCetakKk
    ) {
      toast({
        variant: "destructive",
        title: "Tahapan 3 Belum Lengkap",
        description: "Semua kolom Data Keluarga (13 s/d 21) wajib diisi lengkap dan NIK Kepala Keluarga harus 16 digit."
      })
      return false
    }
    return true
  }

  const validateStep4 = (): boolean => {
    if (
      !businessCategory ||
      !businessName.trim() ||
      !businessLocation.trim() ||
      !selectedCoordinator
    ) {
      toast({
        variant: "destructive",
        title: "Tahapan 4 Belum Lengkap",
        description: "Semua kolom Data Usaha (22 s/d 25) wajib diisi lengkap sebelum mengirim pendaftaran."
      })
      return false
    }
    return true
  }

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const resetAllFields = () => {
    setCurrentStep(1)
    setFullName("")
    setNik("")
    setNoKK("")
    setComparisonPhotoUrl("")
    setKkCheckResults([])
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
    setIsEditingDobKk(false)
    setAgamaKepalaKeluarga("")
    setPekerjaanKepalaKeluarga("")
    setTanggalCetakKk("")
    setBusinessCategory("")
    setBusinessName("")
    setBusinessLocation("")
    setSelectedCoordinator("")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) {
      return
    }
    setLoading(true)

    const payload = {
      fullName: fullName.trim().toUpperCase(),
      gender: extractGenderFromNik(nik.trim()) || "Laki-laki",
      nik: nik.trim(),
      noKK: noKK.trim(),
      pob: pob.trim().toUpperCase(),
      dob: dob.trim(),
      phone: phone.trim(),
      agama,
      pekerjaan,
      address: address.trim().toUpperCase(),
      rtRw: rtRw.trim(),
      kelurahan,
      kecamatan,
      tanggalCetakKtp,
      statusKeluarga,
      namaKepalaKeluarga: namaKepalaKeluarga.trim().toUpperCase(),
      nikKepalaKeluarga: nikKepalaKeluarga.trim(),
      pobKepalaKeluarga: pobKepalaKeluarga.trim().toUpperCase(),
      dobKepalaKeluarga: dobKepalaKeluarga.trim(),
      agamaKepalaKeluarga,
      pekerjaanKepalaKeluarga,
      tanggalCetakKk,
      businessCategory,
      businessName: businessName.trim().toUpperCase(),
      businessLocation: businessLocation.trim().toUpperCase(),
      coordinator: selectedCoordinator,
      comparisonPhotoUrl: requiresComparisonPhoto ? comparisonPhotoUrl : undefined,
    }

    try {
      const res = await fetch('/api/pendaftaran', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Pendaftaran Tidak Berhasil",
          description: result.message || "Terjadi kesalahan saat memproses pendaftaran.",
        })
        setLoading(false)
        return
      }

      setSuccessData({
        ...payload,
        registrationCode: result.registrationCode,
        createdAt: result.data?.createdAt || new Date().toISOString(),
      })
      setShowSuccessDialog(true)
      resetAllFields()

      toast({
        title: "Pendaftaran Berhasil!",
        description: `Nomor Registrasi: ${result.registrationCode}`,
      })
    } catch (err: any) {
      console.error("Submit error:", err)
      toast({
        variant: "destructive",
        title: "Kesalahan Jaringan",
        description: err.message || "Gagal menghubungi server pendaftaran. Silakan periksa koneksi Anda.",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyRegistrationCode = () => {
    if (!successData?.registrationCode) return
    navigator.clipboard.writeText(successData.registrationCode)
    setHasCopiedCode(true)
    toast({
      title: "Berhasil Disalin",
      description: `Nomor Registrasi ${successData.registrationCode} telah disalin ke clipboard.`,
    })
    setTimeout(() => setHasCopiedCode(false), 2500)
  }

  const handlePrintReceipt = () => {
    window.print()
  }

  const kelurahanList = [
    "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
    "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
    "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
    "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
  ]

  const steps = [
    { id: 1, title: "Tahapan 1", subtitle: "Cek Identitas & KK", icon: SearchCheck },
    { id: 2, title: "Tahapan 2", subtitle: "Data Pelaku Usaha", icon: User },
    { id: 3, title: "Tahapan 3", subtitle: "Data Keluarga", icon: Users },
    { id: 4, title: "Tahapan 4", subtitle: "Data Usaha", icon: Store },
  ]

  return (
    <div className="min-h-screen py-6 sm:py-10 px-3 sm:px-6 max-w-4xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-2 px-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary font-headline uppercase tracking-tighter flex items-center gap-2.5">
          <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
          Formulir Pendaftaran UMKM
        </h1>
        <p className="text-muted-foreground font-medium text-sm">
          Silakan lengkapi pendaftaran secara bertahap (Tahapan 1 s/d Tahapan 4) untuk melanjutkan ke Verifikasi Admin.
        </p>
      </div>

      {/* Stepper Indicator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {steps.map((step) => {
          const Icon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                isActive
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : isCompleted
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                  : "bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-400"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
                  isActive
                    ? "bg-white/20 text-white"
                    : isCompleted
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider leading-none">
                  {step.title}
                </p>
                <p className={cn(
                  "text-xs font-bold truncate mt-1",
                  isActive ? "text-white" : isCompleted ? "text-emerald-900 dark:text-emerald-100" : "text-slate-500"
                )}>
                  {step.subtitle}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAHAPAN 1 */}
        {currentStep === 1 && (
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-md rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/90 backdrop-blur-md">
            <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                  1
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                    Tahapan 1 : Input Identitas Awal & Pengecekan Database
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-500">
                    Masukkan Nama Lengkap, NIK, dan Nomor Kartu Keluarga (Nomor KK) untuk pengecekan database.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fullName" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Nama Lengkap (Sesuai KTP) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="CONTOH: SITI AMINAH"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.toUpperCase())}
                    required
                    className="h-11 rounded-xl font-bold uppercase text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nik" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Nomor Induk Kependudukan / NIK (16 Digit) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="nik"
                    placeholder="16 Digit Angka NIK"
                    maxLength={16}
                    value={nik}
                    onChange={(e) => {
                      const cleanNik = e.target.value.replace(/[^0-9]/g, "")
                      setNik(cleanNik)
                      if (cleanNik.length >= 12) {
                        const extracted = extractDobFromNik(cleanNik)
                        if (extracted) setDob(extracted)
                      } else if (!isEditingDob) {
                        setDob("")
                      }
                    }}
                    required
                    className="h-11 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                  <span className="text-[10px] font-bold text-slate-400 block">
                    Terisi: {nik.length}/16 digit
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="noKK" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Nomor Kartu Keluarga / Nomor KK (16 Digit) <span className="text-rose-500">*</span>
                    </Label>
                    {isCheckingKk && (
                      <span className="text-[10px] text-primary font-bold flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Memeriksa KK...
                      </span>
                    )}
                  </div>
                  <Input
                    id="noKK"
                    placeholder="16 Digit Angka Nomor KK"
                    maxLength={16}
                    value={noKK}
                    onChange={(e) => {
                      const cleanKk = e.target.value.replace(/[^0-9]/g, "")
                      setNoKK(cleanKk)
                    }}
                    required
                    className={cn(
                      "h-11 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 border-slate-300 transition-all",
                      isHardLocked && "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/40",
                      requiresComparisonPhoto && "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40",
                      !isHardLocked && !requiresComparisonPhoto && kkCheckResults.length > 0 && "border-emerald-500 ring-2 ring-emerald-500/20"
                    )}
                  />
                  <span className="text-[10px] font-bold text-slate-400 block">
                    Terisi: {noKK.length}/16 digit (Pengecekan otomatis saat 16 digit)
                  </span>
                </div>
              </div>

              {noKK.replace(/[^0-9]/g, "").length === 16 && !isCheckingKk && (
                <div className="space-y-4 pt-2">
                  {kkCheckResults.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm font-black uppercase text-emerald-800 dark:text-emerald-200">
                          Nomor KK Belum Terdaftar di Database Pembanding & Pengajuan 2026
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                          Silakan klik tombol &quot;Lanjut ke Tahapan 2&quot; untuk mengisi Data Pelaku Usaha.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isHardLocked && (
                        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 flex items-start gap-3">
                          <Lock className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-xs sm:text-sm font-black uppercase text-rose-800 dark:text-rose-200">
                              ⛔ FORMULIR TERKUNCI — TIDAK DAPAT DILANJUTKAN
                            </p>
                            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                              Nomor KK ({noKK}) ditemukan pada <strong>{blockedSourcesLabel}</strong>. Sesuai ketentuan, pendaftaran tidak dapat dilanjutkan.
                            </p>
                          </div>
                        </div>
                      )}

                      {requiresComparisonPhoto && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-800 space-y-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-xs sm:text-sm font-black uppercase text-amber-900 dark:text-amber-200">
                                ⚠️ TERDETEKSI DI SHEET 3 (PEMBANDING 2025) — WAJIB UPLOAD FHOTO PEMBANDING
                              </p>
                              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                Nomor KK ({noKK}) cocok dengan data pada Sheet 3 (Pembanding 2025). Sebelum melanjutkan ke Tahapan 2, wajib menginput/upload <strong>Fhoto Pembanding</strong> terlebih dahulu.
                              </p>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 space-y-3">
                            <Label className="text-xs font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-2">
                              <Camera className="w-4 h-4 text-amber-600" />
                              Form Input Fhoto Pembanding <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleComparisonPhotoUpload}
                              className="bg-slate-50 border-amber-300 cursor-pointer"
                            />
                            {comparisonPhotoUrl && (
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 rounded-xl flex items-center gap-3">
                                <img
                                  src={comparisonPhotoUrl}
                                  alt="Preview Fhoto Pembanding"
                                  className="w-20 h-20 object-cover rounded-lg border-2 border-emerald-400 shadow-sm"
                                />
                                <div className="space-y-1">
                                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-200 uppercase flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Fhoto Pembanding Siap
                                  </span>
                                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                                    Anda sekarang dapat melanjutkan ke Tahapan 2.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {!isHardLocked && !requiresComparisonPhoto && isKkSheet1Or2 && (
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-800 flex items-start gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-xs sm:text-sm font-black uppercase text-emerald-800 dark:text-emerald-200">
                              ✅ DATA DITEMUKAN DI SHEET 1 / SHEET 2 — PENGISIAN DAPAT DILANJUTKAN
                            </p>
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              Data riwayat ditemukan pada Sheet 1 (2024) / Sheet 2 (2023). Silakan periksa rincian data di bawah dan lanjutkan ke Tahapan 2.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <History className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                          <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">
                            Rincian Data KK yang Ditemukan ({kkCheckResults.length} Data)
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {kkCheckResults.map((item, idx) => (
                            <KkDetailCard key={`${item._table}-${idx}`} item={item} />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="pt-4 border-t flex justify-end">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isHardLocked || isCheckingKk || (requiresComparisonPhoto && !comparisonPhotoUrl)}
                  className="h-11 px-6 rounded-xl font-black uppercase tracking-wider gap-2"
                >
                  <span>Lanjut ke Tahapan 2</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAHAPAN 2 */}
        {currentStep === 2 && (
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-md rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/90 backdrop-blur-md">
            <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                  2
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                    Tahapan 2 : Pengisian Data Pelaku Usaha
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-500">
                    Semua kolom (1 s/d 12) wajib diisi lengkap sebelum dapat melanjutkan ke Tahapan 3.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    1. Nama Lengkap (Dari Tahapan 1) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={fullName}
                    readOnly
                    className="h-11 rounded-xl font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    2. Nomor Induk Kependudukan / NIK (Dari Tahapan 1) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={nik}
                    readOnly
                    className="h-11 rounded-xl font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    3. Tempat Lahir <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="CONTOH: TANJUNGPINANG"
                    value={pob}
                    onChange={(e) => setPob(e.target.value.toUpperCase())}
                    required
                    className="h-11 rounded-xl font-semibold uppercase text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      4. Tanggal Lahir ({isEditingDob ? "Edit Manual" : "Otomatis NIK"}) <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsEditingDob(!isEditingDob)}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      {isEditingDob ? "Gunakan Otomatis NIK" : "Edit Manual"}
                    </button>
                  </div>
                  <Input
                    value={dob}
                    readOnly={!isEditingDob}
                    onChange={(e) => setDob(e.target.value)}
                    placeholder="DD-MM-YYYY (Ketik NIK atau klik Edit Manual)"
                    required
                    className={cn(
                      "h-11 rounded-xl font-bold border-slate-300",
                      !isEditingDob
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-not-allowed"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-primary ring-1 ring-primary/30"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    5. Nomor WhatsApp <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                    required
                    className="h-11 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    6. Agama <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={agama} onValueChange={setAgama}>
                    <SelectTrigger className="h-11 rounded-xl font-bold border-slate-300">
                      <SelectValue placeholder="Pilih Agama..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {AGAMA_INDONESIA.map((agm) => (
                        <SelectItem key={agm} value={agm} className="font-semibold">
                          {agm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    7. Pekerjaan (Sesuai Data Kependudukan Indonesia) <span className="text-rose-500">*</span>
                  </Label>
                  <PekerjaanSelect
                    value={pekerjaan}
                    onValueChange={setPekerjaan}
                    placeholder="Pilih Pekerjaan Pelaku Usaha..."
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    8. Alamat Lengkap <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="CONTOH: JL. SULTAN MAHMUD NO. 12"
                    value={address}
                    onChange={(e) => setAddress(e.target.value.toUpperCase())}
                    required
                    className="h-11 rounded-xl uppercase font-semibold text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    9. RT / RW <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="Contoh: 001/002"
                    value={rtRw}
                    onChange={(e) => setRtRw(e.target.value)}
                    required
                    className="h-11 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    10. Kelurahan <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={kelurahan} onValueChange={setKelurahan}>
                    <SelectTrigger className="h-11 rounded-xl font-bold border-slate-300">
                      <SelectValue placeholder="Pilih Kelurahan..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[260px] rounded-xl">
                      {kelurahanList.map((k) => (
                        <SelectItem key={k} value={k} className="font-semibold">
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    11. Kecamatan (Otomatis dari Kelurahan) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={kecamatan}
                    readOnly
                    placeholder="Terisi otomatis saat memilih Kelurahan"
                    required
                    className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 cursor-not-allowed border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    12. Tanggal Cetak KTP <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={tanggalCetakKtp}
                    onChange={(e) => setTanggalCetakKtp(e.target.value)}
                    required
                    className="h-11 rounded-xl font-bold text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  className="h-11 px-5 rounded-xl font-bold gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali ke Tahapan 1</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="h-11 px-6 rounded-xl font-black uppercase tracking-wider gap-2"
                >
                  <span>Lanjut ke Tahapan 3</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAHAPAN 3 */}
        {currentStep === 3 && (
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-md rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/90 backdrop-blur-md">
            <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                  3
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                    Tahapan 3 : Pengisian Data Keluarga
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-500">
                    Semua kolom (13 s/d 21) wajib diisi lengkap sebelum dapat melanjutkan ke Tahapan 4.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    13. Nomor Kartu Keluarga / Nomor KK (Dari Tahapan 1) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={noKK}
                    readOnly
                    className="h-11 rounded-xl font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    14. Status Keluarga <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={statusKeluarga} onValueChange={setStatusKeluarga}>
                    <SelectTrigger className="h-11 rounded-xl font-bold border-slate-300">
                      <SelectValue placeholder="Pilih Status Keluarga..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {STATUS_KELUARGA_LIST.map((st) => (
                        <SelectItem key={st} value={st} className="font-semibold">
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    15. Nama Kepala Keluarga <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="CONTOH: BUDI SANTOSO"
                    value={namaKepalaKeluarga}
                    onChange={(e) => setNamaKepalaKeluarga(e.target.value.toUpperCase())}
                    required
                    className="h-11 rounded-xl font-bold uppercase text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    16. Nomor Induk Kependudukan (Kepala Keluarga) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="16 Digit NIK Kepala Keluarga"
                    maxLength={16}
                    value={nikKepalaKeluarga}
                    onChange={(e) => {
                      const cleanNikKk = e.target.value.replace(/[^0-9]/g, "")
                      setNikKepalaKeluarga(cleanNikKk)
                      if (cleanNikKk.length >= 12) {
                        const extracted = extractDobFromNik(cleanNikKk)
                        if (extracted) setDobKepalaKeluarga(extracted)
                      } else if (!isEditingDobKk) {
                        setDobKepalaKeluarga("")
                      }
                    }}
                    required
                    className="h-11 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                  <span className="text-[10px] font-bold text-slate-400 block">
                    Terisi: {nikKepalaKeluarga.length}/16 digit
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    17. Tempat Lahir (Kepala Keluarga) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="CONTOH: TANJUNGPINANG"
                    value={pobKepalaKeluarga}
                    onChange={(e) => setPobKepalaKeluarga(e.target.value.toUpperCase())}
                    required
                    className="h-11 rounded-xl font-semibold uppercase text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      18. Tanggal Lahir Kepala Keluarga ({isEditingDobKk ? "Edit Manual" : "Otomatis NIK"}) <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsEditingDobKk(!isEditingDobKk)}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      {isEditingDobKk ? "Gunakan Otomatis NIK" : "Edit Manual"}
                    </button>
                  </div>
                  <Input
                    value={dobKepalaKeluarga}
                    readOnly={!isEditingDobKk}
                    onChange={(e) => setDobKepalaKeluarga(e.target.value)}
                    placeholder="DD-MM-YYYY (Ketik NIK KK atau klik Edit Manual)"
                    required
                    className={cn(
                      "h-11 rounded-xl font-bold border-slate-300",
                      !isEditingDobKk
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-not-allowed"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-primary ring-1 ring-primary/30"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    19. Agama (Kepala Keluarga) <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={agamaKepalaKeluarga} onValueChange={setAgamaKepalaKeluarga}>
                    <SelectTrigger className="h-11 rounded-xl font-bold border-slate-300">
                      <SelectValue placeholder="Pilih Agama Kepala Keluarga..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {AGAMA_INDONESIA.map((agm) => (
                        <SelectItem key={agm} value={agm} className="font-semibold">
                          {agm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    20. Pekerjaan Kepala Keluarga <span className="text-rose-500">*</span>
                  </Label>
                  <PekerjaanSelect
                    value={pekerjaanKepalaKeluarga}
                    onValueChange={setPekerjaanKepalaKeluarga}
                    placeholder="Pilih Pekerjaan Kepala Keluarga..."
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    21. Tanggal Cetak di Kartu Keluarga <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={tanggalCetakKk}
                    onChange={(e) => setTanggalCetakKk(e.target.value)}
                    required
                    className="h-11 rounded-xl font-bold text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  className="h-11 px-5 rounded-xl font-bold gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali ke Tahapan 2</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="h-11 px-6 rounded-xl font-black uppercase tracking-wider gap-2"
                >
                  <span>Lanjut ke Tahapan 4</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAHAPAN 4 */}
        {currentStep === 4 && (
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-md rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/90 backdrop-blur-md">
            <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                  4
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                    Tahapan 4 : Pengisian Data Usaha
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-500">
                    Semua kolom (22 s/d 25) wajib diisi lengkap sebelum mengirim ke tahapan Verifikasi Admin.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    22. Jenis Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={businessCategory} onValueChange={setBusinessCategory}>
                    <SelectTrigger className="h-11 rounded-xl font-bold border-slate-300">
                      <SelectValue placeholder="Pilih Jenis Usaha..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Kuliner" className="font-semibold">
                        Kuliner
                      </SelectItem>
                      <SelectItem value="Non Kuliner" className="font-semibold">
                        Non Kuliner
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    23. Nama Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="CONTOH: KERIPIK TEMPE BERKAH"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value.toUpperCase())}
                    required
                    className="h-11 rounded-xl uppercase font-bold text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    24. Alamat Usaha <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="CONTOH: JL. MERDEKA DEPAN KEDAI KOPI ATAU DI RUMAH"
                    value={businessLocation}
                    onChange={(e) => setBusinessLocation(e.target.value.toUpperCase())}
                    required
                    className="h-11 rounded-xl uppercase font-semibold text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      25. Usulan (Koordinator dengan Sisa Kuota Tersedia) <span className="text-rose-500">*</span>
                    </Label>
                    {isQuotaLoading && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Memuat kuota...
                      </span>
                    )}
                  </div>
                  <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator}>
                    <SelectTrigger className="h-11 rounded-xl font-bold border-slate-300">
                      <SelectValue placeholder="Pilih Usulan Koordinator..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] rounded-xl">
                      {availableCoordinators.filter((c) => c.remaining > 0).map((c) => (
                        <SelectItem key={c.id || c.name} value={c.name} className="group font-semibold py-2.5">
                          <div className="flex justify-between items-center w-full min-w-[260px] sm:min-w-[320px] gap-4">
                            <span className="font-bold text-slate-800 dark:text-slate-200 group-data-[highlighted]:text-white group-focus:text-white transition-colors">
                              {c.name}
                            </span>
                            <span className="text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 group-data-[highlighted]:bg-white/20 group-data-[highlighted]:text-white group-data-[highlighted]:border-transparent border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition-colors">
                              Sisa: {c.remaining}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Menampilkan nama koordinator yang kuotanya masih ada sisa.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  className="w-full sm:w-auto h-11 px-5 rounded-xl font-bold gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali ke Tahapan 3</span>
                </Button>

                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full sm:w-auto min-w-[260px] h-12 rounded-2xl font-black uppercase tracking-wider shadow-xl shadow-primary/20 text-white bg-primary hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Menyimpan Pendaftaran...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Submit & Lanjut Verifikasi Admin</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>

      {/* POP-UP MODAL SUKSES & BUKTI PENDAFTARAN */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white dark:bg-slate-900">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
              Pendaftaran Berhasil Disimpan!
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-semibold text-emerald-100 mt-1">
              Data pelaku usaha telah tercatat di sistem SIMPU dan sedang dalam antrean Verifikasi Admin.
            </DialogDescription>
          </div>

          <div className="p-6 space-y-5" ref={printReceiptRef}>
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Nomor Registrasi Resmi
              </span>
              <div className="text-3xl font-black font-mono tracking-widest text-primary">
                {successData?.registrationCode || "--------"}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyRegistrationCode}
                className="h-8 text-xs font-bold rounded-xl gap-1.5 mt-1 border-slate-300"
              >
                {hasCopiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Nomor Registrasi</span>
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2 text-xs border-y border-slate-100 dark:border-slate-800 py-3">
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Nama Pelaku Usaha:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{successData?.fullName || "-"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">NIK:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{successData?.nik || "-"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Nomor KK:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{successData?.noKK || "-"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Nama Usaha:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{successData?.businessName || "-"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Kelurahan / Kecamatan:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{successData?.kelurahan} / {successData?.kecamatan}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Usulan Koordinator:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">{successData?.coordinator || "-"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintReceipt}
                className="h-11 rounded-xl font-bold text-xs gap-2 border-slate-300 print:hidden"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Cetak Bukti Pendaftaran</span>
              </Button>

              <Link
                href={`/cek-data?type=nik&q=${encodeURIComponent(successData?.nik || "")}`}
                className="h-11 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 transition-colors print:hidden"
              >
                <SearchCheck className="w-4 h-4 text-emerald-400" />
                <span>Cek Status Sekarang</span>
              </Link>
            </div>

            <Button
              type="button"
              onClick={() => setShowSuccessDialog(false)}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider text-xs rounded-xl print:hidden"
            >
              Input Pendaftaran Baru
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
