"use client"

import { useMemoFirebase, useList, useUser, useDatabase, useObject } from "@/firebase"
import { ref, query, orderByChild, equalTo, limitToFirst } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { RefreshCw, Users, UserCheck, UserX, Loader2, Building2, TrendingUp, MapPin, BarChart3, User, Clock, History, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { BusinessActor } from "../lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MusicDashboardCard } from "@/components/MusicDashboardCard"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  LabelList,
  Tooltip as RechartsTooltip
} from "recharts"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart"

const KELURAHAN_LIST = [
  "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
  "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
  "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
  "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
]

const kelurahanChartConfig = {
  count: {
    label: "Jumlah Pelaku Usaha",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const categoryChartConfig = {
  kuliner: {
    label: "Kuliner",
    color: "hsl(var(--primary))",
  },
  bukan_kuliner: {
    label: "Bukan Kuliner",
    color: "hsl(var(--indigo-500))",
  },
  unknown: {
    label: "Lainnya",
    color: "hsl(var(--slate-400))",
  },
} satisfies ChartConfig

export default function DashboardStatsPage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const router = useRouter()
  const { toast } = useToast()

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForDashboard } = useList(userProfileRef)
  const userProfile = allUsersForDashboard?.find((u: any) => u.uid === user?.uid)
  const [selectedFilter, setSelectedFilter] = useState<{name: string, filterType: string} | null>(null)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
      return
    }

    if (userProfile?.role === 'dinas') {
      router.push("/verifikasi-dinas")
    }

    if (userProfile?.role === 'koordinator') {
      router.push("/actor-data")
    }
  }, [user, isUserLoading, router, userProfile])
  
  // Optimize: Fetch pre-calculated stats instead of all actors
  const statsRef = useMemoFirebase(() => database ? ref(database, 'system_stats') : null, [database])
  const { data: systemStats, isLoading: isStatsLoading } = useObject(statsRef)

  // On-demand fetch for modal data (only when a filter is selected)
  const modalQuery = useMemoFirebase(() => {
    if (!database || !selectedFilter) return null
    const baseRef = ref(database, 'businessActors')
    
    // Applying filters at the query level where possible
    if (selectedFilter.filterType === 'laki') return query(baseRef, orderByChild('gender'), equalTo('Laki-laki'))
    if (selectedFilter.filterType === 'perempuan') return query(baseRef, orderByChild('gender'), equalTo('Perempuan'))
    if (selectedFilter.filterType === 'rejected') return query(baseRef, orderByChild('status'), equalTo('rejected'))
    // Note: Complex filters like 'verified' or 'kelurahan' might still need some client-side filtering 
    // unless we optimize the database structure further.
    return query(baseRef, limitToFirst(100)) // Limit initial modal data
  }, [database, selectedFilter])

  const { data: modalData, isLoading: isModalLoading } = useList(modalQuery)

  const kuotaQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'koordinator_kuotas')
  }, [database])

  const { data: kuotaData, isLoading: isKuotaLoading } = useList(kuotaQuery)

  // Use systemStats if available, otherwise fallback to 0 or calculate (one-time)
  const statsValues = useMemo(() => {
    if (systemStats) {
      return {
        total: systemStats.totalActors || 0,
        laki: systemStats.gender?.laki || 0,
        perempuan: systemStats.gender?.perempuan || 0,
        verified: systemStats.status?.verified || 0,
        rejected: systemStats.status?.rejected || 0
      }
    }
    return { total: 0, laki: 0, perempuan: 0, verified: 0, rejected: 0 }
  }, [systemStats])

  const [isSyncing, setIsSyncing] = useState(false)
  const handleSyncStats = async () => {
    if (!database || isSyncing) return
    setIsSyncing(true)
    try {
      const { get, ref } = await import("firebase/database")
      const snap = await get(ref(database, 'businessActors'))
      if (snap.exists()) {
        const actors = Object.values(snap.val())
        const stats = {
          totalActors: actors.length,
          gender: {
            laki: actors.filter((a: any) => ['laki-laki', 'l'].includes((a.gender || "").toLowerCase())).length,
            perempuan: actors.filter((a: any) => ['perempuan', 'p'].includes((a.gender || "").toLowerCase())).length,
            unknown: 0
          },
          status: {
            pending: actors.filter((a: any) => (a.status || 'pending') === 'pending').length,
            verified: actors.filter((a: any) => ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending'].includes(a.status)).length,
            rejected: actors.filter((a: any) => a.status === 'rejected').length,
            finish: actors.filter((a: any) => a.status === 'finish').length,
          },
          kelurahan: {},
          coordinator: {},
          lastUpdated: new Date().toISOString()
        } as any

        actors.forEach((a: any) => {
          if (a.kelurahan) {
            const k = a.kelurahan.toUpperCase().trim()
            stats.kelurahan[k] = (stats.kelurahan[k] || 0) + 1
          }
          if (a.coordinator) {
            const c = a.coordinator.toUpperCase().trim()
            stats.coordinator[c] = (stats.coordinator[c] || 0) + 1
          }
        })
        
        const { set } = await import("firebase/database")
        await set(ref(database, 'system_stats'), stats)
        toast({ title: "Sinkronisasi Berhasil", description: "Statistik sistem telah diperbarui." })
      }
    } catch (err) {
      console.error(err)
      toast({ variant: "destructive", title: "Gagal Sinkronisasi", description: "Terjadi kesalahan saat menghitung ulang statistik." })
    } finally {
      setIsSyncing(false)
    }
  }

  const coordinatorStats = useMemo(() => {
    if (!systemStats?.coordinator) return []
    return Object.entries(systemStats.coordinator)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [systemStats])

  const combinedKuotaData = useMemo(() => {
    if (!kuotaData) return []
    
    const achievedMap = systemStats?.coordinator || {}

    return kuotaData.map((item: any) => {
      const quota = item.quota || 0
      const nameUpper = item.name ? item.name.toUpperCase().trim() : ''
      const achieved = achievedMap[nameUpper] || 0
      const remaining = quota - achieved
      return {
        ...item,
        quota,
        achieved,
        remaining
      }
    }).sort((a: any, b: any) => {
      const nameA = (a.name || "").toLowerCase()
      const nameB = (b.name || "").toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }, [kuotaData, systemStats])

  const totalKuotaDashboard = useMemo(() => {
    return combinedKuotaData.reduce((acc, curr) => acc + curr.quota, 0)
  }, [combinedKuotaData])

  const totalAchievedDashboard = useMemo(() => {
    return combinedKuotaData.reduce((acc, curr) => acc + curr.achieved, 0)
  }, [combinedKuotaData])

  const kelurahanStats = useMemo(() => {
    if (!systemStats?.kelurahan) return []
    const stats = Object.entries(systemStats.kelurahan).map(([name, count]) => ({
      name,
      count
    }))
    return stats.sort((a, b) => b.count - a.count);
  }, [systemStats])

  const filteredModalData = useMemo(() => {
    if (!selectedFilter || !modalData) return []
    // Since we fetch modalData on demand based on the filter, 
    // we might still need some refinement here if the query was generic.
    const type = selectedFilter.filterType
    if (type === "total") return modalData
    if (type === "verified") return modalData.filter(d => {
      const s = d.status || "";
      return ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish'].includes(s);
    })
    if (type === "kelurahan") {
      return modalData.filter(d => {
        const k = d.kelurahan?.toLowerCase().trim() || "";
        const targetK = selectedFilter.name.toLowerCase().trim();
        return k === targetK;
      })
    }
    return modalData
  }, [modalData, selectedFilter])

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  const stats = [
    { 
      name: "Total Pelaku Usaha", 
      value: statsValues.total, 
      icon: Building2, 
      color: "text-white", 
      bg: "bg-white/20",
      cardBg: "bg-amber-500",
      hoverBg: "hover:bg-amber-600",
      border: "border-amber-400",
      filterType: "total"
    },
    { 
      name: "Pelaku Laki-laki", 
      value: statsValues.laki, 
      icon: Users, 
      color: "text-white", 
      bg: "bg-white/20",
      cardBg: "bg-blue-600",
      hoverBg: "hover:bg-blue-700",
      border: "border-blue-500",
      filterType: "laki"
    },
    { 
      name: "Pelaku Perempuan", 
      value: statsValues.perempuan, 
      icon: Users, 
      color: "text-white", 
      bg: "bg-white/20",
      cardBg: "bg-rose-500",
      hoverBg: "hover:bg-rose-600",
      border: "border-rose-400",
      filterType: "perempuan"
    },
    { 
      name: "Data Terverifikasi", 
      value: statsValues.verified, 
      icon: UserCheck, 
      color: "text-white", 
      bg: "bg-white/20",
      cardBg: "bg-emerald-600",
      hoverBg: "hover:bg-emerald-700",
      border: "border-emerald-500",
      filterType: "verified"
    },
    { 
      name: "Data Ditolak", 
      value: statsValues.rejected, 
      icon: UserX, 
      color: "text-white", 
      bg: "bg-white/20",
      cardBg: "bg-orange-500",
      hoverBg: "hover:bg-orange-600",
      border: "border-orange-400",
      filterType: "rejected"
    },
  ]

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in-up duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1 relative">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline text-slate-800 uppercase drop-shadow-sm">
            Dashboard Statistik
          </h1>
          <p className="text-xs md:text-sm text-slate-600 font-semibold">
            Monitor dan kelola pendaftaran pelaku usaha secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {userProfile?.role === 'admin' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSyncStats} 
              disabled={isSyncing}
              className="glass-panel border-primary/20 text-primary hover:bg-primary/5 font-bold text-[10px] md:text-xs h-8 md:h-10"
            >
              {isSyncing ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-2" />}
              SYNC STATS
            </Button>
          )}
          <div className="glass-panel px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-2 md:gap-3 hover:shadow-lg transition-all">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Sistem: <span className="text-emerald-600">AKTIF</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card 
            key={stat.name} 
            onClick={() => setSelectedFilter({ name: stat.name, filterType: stat.filterType })}
            className={cn(
              "border shadow-md transition-all duration-500 group overflow-hidden cursor-pointer active:scale-95",
              "hover:shadow-2xl hover:-translate-y-1",
              stat.cardBg,
              stat.hoverBg,
              stat.border
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
              <CardTitle className="text-[10px] md:text-xs font-bold text-white/80 uppercase tracking-wider truncate mr-2">{stat.name}</CardTitle>
              <div className={cn(stat.bg, "p-1.5 md:p-2.5 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform duration-300 shrink-0")}>
                <stat.icon className={cn("w-4 h-4 md:w-5 md:h-5", stat.color)} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl md:text-3xl font-black text-white">{isStatsLoading ? "..." : stat.value}</div>
              <div className="flex items-center gap-1 mt-1 text-[8px] md:text-[10px] font-bold text-white/70 uppercase">
                <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                DATA TERKINI
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 items-stretch">
        <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
          <Card className="glass overflow-hidden transition-all hover:shadow-xl border-none h-fit">
            <CardHeader className="bg-primary/10 pb-4">
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2 text-primary">
                <BarChart3 className="w-5 h-5" /> Jumlah Kuota
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[40px] text-center font-black text-slate-800 text-[10px] md:text-xs">No</TableHead>
                      <TableHead className="font-black text-slate-800 text-[10px] md:text-xs min-w-[120px]">Nama Korlap / Dewan Aktif</TableHead>
                      <TableHead className="text-center font-black text-slate-800 text-[10px] md:text-xs">Jumlah Kuota</TableHead>
                      <TableHead className="text-center font-black text-slate-800 text-[10px] md:text-xs">Kuota Tercapai</TableHead>
                      <TableHead className="text-center font-black text-slate-800 text-[10px] md:text-xs">Sisa Kuota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combinedKuotaData.map((item: any, index: number) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-center font-bold text-slate-600 text-xs">{index + 1}</TableCell>
                        <TableCell className="font-black text-primary text-xs tracking-tight">{item.name}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 font-black px-3 py-1 rounded-full min-w-[3rem] shadow-sm text-xs border border-slate-200">
                            {item.quota}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center bg-emerald-100 text-emerald-700 font-black px-3 py-1 rounded-full min-w-[3rem] shadow-sm text-xs border border-emerald-200">
                            {item.achieved}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center font-black px-3 py-1 rounded-full min-w-[3rem] shadow-sm text-xs border",
                            item.remaining <= 0 
                              ? "bg-rose-100 text-rose-700 border-rose-200" 
                              : "bg-blue-100 text-blue-700 border-blue-200"
                          )}>
                            {item.remaining}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                      <TableCell colSpan={2} className="font-black text-slate-800 uppercase text-right text-xs py-3">
                        Total Kuota Data
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-600 text-sm">
                        {totalKuotaDashboard}
                      </TableCell>
                      <TableCell className="text-center font-black text-emerald-600 text-sm">
                        {totalAchievedDashboard}
                      </TableCell>
                      <TableCell className="text-center font-black text-primary text-sm">
                        {totalKuotaDashboard - totalAchievedDashboard}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          {/* Music Player Section */}
          <div className="grid grid-cols-1 gap-6 items-stretch">
            <MusicDashboardCard className="h-full" role={userProfile?.role} />
          </div>
        </div>

        <div className="space-y-6 flex flex-col">
          <Card className="glass overflow-hidden transition-all hover:shadow-xl border-none h-full flex flex-col">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Sebaran per Kelurahan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-auto flex-1">
              <Table>
                <TableHeader className="bg-slate-100/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[50px] text-center font-black text-[10px] uppercase">No</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Nama Kelurahan</TableHead>
                    <TableHead className="text-center font-black text-[10px] uppercase">Jumlah Pelaku</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kelurahanStats.map((item, idx) => (
                    <TableRow 
                      key={item.name} 
                      className="hover:bg-primary/5 cursor-pointer transition-colors group"
                      onClick={() => setSelectedFilter({ name: item.name, filterType: "kelurahan" })}
                    >
                      <TableCell className="text-center font-bold text-xs text-slate-400">{idx + 1}</TableCell>
                      <TableCell className="font-black text-xs text-slate-700 uppercase group-hover:text-primary transition-colors">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded-full min-w-[2.5rem] text-[10px] border border-slate-200 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all">
                          {item.count}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-slate-50/80 border-t-2">
                    <TableCell colSpan={2} className="text-right font-black text-[10px] uppercase text-slate-500 py-3">Total Data Tersebar</TableCell>
                    <TableCell className="text-center font-black text-primary text-xs">
                      {kelurahanStats.reduce((acc, curr) => acc + curr.count, 0)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedFilter} onOpenChange={(open) => !open && setSelectedFilter(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase text-primary">
              DATA: {selectedFilter?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-xl border">
            {isModalLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                  <TableRow>
                    <TableHead className="w-[50px] text-center font-black text-slate-800 text-xs">No</TableHead>
                    <TableHead className="font-black text-slate-800 text-xs">Nama Lengkap</TableHead>
                    <TableHead className="font-black text-slate-800 text-xs">NIK</TableHead>
                    <TableHead className="font-black text-slate-800 text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModalData.map((d, i) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-center font-bold text-slate-600 text-xs">{i + 1}</TableCell>
                      <TableCell className="font-black text-slate-800 text-xs uppercase">{d.fullName || "-"}</TableCell>
                      <TableCell className="font-mono text-slate-600 text-xs">{d.nik || "-"}</TableCell>
                      <TableCell className="text-center">
                         <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full border bg-slate-100 text-slate-600">
                           {(d.status || "PENDING").replace(/_/g, " ")}
                         </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
