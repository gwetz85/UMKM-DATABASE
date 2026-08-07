"use client"

import { useState, useEffect, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject, deleteDocumentNonBlocking } from "@/firebase"
import { ref, query, equalTo, orderByChild } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Printer, Edit3, Loader2, Save, RotateCcw, User, CreditCard, History, Building2, MapPin, BadgeCheck, FileText, Search, Trash2, Folder, FileSpreadsheet } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { cn, extractDobFromNik, parsePobDob, calculateAge } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import * as XLSX from 'xlsx'

export default function FinishPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <FinishContent />
    </Suspense>
  )
}

function FinishContent() {
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const filterCoordinator = searchParams.get('coordinator')

  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState<string>("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const [revertPending, setRevertPending] = useState<{ actorId: string; fullName: string } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePending, setDeletePending] = useState<{ actorId: string; fullName: string } | null>(null)
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
  }, [viewingActor])

  // ── Firebase ──────────────────────────────────────────────────────────────
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isKoordinator = userProfile?.role === 'koordinator'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('finish'))
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)

  const actors = allActorsRaw
    ? allActorsRaw
        .filter(a => {
          const matchesSearch =
            a.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.nik?.includes(searchQuery)
          const matchesCategory = !category || a.businessCategory === category
          if (isKoordinator) {
            if (!a.coordinator || !userProfile?.fullName) return false
            return matchesSearch && matchesCategory && a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase()
          }
          if (filterCoordinator) {
            return matchesSearch && matchesCategory && a.coordinator === filterCoordinator
          }
          return matchesSearch && matchesCategory
        })
        .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
    : undefined

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrintActor = (actor: BusinessActor) => {
    const a = actor as any
    const sd = a.surveyData || {}
    const parsed = parsePobDob(actor.pobDob || "")
    const dob = actor.dob || parsed.dob || "-"
    const pob = actor.pob || parsed.pob || "-"
    const regCode = actor.registrationCode || '-'

    const row = (label: string, value: string | undefined) =>
      `<tr><td class="lbl">${label}</td><td class="sep">:</td><td class="val">${value || '-'}</td></tr>`

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Formulir Biodata - ${actor.fullName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Arial',sans-serif;font-size:11px;color:#222;background:white;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:15mm;}
  .kop{display:flex;align-items:center;justify-content:center;gap:20px;padding-bottom:10px;}
  .kop-logo img{width:80px;height:auto;object-fit:contain;}
  .kop-center{text-align:center;padding-top:4px;}
  .kop-center .org{font-size:16px;font-weight:bold;color:#1565C0;text-transform:uppercase;letter-spacing:0.5px;}
  .kop-center .sub{font-size:10px;font-weight:bold;color:#555;text-transform:uppercase;margin-top:4px;}
  .kop-line{height:2px;background:#1565C0;margin-top:2px;margin-bottom:20px;}
  .judul-row{text-align:center;margin-bottom:20px;}
  .judul-text{font-size:16px;font-weight:bold;text-transform:uppercase;color:#1565C0;letter-spacing:0.5px;}
  .judul-underline{width:90px;height:4px;background:#4285F4;margin:6px auto 0 auto;}
  .section{margin-bottom:12px;page-break-inside:avoid;}
  .sec-hdr{background:#EEF5FF;color:#1565C0;font-weight:bold;font-size:11px;padding:6px 12px;text-transform:uppercase;}
  .sec-body{padding:0;}
  table{width:100%;border-collapse:collapse;}
  td.lbl{width:30%;font-weight:bold;font-size:11px;padding:7px 12px;color:#222;}
  td.sep{width:10px;padding:7px 2px;color:#555;}
  td.val{font-size:11px;padding:7px 12px;color:#555;text-transform:uppercase;}
  tr{border-bottom:1px solid #F0F0F0;page-break-inside:avoid;}
  tr:last-child{border-bottom:none;}
  .stbl{width:100%;border-collapse:collapse;font-size:11px;}
  .stbl th,.stbl td{padding:7px 12px;border-bottom:1px solid #F0F0F0;}
  .stbl th{font-weight:bold;color:#222;text-align:left;width:25%;}
  .stbl td{color:#555;text-transform:uppercase;}
  .lpj-box{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;}
  .lpj-nom{font-size:16px;font-weight:bold;color:#1565C0;}
  .lpj-badge{background:#E8F5E9;color:#2E7D32;font-weight:bold;font-size:10px;padding:6px 14px;border:1px solid #81C784;border-radius:4px;}
  .footer{margin-top:15px;border-top:1px solid #F0F0F0;padding-top:10px;text-align:center;font-size:9px;color:#888;}
  @media print{
    @page{size:A4;margin:15mm;}
    .page{width:100%;min-height:auto;margin:0;padding:0;}
    .sec-hdr{background:#EEF5FF !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  }
</style>
</head>
<body>
<div class="page">
<div class="kop">
  <div class="kop-logo"><img src="${window.location.origin}/logo-tunas-bangsa.png" alt="Logo"/></div>
  <div class="kop-center">
    <div class="org">Tunas Bangsa Kepulauan Riau</div>
    <div class="sub">Pengajuan Bantuan UMKM Tahun 2026</div>
  </div>
</div>
<div class="kop-line"></div>
<div class="judul-row">
  <div class="judul-text">Formulir Biodata Pelaku Usaha</div>
  <div class="judul-underline"></div>
</div>

<div class="section">
  <div class="sec-hdr">I. DATA PRIBADI PELAKU USAHA</div>
  <div class="sec-body"><table>
    ${row('Nomor Registrasi', regCode)}
    ${row('Nama Lengkap', actor.fullName)}
    ${row('NIK', actor.nik)}
    ${row('Nomor Kartu Keluarga', actor.noKK)}
    ${row('Jenis Kelamin', actor.gender)}
    ${row('Tempat Lahir', pob)}
    ${row('Tanggal Lahir', dob)}
    ${row('Nomor HP / WhatsApp', actor.phone)}
    ${row('Kecamatan / Kelurahan', (actor.kecamatan && actor.kelurahan) ? actor.kecamatan + ' / ' + actor.kelurahan : (actor.kecamatan || actor.kelurahan || '-'))}
    ${row('RT / RW', actor.rtRw)}
    ${row('Alamat Domisili Lengkap', actor.address)}
  </table></div>
</div>

<div class="section">
  <div class="sec-hdr">II. INFORMASI USAHA</div>
  <div class="sec-body"><table>
    ${row('Nama Usaha', actor.businessName)}
    ${row('Kategori Usaha', actor.businessCategory)}
    ${row('Alamat / Lokasi Usaha', actor.businessLocation)}
    ${row('Pengusul / Koordinator', actor.coordinator)}
  </table></div>
</div>

<div class="section">
  <div class="sec-hdr">III. DATA KEUANGAN / PERBANKAN</div>
  <div class="sec-body"><table>
    ${row('Nama Bank', actor.bankName)}
    ${row('Nomor Rekening', actor.bankNumber)}
    ${row('Nama Pemilik Rekening', actor.bankOwner)}
  </table></div>
</div>

<div class="section">
  <div class="sec-hdr">IV. HASIL SURVEY DINAS</div>
  <div class="sec-body"><table class="stbl">
    <tr><th>Petugas Survey</th><td>${actor.petugasSurvey || sd.namaPemilik || '-'}</td><th>Petugas Verifikator</th><td>${actor.createdBy || 'Admin'}</td></tr>
    <tr><th>Bidang Usaha</th><td>${sd.bidangUsaha || '-'}</td><th>Tahun Berdiri</th><td>${sd.tahunBerdiri || '-'}</td></tr>
    <tr><th>Peralatan Usaha</th><td>${sd.peralatan || '-'}</td><th>Email</th><td>${sd.email || '-'}</td></tr>
    <tr><th>Sosial Media</th><td>${sd.sosmed || '-'}</td><th>Status DTKS</th><td>${sd.dtks?.masuk ? 'Ya (' + (sd.dtks.jenis || 'DTKS') + ')' : 'Tidak'}</td></tr>
    <tr><th>Modal Usaha</th><td>${sd.modalUsaha || '-'}</td><th>Omset / Bulan</th><td>${sd.omset || '-'}</td></tr>
    <tr><th>Izin Usaha</th><td colspan="3">${Array.isArray(sd.izin) ? sd.izin.join(', ') : (sd.izin || '-')}</td></tr>
    <tr><th>Riwayat Hibah</th><td colspan="3">${sd.hibah?.pernah ? 'Pernah (Dari: ' + (sd.hibah.dariMana || '-') + ', Tahun: ' + (sd.hibah.tahun || '-') + ')' : 'Belum Pernah'}</td></tr>
    <tr><th>Rencana Penggunaan</th><td colspan="3">${sd.rencanaPenggunaan || '-'}</td></tr>
    <tr><th>Hasil Survey</th><td colspan="3" style="font-weight:bold;color:#1565C0;">${sd.hasilSurvey || 'Lolos Verifikasi Dinas'}</td></tr>
  </table></div>
</div>

${(a.verificationLocationDinas || a.verificationLocation) ? `
<div class="section">
  <div class="sec-hdr">V. TITIK MAP SURVEY &amp; KOORDINAT GPS</div>
  <div class="sec-body"><table>
    ${row('Koordinat GPS', (a.verificationLocationDinas || a.verificationLocation).lat + ', ' + (a.verificationLocationDinas || a.verificationLocation).lon)}
    ${row('Link Google Maps', 'https://maps.google.com/?q=' + (a.verificationLocationDinas || a.verificationLocation).lat + ',' + (a.verificationLocationDinas || a.verificationLocation).lon)}
  </table></div>
</div>` : ''}

<div class="section">
  <div class="sec-hdr">VI. BERKAS TAMBAHAN &amp; FOTO SURVEY</div>
  <div class="sec-body" style="padding:10px 12px;">
    ${actor.googleDriveLink ? `<div style="margin-bottom:8px;"><strong>Link Google Drive Berkas:</strong> <a href="${actor.googleDriveLink}" target="_blank" style="color:#1565C0;">${actor.googleDriveLink}</a></div>` : ''}
    ${sd.fotoSurveyUrl ? `<div style="margin-bottom:4px;"><strong>Foto Survey Lapangan:</strong></div><div><img src="${sd.fotoSurveyUrl}" alt="Foto Survey" style="max-width:100%;max-height:220px;border-radius:6px;border:1px solid #ccc;object-fit:cover;"/></div>` : '<div style="color:#777;">Tidak ada foto survey yang diupload.</div>'}
  </div>
</div>

<div class="section">
  <div class="sec-hdr">VII. LAPORAN PERTANGGUNG JAWABAN (LPJ)</div>
  <div class="sec-body">
    <div class="lpj-box">
      <div>
        <div style="font-size:10px;font-weight:bold;text-transform:uppercase;color:#555;margin-bottom:3px;">Nominal Dana Terlaporkan</div>
        <div class="lpj-nom">Rp ${(actor.lpjNominal || 0).toLocaleString('id-ID')}</div>
      </div>
      <div class="lpj-badge">&#10003; TELAH TERVERIFIKASI</div>
    </div>
  </div>
</div>

<div class="footer">
  Sistem Informasi SIMPU &bull; Dicetak: ${new Date().toLocaleString('id-ID')} &bull; Kode Reg: ${regCode}
</div>
</div>
</body>
</html>`

    // Gunakan hidden iframe agar tidak terkena popup blocker
    let iframe = document.getElementById('__print_iframe__') as HTMLIFrameElement | null
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = '__print_iframe__'
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;'
      document.body.appendChild(iframe)
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) return

    iframeDoc.open()
    iframeDoc.write(htmlContent)
    iframeDoc.close()

    setTimeout(() => {
      iframe!.contentWindow?.focus()
      iframe!.contentWindow?.print()
    }, 500)
  }

  // ── Excel Export ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    try {
      if (!actors || actors.length === 0) {
        toast({ variant: "destructive", title: "Data Kosong", description: "Tidak ada data selesai untuk di-export." })
        return
      }

      const exportData = actors.map((actor, index) => {
        const a = actor as any
        const sd = a.surveyData || {}
        const parsed = parsePobDob(actor.pobDob || "")
        const dob = actor.dob || parsed.dob || "-"
        const pob = actor.pob || parsed.pob || "-"
        const locationGps = a.verificationLocationDinas
          ? `${a.verificationLocationDinas.lat}, ${a.verificationLocationDinas.lon}`
          : (a.verificationLocation ? `${a.verificationLocation.lat}, ${a.verificationLocation.lon}` : "-")
        const mapsUrl = a.verificationLocationDinas
          ? `https://maps.google.com/?q=${a.verificationLocationDinas.lat},${a.verificationLocationDinas.lon}`
          : (a.verificationLocation ? `https://maps.google.com/?q=${a.verificationLocation.lat},${a.verificationLocation.lon}` : "-")

        let dtksStatus = "Tidak"
        if (sd.dtks && typeof sd.dtks === 'object' && sd.dtks.masuk) {
          dtksStatus = `Ya (${sd.dtks.jenis || 'DTKS'})`
        } else if (typeof sd.dtks === 'string') {
          dtksStatus = sd.dtks
        }

        let hibahStatus = "Belum Pernah"
        if (sd.hibah && typeof sd.hibah === 'object' && sd.hibah.pernah) {
          hibahStatus = `Pernah (${sd.hibah.dariMana || '-'}, ${sd.hibah.tahun || '-'})`
        } else if (typeof sd.hibah === 'string') {
          hibahStatus = sd.hibah
        }

        let rawFoto = sd.fotoSurveyUrl || "-"
        if (typeof rawFoto === 'string' && rawFoto.startsWith('data:')) {
          rawFoto = "[FOTO BASE64]"
        }

        return {
          "NO": index + 1,
          "NOMOR REGISTRASI": actor.registrationCode || "-",
          "NAMA LENGKAP": actor.fullName || "-",
          "NIK": actor.nik || "-",
          "NOMOR KK": actor.noKK || "-",
          "JENIS KELAMIN": actor.gender || "-",
          "TEMPAT LAHIR": pob,
          "TANGGAL LAHIR": dob,
          "NOMOR HP / WA": actor.phone || "-",
          "ALAMAT LENGKAP": actor.address || "-",
          "RT / RW": actor.rtRw || "-",
          "KELURAHAN": actor.kelurahan || "-",
          "KECAMATAN": actor.kecamatan || "-",
          "NAMA USAHA": actor.businessName || "-",
          "KATEGORI USAHA": actor.businessCategory || "-",
          "LOKASI USAHA": actor.businessLocation || "-",
          "PENGUSUL / KOORDINATOR": actor.coordinator || "-",
          "NAMA BANK": actor.bankName || "-",
          "NOMOR REKENING": actor.bankNumber || "-",
          "PEMILIK REKENING": actor.bankOwner || "-",
          "PETUGAS SURVEY": actor.petugasSurvey || sd.namaPemilik || "-",
          "PETUGAS VERIFIKATOR": actor.createdBy || "Admin",
          "BIDANG USAHA (SURVEY)": sd.bidangUsaha || "-",
          "TAHUN BERDIRI": sd.tahunBerdiri || "-",
          "PERALATAN USAHA": sd.peralatan || "-",
          "IZIN USAHA": Array.isArray(sd.izin) ? sd.izin.join(", ") : (sd.izin || "-"),
          "MODAL USAHA": sd.modalUsaha || "-",
          "OMSET PER BULAN": sd.omset || "-",
          "STATUS DTKS": dtksStatus,
          "RIWAYAT HIBAH": hibahStatus,
          "RENCANA PENGGUNAAN": sd.rencanaPenggunaan || "-",
          "HASIL REKOMENDASI SURVEY": sd.hasilSurvey || "-",
          "LINK GOOGLE DRIVE BERKAS": actor.googleDriveLink || "-",
          "URL FOTO SURVEY": rawFoto,
          "KOORDINAT MAP GPS": locationGps,
          "LINK GOOGLE MAPS": mapsUrl,
          "STATUS LPJ": actor.lpjNominal ? "TELAH TERVERIFIKASI" : "BELUM LPJ",
          "NOMINAL LPJ (RP)": actor.lpjNominal || 0,
        }
      })

      // Sanitize all cell text values to ensure none exceed 32000 characters (Excel limit is 32767)
      const safeExportData = exportData.map(row => {
        const cleaned: Record<string, any> = {}
        for (const [k, v] of Object.entries(row)) {
          if (typeof v === 'string') {
            if (v.startsWith('data:')) {
              cleaned[k] = '[DATA BASE64]'
            } else if (v.length > 32000) {
              cleaned[k] = v.substring(0, 32000) + '...'
            } else {
              cleaned[k] = v
            }
          } else {
            cleaned[k] = v
          }
        }
        return cleaned
      })

      const worksheet = XLSX.utils.json_to_sheet(safeExportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Selesai UMKM")

      const colWidths = Object.keys(exportData[0] || {}).map(key => ({ wch: Math.max(key.length + 3, 16) }))
      worksheet["!cols"] = colWidths

      const nowStr = new Date().toISOString().split("T")[0]
      const filename = `Data_Selesai_UMKM_${nowStr}.xlsx`

      try {
        XLSX.writeFile(workbook, filename)
      } catch (err) {
        console.warn("XLSX.writeFile fallback trigger:", err)
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      }

      toast({ title: "✅ Export Berhasil", description: `${exportData.length} data berhasil di-export ke Excel.` })
    } catch (error: any) {
      console.error("Export Excel Exception:", error)
      toast({ variant: "destructive", title: "Gagal Export", description: error?.message || "Terjadi kesalahan saat membuat file Excel." })
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleSaveFullEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAdmin || !database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    const lpjVal = formData.get('lpjNominal') as string
    const lpjNum = lpjVal ? parseInt(lpjVal) : viewingActor.lpjNominal || 0

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
      lpjNominal: lpjNum,
    }

    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)
    toast({ title: "Tersimpan", description: "Data pelaku usaha berhasil diperbarui." })
    setIsEditMode(false)
    setViewingActor({ ...viewingActor, ...updates } as BusinessActor)
  }

  // ── Revert ────────────────────────────────────────────────────────────────
  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setRevertPending({ actorId, fullName })
    setShowRevertDialog(true)
  }

  const executeRevert = () => {
    if (!revertPending || !database) return
    const { actorId, fullName } = revertPending
    const actorObj = allActorsRaw?.find(a => a.id === actorId)
    updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), { status: 'pending' })
    if (actorObj) {
      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        updateStatsOnStatusChange(database, 'finish', 'pending', actorObj).catch(e => console.error(e))
      })
    }
    toast({ title: "Berhasil", description: `Data ${fullName} dikembalikan ke Pending.` })
    setViewingActor(null)
    setShowRevertDialog(false)
    setRevertPending(null)
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setDeletePending({ actorId, fullName })
    setShowDeleteDialog(true)
  }

  const executeDelete = () => {
    if (!deletePending || !database) return
    const { actorId, fullName } = deletePending
    const actorObj = allActorsRaw?.find(a => a.id === actorId)
    deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
    if (actorObj) {
      import("@/lib/stats-service").then(({ updateStatsOnDelete }) => {
        updateStatsOnDelete(database, actorObj).catch(e => console.error(e))
      })
    }
    toast({ title: "Data Dihapus", description: `Data ${fullName} telah dihapus dari sistem.` })
    setViewingActor(null)
    setShowDeleteDialog(false)
    setDeletePending(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-card/80 backdrop-blur sticky top-0 z-10 shrink-0">
        <SidebarTrigger />
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-green-600 shrink-0" />
            <h1 className="font-black text-base md:text-lg uppercase text-green-700">Data Selesai</h1>
            <Badge className="bg-green-600 text-white font-black text-xs">{actors?.length ?? 0}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:ml-4">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama / NIK / usaha…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="h-8 text-xs px-2 rounded-md border border-input bg-background"
            >
              <option value="">Semua Kategori</option>
              <option value="Kuliner">Kuliner</option>
              <option value="Bukan Kuliner">Bukan Kuliner</option>
            </select>
          </div>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            className="border-green-500 text-green-700 font-bold hover:bg-green-50 text-xs shrink-0"
            disabled={!actors || actors.length === 0}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Export Excel
          </Button>
        )}
      </header>

      {/* Card Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {actors?.map(actor => (
              <Card
                key={actor.id}
                className="cursor-pointer hover:shadow-lg hover:border-green-400 transition-all group border-green-100"
                onClick={() => setViewingActor(actor)}
              >
                <CardContent className="p-3 flex flex-col gap-1.5 h-full">
                  <div className="flex-1">
                    <p className="text-[11px] font-black uppercase line-clamp-2 leading-tight text-green-800 group-hover:text-green-600" title={actor.businessName}>
                      {actor.businessName || "NAMA USAHA KOSONG"}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase line-clamp-1 font-bold flex items-center gap-1 mt-1" title={actor.fullName}>
                      <User className="w-3 h-3 shrink-0" /> {actor.fullName}
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                      NIK: {actor.nik || "-"}
                    </p>
                    {actor.bankName && (
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {actor.bankName} · {actor.bankNumber}
                      </p>
                    )}
                  </div>
                  <div className="text-[9px] font-black uppercase bg-green-500 text-white w-full justify-center shrink-0 mt-auto rounded-full py-0.5 px-2 flex items-center">
                    SELESAI
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!actors || actors.length === 0) && (
              <div className="col-span-full py-20 text-center text-muted-foreground grid place-items-center">
                <BadgeCheck className="w-12 h-12 mb-4 opacity-20" />
                <p>Tidak ada data selesai yang ditemukan.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!viewingActor} onOpenChange={(open) => {
        if (!open) { setViewingActor(null); setIsEditMode(false) }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingActor && (
            <div className="flex flex-col gap-2 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
                <DialogTitle className="text-xl md:text-2xl font-black text-green-700 uppercase">
                  {isEditMode ? "Edit Data Selesai" : "Detail Lengkap Data Final"}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  {!isEditMode && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintActor(viewingActor)}
                      className="border-green-600 text-green-700 font-bold hover:bg-green-50"
                    >
                      <Printer className="w-4 h-4 mr-2" /> Cetak Data Pengajuan
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant={isEditMode ? "outline" : "default"}
                      size="sm"
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={cn("font-bold", isEditMode ? "border-amber-500 text-amber-600" : "bg-primary")}
                    >
                      {isEditMode ? "Batal Edit" : <><Edit3 className="w-4 h-4 mr-2" />Edit Semua Data</>}
                    </Button>
                  )}
                  {isAdmin && !isEditMode && (
                    <Button size="sm" variant="outline" onClick={() => handleRevert(viewingActor.id, viewingActor.fullName)} className="border-amber-500 text-amber-600 font-bold" title="Kembalikan ke Pending">
                      <RotateCcw className="w-4 h-4 mr-1" /> <span className="md:hidden">Revert</span>
                    </Button>
                  )}
                  {isAdmin && !isEditMode && (
                    <Button size="sm" variant="outline" onClick={() => handleDelete(viewingActor.id, viewingActor.fullName)} className="border-red-500 text-red-600 font-bold hover:bg-red-50" title="Hapus Data">
                      <Trash2 className="w-4 h-4 mr-1" /> <span className="md:hidden">Hapus</span>
                    </Button>
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
                        <Input name="nik" value={editNik} required onChange={(e) => {
                          const clean = e.target.value.replace(/[^0-9]/g, "")
                          setEditNik(clean)
                          if (clean.length >= 12) {
                            const ex = extractDobFromNik(clean)
                            if (ex) setEditDob(ex)
                          } else setEditDob("")
                        }} />
                      </div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor KK</Label><Input name="noKK" defaultValue={viewingActor.noKK} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Jenis Kelamin</Label>
                        <select name="gender" defaultValue={viewingActor.gender || ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                          <option value="L">Laki-Laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Tempat Lahir</Label><Input name="pob" value={editPob} onChange={e => setEditPob(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Tanggal Lahir (Otomatis)</Label><Input name="dob" value={editDob} readOnly className="bg-muted font-semibold" /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor HP</Label><Input name="phone" defaultValue={viewingActor.phone} /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat &amp; Domisili (Edit)</div>
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
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan &amp; LPJ (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Bank</Label><Input name="bankName" defaultValue={viewingActor.bankName} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor Rekening</Label><Input name="bankNumber" defaultValue={viewingActor.bankNumber} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Pemilik Rekening</Label><Input name="bankOwner" defaultValue={viewingActor.bankOwner} className="uppercase" /></div>
                      <div className="space-y-1 md:col-span-3 pt-2">
                        <Label className="text-xs font-bold uppercase text-emerald-600">Nominal LPJ Terlaporkan</Label>
                        <Input name="lpjNominal" type="number" defaultValue={viewingActor.lpjNominal || 0} className="font-mono" />
                      </div>
                    </div>
                  </section>

                  <div className="sticky bottom-0 bg-white dark:bg-zinc-950 p-4 border-t flex justify-end gap-2 mt-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] rounded-b-lg z-10">
                    <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} className="font-bold">Batal</Button>
                    <Button type="submit" className="bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</Button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-6 py-4">
                  {/* Informasi Pribadi */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Nama Lengkap", value: viewingActor.fullName },
                        { label: "NIK", value: viewingActor.nik },
                        { label: "Nomor KK", value: viewingActor.noKK },
                        { label: "Jenis Kelamin", value: viewingActor.gender },
                        { label: "Tempat Lahir", value: viewingActor.pob || parsePobDob(viewingActor.pobDob).pob },
                        { label: "Tanggal Lahir", value: viewingActor.dob || parsePobDob(viewingActor.pobDob).dob },
                        { label: "Usia", value: calculateAge(viewingActor.dob || parsePobDob(viewingActor.pobDob).dob || extractDobFromNik(viewingActor.nik || "")) },
                        { label: "Nomor HP", value: viewingActor.phone, isPhone: true },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          {(item as any).isPhone && item.value ? (
                            <a href={`https://wa.me/${String(item.value).replace(/\D/g, "").replace(/^0/, "62")}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-green-600 hover:underline flex items-center gap-1">
                              {item.value}
                            </a>
                          ) : (
                            <p className="text-sm font-bold">{item.value || "-"}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Alamat */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat &amp; Domisili</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Kecamatan", value: viewingActor.kecamatan },
                        { label: "Kelurahan", value: viewingActor.kelurahan },
                        { label: "RT/RW", value: viewingActor.rtRw },
                        { label: "Alamat Lengkap", value: viewingActor.address, fullWidth: true },
                      ].map((item, i) => (
                        <div key={i} className={item.fullWidth ? "md:col-span-3 space-y-1" : "space-y-1"}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Usaha */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Nama Usaha", value: viewingActor.businessName },
                        { label: "Kategori Usaha", value: viewingActor.businessCategory },
                        { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                        { label: "Pengusul / Koordinator", value: viewingActor.coordinator },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Titik Lokasi */}
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
                          <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Sumber: Bypass Admin</p>
                          <p className="text-xs text-amber-800 font-medium mb-2">Alasan: {(viewingActor as any).verificationBypass.reason}</p>
                          {(viewingActor as any).verificationBypass.fileBase64 && (
                            <a href={(viewingActor as any).verificationBypass.fileBase64} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-amber-200 text-amber-800 px-3 py-1 rounded hover:bg-amber-300 transition-colors inline-block mt-1">Lihat Bukti Lampiran</a>
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

                  {/* Perbankan */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                      {[
                        { label: "Nama Bank", value: viewingActor.bankName },
                        { label: "Nomor Rekening", value: viewingActor.bankNumber, isMono: true },
                        { label: "Nama Pemilik Rekening", value: viewingActor.bankOwner, isUpper: true },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className={cn("text-sm font-black text-primary", item.isMono && "font-mono text-lg", item.isUpper && "uppercase")}>{item.value || "BELUM TERISI"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* LPJ */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-sm uppercase border-b pb-1">
                      <FileText className="w-4 h-4" /> Laporan Pertanggung Jawaban (LPJ)
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Nominal Terlaporkan</p>
                        <p className="text-3xl font-black text-emerald-600 font-mono">RP {viewingActor.lpjNominal?.toLocaleString('id-ID') || "0"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-emerald-800 uppercase">Status Verifikasi LPJ</p>
                        <Badge className="bg-emerald-600 font-black uppercase text-[10px] mt-1 px-4 py-1 hover:bg-emerald-600">TELAH TERVERIFIKASI</Badge>
                      </div>
                    </div>
                  </section>

                  {/* Google Drive */}
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

                  {/* Audit */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Informasi Sistem &amp; Audit</div>
                    <div className="bg-slate-50 p-4 rounded-xl text-xs font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Status Terakhir</p>
                        <p className="capitalize text-primary">{viewingActor.status?.replace('_', ' ')}</p>
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
        </DialogContent>
      </Dialog>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={showRevertDialog}
        onOpenChange={(open) => { setShowRevertDialog(open); if (!open) setRevertPending(null) }}
        icon={<RotateCcw className="w-6 h-6" />}
        title="Kembalikan ke Pending?"
        description={`Kembalikan ${revertPending?.fullName || ''} ke antrean awal (Pending)?`}
        confirmText="Ya, Kembalikan"
        confirmIcon={<RotateCcw className="w-4 h-4" />}
        variant="default"
        onConfirm={executeRevert}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setDeletePending(null) }}
        icon={<Trash2 className="w-6 h-6" />}
        title="Hapus Permanen?"
        description={`HAPUS PERMANEN data ${deletePending?.fullName || ''}? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        variant="destructive"
        onConfirm={executeDelete}
      />
    </div>
  )
}
