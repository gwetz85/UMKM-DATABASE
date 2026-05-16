
"use client"

import { useState, useEffect, Suspense, useMemo } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject, deleteDocumentNonBlocking } from "@/firebase"
import { ref, query, equalTo, limitToFirst, orderByChild, startAt, get } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Printer, Edit3, Loader2, Save, Trash2, Eye, User, CreditCard, History, X, RotateCcw, Building2, MapPin, CheckCircle2, Store, Search, ChevronRight, FileSpreadsheet, ArrowLeft, BarChart3 } from "lucide-react"
import * as XLSX from "xlsx"

import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { BusinessActor } from "../lib/types"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckDataIndicator } from "@/components/check-data-indicator"
import { VerificationBadge } from "@/components/verification-badge"
import { SidebarTrigger } from "@/components/ui/sidebar"


const normalizeGender = (g: string) => {
  const val = (g || "").toLowerCase().trim();
  if (val === "l" || val === "laki-laki") return "Laki-laki";
  if (val === "p" || val === "perempuan") return "Perempuan";
  return "";
};


import { cn } from "@/lib/utils"
import { generateRegistrationForm, generateCoordinatorReport, generateAllCoordinatorsReport } from "@/lib/pdf-generator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const BANK_LIST = [
  "BCA", "BNI", "BRI", "BRK", "MANDIRI", "PANIN", "OCBC", "DANAMON", "BUKOPIN", "BTN"
]


