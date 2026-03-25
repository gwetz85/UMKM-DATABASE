
"use client"

import { useMemoFirebase, useList, useUser, useDatabase } from "@/firebase"
import { ref, query } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, UserX, Activity, Loader2, Building2, TrendingUp, MapPin, BarChart3, User, Cloud, DatabaseZap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import { BusinessActor } from "./lib/types"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const router = useRouter()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])
  
  const memoQuery = useMemoFirebase(() => {
    if (!database || !user) return null
    return query(ref(database, 'businessActors'))
  }, [database, user])

  const { data: allData, isLoading } = useList<BusinessActor>(memoQuery)

  const kelurahanList = [
    "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
    "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
    "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
    "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
  ]

  const kelurahanStats = useMemo(() => {
    if (!allData) return []
    return kelurahanList
      .map(k => ({
        name: k,
        count: allData.filter(d => d.kelurahan === k).length
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [allData])

  const coordinatorStats = useMemo(() => {
    if (!allData) return []
    const counts: Record<string, number> = {}
    allData.forEach(d => {
      if (d.coordinator) {
        const name = d.coordinator.toUpperCase().trim()
        counts[name] = (counts[name] || 0) + 1
      }
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [allData])

  const handleCoordinatorClick = (name: string) => {
    router.push(`/actor-data?coordinator=${encodeURIComponent(name)}`)
  }

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
      value: allData?.length || 0, 
      icon: Building2, 
      color: "text-blue-600", 
      bg: "bg-blue-100/50" 
    },
    { 
      name: "Pelaku Laki-laki", 
      value: allData?.filter(d => d.gender === "Laki-laki").length || 0, 
      icon: Users, 
      color: "text-indigo-600", 
      bg: "bg-indigo-100/50" 
    },
    { 
      name: "Pelaku Perempuan", 
      value: allData?.filter(d => d.gender === "Perempuan").length || 0, 
      icon: Users, 
      color: "text-pink-600", 
      bg: "bg-pink-100/50" 
    },
    { 
      name: "Data Terverifikasi", 
      value: allData?.filter(d => d.status === "finish").length || 0, 
      icon: UserCheck, 
      color: "text-emerald-600", 
      bg: "bg-emerald-100/50" 
    },
    { 
      name: "Data Ditolak", 
      value: allData?.filter(d => d.status === "rejected").length || 0, 
      icon: UserX, 
      color: "text-red-600", 
      bg: "bg-red-100/50" 
    },
  ]

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1 relative">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline text-gradient uppercase drop-shadow-sm">
            Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-600 font-semibold">
            Monitor dan kelola pendaftaran pelaku usaha secara real-time.
          </p>
        </div>
        <div className="glass-panel px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-2 md:gap-3 hover:shadow-lg transition-all">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Sistem: <span className="text-emerald-600">Aktif & Sinkron</span>
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card 
            key={stat.name} 
            className="glass hover:shadow-2xl hover:-translate-y-1 hover:bg-white/80 transition-all duration-500 group overflow-hidden cursor-pointer active:scale-95"
          >
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
              <CardTitle className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate mr-2">{stat.name}</CardTitle>
              <div className={cn(stat.bg, "p-1.5 md:p-2.5 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform duration-300 shrink-0")}>
                <stat.icon className={cn("w-4 h-4 md:w-5 md:h-5", stat.color)} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl md:text-3xl font-black text-slate-800">{isLoading ? "..." : stat.value}</div>
              <div className="flex items-center gap-1 mt-1 text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase">
                <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-500" />
                Data Terkini
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass overflow-hidden transition-all hover:shadow-xl">
            <CardHeader className="border-b border-slate-200/50 pb-4">
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Sebaran Data per Kelurahan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {kelurahanStats.map((item) => (
                  <div 
                    key={item.name} 
                    className="p-3 md:p-4 rounded-xl glass-panel flex flex-col justify-between hover:shadow-lg hover:border-white/80 hover:bg-white/90 active:scale-95 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase leading-tight group-hover:text-primary transition-colors">{item.name}</span>
                        <MapPin className="w-3 h-3 text-primary/30 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-lg md:text-2xl font-black text-primary">{item.count}</div>
                  </div>
                ))}
                {kelurahanStats.length === 0 && !isLoading && (
                  <div className="col-span-full py-10 text-center text-muted-foreground italic text-xs">
                    Belum ada data wilayah terekam.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cloud Storage Status Card */}
          <Card className="glass overflow-hidden transition-all hover:shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <Cloud className="w-5 h-5 text-primary" /> Penyimpanan Cloud Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 p-4 rounded-2xl">
                    <DatabaseZap className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status Server</span>
                    <span className="text-xl font-black text-emerald-600 flex items-center gap-2">
                      ONLINE <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    </span>
                  </div>
                </div>
                <div className="w-full md:w-64 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                    <span>Ketersediaan</span>
                    <span>99.9%</span>
                  </div>
                  <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full" />
                  </div>
                  <p className="text-[9px] text-muted-foreground italic text-center md:text-left">Seluruh data tersimpan aman di infrastruktur Cloud Google.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass transition-all hover:shadow-xl">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Progres Verifikasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 group cursor-pointer">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600 group-hover:text-primary transition-colors">Pending Admin</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px]">{allData?.filter(d => d.status === 'pending').length}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${((allData?.filter(d => d.status === 'pending').length || 0) / Math.max(allData?.length || 1, 1)) * 100}%` }}></div>
                </div>
              </div>
              
              <div className="space-y-2 group cursor-pointer">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600 group-hover:text-amber-600 transition-colors">Pending Rekening</span>
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px]">{allData?.filter(d => d.status === 'bank_pending').length}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${((allData?.filter(d => d.status === 'bank_pending').length || 0) / Math.max(allData?.length || 1, 1)) * 100}%` }}></div>
                </div>
              </div>

              <div className="space-y-2 group cursor-pointer">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600 group-hover:text-emerald-600 transition-colors">Selesai (Finish)</span>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px]">{allData?.filter(d => d.status === 'finish').length}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${((allData?.filter(d => d.status === 'finish').length || 0) / Math.max(allData?.length || 1, 1)) * 100}%` }}></div>
                </div>
              </div>

              <div className="space-y-2 group cursor-pointer">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600 group-hover:text-red-600 transition-colors">Ditolak / Batal</span>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px]">{allData?.filter(d => d.status === 'rejected').length}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${((allData?.filter(d => d.status === 'rejected').length || 0) / Math.max(allData?.length || 1, 1)) * 100}%` }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass overflow-hidden transition-all hover:shadow-xl">
            <CardHeader className="border-b border-slate-200/50 pb-4">
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Pencapaian per Koordinator
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {coordinatorStats.map((item) => (
                  <div 
                    key={item.name} 
                    onClick={() => handleCoordinatorClick(item.name)}
                    className="p-3 md:p-4 rounded-xl glass-panel flex flex-col justify-between hover:shadow-lg hover:border-white/80 hover:bg-white/90 active:scale-95 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase leading-tight group-hover:text-primary transition-colors truncate pr-2">{item.name}</span>
                        <User className="w-3 h-3 text-primary/30 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-lg md:text-2xl font-black text-primary">{item.count}</div>
                  </div>
                ))}
                {(!coordinatorStats || coordinatorStats.length === 0) && !isLoading && (
                  <div className="col-span-full py-10 text-center text-muted-foreground italic text-xs">
                    Belum ada data koordinator terekam.
                  </div>
                )}
                {isLoading && (
                   <div className="col-span-full py-10 flex flex-col items-center justify-center text-muted-foreground italic gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <p className="text-xs">Memuat data koordinator...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass overflow-hidden transition-all hover:shadow-xl">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Kategori Usaha
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 rounded-xl glass-panel hover:bg-white/90 active:scale-95 transition-all duration-300 cursor-pointer group hover:shadow-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">Kuliner</span>
                  <span className="text-xl font-black text-primary">{allData?.filter(d => d.businessCategory === "Kuliner").length}</span>
                </div>
                <div className="p-2 bg-white/50 backdrop-blur-sm rounded-lg shadow-sm group-hover:bg-primary/10 transition-colors">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl glass-panel hover:bg-white/90 active:scale-95 transition-all duration-300 cursor-pointer group hover:shadow-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">Bukan Kuliner</span>
                  <span className="text-xl font-black text-slate-700">{allData?.filter(d => d.businessCategory === "Bukan Kuliner").length}</span>
                </div>
                <div className="p-2 bg-white/50 backdrop-blur-sm rounded-lg shadow-sm group-hover:bg-primary/10 transition-colors">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
