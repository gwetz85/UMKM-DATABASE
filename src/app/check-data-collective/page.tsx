"use client"

import React, { useState } from "react"
import { useDatabase, useList, useMemoFirebase, useUser, useObject } from "@/firebase"
import { ref } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  SearchCheck, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Database, 
  UserSearch, 
  User, 
  Eye, 
  FileText, 
  ShieldAlert,
  AlertTriangle,
  Table as TableIcon,
  FileDown
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function CheckDataCollectivePage() {
  const { user } = useUser()
  const database = useDatabase()
  const [loading, setLoading] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [selectedResult, setSelectedResult] = useState<any | null>(null)
  const [searchKks, setSearchKks] = useState<string[]>([])

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])

  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  const master2023Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2023') : null, [database])
  const master2024Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2024') : null, [database])
  const master2025Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2025') : null, [database])
  const blacklistDataRef = useMemoFirebase(() => database ? ref(database, 'blacklist_data') : null, [database])

  const { data: data2023, isLoading: is2023Loading } = useList(master2023Ref)
  const { data: data2024, isLoading: is2024Loading } = useList(master2024Ref)
  const { data: data2025, isLoading: is2025Loading } = useList(master2025Ref)
  const { data: allBlacklistData, isLoading: isBlacklistLoading } = useList(blacklistDataRef)

  const isDataLoading = is2023Loading || is2024Loading || is2025Loading || isBlacklistLoading

  const results = React.useMemo(() => {
    if (searchKks.length === 0) return []
    
    const d2023 = data2023 || []
    const d2024 = data2024 || []
    const d2025 = data2025 || []
    const blacklist = allBlacklistData || []
    
    const combinedData = [
      ...d2023.map(m => ({ ...m, _source: "SHEET 2023" })),
      ...d2024.map(m => ({ ...m, _source: "SHEET 2024" })),
      ...d2025.map(m => ({ ...m, _source: "SHEET 2025" })),
      ...blacklist.map(m => ({ ...m, _source: "DATA BLACKLIST" }))
    ]

    const allMatches: any[] = []
    
    searchKks.forEach(kk => {
      const matches = combinedData.filter((m: any) => m.noKK && String(m.noKK).trim() === kk.trim())
      if (matches.length > 0) {
        matches.forEach(match => {
          allMatches.push({
            ...match,
            _searchKk: kk,
            _isMultiple: matches.length > 1
          })
        })
      } else {
        allMatches.push({
          noKK: kk,
          _searchKk: kk,
          _notFound: true
        })
      }
    })

    return allMatches
  }, [data2023, data2024, data2025, allBlacklistData, searchKks])

  if (isAdminLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Hanya Administrator yang dapat mengakses menu Master Data ini.
        </p>
      </div>
    )
  }

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    
    setLoading(true)
    const kks = inputValue
      .split(/\n|,/)
      .map(kk => kk.trim())
      .filter(kk => kk.length > 0)
      .slice(0, 20)
    
    setSearchKks(kks)
    setSearchDone(true)
    setLoading(false)
  }

  const resetSearch = () => {
    setSearchDone(false)
    setSearchKks([])
    setInputValue("")
  }

  const handleExportPdf = () => {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(({ default: autoTable }) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

        // Header
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.text('HASIL PENGECEKKAN DATA KOLEKTIF', doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(
          `Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' }
        )

        const tableBody = results.map((res, index) => [
          index + 1,
          res.noKK || res._searchKk || '-',
          (res.nama || res.fullName || (res._notFound ? 'TIDAK DITEMUKAN' : '-')).toUpperCase(),
          (res.coordinator || '-').toUpperCase(),
          (res._source || '-').toUpperCase(),
          (res.statusLpj || (res._notFound ? '-' : 'PENDING')).toUpperCase()
        ])

        const margin = 14
        const pageWidth = doc.internal.pageSize.getWidth()
        const usableWidth = pageWidth - margin * 2

        autoTable(doc, {
          startY: 30,
          margin: { left: margin, right: margin },
          tableWidth: usableWidth,
          head: [['No', 'Nomor KK', 'Nama Pelaku Usaha', 'Koordinator', 'Nama Sheet', 'Status']],
          body: tableBody,
          styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, halign: 'center' },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 35 },
            2: { halign: 'left', cellWidth: 'auto' },
            3: { halign: 'left', cellWidth: 30 },
            4: { cellWidth: 30 },
            5: { cellWidth: 25 },
          },
          didParseCell: (data: any) => {
             if (data.section === 'body' && data.column.index === 2 && data.cell.raw === 'TIDAK DITEMUKAN') {
               data.cell.styles.textColor = [220, 38, 38]
               data.cell.styles.fontStyle = 'italic'
             }
          }
        })

        doc.save(`Hasil_Cek_Kolektif_${new Date().toISOString().slice(0, 10)}.pdf`)
      })
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-[95rem] mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl">
            <SearchCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black text-primary font-headline">Cek Data Kolektif</h1>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto font-medium">
          Validasi hingga 20 Nomor KK sekaligus terhadap Database Master UMKM dan Daftar Blacklist.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <Card className="lg:col-span-3 border-none shadow-xl h-fit bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg">Input Nomor KK</CardTitle>
            <CardDescription>Masukkan hingga 20 Nomor KK (satu per baris atau dipisah koma).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheck} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="inputValue" className="font-bold text-foreground">
                  Daftar Nomor KK
                </Label>
                <Textarea 
                  id="inputValue" 
                  placeholder="Contoh:&#10;1234567890123456&#10;1234567890123457" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="min-h-[200px] font-mono text-base bg-white"
                  required 
                />
                <p className="text-[10px] text-muted-foreground italic">
                  * Maksimal 20 Nomor KK per pengecekkan.
                </p>
              </div>

              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20" disabled={loading || isDataLoading}>
                {loading || isDataLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <SearchCheck className="w-5 h-5 mr-2" />}
                Proses Pengecekkan
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-9 space-y-6">
          {!searchDone && !loading && !isDataLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] border-2 border-dashed rounded-3xl border-muted bg-white/30 backdrop-blur-sm p-8 text-center">
              <div className="bg-white/50 p-4 rounded-full mb-4">
                <TableIcon className="w-8 h-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Hasil akan ditampilkan di sini</h3>
              <p className="text-sm text-muted-foreground">
                Masukkan daftar Nomor KK di sebelah kiri untuk memulai validasi massal.
              </p>
            </div>
          )}

          {isDataLoading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border p-8 text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-primary font-bold animate-pulse">Menyiapkan Database...</p>
            </div>
          )}

          {searchDone && !isDataLoading && (
            <div className="animate-in fade-in duration-500 space-y-6">
              <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                <div className="bg-primary/5 p-4 border-b border-primary/10 flex items-center justify-between">
                  <h3 className="font-black text-primary uppercase flex items-center gap-2">
                    <TableIcon className="w-5 h-5" /> Hasil Pengecekkan Kolektif
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportPdf} className="font-bold border-red-200 text-red-600 hover:bg-red-50 shadow-sm">
                      <FileDown className="w-4 h-4 mr-2" /> Cetak PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetSearch} className="font-bold border-primary/20 hover:bg-primary/5">
                      Reset
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-black text-[10px] uppercase text-slate-500">Nomor KK</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-500">Nama Pelaku Usaha</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-500">Sumber Sheet</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-500">Koordinator</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-500">Usaha</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-500 text-center">Status LPJ</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-500 text-right">Nominal LPJ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((res, idx) => (
                        <TableRow 
                          key={idx} 
                          className={cn(
                            "group hover:bg-primary/5 transition-colors cursor-pointer",
                            res._notFound && "bg-red-50/30",
                            res._isMultiple && "bg-amber-50/30"
                          )}
                          onClick={() => !res._notFound && setSelectedResult(res)}
                        >
                          <TableCell className="font-mono font-bold text-xs text-primary group-hover:underline">
                            {res.noKK || res._searchKk}
                            {res._isMultiple && (
                              <span className="ml-2 inline-flex items-center gap-1 text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase">
                                <AlertTriangle className="w-2 h-2" /> GANDA
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-xs uppercase">
                            {res._notFound ? <span className="text-red-500 italic">TIDAK DITEMUKAN</span> : (res.nama || res.fullName)}
                          </TableCell>
                          <TableCell>
                            {!res._notFound && (
                              <span className={cn(
                                "text-[9px] font-black px-2 py-1 rounded-lg uppercase",
                                res._source === "DATA BLACKLIST" ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
                              )}>
                                {res._source}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-[10px] font-medium text-slate-600">
                            {res.coordinator || "-"}
                          </TableCell>
                          <TableCell className="text-[10px] font-medium text-slate-600 max-w-[150px] truncate">
                            {res.usaha || res.businessName || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {!res._notFound && (
                              <span className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                                res.statusLpj?.toLowerCase().includes("lengkap") || res.statusLpj?.toLowerCase().includes("sudah")
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              )}>
                                {res.statusLpj || "PENDING"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs">
                            {res._notFound ? "-" : formatCurrency(res.nominal || res.lpjNominal || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-800">
                <Info className="w-5 h-5 shrink-0" />
                <p className="text-xs font-medium">
                  Klik pada baris data untuk melihat informasi lengkap. Data yang disorot <span className="bg-amber-200 px-1 rounded">kuning</span> menunjukkan Nomor KK tersebut memiliki lebih dari satu entri data di sistem.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pop Out Detail */}
      <Dialog open={!!selectedResult} onOpenChange={(open) => !open && setSelectedResult(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className={cn(
              "text-2xl font-black uppercase flex items-center gap-2",
              selectedResult?._source === "DATA BLACKLIST" ? "text-red-600" : "text-primary"
            )}>
              <UserSearch className="w-6 h-6" /> 
              {selectedResult?._source}
            </DialogTitle>
            <DialogDescription className="font-bold text-muted-foreground">
              {selectedResult?._source === "DATA BLACKLIST" 
                ? "Informasi Detail Data Pembatalan / Blacklist" 
                : "Informasi Detail Data Pelaku Usaha"}
            </DialogDescription>
          </DialogHeader>
          {selectedResult && (
            <div className="py-4 space-y-6">
              {selectedResult._isMultiple && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 font-bold">Data Ganda Ditemukan</AlertTitle>
                  <AlertDescription className="text-amber-700 text-xs">
                    Nomor KK ini terdaftar lebih dari satu kali. Pastikan untuk meninjau semua entri yang muncul di tabel hasil.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                   { label: "Nomor", value: selectedResult.nomor, icon: FileText },
                   { label: "Nomor KK", value: selectedResult.noKK, icon: FileText },
                   { label: "NIK", value: selectedResult.nik, icon: FileText },
                   { label: "Nama Lengkap", value: selectedResult.nama || selectedResult.fullName, icon: User, full: true },
                   { label: "Usaha", value: selectedResult.usaha || selectedResult.businessName, icon: Database, full: true },
                   { label: "Kategori Status", value: selectedResult.status, icon: Info },
                   { label: "Status LPJ", value: selectedResult.statusLpj, icon: Info },
                   { label: "Nominal", value: formatCurrency(selectedResult.nominal || selectedResult.lpjNominal), icon: SearchCheck },
                   { label: "Tahun Pengajuan", value: selectedResult.tahunPengajuan, icon: SearchCheck },
                   { label: "Kelurahan", value: selectedResult.kelurahan, icon: UserSearch },
                   { label: "Kecamatan", value: selectedResult.kecamatan, icon: UserSearch },
                   { label: "Koordinator", value: selectedResult.coordinator, icon: UserSearch },
                   { label: "Alamat", value: selectedResult.alamat || selectedResult.address, icon: UserSearch, full: true },
                ].map((item, i) => (
                  <div key={i} className={item.full ? "md:col-span-2 space-y-1" : "space-y-1"}>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                      {item.icon && <item.icon className="w-3 h-3" />} {item.label}
                    </div>
                    <div className="p-3 bg-muted/50 rounded-xl border border-muted text-sm font-bold text-slate-800 uppercase">
                      {item.value || "-"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="pt-4">
            <Button className="w-full font-bold h-12" onClick={() => setSelectedResult(null)}>
              Tutup Detail
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