function ActorDataContent() {
  const { user } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterCoordinator = searchParams.get('coordinator')
  
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [printDate, setPrintDate] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")


  useEffect(() => {
    setPrintDate(new Date().toLocaleString('id-ID'))
  }, [])

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
  const isMonitoring = userProfile?.role === 'monitoring'
  const isKoordinator = userProfile?.role === 'koordinator'
  const isInspektorat = userProfile?.role === 'inspektorat'

  const [pageLimit, setPageLimit] = useState(50)
  
  // Use pre-calculated stats for the overview
  const statsRef = useMemoFirebase(() => database ? ref(database, 'system_stats') : null, [database])
  const { data: systemStats } = useObject(statsRef)

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    let q = query(ref(database, 'businessActors'), orderByChild('status'), equalTo('verified_actor'))
    
    // In a full implementation, we would use startAt/endAt for pagination
    // For now, we'll just use a reasonable limit to keep it "light"
    return query(q, limitToFirst(pageLimit))
  }, [database, pageLimit])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  // Auxiliary data is now fetched on-demand in the detail dialog
  const [activeDetailData, setActiveDetailData] = useState<{
    data2023: any[], data2024: any[], data2025: any[], dataBlacklist: any[]
  }>({ data2023: [], data2024: [], data2025: [], dataBlacklist: [] })

  const fetchAuxData = async (actor: BusinessActor) => {
    if (!database) return;
    const checkMaster = async (path: string, nik: string) => {
      const q = query(ref(database, path), orderByChild('nik'), equalTo(nik), limitToFirst(1))
      const snap = await get(q)
      return snap.exists() ? Object.values(snap.val()) : []
    }
    // Just fetch enough to show the indicator for this actor
    const [d23, d24, d25, dBl] = await Promise.all([
      checkMaster('master_data_2023', actor.nik || ""),
      checkMaster('master_data_2024', actor.nik || ""),
      checkMaster('master_data_2025', actor.nik || ""),
      checkMaster('blacklist_data', actor.nik || "")
    ])
    setActiveDetailData({ data2023: d23, data2024: d24, data2025: d25, dataBlacklist: dBl })
  }

  const kuotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const { data: kuotaData } = useList<any>(kuotaRef)

  const actors = allActorsRaw ? allActorsRaw.filter(a => {
    if (!a) return false;
    // Status filter - equivalent to previous orderByChild('status').equalTo('verified_actor')
    if ((a.status || "") !== 'verified_actor') return false;

    if (isKoordinator) {
      if (!a.coordinator || !userProfile?.fullName) return false;
      return String(a.coordinator).toLowerCase() === String(userProfile.fullName).toLowerCase();
    }
    // Note: We remove the filterCoordinator from this main filter 
    // to allow calculating stats for all coordinators while viewing one.
    return true;
  }) : undefined


  const filteredActors = actors ? actors.filter(a => 
    (a.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.nik || "").includes(searchQuery) ||
    (a.businessName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.address || "").toLowerCase().includes(searchQuery.toLowerCase())
  ) : undefined


  const groupedActors = useMemo(() => {
    if (!filteredActors) return {}
    const sorted = [...filteredActors].sort((a, b) => 
      String(a.coordinator || "Tanpa Koordinator").localeCompare(String(b.coordinator || "Tanpa Koordinator"))
    )
    
    const groups: Record<string, BusinessActor[]> = {}
    sorted.forEach(actor => {
      const key = String(actor.coordinator || "Tanpa Koordinator").toUpperCase().trim()
      if (!groups[key]) groups[key] = []
      groups[key].push(actor)
    })
    return groups
  }, [filteredActors])

  const coordinatorStats = useMemo(() => {
    // Collect all known coordinator names from live data
    const activeNames = Object.keys(groupedActors || {})
    
    // Also include names from kuotaData that might not have data yet
    const allNames = new Set(activeNames)
    if (kuotaData) {
      kuotaData.forEach((q: any) => {
        if (q.name) allNames.add(q.name.toUpperCase().trim())
      })
    }

    return Array.from(allNames).map(name => {
      const quotaObj = (kuotaData || []).find((q: any) => (q.name || "").toUpperCase().trim() === name)
      const quota = quotaObj?.quota || 0
      
      // Use live count from groupedActors
      const count = groupedActors[name]?.length || 0
      const remaining = quota - count
      const isFull = quota > 0 && remaining <= 0
      
      return {
        name,
        count,
        quota,
        remaining,
        isFull
      }
    }).sort((a: any, b: any) => a.name.localeCompare(b.name))
  }, [groupedActors, kuotaData])

  const currentKoorStat = useMemo(() => {
    if (!filterCoordinator) return null
    return coordinatorStats.find(s => s.name === filterCoordinator)
  }, [coordinatorStats, filterCoordinator])




  const [isEditMode, setIsEditMode] = useState(false)
  const [editingBankMode, setEditingBankMode] = useState(false)

  const handleSaveFullEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAdmin || !database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    
    const updates: Partial<BusinessActor> = {
      fullName: formData.get('fullName') as string,
      nik: formData.get('nik') as string,
      noKK: formData.get('noKK') as string,
      gender: formData.get('gender') as "Laki-laki" | "Perempuan",
      pobDob: formData.get('pobDob') as string,
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
    }

    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)
    
    logActivity({
      query: `EDIT DATA: ${viewingActor.fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA PELAKU USAHA',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Tersimpan", description: "Data pelaku usaha berhasil diperbarui." })
    setIsEditMode(false)
    setViewingActor({ ...viewingActor, ...updates } as BusinessActor)
  }

  const handleSaveBank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database || isMonitoring || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    const updates = {
      bankNumber: formData.get('bankNumber'),
      bankOwner: formData.get('bankOwner'),
      bankName: formData.get('bankName'),
      status: 'bank_pending'
    }
    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)
    
    // Update global stats categories if necessary (both are 'verified' so no change, but consistent)
    import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
      updateStatsOnStatusChange(database, viewingActor.status || 'verified_actor', 'bank_pending');
    });

    logActivity({
      query: `INPUT REKENING: ${viewingActor.fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA PELAKU USAHA',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Tersimpan", description: "Data rekening telah dikirim." })
    setEditingBankMode(false)
    setViewingActor(null)
  }

  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    if (confirm(`Kembalikan status ${fullName} ke Pending?`)) {
      // Reset status and creation time to ensure fresh auto-verification countdown
      updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), { 
        status: 'pending',
        createdAt: new Date().toISOString() 
      })
      
      // Update global stats
      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        updateStatsOnStatusChange(database, 'verified_actor', 'pending');
      });

      logActivity({
        query: `KEMBALIKAN DATA: ${fullName}`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'DATA PELAKU USAHA',
        userId: user?.email || user?.uid || 'Admin'
      })
      
      toast({ title: "Berhasil", description: "Status dikembalikan ke antrean Verifikasi Admin." })
      setViewingActor(null)
    }
  }


  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    if (confirm(`Hapus permanen ${fullName}? Semua data terkait akan hilang.`)) {
      const actorToDelete = viewingActor || {}; // Keep ref for stats
      deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
      
      // Update global stats
      import("@/lib/stats-service").then(({ updateStatsOnDelete }) => {
        updateStatsOnDelete(database, actorToDelete).catch(err => console.error(err));
      });

      logActivity({
        query: `HAPUS DATA: ${fullName}`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'DATA PELAKU USAHA',
        userId: user?.email || user?.uid || 'Admin'
      })
      
      toast({ variant: "destructive", title: "Terhapus", description: "Data dihapus permanen." })
      setViewingActor(null)
    }
  }

  const handlePrintForm = (actor: BusinessActor) => {
    if (!database) return

    let actorToPrint = { ...actor }

    // Generate random 8-digit code if not exists
    if (!actor.registrationCode) {
      const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString()
      updateDocumentNonBlocking(ref(database, `businessActors/${actor.id}`), {
        registrationCode: randomCode
      })
      actorToPrint.registrationCode = randomCode
      toast({ title: "Kode Registrasi Di-generate", description: `Kode baru: ${randomCode} telah disimpan.` })
    }

    generateRegistrationForm(actorToPrint)
  }

  const handleExportExcel = () => {
    try {
      const dataToExport = filterCoordinator 
        ? (groupedActors[filterCoordinator] || [])
        : (filteredActors || [])

      if (dataToExport.length === 0) {
        toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data untuk diekspor." })
        return
      }

      const exportData = dataToExport.map((actor, index) => ({
        "NO": index + 1,
        "NAMA LENGKAP": (actor.fullName || "").toUpperCase(),
        "JENIS KELAMIN": actor.gender || "-",
        "NIK": actor.nik || "-",
        "NOMOR KK": actor.noKK || "-",
        "TEMPAT / TANGGAL LAHIR": actor.pobDob || "-",
        "NOMOR HP": actor.phone || "-",
        "ALAMAT": (actor.address || "").toUpperCase(),
        "RT/RW": actor.rtRw || "-",
        "KELURAHAN": (actor.kelurahan || "").toUpperCase(),
        "JENIS USAHA": (actor.businessCategory || "").toUpperCase(),
        "USAHA": (actor.businessName || "").toUpperCase(),
        "LOKASI USAHA": (actor.businessLocation || "").toUpperCase(),
        "KOORDINATOR": (actor.coordinator || "").toUpperCase(),
        "REG ID": actor.registrationCode || "-",
      }))

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pelaku")
      
      // Auto-width columns
      const maxWidths = Object.keys(exportData[0]).map(key => {
        let max = key.length;
        exportData.forEach(row => {
          const val = String((row as any)[key] || "");
          if (val.length > max) max = val.length;
        });
        return { wch: max + 2 };
      });
      worksheet['!cols'] = maxWidths;

      XLSX.writeFile(workbook, `Data_Pelaku_Usaha_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast({ title: "Berhasil", description: "Data berhasil diekspor ke Excel." })
    } catch (error) {
      console.error("Export Excel Error:", error)
      toast({ variant: "destructive", title: "Error", description: "Gagal mengekspor data." })
    }
  }

  // Auto-generate missing registration codes for currently filtered actors
  useEffect(() => {
    if (!database || !filteredActors || filteredActors.length === 0) return;
    
    const missingCodes = filteredActors.filter(a => !a.registrationCode);
    if (missingCodes.length === 0) return;

    // Process a small batch to prevent firebase connection throttling
    const batch = missingCodes.slice(0, 20);
    batch.forEach(actor => {
       const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
       updateDocumentNonBlocking(ref(database, `businessActors/${actor.id}`), {
          registrationCode: randomCode
       });
    });
  }, [filteredActors, database]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="hidden print:block text-center space-y-2 mb-8 border-b-2 border-black pb-4">
        <h1 className="text-xl font-black uppercase">LAPORAN DATA PELAKU USAHA (SIMPU)</h1>
        <p className="text-xs font-bold uppercase tracking-widest">Sistem Informasi Manajemen Pelaku Usaha</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Data Pelaku Usaha</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">Data lolos verifikasi siap diisi rekening.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto print:hidden">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari Nama, NIK, Usaha..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-primary/20 bg-white"
            />
          </div>

          <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md w-full md:w-auto h-10 rounded-xl">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> EKSPOR EXCEL
          </Button>
          <Button 
            onClick={() => {
              if (filterCoordinator) {
                generateCoordinatorReport(filterCoordinator, groupedActors[filterCoordinator] || [])
              } else {
                generateAllCoordinatorsReport(groupedActors)
              }
            }} 
            className="bg-red-600 hover:bg-red-700 font-bold shadow-md w-full md:w-auto h-10"
          >
            <Printer className="w-4 h-4 mr-2" /> CETAK PDF
          </Button>
        </div>
      </div>


      <div className="bg-card print:bg-transparent">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : isInspektorat ? (
           <div className="space-y-12">
            {Object.entries(groupedActors).map(([coordinator, actors]) => (
              <div key={coordinator} className="space-y-4 break-after-page">
                <div className="flex items-center justify-between border-l-4 border-primary pl-4 py-1 print:border-black">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-primary uppercase tracking-tight print:text-black">{coordinator}</h2>
                    <Badge variant="secondary" className="font-bold print:hidden">{actors.length} DATA</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 print:flex print:flex-col print:gap-1">
                  {actors.map((actor) => (
                    <Card 
                      key={actor.id} 
                      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group relative overflow-hidden print:shadow-none print:border-b print:rounded-none"
                      onClick={() => {
                        setViewingActor(actor)
                        setIsEditMode(false)
                        fetchAuxData(actor)
                      }}
                    >
                      <CardContent className="p-4 flex flex-col items-center text-center gap-3 print:flex-row print:justify-between print:text-left print:p-2">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform print:hidden shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 w-full justify-center">
                          <p className="font-bold text-[13px] md:text-sm line-clamp-2 uppercase leading-tight print:line-clamp-none text-primary/80" title={actor.businessName}>
                            {actor.businessName || "NAMA USAHA KOSONG"}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase line-clamp-1 print:line-clamp-none font-bold flex items-center justify-center print:justify-start gap-1" title={actor.fullName}>
                            <User className="w-3 h-3 print:hidden" /> {actor.fullName}
                          </p>
                          <p className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-sm print:hidden">
                            Reg: {actor.registrationCode || "PROSES..."}
                          </p>
                          <VerificationBadge actor={actor} />
                        </div>
                        <div className="text-[9px] font-black uppercase bg-primary text-white w-full justify-center print:w-auto shrink-0 mt-auto rounded-full py-0.5 px-2 flex items-center">
                          LIHAT DETAIL
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (isKoordinator || filterCoordinator || isInspektorat) ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
              {!isInspektorat && !isKoordinator && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push('/actor-data')}
                  className="font-bold border-primary text-primary hover:bg-primary/5"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> KEMBALI KE MODUL
                </Button>
              )}
              <h2 className="text-xl font-black text-primary uppercase tracking-tighter">
                {isInspektorat ? "DATABASE PELAKU USAHA" : isKoordinator ? `DATA: ${userProfile?.fullName}` : `DATA: ${filterCoordinator}`}
              </h2>
            </div>
            
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden overflow-x-auto print:border-black print:rounded-none">
              <Table>
                <TableHeader className="bg-muted/50 print:bg-slate-100">
                  <TableRow>
                    <TableHead className="font-bold text-primary py-4 pl-6 w-12 text-center print:text-black">NO</TableHead>
                    <TableHead className="font-bold text-primary py-4 print:text-black">NAMA PELAKU USAHA</TableHead>
                    <TableHead className="font-bold text-primary py-4 print:text-black">NIK</TableHead>
                    <TableHead className="font-bold text-primary py-4 print:text-black">USAHA</TableHead>
                    <TableHead className="font-bold text-primary py-4 pr-6 text-right print:hidden">AKSI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isInspektorat || isKoordinator ? (filteredActors || []) : (groupedActors[String(filterCoordinator || "").toUpperCase().trim()] || [])).map((actor, index) => (
                    <TableRow key={actor.id} className="hover:bg-primary/5 transition-colors group print:border-black">
                      <TableCell className="py-4 pl-6 text-center font-bold text-slate-500 print:text-black">{index + 1}</TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col items-start gap-2">
                          {isKoordinator && (
                            <div className={cn(
                              "flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 shadow-sm border print:hidden",
                              normalizeGender(actor.gender) === 'Perempuan' 
                                ? "bg-pink-100 border-pink-200 text-pink-600" 
                                : "bg-blue-100 border-blue-200 text-blue-600"
                            )}>
                              <span className="text-lg">{normalizeGender(actor.gender) === 'Perempuan' ? '👧' : '👦'}</span>
                            </div>
                          )}
                          <span className="font-bold text-slate-800 uppercase text-[13px] leading-tight print:text-black">{actor.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="font-mono text-[11px] text-slate-600 print:text-black block">{actor.nik}</span>
                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded-sm print:hidden inline-block mt-0.5">
                          Reg: {actor.registrationCode || "..."}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-primary uppercase text-[12px] print:text-black">{actor.businessName}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase print:hidden">{actor.businessCategory}</span>
                          <VerificationBadge actor={actor} />
                        </div>
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right print:hidden">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              setViewingActor(actor)
                              setIsEditMode(false)
                              setEditingBankMode(false)
                              fetchAuxData(actor)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handlePrintForm(actor)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {coordinatorStats.map((stat) => (
              <Card 
                key={stat.name}
                onClick={() => router.push(`/actor-data?coordinator=${stat.name}`)}
                className={cn(
                  "cursor-pointer transition-all hover:scale-[1.03] active:scale-95 border-none shadow-xl overflow-hidden group relative",
                  stat.isFull ? "bg-rose-600" : "bg-emerald-600"
                )}
              >
                <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:scale-125 transition-transform">
                  <BarChart3 className="w-12 h-12 text-white" />
                </div>
                <CardContent className="p-6 flex flex-col items-center text-center text-white gap-4 relative z-10">
                  <div className="w-full border-b border-white/20 pb-3 mb-1">
                    <h3 className="font-black uppercase text-[12px] tracking-widest leading-tight line-clamp-2 min-h-[2rem]" title={stat.name}>
                      {stat.name}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-4xl font-black drop-shadow-md">{stat.count}</span>
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-90">Data Terinput</span>
                  </div>
                  <div className="w-full mt-2">
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 flex justify-between items-center border border-white/10 shadow-inner">
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Total Kuota</span>
                        <span className="text-sm font-black">{stat.quota}</span>
                      </div>
                      <div className="h-8 w-px bg-white/10 mx-2" />
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Sisa</span>
                        <span className={cn(
                          "text-sm font-black",
                          stat.remaining <= 0 ? "text-rose-200" : "text-white"
                        )}>{stat.remaining > 0 ? stat.remaining : 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div 
                      className="bg-white h-full transition-all duration-1000" 
                      style={{ width: `${Math.min((stat.count / (stat.quota || 1)) * 100, 100)}%` }} 
                    />
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                    LIHAT DETAIL <ChevronRight className="w-3 h-3" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Load More Button */}
            <div className="col-span-full flex justify-center py-8">
              <Button 
                variant="outline" 
                onClick={() => setPageLimit(prev => prev + 50)}
                className="font-bold border-primary text-primary hover:bg-primary/5"
              >
                LOAD MORE DATA (50 BERIKUTNYA)
              </Button>
            </div>
            {coordinatorStats.length === 0 && (
               <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                 <div className="p-4 bg-slate-50 rounded-full">
                    <Search className="w-10 h-10 text-slate-300" />
                 </div>
                 <p className="font-black text-slate-400 uppercase tracking-widest">Belum ada data koordinator ditemukan</p>
               </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!viewingActor} onOpenChange={(open) => {
        if (!open) {
          setViewingActor(null)
          setIsEditMode(false)
          setEditingBankMode(false)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingActor && !editingBankMode && (
            <div className="flex flex-col gap-2 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-4">
                <DialogTitle className="text-xl md:text-2xl font-black text-primary uppercase">
                  {isEditMode ? "Edit Data Pelaku Usaha" : "Detail Pelaku Usaha"}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  {!isEditMode && viewingActor && !isKoordinator && !isInspektorat && (
                    <Button 
                      size="sm" 
                      onClick={() => handlePrintForm(viewingActor)}
                      className="font-bold bg-primary hover:bg-primary/90 text-white"
                    >
                      <Printer className="w-4 h-4 mr-2" /> Cetak Formulir
                    </Button>
                  )}
                  {!isAdmin && !isMonitoring && !isKoordinator && !isEditMode && viewingActor.status === 'verified_actor' && (

                    <Button 
                      size="sm" 
                      onClick={() => setEditingBankMode(true)}
                      className="font-bold bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <CreditCard className="w-4 h-4 mr-2" /> Input Rekening
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
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleRevert(viewingActor.id, viewingActor.fullName)} className="border-amber-500 text-amber-600 font-bold" title="Kembalikan ke antrean awal (Pending)">
                        <RotateCcw className="w-4 h-4 mr-1 md:mr-0" /> <span className="md:hidden">Revert</span>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(viewingActor.id, viewingActor.fullName)} className="font-bold" title="Hapus Permanen">
                        <Trash2 className="w-4 h-4 mr-1 md:mr-0" /> <span className="md:hidden">Delete</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isEditMode ? (
                <form onSubmit={handleSaveFullEdit} className="grid gap-6 py-4">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Lengkap</Label><Input name="fullName" defaultValue={viewingActor.fullName} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">NIK</Label><Input name="nik" defaultValue={viewingActor.nik} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor KK</Label><Input name="noKK" defaultValue={viewingActor.noKK} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Jenis Kelamin</Label>
                        <select name="gender" defaultValue={normalizeGender(viewingActor.gender || "")} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Tempat/Tgl Lahir</Label><Input name="pobDob" defaultValue={viewingActor.pobDob} /></div>
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
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Bank</Label><Input name="bankName" defaultValue={viewingActor.bankName} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor Rekening</Label><Input name="bankNumber" defaultValue={viewingActor.bankNumber} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Pemilik Rekening</Label><Input name="bankOwner" defaultValue={viewingActor.bankOwner} className="uppercase" /></div>
                    </div>
                  </section>

                  <div className="sticky bottom-0 bg-white dark:bg-zinc-950 p-4 border-t flex justify-end gap-2 mt-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] rounded-b-lg">
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
                        { label: "Reg ID", value: viewingActor.registrationCode },
                        { label: "Nama Lengkap", value: viewingActor.fullName },
                        { label: "NIK", value: viewingActor.nik },
                        { label: "Nomor KK", value: viewingActor.noKK },
                        { label: "Jenis Kelamin", value: viewingActor.gender },
                        { label: "Tempat/Tgl Lahir", value: viewingActor.pobDob },
                        { label: "Nomor HP", value: viewingActor.phone }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                      <div className="md:col-span-3 pt-2 border-t">
                          <CheckDataIndicator 
                            actor={viewingActor} 
                            data2023={activeDetailData.data2023}
                            data2024={activeDetailData.data2024}
                            data2025={activeDetailData.data2025}
                            dataBlacklist={activeDetailData.dataBlacklist}
                          />
                      </div>
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
                        ...(!isInspektorat ? [{ label: "KORLAP / DEWAN AKTIF", value: viewingActor.coordinator }] : [])
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-bold">{item.value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                      {[
                        { label: "Nama Bank", value: viewingActor.bankName },
                        { label: "Nomor Rekening", value: viewingActor.bankNumber },
                        { label: "Nama Pemilik Rekening", value: viewingActor.bankOwner }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          <p className="text-sm font-black text-primary">{item.value || "BELUM TERISI"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Informasi Sistem & Audit</div>
                    <div className="bg-slate-50 p-4 rounded-xl text-xs font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Status Terakhir</p>
                        <p className="capitalize text-primary">{(viewingActor.status || "").replace('_', ' ')}</p>
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

          {viewingActor && editingBankMode && (
            <div className="flex flex-col gap-4">
              <div className="border-b pb-2 flex justify-between items-center">
                <DialogTitle className="text-xl font-black text-amber-600 flex items-center gap-2">
                  <CreditCard className="w-5 h-5"/> INPUT REKENING
                </DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingBankMode(false)}>Batal</Button>
              </div>
              <form onSubmit={handleSaveBank}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Nomor Rekening</Label>
                    <Input name="bankNumber" defaultValue={viewingActor.bankNumber} placeholder="Contoh: 00129384812" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Nama Pemilik Sesuai Rekening</Label>
                    <Input name="bankOwner" defaultValue={viewingActor.bankOwner} className="uppercase" placeholder="Contoh: AGUS SURIYADI" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Nama Bank</Label>
                    <Select name="bankName" defaultValue={viewingActor.bankName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Bank..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BANK_LIST.map(bank => (
                          <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="submit" className="w-full bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan & Proses LPJ</Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ActorDataPage() {
  return (<Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}><ActorDataContent /></Suspense>)
}
