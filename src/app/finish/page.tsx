"use client"

import { useState, useEffect, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject, deleteDocumentNonBlocking } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Printer, Edit3, Loader2, Save, RotateCcw, Eye, User, CreditCard, History, X, Building2, MapPin, BadgeCheck, FileText, Search, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { cn, extractDobFromNik, parsePobDob, calculateAge } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"

function FinishContent() {
  const { user } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterCoordinator = searchParams.get('coordinator')
  
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState<string>("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [printDate, setPrintDate] = useState<string>("")

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('id-ID'))
  }, [])

  const handlePrintActor = (actor: BusinessActor) => {
    const a = actor as any
    const sd = a.surveyData || {}
    const parsed = parsePobDob(actor.pobDob || "")
    const dob = actor.dob || parsed.dob || "-"
    const pob = actor.pob || parsed.pob || "-"
    const regCode = (actor.id || '00000000').slice(-8).toUpperCase()
    const barcodeStr = regCode.split('').map((c: string) => c.charCodeAt(0).toString(2).padStart(7,'0')).join('')
    const barcodeSvg = `<svg width="120" height="40" xmlns="http://www.w3.org/2000/svg">${barcodeStr.split('').map((bit: string, i: number) =>
      bit === '1' ? `<rect x="${i*1.1}" y="0" width="1" height="40" fill="black"/>` : ''
    ).join('')}</svg>`
    const row = (label: string, value: string | undefined) =>
      `<tr><td class="lbl">${label}</td><td class="sep">:</td><td class="val">${value || '-'}</td></tr>`
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Formulir Biodata - ${actor.fullName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;font-size:11px;color:#222;background:white;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:12mm 14mm 10mm 14mm;}
  .kop{display:flex;align-items:center;gap:10px;padding-bottom:8px;}
  .kop-logo-placeholder{width:68px;height:68px;border:2px solid #1565C0;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:7px;font-weight:900;color:#1565C0;text-align:center;line-height:1.2;background:#EBF5FB;flex-shrink:0;}
  .kop-center{flex:1;padding-left:4px;}
  .kop-center .org{font-size:15px;font-weight:900;color:#1565C0;text-transform:uppercase;letter-spacing:0.5px;}
  .kop-center .sub{font-size:10px;font-weight:700;color:#1565C0;text-transform:uppercase;margin-top:1px;}
  .kop-right{text-align:center;min-width:110px;}
  .kop-right .reg-code{font-size:12px;font-weight:900;font-family:monospace;letter-spacing:2px;margin-top:2px;}
  .kop-right .reg-label{font-size:8px;color:#555;letter-spacing:1px;text-transform:uppercase;}
  .kop-line{height:3px;background:linear-gradient(to right,#1565C0 70%,#4CAF50 100%);margin-top:6px;margin-bottom:14px;}
  .judul-row{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:16px;}
  .judul-text{font-size:17px;font-weight:900;text-transform:uppercase;letter-spacing:1px;text-align:center;}
  .judul-underline{width:60px;height:3px;background:#1565C0;margin:4px auto 0 auto;}
  .no-badge{background:#1565C0;color:white;font-weight:900;font-size:11px;padding:5px 16px;border-radius:20px;white-space:nowrap;}
  .section{margin-bottom:0;}
  .sec-hdr{background:#BBDEFB;color:#0D47A1;font-weight:900;font-size:11px;padding:6px 10px;border:1px solid #90CAF9;letter-spacing:0.3px;}
  .sec-body{border:1px solid #90CAF9;border-top:none;}
  table{width:100%;border-collapse:collapse;}
  td.lbl{width:200px;font-weight:700;font-size:11px;padding:6px 10px;vertical-align:top;color:#222;}
  td.sep{width:16px;padding:6px 2px;color:#222;font-weight:700;}
  td.val{font-size:11px;padding:6px 8px;color:#222;border-bottom:1px solid #E3F2FD;}
  tr:last-child td{border-bottom:none;}
  tr:nth-child(even) td{background:#F8FCFF;}
  .stbl{width:100%;border-collapse:collapse;font-size:10.5px;}
  .stbl th,.stbl td{border:1px solid #90CAF9;padding:5px 8px;}
  .stbl th{background:#BBDEFB;color:#0D47A1;font-weight:700;text-transform:uppercase;font-size:9.5px;width:35%;}
  .stbl tr:nth-child(even) td{background:#F8FCFF;}
  .stbl .highlight-th{background:#C8E6C9;color:#1B5E20;}
  .stbl .highlight-td{background:#F1F8E9;font-weight:700;color:#1B5E20;}
  .lpj-box{display:flex;justify-content:space-between;align-items:center;background:#E8F5E9;border:2px solid #66BB6A;border-radius:4px;padding:10px 16px;}
  .lpj-nom{font-size:22px;font-weight:900;color:#2E7D32;}
  .lpj-badge{background:#2E7D32;color:white;font-weight:900;font-size:10px;padding:5px 14px;border-radius:4px;}
  .ttd-row{display:flex;justify-content:space-between;gap:10px;margin-top:20px;}
  .ttd-col{flex:1;text-align:center;border:1px solid #ccc;padding:10px 6px 6px 6px;border-radius:4px;}
  .ttd-title{font-size:10px;font-weight:900;text-transform:uppercase;margin-bottom:2px;}
  .ttd-sub{font-size:8.5px;color:#666;margin-bottom:55px;}
  .ttd-name{border-top:1px solid #333;padding-top:3px;font-size:9px;font-weight:700;}
  .footer{margin-top:12px;border-top:1px solid #ddd;padding-top:5px;text-align:center;font-size:8px;color:#aaa;}
  @media print{.page{margin:0;padding:8mm 10mm;}body{background:white;}}
</style>
</head>
<body>
<div class="page">
<div class="kop">
  <div class="kop-logo-placeholder">TUNAS<br/>BANGSA<br/>KEPRI</div>
  <div class="kop-center">
    <div class="org">Tunas Bangsa Kepulauan Riau</div>
    <div class="sub">Pengajuan Bantuan UMKM Tahun 2026</div>
  </div>
  <div class="kop-right">
    ${barcodeSvg}
    <div class="reg-code">${regCode}</div>
    <div class="reg-label">Registration Code</div>
  </div>
</div>
<div class="kop-line"></div>
<div class="judul-row">
  <div>
    <div class="judul-text">Formulir Biodata Pelaku Usaha</div>
    <div class="judul-underline"></div>
  </div>
  <div class="no-badge">NO: ${actor.id?.slice(-4) || '1'}</div>
</div>
<div class="section">
  <div class="sec-hdr">I. DATA PRIBADI</div>
  <div class="sec-body"><table>
    ${row('Nama Lengkap', actor.fullName)}
    ${row('NIK', actor.nik)}
    ${row('Nomor Kartu Keluarga', actor.noKK)}
    ${row('Jenis Kelamin', actor.gender)}
    ${row('Tempat Lahir', pob)}
    ${row('Tanggal Lahir', dob)}
    ${row('Nomor HP / WhatsApp', actor.phone)}
    ${row('Kecamatan / Kelurahan', (actor.kecamatan && actor.kelurahan) ? actor.kecamatan + ' / ' + actor.kelurahan : (actor.kecamatan || actor.kelurahan || '-'))}
    ${row('Alamat Domisili', actor.address)}
  </table></div>
</div>
<div class="section" style="margin-top:8px;">
  <div class="sec-hdr">II. INFORMASI USAHA</div>
  <div class="sec-body"><table>
    ${row('Nama Usaha', actor.businessName)}
    ${row('Kategori Usaha', actor.businessCategory)}
    ${row('Lokasi Usaha', actor.businessLocation)}
    ${row('Korlap / Koordinator', actor.coordinator)}
  </table></div>
</div>
<div class="section" style="margin-top:8px;">
  <div class="sec-hdr">III. DATA PERBANKAN</div>
  <div class="sec-body"><table>
    ${row('Nama Bank', actor.bankName)}
    ${row('Nomor Rekening', actor.bankNumber)}
    ${row('Nama Pemilik Rekening', actor.bankOwner)}
  </table></div>
</div>
<div class="section" style="margin-top:8px;">
  <div class="sec-hdr">IV. HASIL SURVEY DINAS</div>
  <div class="sec-body" style="padding:0;"><table class="stbl">
    <tr><th>Bidang Usaha</th><td>${sd.bidangUsaha||'-'}</td><th>Tahun Berdiri</th><td>${sd.tahunBerdiri||'-'}</td></tr>
    <tr><th>Peralatan Usaha</th><td>${sd.peralatan||'-'}</td><th>Email</th><td>${sd.email||'-'}</td></tr>
    <tr><th>Sosial Media</th><td>${sd.sosmed||'-'}</td><th>DTKS</th><td>${sd.dtks?.masuk?'Ya ('+sd.dtks.jenis+')':'Tidak'}</td></tr>
    <tr><th>Modal Usaha</th><td>${sd.modalUsaha||'-'}</td><th>Omset / Bulan</th><td>${sd.omset||'-'}</td></tr>
    <tr><th>Izin yang Dimiliki</th><td colspan="3">${(sd.izin||[]).join(', ')||'-'}</td></tr>
    <tr><th>Pernah Terima Hibah?</th><td colspan="3">${sd.hibah?.pernah?'Ya (Dari: '+sd.hibah.dariMana+', Tahun: '+sd.hibah.tahun+')':'Tidak'}</td></tr>
    <tr><th>Rencana Penggunaan Dana</th><td colspan="3">${sd.rencanaPenggunaan||'-'}</td></tr>
    <tr><th class="highlight-th">Hasil Survey</th><td colspan="3" class="highlight-td">${sd.hasilSurvey||'-'}</td></tr>
  </table></div>
</div>
${a.verificationLocationDinas ? `
<div class="section" style="margin-top:8px;">
  <div class="sec-hdr">V. TITIK LOKASI GPS SURVEY</div>
  <div class="sec-body"><table>
    ${row('Koordinat GPS', a.verificationLocationDinas.lat + ', ' + a.verificationLocationDinas.lon)}
    ${row('Link Google Maps', 'maps.google.com/?q=' + a.verificationLocationDinas.lat + ',' + a.verificationLocationDinas.lon)}
  </table></div>
</div>` : ''}
<div class="section" style="margin-top:8px;">
  <div class="sec-hdr">VI. LAPORAN PERTANGGUNG JAWABAN (LPJ)</div>
  <div class="sec-body" style="padding:8px;">
    <div class="lpj-box">
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#2E7D32;margin-bottom:3px;">Nominal Dana Terlaporkan</div>
        <div class="lpj-nom">Rp ${(actor.lpjNominal||0).toLocaleString('id-ID')}</div>
      </div>
      <div class="lpj-badge">&#10003; Telah Terverifikasi</div>
    </div>
  </div>
</div>
<div class="ttd-row">
  <div class="ttd-col">
    <div class="ttd-title">Pelaku Usaha</div>
    <div class="ttd-sub">Yang bertanda tangan di bawah ini</div>
    <div class="ttd-name">(${actor.fullName?.toUpperCase()||'..............................'})</div>
  </div>
  <div class="ttd-col">
    <div class="ttd-title">Koordinator Lapangan</div>
    <div class="ttd-sub">Menyatakan data telah diperiksa</div>
    <div class="ttd-name">(${actor.coordinator?.toUpperCase()||'..............................'})</div>
  </div>
  <div class="ttd-col">
    <div class="ttd-title">Pejabat Verifikasi Dinas</div>
    <div class="ttd-sub">Menyatakan data telah diverifikasi</div>
    <div class="ttd-name">(..............................)</div>
  </div>
</div>
<div class="footer">Sistem Informasi DKUKM &bull; Dicetak: ${new Date().toLocaleString('id-ID')} &bull; Kode: ${regCode}</div>
</div></body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 600)
  }

  const adminRef = useMemoFirebase(() => {
  
  /* KOP SURAT */
  .kop { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #166534; padding-bottom: 10px; margin-bottom: 4px; }
  .kop-logo { width: 60px; height: 60px; border: 2px solid #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #166534; text-align: center; flex-shrink: 0; padding: 4px; }
  .kop-text { flex: 1; text-align: center; }
  .kop-text .instansi { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #333; }
  .kop-text .judul { font-size: 16px; font-weight: 900; text-transform: uppercase; color: #166534; letter-spacing: 1px; margin: 2px 0; }
  .kop-text .sub { font-size: 9px; color: #555; }
  .kop-right { width: 60px; text-align: right; font-size: 8px; color: #666; }

  /* JUDUL FORMULIR */
  .form-title { text-align: center; margin: 10px 0 8px 0; }
  .form-title h2 { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border: 2px solid #000; padding: 5px 20px; display: inline-block; }
  .form-title .nomor { font-size: 9px; color: #555; margin-top: 3px; }

  /* FOTO & DATA UTAMA */
  .header-row { display: flex; gap: 12px; margin-bottom: 10px; }
  .foto-col { width: 90px; flex-shrink: 0; }
  .foto-box { width: 90px; height: 115px; border: 1.5px solid #333; display: flex; align-items: center; justify-content: center; background: #f5f5f5; overflow: hidden; }
  .foto-box img { width: 100%; height: 100%; object-fit: cover; }
  .foto-label { text-align: center; font-size: 8px; margin-top: 3px; color: #555; }
  .data-col { flex: 1; }

  /* SECTION */
  .section { margin-bottom: 10px; }
  .section-hdr { background: #166534; color: white; font-weight: bold; font-size: 10px; text-transform: uppercase; padding: 4px 8px; letter-spacing: 0.5px; margin-bottom: 0; }
  .section-body { border: 1px solid #333; border-top: none; padding: 6px 8px; }

  /* TABLE */
  table { width: 100%; border-collapse: collapse; }
  td.lbl { width: 38%; font-weight: bold; font-size: 10px; padding: 3px 4px; vertical-align: top; white-space: nowrap; }
  td.sep { width: 3%; text-align: center; padding: 3px 2px; }
  td.val { font-size: 10px; padding: 3px 4px; border-bottom: 1px dotted #ccc; text-transform: uppercase; font-weight: 600; }
  td.full { text-transform: none; }
  tr:last-child td.val { border-bottom: none; }

  /* SURVEY TABLE */
  .survey-table { width: 100%; border-collapse: collapse; }
  .survey-table td, .survey-table th { border: 1px solid #aaa; padding: 4px 6px; font-size: 10px; }
  .survey-table th { background: #e8f5e9; font-weight: bold; text-transform: uppercase; font-size: 9px; width: 40%; }
  .survey-table tr:nth-child(even) td:last-child { background: #fafafa; }

  /* LPJ */
  .lpj-box { border: 2px solid #166534; border-radius: 4px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; }
  .lpj-nom { font-size: 20px; font-weight: 900; color: #166534; }
  .lpj-status { border: 2px solid #166534; padding: 4px 14px; font-weight: 900; font-size: 9px; color: #166534; text-transform: uppercase; border-radius: 4px; }

  /* TTD */
  .ttd-row { display: flex; justify-content: space-between; margin-top: 14px; gap: 10px; }
  .ttd-col { flex: 1; text-align: center; }
  .ttd-title { font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
  .ttd-sub { font-size: 9px; color: #555; margin-bottom: 60px; }
  .ttd-line { border-top: 1px solid #333; margin-top: 5px; padding-top: 3px; font-size: 9px; }

  /* FOTO SURVEY */
  .foto-survey-box { display: flex; gap: 12px; align-items: flex-start; }
  .foto-survey-img { max-width: 160px; max-height: 160px; border: 1.5px solid #aaa; border-radius: 4px; object-fit: contain; }
  .foto-survey-info { flex: 1; font-size: 10px; }

  /* FOOTER */
  .footer { margin-top: 10px; border-top: 1px solid #ccc; padding-top: 4px; text-align: center; font-size: 8px; color: #888; }

  @media print {
    .page { margin: 0; padding: 10mm 12mm; }
    body { background: white; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- KOP SURAT -->
  <div class="kop">
    <div class="kop-logo">DKUKM<br/>KEPRI</div>
    <div class="kop-text">
      <div class="instansi">Pemerintah Provinsi Kepulauan Riau</div>
      <div class="judul">Dinas Koperasi &amp; UMKM</div>
      <div class="sub">Jl. D.I. Panjaitan, Kota Tanjungpinang, Kepulauan Riau &nbsp;|&nbsp; Telp. (0771) 21000</div>
    </div>
    <div class="kop-right">No. Dok:<br/><strong>${actor.id?.slice(-6)?.toUpperCase() || 'XXXXXX'}</strong></div>
  </div>

  <!-- JUDUL -->
  <div class="form-title">
    <h2>Formulir Data Pelaku Usaha UMKM</h2>
    <div class="nomor">Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', {day:'2-digit',month:'long',year:'numeric'})}</div>
  </div>

  <!-- DATA PRIBADI + FOTO -->
  <div class="header-row">
    <div class="data-col">
      <div class="section">
        <div class="section-hdr">A. Identitas Pelaku Usaha</div>
        <div class="section-body">
          <table>
            ${row('Nama Lengkap', actor.fullName)}
            ${row('NIK', actor.nik)}
            ${row('Nomor KK', actor.noKK)}
            ${row('Jenis Kelamin', actor.gender)}
            ${row('Tempat Lahir', pob)}
            ${row('Tanggal Lahir', dob)}
            ${row('Usia', age)}
            ${row('Nomor HP', actor.phone)}
          </table>
        </div>
      </div>
    </div>
    <div class="foto-col">
      <div class="foto-box">
        ${sd.fotoSurveyUrl ? `<img src="${sd.fotoSurveyUrl}" alt="Foto" />` : '<span style="font-size:8px;color:#999;text-align:center;padding:4px;">Foto<br/>Pelaku Usaha</span>'}
      </div>
      <div class="foto-label">Foto Survey</div>
    </div>
  </div>

  <!-- ALAMAT -->
  <div class="section">
    <div class="section-hdr">B. Alamat &amp; Domisili</div>
    <div class="section-body">
      <table>
        ${row('Kecamatan', actor.kecamatan)}
        ${row('Kelurahan', actor.kelurahan)}
        ${row('RT / RW', actor.rtRw)}
        ${row('Alamat Lengkap', actor.address, true)}
      </table>
    </div>
  </div>

  <!-- USAHA -->
  <div class="section">
    <div class="section-hdr">C. Informasi Usaha</div>
    <div class="section-body">
      <table>
        ${row('Nama Usaha', actor.businessName)}
        ${row('Kategori Usaha', actor.businessCategory)}
        ${row('Lokasi Usaha', actor.businessLocation)}
        ${row('Koordinator / Usulan', actor.coordinator)}
      </table>
    </div>
  </div>

  <!-- DATA SURVEY DINAS -->
  <div class="section">
    <div class="section-hdr">D. Hasil Survey Dinas</div>
    <div class="section-body" style="padding:0;">
      <table class="survey-table">
        <tr><th>Bidang Usaha</th><td>${sd.bidangUsaha || '-'}</td><th>Tahun Berdiri</th><td>${sd.tahunBerdiri || '-'}</td></tr>
        <tr><th>Peralatan Usaha</th><td>${sd.peralatan || '-'}</td><th>Email</th><td>${sd.email || '-'}</td></tr>
        <tr><th>Sosial Media</th><td>${sd.sosmed || '-'}</td><th>DTKS</th><td>${sd.dtks?.masuk ? 'Ya (' + sd.dtks.jenis + ')' : 'Tidak'}</td></tr>
        <tr><th>Modal Usaha</th><td>${sd.modalUsaha || '-'}</td><th>Omset / Bulan</th><td>${sd.omset || '-'}</td></tr>
        <tr><th>Izin yang Dimiliki</th><td colspan="3">${(sd.izin || []).join(', ') || '-'}</td></tr>
        <tr><th>Pernah Terima Hibah?</th><td colspan="3">${sd.hibah?.pernah ? 'Ya (Dari: ' + sd.hibah.dariMana + ', Tahun: ' + sd.hibah.tahun + ')' : 'Tidak'}</td></tr>
        <tr><th>Rencana Penggunaan Dana</th><td colspan="3">${sd.rencanaPenggunaan || '-'}</td></tr>
        <tr><th style="background:#dcfce7;">Hasil Survey</th><td colspan="3" style="font-weight:bold;background:#f0fdf4;">${sd.hasilSurvey || '-'}</td></tr>
      </table>
    </div>
  </div>

  <!-- TITIK LOKASI -->
  ${a.verificationLocationDinas ? `
  <div class="section">
    <div class="section-hdr">E. Titik Lokasi GPS Survey</div>
    <div class="section-body">
      <table>
        ${row('Koordinat GPS', a.verificationLocationDinas.lat + ', ' + a.verificationLocationDinas.lon)}
        ${row('Link Maps', 'maps.google.com/?q=' + a.verificationLocationDinas.lat + ',' + a.verificationLocationDinas.lon, true)}
      </table>
    </div>
  </div>` : ''}

  <!-- PERBANKAN -->
  <div class="section">
    <div class="section-hdr">F. Data Rekening Bank</div>
    <div class="section-body">
      <table>
        ${row('Nama Bank', actor.bankName)}
        ${row('Nomor Rekening', actor.bankNumber)}
        ${row('Nama Pemilik Rekening', actor.bankOwner)}
      </table>
    </div>
  </div>

  <!-- LPJ -->
  <div class="section">
    <div class="section-hdr">G. Laporan Pertanggung Jawaban (LPJ)</div>
    <div class="section-body">
      <div class="lpj-box">
        <div>
          <div style="font-size:9px;font-weight:bold;text-transform:uppercase;color:#166534;margin-bottom:4px;">Nominal Dana Terlaporkan</div>
          <div class="lpj-nom">Rp ${(actor.lpjNominal || 0).toLocaleString('id-ID')}</div>
        </div>
        <div class="lpj-status">&#10003; Telah Terverifikasi</div>
      </div>
    </div>
  </div>

  <!-- TANDA TANGAN -->
  <div class="ttd-row">
    <div class="ttd-col">
      <div class="ttd-title">Pelaku Usaha</div>
      <div class="ttd-sub">Yang bertanda tangan di bawah ini</div>
      <div class="ttd-line">( ${actor.fullName?.toUpperCase() || '.................................'} )</div>
    </div>
    <div class="ttd-col">
      <div class="ttd-title">Koordinator Lapangan</div>
      <div class="ttd-sub">Menyatakan data telah diperiksa</div>
      <div class="ttd-line">( ${actor.coordinator?.toUpperCase() || '.................................'} )</div>
    </div>
    <div class="ttd-col">
      <div class="ttd-title">Pejabat Verifikasi Dinas</div>
      <div class="ttd-sub">Menyatakan data telah diverifikasi</div>
      <div class="ttd-line">( ................................. )</div>
    </div>
  </div>

  <div class="footer">
    Dokumen ini dicetak dari Sistem Informasi DKUKM &bull; ${new Date().toLocaleString('id-ID')} &bull; ID: ${actor.id || '-'}
  </div>

</div>
</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 600)
  }

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForProfile } = useList(userProfileRef)
  const userProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isKoordinator = userProfile?.role === 'koordinator'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const actors = allActorsRaw ? allActorsRaw.filter(a => {
    // Status filter - equivalent to previous orderByChild('status').equalTo('finish')
    if (a.status !== 'finish' || !a.lpjNominal) return false;

    const matchesSearch = 
      a.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.nik?.includes(searchQuery)
    const matchesCategory = !category || a.businessCategory === category

    if (isKoordinator) {
      if (!a.coordinator || !userProfile?.fullName) return false;
      const matchesKoor = a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase();
      return matchesSearch && matchesCategory && matchesKoor;
    }
    if (filterCoordinator) {
      const matchesKoor = a.coordinator === filterCoordinator;
      return matchesSearch && matchesCategory && matchesKoor;
    }
    return matchesSearch && matchesCategory;
  }).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "")) : undefined

  const [isEditMode, setIsEditMode] = useState(false)

  // ConfirmDialog states
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const [revertPending, setRevertPending] = useState<{actorId: string, fullName: string} | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePending, setDeletePending] = useState<{actorId: string, fullName: string} | null>(null)
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

  const handleSaveFullEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAdmin || !database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    
    const lpjVal = formData.get('lpjNominal') as string;
    const lpjNum = lpjVal ? parseInt(lpjVal) : viewingActor.lpjNominal || 0;

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

  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setRevertPending({ actorId, fullName })
    setShowRevertDialog(true)
  }

  const executeRevert = () => {
    if (!revertPending || !database) return
    const { actorId, fullName } = revertPending
    const actorObj = allActorsRaw?.find(a => a.id === actorId);
    updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), { status: 'pending' })
    
    if (actorObj) {
      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        updateStatsOnStatusChange(database, 'finish', 'pending', actorObj).catch(e => console.error(e));
      });
    }

    toast({ title: "Berhasil", description: "Status dikembalikan ke Pending." })
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
    const actorObj = allActorsRaw?.find(a => a.id === actorId);
    deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
    
    if (actorObj) {
      import("@/lib/stats-service").then(({ updateStatsOnDelete }) => {
        updateStatsOnDelete(database, actorObj).catch(e => console.error(e));
      });
    }

    toast({ title: "Data Dihapus", description: `Data ${fullName} telah dihapus dari sistem.` })
    setViewingActor(null)
    setShowDeleteDialog(false)
    setDeletePending(null)
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="hidden print:block text-center space-y-2 mb-8 border-b-2 border-black pb-4">
        <h1 className="text-xl font-black uppercase">LAPORAN DATA PELAKU USAHA (SIMPU)</h1>
        <p className="text-xs font-bold uppercase tracking-widest">Sistem Informasi Manajemen Pelaku Usaha</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <BadgeCheck className="w-8 h-8 text-green-600" />
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Finish</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Arsip data yang telah dinyatakan SELESAI.</p>
            {filterCoordinator && (
              <div className="flex items-center gap-2 mt-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 w-fit">
                <span className="text-[10px] font-black text-primary uppercase">Filter Koordinator: {filterCoordinator}</span>
                <Link href="/finish" className="text-primary hover:text-primary/70 transition-transform active:scale-90">
                  <X className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
        <Button onClick={() => window.print()} className="bg-primary font-bold shadow-md w-full md:w-auto">
          <Printer className="w-4 h-4 mr-2" /> CETAK
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Cari Nama / Usaha / NIK..." 
            className="pl-10 h-10 md:h-12 bg-card border-primary/20 focus-visible:ring-primary rounded-xl md:rounded-2xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="h-10 md:h-12 px-4 rounded-xl md:rounded-2xl border border-primary/20 bg-card text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            <option value="Kuliner">Kuliner</option>
            <option value="Bukan Kuliner">Bukan Kuliner</option>
          </select>
        </div>
      </div>

      <div className="bg-card print:bg-transparent">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 flex flex-col items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-3 w-1/2 mx-auto" />
                  </div>
                  <Skeleton className="h-5 w-full rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 print:flex print:flex-col print:gap-1">
            {actors?.map((actor) => (
              <Card 
                key={actor.id} 
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group relative overflow-hidden print:shadow-none print:border-b print:rounded-none"
                onClick={() => {
                  setViewingActor(actor)
                  setIsEditMode(false)
                }}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-3 print:flex-row print:justify-between print:text-left print:p-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 group-hover:scale-110 transition-transform print:hidden shrink-0">
                    <BadgeCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 w-full justify-center">
                    <p className="font-bold text-[13px] md:text-sm line-clamp-2 uppercase leading-tight print:line-clamp-none text-green-800" title={actor.businessName}>
                      {actor.businessName || "NAMA USAHA KOSONG"}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase line-clamp-1 print:line-clamp-none font-bold flex items-center justify-center print:justify-start gap-1" title={actor.fullName}>
                      <User className="w-3 h-3 print:hidden" /> {actor.fullName}
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono hidden print:block">
                      NIK: {actor.nik} | Koor: {actor.coordinator} | Bank: {actor.bankName} - {actor.bankNumber}
                    </p>
                  </div>
                  <div className="text-[9px] font-black uppercase bg-green-500 text-white w-full justify-center print:w-auto shrink-0 mt-auto rounded-full py-0.5 px-2 flex items-center">
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

      <Dialog open={!!viewingActor} onOpenChange={(open) => {
        if (!open) {
          setViewingActor(null)
          setIsEditMode(false)
        }
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
                      {isEditMode ? "Batal Edit" : <><Edit3 className="w-4 h-4 mr-2"/> Edit Semua Data</>}
                    </Button>
                  )}
                  {isAdmin && !isEditMode && (
                    <Button size="sm" variant="outline" onClick={() => handleRevert(viewingActor.id, viewingActor.fullName)} className="border-amber-500 text-amber-600 font-bold" title="Kembalikan ke antrean awal (Pending)">
                      <RotateCcw className="w-4 h-4 mr-1 md:mr-0" /> <span className="md:hidden">Revert</span>
                    </Button>
                  )}
                  {isAdmin && !isEditMode && (
                    <Button size="sm" variant="outline" onClick={() => handleDelete(viewingActor.id, viewingActor.fullName)} className="border-red-500 text-red-600 font-bold hover:bg-red-50" title="Hapus Data">
                      <Trash2 className="w-4 h-4 mr-1 md:mr-0" /> <span className="md:hidden">Hapus</span>
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
                        <select name="gender" defaultValue={viewingActor.gender || ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                          <option value="L">Laki-Laki</option>
                          <option value="P">Perempuan</option>
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
                        <Label className="text-xs font-bold uppercase">Tanggal Lahir (Otomatis)</Label>
                        <Input 
                          name="dob" 
                          value={editDob} 
                          readOnly 
                          className="bg-muted font-semibold"
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
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Koordinator</Label><Input name="coordinator" defaultValue={viewingActor.coordinator} /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan & LPJ (Edit)</div>
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
                        { label: "Nomor HP", value: viewingActor.phone }
                      ].map((item, i) => (
                         <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Kecamatan", value: viewingActor.kecamatan },
                        { label: "Kelurahan", value: viewingActor.kelurahan },
                        { label: "RT/RW", value: viewingActor.rtRw },
                        { label: "Alamat Lengkap", value: viewingActor.address, fullWidth: true }
                      ].map((item, i) => (
                        <div key={i} className={item.fullWidth ? "md:col-span-3 space-y-1" : "space-y-1"}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Usaha", value: viewingActor.businessName },
                        { label: "Kategori Usaha", value: viewingActor.businessCategory },
                        { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                        { label: "USULAN", value: viewingActor.coordinator }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

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
                          <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Sumber: Verifikasi Admin (Bypass)</p>
                          <p className="text-xs text-amber-800 font-medium mb-2">Alasan: {(viewingActor as any).verificationBypass.reason}</p>
                          {(viewingActor as any).verificationBypass.fileBase64 && (
                            <a href={(viewingActor as any).verificationBypass.fileBase64} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-amber-200 text-amber-800 px-3 py-1 rounded shadow-sm hover:bg-amber-300 transition-colors inline-block mt-1">Lihat Bukti Lampiran</a>
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

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                      {[
                        { label: "Nama Bank", value: viewingActor.bankName },
                        { label: "Nomor Rekening", value: viewingActor.bankNumber, isMono: true },
                        { label: "Nama Pemilik Rekening", value: viewingActor.bankOwner, isUpper: true }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className={cn("text-sm font-black text-primary", item.isMono && "font-mono text-lg", item.isUpper && "uppercase")}>{item.value || "BELUM TERISI"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-sm uppercase border-b pb-1">
                      <FileText className="w-4 h-4" /> Laporan Pertanggung Jawaban (LPJ)
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Nominal Terlaporkan</p>
                          <p className="text-3xl font-black text-emerald-600 font-mono">
                              RP {viewingActor.lpjNominal?.toLocaleString('id-ID') || "0"}
                          </p>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] font-bold text-emerald-800 uppercase">Status Verifikasi LPJ</p>
                          <Badge className="bg-emerald-600 font-black uppercase text-[10px] mt-1 px-4 py-1 hover:bg-emerald-600">TELAH TERVERIFIKASI</Badge>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Informasi Sistem & Audit</div>
                    <div className="bg-slate-50 p-4 rounded-xl text-xs font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Status Terakhir</p>
                        <p className="capitalize text-primary">{viewingActor.status.replace('_', ' ')}</p>
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
        onOpenChange={(open) => {
          setShowRevertDialog(open)
          if (!open) setRevertPending(null)
        }}
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
        onOpenChange={(open) => {
          setShowDeleteDialog(open)
          if (!open) setDeletePending(null)
        }}
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

export default function FinishPage() {
  return (<Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}><FinishContent /></Suspense>)
}
