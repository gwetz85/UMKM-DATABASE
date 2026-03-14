
"use client"

import { useMemoFirebase, useCollection, useUser, useFirestore } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Activity, Loader2, Building2, TrendingUp, MapPin, BarChart3, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import { BusinessActor } from "./lib/types"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])
  
  const memoQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, 'businessActors'), orderBy('createdAt', 'desc'))
  }, [firestore, user])

  const { data: allData, isLoading } = useCollection<BusinessActor>(memoQuery)

  const kelurahanList = [
    "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
    "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
    "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
    "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
  ]

  const kelurahanStats = useMemo(() => {
    if (!allData) return []
    return kelurahanList.map(k => ({
      name: k,
      count: allData.filter(d => d.kelurahan === k).length
    })).sort((a, b) => b.count - a.count)
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
      name: "Total Data UMKM", 
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
  ]

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight font-headline text-primary uppercase">
            Dashboard
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-medium">
            Monitor dan kelola pendaftaran pelaku usaha secara real-time.
          </p>
        </div>
        <div className="bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-muted shadow-sm flex items-center gap-2 md:gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Sistem: <span className="text-emerald-600">Aktif & Sinkron</span>
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card 
            key={stat.name} 
            className="border-none shadow-sm hover:shadow-xl hover:ring-1 hover:ring-primary/20 transition-all duration-300 group overflow-hidden bg-white cursor-pointer active:scale-95"
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
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-muted/50 pb-4">
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Sebaran Data per Kelurahan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {kelurahanStats.map((item) => (
                  <div 
                    key={item.name} 
                    className="p-3 md:p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-primary/30 hover:bg-primary/5 active:scale-95 transition-all duration-200 group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase leading-tight group-hover:text-primary transition-colors">{item.name}</span>
                        <MapPin className="w-3 h-3 text-primary/30 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-lg md:text-2xl font-black text-primary">{item.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-muted/50 pb-4">
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Pencapaian per Koordinator
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {coordinatorStats.map((item) => (
                  <div 
                    key={item.name} 
                    className="p-3 md:p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-primary/30 hover:bg-primary/5 active:scale-95 transition-all duration-200 group cursor-pointer"
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
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white">
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
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Kategori Usaha
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-primary/5 active:scale-95 transition-all duration-200 cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">Kuliner</span>
                  <span className="text-xl font-black text-primary">{allData?.filter(d => d.businessCategory === "Kuliner").length}</span>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-primary/10 transition-colors">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-primary/5 active:scale-95 transition-all duration-200 cursor-pointer group">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">Bukan Kuliner</span>
                  <span className="text-xl font-black text-slate-700">{allData?.filter(d => d.businessCategory === "Bukan Kuliner").length}</span>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-primary/10 transition-colors">
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
