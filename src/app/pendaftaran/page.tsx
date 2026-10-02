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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  Save, 
  CheckCircle2, 
  ShieldAlert, 
  Building2, 
  User, 
  MapPin, 
  Store, 
  SearchCheck, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle,
  RotateCcw,
  FileCheck2,
  Calendar,
  Phone,
  CreditCard,
  Lock,
  History,
  AlertTriangle
} from "lucide-react"
import { cn, extractDobFromNik, formatCurrency } from "@/lib/utils"
import { normalizeCoordinator } from "@/lib/coordinator-utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

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

export default function PendaftaranPage() {
  const { toast } = useToast()
  const database = useDatabase()

  const [loading, setLoading] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [kelurahan, setKelurahan] = useState<string>("")
  const [kecamatan, setKecamatan] = useState<string>("")
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("")
  const [nik, setNik] = useState("")
  const [noKK, setNoKK] = useState("")
  const [pob, setPob] = useState("")
  const [dob, setDob] = useState("")
  const [isEditingDob, setIsEditingDob] = useState(false)

  // KK Verification States
  const [kkCheckResults, setKkCheckResults] = useState<any[]>([])
  const [isCheckingKk, setIsCheckingKk] = useState(false)

  // Success & Print States
  const [successData, setSuccessData] = useState<any | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [hasCopiedCode, setHasCopiedCode] = useState(false)
  const printReceiptRef = useRef<HTMLDivElement>(null)

  // Fetch Quotas realtime
  const quotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const { data: rawQuotaData, isLoading: isQuotaLoading } = useList<any>(quotaRef)

  // Fetch pre-calculated system_stats for coordinator usage
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

  // Live Pengecekan Nomor KK terhadap database pembanding
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
              } catch (eFallback) {
                // Silently ignore
              }
            }
          } catch (e) {
            // Silently ignore index issues for live check
          }
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
                  _source: 'Data Pelaku Usaha 2026', 
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

  // Evaluasi Status Blacklist, Hold, dan 2026 dari hasil cek KK
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

  const isFormBlocked = isKkBlacklisted || isKkHold || isKkAlreadyRegistered

  const blockedSourcesLabel = useMemo(() => {
    const list: string[] = []
    if (isKkBlacklisted) list.push("Sheet 4 : Blacklist")
    if (isKkHold) list.push("Sheet 3 : Pembanding 2025")
    if (isKkAlreadyRegistered) list.push("Data Pelaku Usaha 2026")
    return list.join(" & ") || "Basis Data Terlarang"
  }, [isKkBlacklisted, isKkHold, isKkAlreadyRegistered])

  const kkHistoryResults = useMemo(() => {
    if (isFormBlocked) return []
    return kkCheckResults.filter((res) => {
      const tbl = (res._table || "").toLowerCase()
      const src = (res._source || "").toUpperCase()
      return tbl === "master_data_2024" || tbl === "master_data_2023" || src.includes("SHEET 1") || src.includes("SHEET 2") || src.includes("2023") || src.includes("2024")
    })
  }, [kkCheckResults, isFormBlocked])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isFormBlocked) {
      toast({
        variant: "destructive",
        title: "Pendaftaran Ditutup",
        description: `Nomor KK terdata pada ${blockedSourcesLabel}. Pendaftaran tidak dapat diproses.`
      })
      return
    }
    setLoading(true)

    const formElement = e.currentTarget
    const formData = new FormData(formElement)

    const payload = {
      fullName: formData.get("fullName") as string,
      gender: formData.get("gender") as string,
      nik: nik.trim(),
      noKK: noKK.trim(),
      pob: pob.trim(),
      dob: dob.trim(),
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      rtRw: formData.get("rtRw") as string,
      kelurahan: kelurahan,
      kecamatan: kecamatan,
      businessCategory: formData.get("businessCategory") as string,
      businessName: formData.get("businessName") as string,
      businessLocation: formData.get("businessLocation") as string,
      coordinator: selectedCoordinator,
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

      // Berhasil
      setSuccessData({
        ...payload,
        registrationCode: result.registrationCode,
        createdAt: result.data?.createdAt || new Date().toISOString(),
      })
      setShowSuccessDialog(true)

      // Reset form
      formElement.reset()
      setKelurahan("")
      setKecamatan("")
      setSelectedCoordinator("")
      setNik("")
      setNoKK("")
      setPob("")
      setDob("")
      setFormKey(prev => prev + 1)

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

  return (
    <div className="min-h-screen py-6 sm:py-10 px-3 sm:px-6 max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Header Formulir */}
      <div className="flex flex-col gap-2 px-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary font-headline uppercase tracking-tighter flex items-center gap-2.5">
          <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
          Formulir Pendaftaran
        </h1>
        <p className="text-muted-foreground font-medium text-sm">
          Silakan isi formulir di bawah ini dengan lengkap dan benar untuk pendaftaran pelaku usaha.
        </p>
      </div>

      {/* Main Registration Form */}
      <form key={formKey} onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: BIODATA PRIBADI */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/90 backdrop-blur-md">
          <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                1
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                  Biodata Pribadi Pelaku Usaha
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-500">
                  Pastikan identitas sesuai dengan KTP & Kartu Keluarga (KK) asli.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 sm:gap-5 md:grid-cols-2 p-5 sm:p-6">
            <div className="space-y-2 md:col-span-2 sm:col-span-1">
              <Label htmlFor="fullName" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                Nama Lengkap <span className="text-rose-500">*</span>
              </Label>
              <Input 
                id="fullName" 
                name="fullName" 
                placeholder="Contoh: AHMAD SYAFI'I" 
                required 
                className="h-11 rounded-xl uppercase font-semibold text-slate-900 dark:text-slate-100 border-slate-300 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Jenis Kelamin <span className="text-rose-500">*</span>
              </Label>
              <Select name="gender" required>
                <SelectTrigger className="h-11 rounded-xl font-semibold border-slate-300">
                  <SelectValue placeholder="Pilih Jenis Kelamin..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Laki-laki" className="font-semibold">Laki-laki</SelectItem>
                  <SelectItem value="Perempuan" className="font-semibold">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nik" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                NIK (Nomor Induk Kependudukan) <span className="text-rose-500">*</span>
              </Label>
              <Input 
                id="nik" 
                name="nik" 
                maxLength={16} 
                placeholder="Masukkan 16 digit NIK..." 
                required 
                value={nik}
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
                className="h-11 rounded-xl font-mono font-bold tracking-wider text-slate-900 dark:text-slate-100 border-slate-300"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold px-1">
                <span>Wajib 16 digit angka</span>
                <span className={cn(nik.length === 16 ? "text-emerald-600 font-bold" : "text-slate-400")}>
                  {nik.length} / 16
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="noKK" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                Nomor KK (Kartu Keluarga) <span className="text-rose-500">*</span>
              </Label>
              <Input 
                id="noKK" 
                name="noKK" 
                maxLength={16} 
                placeholder="Masukkan 16 digit Nomor KK..." 
                required 
                value={noKK}
                onChange={(e) => setNoKK(e.target.value.replace(/[^0-9]/g, ""))}
                className="h-11 rounded-xl font-mono font-bold tracking-wider text-slate-900 dark:text-slate-100 border-slate-300"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold px-1">
                <span>Wajib 16 digit angka</span>
                <span className={cn(noKK.length === 16 ? "text-emerald-600 font-bold" : "text-slate-400")}>
                  {noKK.length} / 16
                </span>
              </div>

              {/* Live KK Verification Indicators */}
              {isCheckingKk && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Sedang memeriksa Nomor KK...
                </div>
              )}

              {!isCheckingKk && noKK.length === 16 && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  {isFormBlocked && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-xs sm:text-sm">
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
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
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
                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 font-bold">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Nomor KK Bersih & Valid (Belum pernah terdaftar. Pendaftaran diizinkan dilanjutkan).</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FORMULIR ISIAN LAINNYA DI SECTION 1 */}
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
                <div className="space-y-2">
                  <Label htmlFor="pob" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Tempat Lahir <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    id="pob" 
                    name="pob" 
                    placeholder="Contoh: TANJUNGPINANG" 
                    required 
                    value={pob}
                    onChange={(e) => setPob(e.target.value)}
                    className="h-11 rounded-xl uppercase font-semibold text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="dob" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Tanggal Lahir {isEditingDob ? "(Edit Manual)" : "(Otomatis dari NIK)"} <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsEditingDob(!isEditingDob)}
                      className="text-[11px] text-primary font-bold hover:underline"
                    >
                      {isEditingDob ? "Kunci Otomatis" : "Ubah Manual"}
                    </button>
                  </div>
                  <Input 
                    id="dob" 
                    name="dob" 
                    placeholder="Terisi otomatis dari NIK..." 
                    readOnly={!isEditingDob}
                    required 
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={cn("h-11 rounded-xl font-semibold border-slate-300", !isEditingDob && "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300")}
                  />
                </div>

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
                    className="h-11 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                  <p className="text-[11px] text-slate-500 font-medium">
                    Nomor ini akan digunakan petugas untuk konfirmasi dan penjadwalan survey dinas.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {!isFormBlocked && (
          <>
            {/* SECTION 2: ALAMAT & LOKASI */}
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/90 backdrop-blur-md">
          <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                2
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                  Alamat Tempat Tinggal
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-500">
                  Alamat domisili pelaku usaha di wilayah Kota Tanjungpinang.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 sm:gap-5 md:grid-cols-2 p-5 sm:p-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Alamat Lengkap <span className="text-rose-500">*</span>
              </Label>
              <Textarea 
                id="address" 
                name="address" 
                rows={2}
                placeholder="Contoh: JL. HANG TUAH NO. 45, GANG MAWAR" 
                required 
                className="rounded-xl uppercase font-semibold text-slate-900 dark:text-slate-100 border-slate-300 resize-none"
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
                className="h-11 rounded-xl font-bold uppercase text-slate-900 dark:text-slate-100 border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kelurahan" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Kelurahan <span className="text-rose-500">*</span>
              </Label>
              <Select value={kelurahan} onValueChange={setKelurahan} required>
                <SelectTrigger className="h-11 rounded-xl font-bold border-slate-300">
                  <SelectValue placeholder="Pilih Kelurahan..." />
                </SelectTrigger>
                <SelectContent className="max-h-[280px] rounded-xl">
                  {kelurahanList.map((k) => (
                    <SelectItem key={k} value={k} className="font-semibold">{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="kecamatan" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Kecamatan (Terisi Otomatis)
              </Label>
              <Input 
                id="kecamatan" 
                name="kecamatan" 
                value={kecamatan} 
                readOnly 
                placeholder="Pilih Kelurahan untuk mengisi Kecamatan"
                className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold uppercase text-primary border-slate-300" 
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: DATA USAHA */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/90 backdrop-blur-md">
          <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                3
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                  Data Usaha & Usulan Koordinator
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-500">
                  Informasi jenis usaha, nama produk, lokasi operasional, dan usulan koordinator pendamping.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 sm:gap-5 md:grid-cols-2 p-5 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="businessCategory" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Jenis Usaha <span className="text-rose-500">*</span>
              </Label>
              <Select name="businessCategory" required>
                <SelectTrigger className="h-11 rounded-xl font-bold border-slate-300">
                  <SelectValue placeholder="Pilih Jenis Usaha..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Kuliner" className="font-semibold">Kuliner (Makanan / Minuman)</SelectItem>
                  <SelectItem value="Bukan Kuliner" className="font-semibold">Bukan Kuliner (Jasa / Kerajinan / Lainnya)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-primary" />
                Nama Usaha / Produk <span className="text-rose-500">*</span>
              </Label>
              <Input 
                id="businessName" 
                name="businessName" 
                placeholder="Contoh: KERIPIK TEMPE BERKAH" 
                required 
                className="h-11 rounded-xl uppercase font-bold text-slate-900 dark:text-slate-100 border-slate-300"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessLocation" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Lokasi Tempat Usaha <span className="text-rose-500">*</span>
              </Label>
              <Input 
                id="businessLocation" 
                name="businessLocation" 
                placeholder="Contoh: JL. MERDEKA DEPAN KEDAI KOPI ATAU DI RUMAH" 
                required 
                className="h-11 rounded-xl uppercase font-semibold text-slate-900 dark:text-slate-100 border-slate-300"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="coordinator" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  USULAN / KOORDINATOR <span className="text-rose-500">*</span>
                </Label>
                {isQuotaLoading && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Memuat kuota...
                  </span>
                )}
              </div>
              <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator} required>
                <SelectTrigger className="h-11 rounded-xl font-bold border-slate-300">
                  <SelectValue placeholder="Pilih Usulan Koordinator..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-xl">
                  {availableCoordinators.filter(c => c.remaining > 0).map((c) => (
                    <SelectItem key={c.id || c.name} value={c.name} className="group font-semibold py-2.5">
                      <div className="flex justify-between items-center w-full min-w-[260px] sm:min-w-[320px] gap-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200 group-data-[highlighted]:text-white group-focus:text-white transition-colors">{c.name}</span>
                        <span className="text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 group-data-[highlighted]:bg-white/20 group-data-[highlighted]:text-white group-data-[highlighted]:border-transparent border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition-colors">
                          Sisa: {c.remaining}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 font-medium">
                Daftar koordinator di atas otomatis menyaring koordinator yang kuotanya masih tersedia.
              </p>
            </div>
          </CardContent>
        </Card>
          </>
        )}

        {/* KK CHECK RESULT DETAIL CARDS */}
        {kkCheckResults.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <h3 className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">
                Detail Riwayat & Data KK Terdeteksi ({kkCheckResults.length} Catatan Ditemukan)
              </h3>
            </div>
            <div className="space-y-4">
              {kkCheckResults.map((item, idx) => (
                <KkDetailCard key={`${item.source || item._table}-${idx}`} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <div className="pt-2 pb-12 flex flex-col sm:flex-row items-center justify-end gap-3">
          {isFormBlocked ? (
            <div className="w-full p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm font-bold flex items-center justify-center gap-2 text-center">
              <Lock className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>Pendaftaran Dikunci: Nomor KK terdaftar pada {blockedSourcesLabel}. Formulir pendaftaran otomatis ditutup.</span>
            </div>
          ) : (
            <Button 
              type="submit" 
              disabled={loading} 
              size="lg"
              className="w-full sm:w-auto min-w-[240px] h-12 rounded-2xl font-black uppercase tracking-wider shadow-xl shadow-primary/20 text-white bg-primary hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Menyimpan Pendaftaran...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Kirim Data Pendaftaran</span>
                </>
              )}
            </Button>
          )}
        </div>
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
              Data pelaku usaha telah tercatat di sistem SIMPU dan sedang dalam antrean verifikasi.
            </DialogDescription>
          </div>

          <div className="p-6 space-y-5" ref={printReceiptRef}>
            {/* Nomor Registrasi Card */}
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

            {/* Ringkasan Data */}
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

            {/* Print & Status Buttons */}
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
