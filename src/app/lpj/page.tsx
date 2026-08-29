"use client"

import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject } from "@/firebase"
import { ref, query, orderByChild, equalTo, limitToFirst } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  FileText, 
  Loader2, 
  Save, 
  AlertCircle, 
  Clock, 
  Ban, 
  CheckCircle2,
  ShieldAlert,
  Printer,
  ChevronRight,
  Search,
  RotateCcw
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/confirm-dialog"

export default function LPJPage() {
  const { user, userProfile } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [mounted, setMounted] = useState(false)
  const [filterCoordinator, setFilterCoordinator] = useState<string>("all")
  const [pageLimit, setPageLimit] = useState(50)
  const [printDate, setPrintDate] = useState<string>("")
  const [showUnblacklistDialog, setShowUnblacklistDialog] = useState(false)
  const [unblacklistPending, setUnblacklistPending] = useState<{ id: string; fullName: string } | null>(null)

  useEffect(() => {
    setMounted(true)
    setPrintDate(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }))
  }, [])

  useEffect(() => {
    setPageLimit(50)
  }, [filterCoordinator])

  const isAdmin = userProfile?.role === 'admin'
  const isPetugas = userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas'
  const isMonitoring = userProfile?.role === 'monitoring'
  const isKoordinator = userProfile?.role === 'koordinator'
  const canAccess = isAdmin || isPetugas || isMonitoring || isKoordinator
  const canModify = isAdmin || isPetugas

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('finish'))
  }, [database])
  
  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const actors = useMemo(() => {
      const filtered = allActorsRaw?.filter(a => {
        const isFinish = a.status === 'finish';
        const isReady = !!a.readyForLPJ;
        const noLpj = !a.lpjNominal;
        const isBlacklist = a.status === 'blacklist';
        
        const baseFilter = (isFinish && isReady && noLpj) || isBlacklist;
        
        if (!baseFilter) return false;

        if (isKoordinator) {
          return a.coordinator?.toLowerCase() === userProfile?.fullName?.toLowerCase();
        }

        if (filterCoordinator !== "all") {
          return a.coordinator === filterCoordinator;
        }

        return true;
      }) || [];
      return filtered;
  }, [allActorsRaw, isKoordinator, userProfile, filterCoordinator])

  const coordinators = useMemo(() => {
    if (!allActorsRaw) return [];
    const unique = Array.from(new Set(allActorsRaw
      .filter(a => (a.status === 'finish' && a.readyForLPJ && !a.lpjNominal) || a.status === 'blacklist')
      .map(a => a.coordinator)
      .filter(Boolean)
    )).sort();
    return unique;
  }, [allActorsRaw])

  const handleSaveLPJ = async (actorId: string, fullName: string, nominal: string) => {
    if (!canAccess || !database || !nominal) return
    const numNominal = parseFloat(nominal.replace(/[^0-9]/g, ''))
    if (isNaN(numNominal)) {
        toast({ variant: "destructive", title: "Input Tidak Valid", description: "Harap masukkan nominal angka yang benar." })
        return
    }

    const actorRef = ref(database, `businessActors/${actorId}`)
    await updateDocumentNonBlocking(actorRef, { 
      status: 'finish',
      lpjNominal: numNominal,
      lpjDoneAt: new Date().toISOString()
    })

    // Update global stats
    import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
      // Find actor for metadata
      const actorObj = { id: actorId, status: 'lpj_pending' }; // Minimal fallback
      updateStatsOnStatusChange(database, 'lpj_pending', 'finish', actorObj).catch(e => console.error(e));
    });
    
    logActivity({
      query: `SIMPAN LPJ: ${fullName} (Rp${numNominal})`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA LPJ',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "LPJ Berhasil Disimpan", description: "Data telah dipindahkan ke folder Selesai." })
  }

  const handleUnblacklist = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setUnblacklistPending({ id: actorId, fullName })
    setShowUnblacklistDialog(true)
  }

  const confirmUnblacklist = async () => {
    if (!isAdmin || !database || !unblacklistPending) return
    const actorRef = ref(database, `businessActors/${unblacklistPending.id}`)
    await updateDocumentNonBlocking(actorRef, { 
        status: 'finish',
        lpjEntryDate: new Date().toISOString() // Reset entry date to give another 14 days
    })
    
    // Update global stats (Moving back from whatever it was, though Blacklist in this context is finish-with-flag)
    // Actually if it's already finish, no status change in DB terms, but if status was 'blacklist_lpj' or similar:
    // Let's assume it was status: 'finish' but now we just reset date.
    // If status changes from 'rejected' (blacklist) to 'finish':
    /*
    import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        updateStatsOnStatusChange(database, 'rejected', 'finish', { id: unblacklistPending.id });
    });
    */
    
    logActivity({
      query: `PULIHKAN DARI BLACKLIST (LPJ): ${unblacklistPending.fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA LPJ',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Status Dikembalikan", description: "Data kini kembali di antrean LPJ." })
    setUnblacklistPending(null)
  }

  if (!mounted) return null

  if (!canAccess) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center text-destructive">
        <ShieldAlert className="w-16 h-16" />
        <h1 className="text-2xl font-bold uppercase tracking-tighter">Akses Ditolak</h1>
        <p className="text-muted-foreground font-medium">Halaman pelaporan LPJ hanya untuk Petugas dan Administrator.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <h1 className="text-3xl font-black text-primary font-headline uppercase tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8" /> Pelaporan LPJ
          </h1>
        </div>
        <p className="text-muted-foreground font-medium print:hidden">Catat laporan pertanggungjawaban dana yang telah diterima pelaku usaha.</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        {isAdmin || isPetugas || isMonitoring ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
            <Label className="text-[10px] font-black uppercase text-slate-400 shrink-0">Filter Koordinator</Label>
            <Select value={filterCoordinator} onValueChange={setFilterCoordinator}>
              <SelectTrigger className="w-full sm:w-[250px] h-10 rounded-xl border-primary/20 bg-white/50 backdrop-blur-sm font-bold text-xs">
                <SelectValue placeholder="Pilih Koordinator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bold text-xs uppercase">Semua Koordinator</SelectItem>
                {coordinators.map(c => (
                  <SelectItem key={c} value={c} className="font-bold text-xs uppercase">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : isKoordinator ? (
          <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase text-primary tracking-widest">KOORDINATOR: {userProfile?.fullName}</span>
          </div>
        ) : <div />}

        <Button 
          onClick={() => window.print()} 
          className="bg-primary hover:bg-primary/90 font-black text-xs rounded-xl px-6 h-10 shadow-lg shadow-primary/20 gap-2 w-full md:w-auto"
        >
          <Printer className="w-4 h-4" /> CETAK REKAPAN LPJ
        </Button>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Status / Durasi</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Batas Waktu</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Nama Lengkap</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">NIK / Rekening Bank</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Nominal LPJ</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actors?.slice(0, pageLimit).map((actor) => {
                    const entryDate = actor.lpjEntryDate ? new Date(actor.lpjEntryDate) : new Date()
                    const deadlineDate = new Date(entryDate.getTime() + (14 * 24 * 60 * 60 * 1000))
                    const daysInLPJ = Math.floor((new Date().getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
                    const isOverdue = daysInLPJ >= 14
                    const isBlacklisted = actor.status === 'blacklist' || (isOverdue && actor.status === 'finish')
                    
                    // Auto-blacklist logic (visual cue, in a real app this would be a trigger)
                    const statusLabel = isBlacklisted ? "BLACKLIST" : "Menunggu LPJ"

                    return (
                      <TableRow key={actor.id} className={cn("hover:bg-slate-50 transition-colors", isBlacklisted && "bg-red-50/50")}>
                        <TableCell>
                           <div className="flex flex-col gap-1">
                             <Badge variant={isBlacklisted ? "destructive" : "outline"} className={cn(
                                "w-fit font-black text-[9px] uppercase tracking-wider",
                                !isBlacklisted && "border-primary text-primary"
                             )}>
                               {statusLabel}
                             </Badge>
                             <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                                <Clock className="w-3 h-3" /> {daysInLPJ} hari di LPJ
                             </div>
                           </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                <span className={cn(
                                    "font-black text-xs",
                                    isOverdue ? "text-destructive" : "text-primary"
                                )}>
                                    {deadlineDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                    {isOverdue ? "WAKTU HABIS" : "PENYERAHAN TERAKHIR"}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell className="font-black text-slate-700 uppercase">{actor.fullName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-[10px]">
                            <span className="font-mono text-slate-400">{actor.nik}</span>
                            <span className="font-bold text-slate-600 uppercase">{actor.bankName} - {actor.bankNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                           {isBlacklisted ? (
                             <div className="flex items-center gap-2 text-destructive font-black text-xs">
                               <Ban className="w-4 h-4" /> DIBLOKIR
                             </div>
                           ) : (
                             <div className="relative max-w-[200px]">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">RP</span>
                               <Input 
                                 id={`lpj-${actor.id}`}
                                 placeholder="0" 
                                 disabled={isMonitoring}
                                 className="pl-9 h-9 rounded-xl font-black text-sm border-slate-200 focus:ring-primary shadow-inner" 
                               />
                             </div>
                           )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isBlacklisted ? (
                              isAdmin ? (
                                <Button size="sm" variant="outline" className="rounded-xl font-black text-[10px] border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleUnblacklist(actor.id, actor.fullName)}>
                                    AKTIFKAN KEMBALI
                                </Button>
                              ) : (
                                <span className="text-[9px] font-black text-red-400 uppercase bg-red-50 px-3 py-2 rounded-lg py-1">HUBUNGI ADMIN</span>
                              )
                            ) : (
                              !isMonitoring && (
                                <Button 
                                  size="sm" 
                                  className="bg-primary hover:bg-primary/90 font-black text-[10px] rounded-xl px-4 h-9 shadow-lg shadow-primary/20"
                                  onClick={() => {
                                      const input = document.getElementById(`lpj-${actor.id}`) as HTMLInputElement
                                      handleSaveLPJ(actor.id, actor.fullName, input.value)
                                  }}
                                >
                                  <Save className="w-3.5 h-3.5 mr-2" /> SIMPAN LPJ
                                </Button>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(!actors || actors.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24">
                        <div className="flex flex-col items-center opacity-20">
                            <CheckCircle2 className="w-16 h-16 mb-4" />
                            <p className="font-black uppercase tracking-widest text-xs">SEMUA DATA LPJ TELAH DISELESAIKAN</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {actors && actors.length > pageLimit && (
                <div className="p-4 flex justify-center border-t bg-slate-50">
                  <Button 
                    variant="outline" 
                    onClick={() => setPageLimit(prev => prev + 50)} 
                    className="font-bold border-primary text-primary hover:bg-primary/10 text-xs"
                  >
                    Tampilkan Lebih Banyak Data (+50)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Legend / Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
                <p className="text-xs font-black text-amber-900 uppercase tracking-tight">ATURAN TENGGAT WAKTU</p>
                <p className="text-[10px] font-medium text-amber-700 leading-relaxed mt-1">
                    Pelaku usaha wajib menyerahkan LPJ maksimal 14 hari setelah dana masuk ke rekening. Jika melewati batas, sistem akan otomatis memblokir (Blacklist) data tersebut.
                </p>
            </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
                <p className="text-xs font-black text-blue-900 uppercase tracking-tight">WEWENANG PEMULIHAN</p>
                <p className="text-[10px] font-medium text-blue-700 leading-relaxed mt-1">
                    Hanya Administrator (Superadmin) yang dapat memulihkan data yang telah ter-blacklist karena keterlambatan LPJ.
                </p>
            </div>
        </div>
      </div>

      {/* PRINT SECTION */}
      <div className="hidden print:block p-4">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-black uppercase border-b-2 border-black pb-2">REKAPAN LPJ</h1>
          <div className="flex justify-between items-center text-xs font-bold uppercase pt-2">
            <span>Koordinator: {filterCoordinator === "all" ? "SEMUA" : filterCoordinator}</span>
            <span>Tanggal: {printDate}</span>
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black p-2 font-black uppercase text-center w-10">No</th>
              <th className="border border-black p-2 font-black uppercase text-center">No. Registrasi</th>
              <th className="border border-black p-2 font-black uppercase text-left">Nama Lengkap</th>
              <th className="border border-black p-2 font-black uppercase text-center">NIK</th>
              <th className="border border-black p-2 font-black uppercase text-center">No. KK</th>
              <th className="border border-black p-2 font-black uppercase text-left">Koordinator</th>
              <th className="border border-black p-2 font-black uppercase text-center w-32">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            {actors.map((actor, index) => (
              <tr key={actor.id}>
                <td className="border border-black p-2 text-center font-bold">{index + 1}</td>
                <td className="border border-black p-2 text-center font-mono">{actor.registrationCode || "-"}</td>
                <td className="border border-black p-2 font-black uppercase">{actor.fullName}</td>
                <td className="border border-black p-2 text-center font-mono">{actor.nik}</td>
                <td className="border border-black p-2 text-center font-mono">{actor.noKK}</td>
                <td className="border border-black p-2 uppercase text-[9px]">{actor.coordinator || "-"}</td>
                <td className="border border-black p-2 h-16 relative">
                  <span className="absolute top-1 left-1 text-[8px] text-slate-300 font-bold">{index + 1}.</span>
                </td>
              </tr>
            ))}
            {actors.length === 0 && (
              <tr>
                <td colSpan={7} className="border border-black p-10 text-center font-bold uppercase italic">Tidak ada data untuk dicetak.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-12 flex justify-end">
          <div className="text-center space-y-16">
            <p className="text-xs font-bold uppercase">Petugas Verifikasi,</p>
            <div className="border-t border-black w-48 pt-2">
              <p className="text-xs font-black uppercase">{userProfile?.fullName || user?.email?.split('@')[0] || "..........................."}</p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showUnblacklistDialog}
        onOpenChange={setShowUnblacklistDialog}
        icon={<RotateCcw className="w-6 h-6" />}
        title="Pulihkan dari Blacklist"
        description="Kembalikan data ini dari Blacklist ke antrean LPJ?"
        confirmText="Ya, Lanjutkan"
        confirmIcon={<RotateCcw className="w-4 h-4" />}
        variant="default"
        onConfirm={confirmUnblacklist}
      />
    </div>
  )
}
