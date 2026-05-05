"use client"

import { useState, useMemo } from "react"
import { useDatabase, useList, useMemoFirebase, useUser } from "@/firebase"
import { ref } from "firebase/database"
import { addTunasBangsaHeader } from "@/lib/pdf-generator"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Printer, FileSpreadsheet, Search, ShieldCheck, Loader2 } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { BusinessActor } from "../lib/types"
import { cn } from "@/lib/utils"

const calculateAge = (dobString: string) => {
  if (!dobString || dobString === "-") return 0;
  
  // Ambil bagian tanggalnya saja (setelah koma jika ada)
  const datePart = dobString.includes(',') ? dobString.split(',').pop()?.trim() : dobString.trim();
  if (!datePart) return 0;
  
  const monthsIndo: { [key: string]: number } = {
    'JANUARI': 0, 'FEBRUARI': 1, 'MARET': 2, 'APRIL': 3, 'MEI': 4, 'JUNI': 5,
    'JULI': 6, 'AGUSTUS': 7, 'SEPTEMBER': 8, 'OKTOBER': 9, 'NOVEMBER': 10, 'DESEMBER': 11
  };

  let day, month, year;

  // Cek jika formatnya DD-MM-YYYY (angka)
  if (datePart.includes('-')) {
    const parts = datePart.split('-').map(Number);
    day = parts[0];
    month = parts[1] - 1;
    year = parts[2];
  } else {
    // Format DD NamaBulan YYYY
    const parts = datePart.split(' ');
    if (parts.length < 3) return 0;
    
    day = parseInt(parts[0]);
    const monthName = parts[1].toUpperCase();
    month = monthsIndo[monthName];
    year = parseInt(parts[2]);
  }

  if (isNaN(day) || month === undefined || isNaN(year)) return 0;

  const birthDate = new Date(year, month, day);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default function BpjsPage() {
  const { user } = useUser()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")

  const actorsRef = useMemoFirebase(() => database ? ref(database, 'businessActors') : null, [database])
  const { data: allActors, isLoading } = useList<BusinessActor>(actorsRef)

  const filteredActors = useMemo(() => {
    if (!allActors) return []
    return allActors
      .filter(a => 
        (a.status === 'verified_actor' || a.status === 'finish' || a.status === 'bank_pending' || a.status === 'lpj_pending' || a.status === 'verified_dinas') &&
        ((a.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.nik || "").includes(searchQuery))
      )
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [allActors, searchQuery])

  const handleExportExcel = () => {
    if (filteredActors.length === 0) return
    
    const exportData = filteredActors.map(actor => {
      const age = calculateAge(actor.pobDob || "")
      return {
        "NAMA LENGKAP": (actor.fullName || "").toUpperCase(),
        "NIK": actor.nik || "-",
        "NOMOR KK": actor.noKK || "-",
        "TANGGAL LAHIR": actor.pobDob || "-",
        "USIA": age,
        "NOMOR PONSEL": actor.phone || "-",
        "ALAMAT": (actor.address || "").toUpperCase(),
        "RT/RW": actor.rtRw || "-",
        "KELURAHAN": (actor.kelurahan || "").toUpperCase(),
        "KOORDINATOR": (actor.coordinator || "").toUpperCase(),
        "NOTE": age < 65 ? "Bisa Didaftarkan" : "Tidak Bisa Didaftarkan"
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data BPJS")
    
    // Auto-width
    const wscols = [
      {wch: 30}, {wch: 20}, {wch: 20}, {wch: 25}, {wch: 10}, 
      {wch: 15}, {wch: 40}, {wch: 10}, {wch: 20}, {wch: 20}, {wch: 25}
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Data_BPJS_Ketenagakerjaan_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handlePrintPDF = () => {
    if (filteredActors.length === 0) return

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header Tunas Bangsa
    addTunasBangsaHeader(doc)
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0)
    doc.text("DATA BPJS KETENAGAKERJAAN", pageWidth - 14, 17, { align: 'right' })
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, pageWidth - 14, 21, { align: 'right' })
    doc.setTextColor(0)

    const tableData = filteredActors.map((actor, index) => {
      const age = calculateAge(actor.pobDob || "")
      return [
        index + 1,
        (actor.fullName || "").toUpperCase(),
        (actor.nik || "-"),
        age,
        (actor.coordinator || "-").toUpperCase(),
        age < 65 ? "Bisa Didaftarkan" : "Tidak Bisa Didaftarkan"
      ]
    })

    autoTable(doc, {
      startY: 30,
      head: [['NO', 'NAMA LENGKAP', 'NIK', 'USIA', 'KOORDINATOR', 'KETERANGAN']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 117, 188], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 32, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 35, halign: 'center' },
        5: { cellWidth: 48, halign: 'center' }
      }
    })

    doc.save(`Laporan_BPJS_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="p-4 md:p-8 max-w-[90rem] mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 md:w-8 md:h-8" /> BPJS Ketenagakerjaan
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">Monitoring kelayakan BPJS Ketenagakerjaan berdasarkan usia pelaku usaha.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari Nama atau NIK..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-primary/20 bg-white text-xs md:text-sm"
            />
          </div>
          <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md h-10 flex-1 md:flex-none">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> EXPORT EXCEL
          </Button>
          <Button onClick={handlePrintPDF} className="bg-primary font-bold shadow-md h-10 flex-1 md:flex-none">
            <Printer className="w-4 h-4 mr-2" /> PRINT DATA
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden rounded-2xl">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col justify-center items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <span className="font-bold text-primary animate-pulse uppercase tracking-widest text-xs">Memuat Data Database...</span>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black text-primary py-4 pl-6 w-12 text-center uppercase text-[10px]">NO</TableHead>
                  <TableHead className="font-black text-primary py-4 uppercase text-[10px]">NAMA LENGKAP</TableHead>
                  <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">NIK</TableHead>
                  <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">TEMPAT / TANGGAL LAHIR</TableHead>
                  <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">USIA</TableHead>
                  <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">KOORDINATOR</TableHead>
                  <TableHead className="font-black text-primary py-4 text-center uppercase text-[10px]">NOTE / KETERANGAN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActors.map((actor, index) => {
                  const age = calculateAge(actor.pobDob || "")
                  return (
                    <TableRow key={actor.id} className="hover:bg-primary/5 transition-colors group">
                      <TableCell className="py-4 pl-6 text-center font-bold text-slate-400 text-xs">{index + 1}</TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 uppercase text-[13px] tracking-tight">{actor.fullName}</span>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase">{actor.kelurahan}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{actor.nik}</span>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <span className="text-[11px] font-bold text-slate-600 uppercase">{actor.pobDob || "-"}</span>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-slate-800 leading-none">{age}</span>
                          <span className="text-[8px] font-black text-muted-foreground uppercase mt-0.5">TAHUN</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                         <span className="text-[11px] font-bold text-slate-600 uppercase">{actor.coordinator || "-"}</span>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge className={cn(
                          "font-black uppercase tracking-wider text-[9px] px-3 py-1.5 border shadow-sm",
                          age < 65 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        )}>
                          {age < 65 ? "Bisa Didaftarkan" : "Tidak Bisa Didaftarkan"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredActors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="bg-slate-100 p-4 rounded-full">
                          <Search className="w-10 h-10 text-slate-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-slate-800 text-lg uppercase">Data Tidak Ditemukan</p>
                          <p className="text-sm text-muted-foreground">Silakan coba kata kunci pencarian lain.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 items-start">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black text-amber-900 uppercase">Informasi Kelayakan</p>
          <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
            Kriteria kelayakan BPJS Ketenagakerjaan berdasarkan usia maksimal 65 tahun pada saat pendaftaran. 
            Data di atas diambil dari database pelaku usaha yang telah diverifikasi.
          </p>
        </div>
      </div>
    </div>
  )
}
