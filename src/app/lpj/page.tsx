"use client"

import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
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
  ShieldAlert
} from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function LPJPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForProfile } = useList(userProfileRef)
  const userProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

  const isAdmin = userProfile?.role === 'admin'
  const isPetugas = userProfile?.role === 'petugas'
  const canAccess = isAdmin || isPetugas

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])
  
  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const actors = useMemo(() => {
      return allActorsRaw?.filter(a => a.status === 'lpj_pending' || a.status === 'blacklist') || []
  }, [allActorsRaw])

  const handleSaveLPJ = async (actorId: string, nominal: string) => {
    if (!canAccess || !database || !nominal) return
    const numNominal = parseFloat(nominal.replace(/[^0-9]/g, ''))
    if (isNaN(numNominal)) {
        toast({ variant: "destructive", title: "Input Tidak Valid", description: "Silahkan masukkan angka nominal yang benar." })
        return
    }

    const actorRef = ref(database, `businessActors/${actorId}`)
    await updateDocumentNonBlocking(actorRef, { 
      status: 'finish',
      lpjNominal: numNominal,
      lpjDoneAt: new Date().toISOString()
    })
    toast({ title: "LPJ Berhasil Disimpan", description: "Data otomatis dipindahkan ke menu FINISH." })
  }

  const handleUnblacklist = async (actorId: string) => {
    if (!isAdmin || !database) return
    if (confirm("Kembalikan status data ini ke Antrean LPJ?")) {
        const actorRef = ref(database, `businessActors/${actorId}`)
        await updateDocumentNonBlocking(actorRef, { 
            status: 'lpj_pending',
            lpjEntryDate: new Date().toISOString() // Reset entry date to give another 14 days
        })
        toast({ title: "Status Dipulihkan", description: "Data kembali ke daftar tunggu LPJ." })
    }
  }

  if (!mounted) return null

  if (!canAccess) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center text-destructive">
        <ShieldAlert className="w-16 h-16" />
        <h1 className="text-2xl font-bold uppercase tracking-tighter">Akses Ditolak</h1>
        <p className="text-muted-foreground font-medium">Hanya Petugas dan Administrator yang dapat mengelola LPJ.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-primary font-headline uppercase tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8" /> Pengelolaan LPJ
        </h1>
        <p className="text-muted-foreground font-medium">Input Nominal Laporan Pertanggung Jawaban untuk penyelesaian data.</p>
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
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Status & Waktu</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Batas Waktu</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Pelaku Usaha</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">NIK / Rekening</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Nominal LPJ</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actors?.map((actor) => {
                    const entryDate = actor.lpjEntryDate ? new Date(actor.lpjEntryDate) : new Date()
                    const deadlineDate = new Date(entryDate.getTime() + (14 * 24 * 60 * 60 * 1000))
                    const daysInLPJ = Math.floor((new Date().getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
                    const isOverdue = daysInLPJ >= 14
                    const isBlacklisted = actor.status === 'blacklist' || (isOverdue && actor.status === 'lpj_pending')
                    
                    // Auto-blacklist logic (visual cue, in a real app this would be a trigger)
                    const statusLabel = isBlacklisted ? "BLACKLIST" : "PENDING LPJ"

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
                                <Clock className="w-3 h-3" /> {daysInLPJ} HARI DALAM LPJ
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
                               <Ban className="w-4 h-4" /> AKSES TERKUNCI
                             </div>
                           ) : (
                             <div className="relative max-w-[200px]">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">RP</span>
                               <Input 
                                 id={`lpj-${actor.id}`}
                                 placeholder="0" 
                                 className="pl-9 h-9 rounded-xl font-black text-sm border-slate-200 focus:ring-primary shadow-inner" 
                               />
                             </div>
                           )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isBlacklisted ? (
                              isAdmin ? (
                                <Button size="sm" variant="outline" className="rounded-xl font-black text-[10px] border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleUnblacklist(actor.id)}>
                                    PULIHKAN AKSES
                                </Button>
                              ) : (
                                <span className="text-[9px] font-black text-red-400 uppercase bg-red-50 px-3 py-2 rounded-lg py-1">Hubungi Admin</span>
                              )
                            ) : (
                              <Button 
                                size="sm" 
                                className="bg-primary hover:bg-primary/90 font-black text-[10px] rounded-xl px-4 h-9 shadow-lg shadow-primary/20"
                                onClick={() => {
                                    const input = document.getElementById(`lpj-${actor.id}`) as HTMLInputElement
                                    handleSaveLPJ(actor.id, input.value)
                                }}
                              >
                                <Save className="w-3.5 h-3.5 mr-2" /> SIMPAN LPJ
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(!actors || actors.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-24">
                        <div className="flex flex-col items-center opacity-20">
                            <CheckCircle2 className="w-16 h-16 mb-4" />
                            <p className="font-black uppercase tracking-widest text-xs">Semua LPJ Telah Selesai</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Legend / Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
                <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Aturan Batas Waktu 14 Hari</p>
                <p className="text-[10px] font-medium text-amber-700 leading-relaxed mt-1">
                    Setiap data yang masuk ke menu ini wajib diinput Nominal LPJ dalam waktu maksimal 14 hari. 
                    Melewati batas tersebut, data akan otomatis berstatus <strong>Blacklist</strong>.
                </p>
            </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
                <p className="text-xs font-black text-blue-900 uppercase tracking-tight">Otoritas Pemulihan</p>
                <p className="text-[10px] font-medium text-blue-700 leading-relaxed mt-1">
                    Status <strong>Blacklist</strong> hanya dapat dipulihkan atau diubah kembali menjadi Antrean LPJ oleh pengguna dengan role <strong>Admin</strong>.
                </p>
            </div>
        </div>
      </div>
    </div>
  )
}
