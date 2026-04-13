"use client"

import { useState, useMemo, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, useObject } from "@/firebase"
import { ref } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Search, History, Smartphone, Monitor, Bot, Globe, Clock, User, MessageSquare, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

function AppLogsContent() {
  const { user } = useUser()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")

  // Admin Check
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsers } = useList(userProfileRef)
  const userProfile = allUsers?.find((u: any) => u.uid === user?.uid)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'

  const logsRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'activity_logs')
  }, [database])

  const { data: allLogs, isLoading } = useList<any>(logsRef)

  const filteredLogs = useMemo(() => {
    if (!allLogs) return []
    
    // Sort by timestamp descending
    const sorted = [...allLogs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    if (!searchQuery) return sorted

    const q = searchQuery.toLowerCase()
    return sorted.filter(log => 
      (log.query || "").toLowerCase().includes(q) ||
      (log.results || "").toLowerCase().includes(q) ||
      (log.device || "").toLowerCase().includes(q) ||
      (log.source || "").toLowerCase().includes(q) ||
      (log.userId || "").toLowerCase().includes(q) ||
      (log.chatId || "").toLowerCase().includes(q)
    )
  }, [allLogs, searchQuery])

  if (!isAdmin && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="w-16 h-16 text-red-500 opacity-20" />
        <h2 className="text-2xl font-black text-slate-800 uppercase">Akses Dibatasi</h2>
        <p className="text-slate-500 font-medium">Halaman ini hanya dapat diakses oleh Administrator.</p>
      </div>
    )
  }

  const getDeviceIcon = (device: string) => {
    const d = device?.toLowerCase() || ""
    if (d.includes("android")) return <Smartphone className="w-4 h-4 text-emerald-500" />
    if (d.includes("ios")) return <Smartphone className="w-4 h-4 text-blue-500" />
    if (d.includes("windows") || d.includes("macos") || d.includes("linux")) return <Monitor className="w-4 h-4 text-slate-600" />
    if (d.includes("bot")) return <Bot className="w-4 h-4 text-amber-500" />
    return <Globe className="w-4 h-4 text-slate-400" />
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <History className="w-8 h-8" /> LOG AKTIVITAS APLIKASI
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground uppercase font-bold tracking-wider">
            Memantau riwayat pengecekkan data dari Web & Bot Telegram
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Cari Log (NIK, Hasil, Perangkat)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 border-primary/20 bg-white ring-offset-primary focus-visible:ring-primary shadow-sm"
          />
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-primary font-black uppercase text-xs animate-pulse">Memuat Log Aktivitas...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[180px] font-black text-slate-500 uppercase text-[10px] pl-6">Waktu</TableHead>
                    <TableHead className="w-[120px] font-black text-slate-500 uppercase text-[10px]">Sumber / Perangkat</TableHead>
                    <TableHead className="font-black text-slate-500 uppercase text-[10px]">Data Yang Dicari</TableHead>
                    <TableHead className="font-black text-slate-500 uppercase text-[10px]">Hasil / Respon</TableHead>
                    <TableHead className="w-[150px] font-black text-slate-500 uppercase text-[10px] pr-6">Pengakses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log, idx) => (
                    <TableRow key={log.id || idx} className="hover:bg-primary/5 transition-colors border-slate-100">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black text-slate-700">
                            {new Date(log.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "w-fit text-[9px] font-black uppercase tracking-tighter px-1.5 py-0",
                              log.source === 'Telegram' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            )}
                          >
                            {log.source || 'Web'}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                            {getDeviceIcon(log.device)}
                            <span className="truncate max-w-[80px]">{log.device}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-primary font-mono select-all">
                            {log.query || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "text-xs font-bold px-3 py-1.5 rounded-lg border w-fit",
                          (log.results || "").toLowerCase().includes("tidak") 
                            ? "bg-red-50 text-red-600 border-red-100" 
                            : "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm"
                        )}>
                          {log.results || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                            {log.source === 'Telegram' ? <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> : <User className="w-3.5 h-3.5 text-slate-400" />}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-[10px] font-black text-slate-700 truncate">
                              {log.source === 'Telegram' ? `ID: ${log.chatId}` : (log.userId === 'Public' ? 'USER PUBLIK' : log.userId)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredLogs.length === 0 && (
                <div className="p-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <History className="w-12 h-12 opacity-10" />
                  <p className="font-bold uppercase text-xs tracking-widest">Tidak ada record aktivitas</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AppLogsPage() {
  return (
    <Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <AppLogsContent />
    </Suspense>
  )
}
