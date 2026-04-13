
"use client"

import { useMemoFirebase, useList, useUser, useDatabase } from "@/firebase"
import { ref, query } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Users, UserCheck, UserX, Loader2, Building2, TrendingUp, MapPin, BarChart3, User, Cloud, DatabaseZap, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { BusinessActor } from "./lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const KELURAHAN_LIST = [
  "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
  "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
  "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
  "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
]

export default function DashboardPage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const router = useRouter()

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForDashboard } = useList(userProfileRef)
  const userProfile = allUsersForDashboard?.find((u: any) => u.uid === user?.uid)
  const isKoordinator = userProfile?.role === 'koordinator'
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin'
  const [selectedFilter, setSelectedFilter] = useState<{name: string, filterType: string} | null>(null)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
      return
    }
    if (user && isKoordinator) {
      router.push("/actor-data")
    }
  }, [user, isUserLoading, isKoordinator, router])
  
  const memoQuery = useMemoFirebase(() => {
    if (!database || !user) return null
    return query(ref(database, 'businessActors'))
  }, [database, user])

  const { data: allData, isLoading } = useList<BusinessActor>(memoQuery)

  const kuotaQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'koordinator_kuotas')
  }, [database])

  const { data: kuotaData, isLoading: isKuotaLoading } = useList(kuotaQuery)

  const activeData = useMemo(() => {
    return allData?.filter(d => {
      const status = d.status?.toLowerCase().trim() || "";
      return status !== 'rejected' && status !== 'blacklist';
    }) || []
  }, [allData])

  const coordinatorStats = useMemo(() => {
    if (!activeData) return []
    const counts: Record<string, number> = {}
    activeData.forEach(d => {
      if (d.coordinator) {
        const name = d.coordinator.toUpperCase().trim()
        counts[name] = (counts[name] || 0) + 1
      }
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [activeData])

  const combinedKuotaData = useMemo(() => {
    if (!kuotaData) return []
    
    const achievedMap: Record<string, number> = {}
    coordinatorStats.forEach(stat => {
      achievedMap[stat.name] = stat.count
    })

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
  }, [kuotaData, coordinatorStats])

  const totalKuotaDashboard = useMemo(() => {
    return combinedKuotaData.reduce((acc, curr) => acc + curr.quota, 0)
  }, [combinedKuotaData])

  const totalAchievedDashboard = useMemo(() => {
    return combinedKuotaData.reduce((acc, curr) => acc + curr.achieved, 0)
  }, [combinedKuotaData])

  const kelurahanStats = useMemo(() => {
    const listMap = new Set(KELURAHAN_LIST.map(k => k.toLowerCase().trim()));
    const knownStats = KELURAHAN_LIST.map(k => ({
      name: k,
      count: activeData.filter(d => d.kelurahan?.toLowerCase().trim() === k.toLowerCase().trim()).length
    })).filter(item => item.count > 0);
    
    const otherCount = activeData.filter(d => {
      const k = d.kelurahan?.toLowerCase().trim() || "";
      return k !== "" && !listMap.has(k);
    }).length;

    const emptyCount = activeData.filter(d => !d.kelurahan?.trim()).length;
    
    if (otherCount + emptyCount > 0) {
      knownStats.push({ name: "Lainnya / Kosong", count: otherCount + emptyCount });
    }
    
    return knownStats.sort((a, b) => b.count - a.count);
  }, [activeData])

  const genderStats = useMemo(() => {
    // Check all data to match the "Total" card's base
    const laki = (allData || []).filter(d => {
      const g = (d.gender || "").toLowerCase().trim();
      return g === "laki-laki" || g === "l";
    }).length;
    
    const perempuan = (allData || []).filter(d => {
      const g = (d.gender || "").toLowerCase().trim();
      return g === "perempuan" || g === "p";
    }).length;

    const unknown = (allData?.length ?? 0) - (laki + perempuan);
    return { laki, perempuan, unknown };
  }, [allData])


  const categoryStats = useMemo(() => {
    const kuliner = (allData || []).filter(d => (d.businessCategory || "").toLowerCase().trim() === "kuliner").length;
    const bukanKuliner = (allData || []).filter(d => (d.businessCategory || "").toLowerCase().trim() === "bukan kuliner").length;
    const unknown = (allData?.length ?? 0) - (kuliner + bukanKuliner);
    return { kuliner, bukanKuliner, unknown };
  }, [allData])

  const filteredModalData = useMemo(() => {
    if (!selectedFilter || !allData) return []
    const type = selectedFilter.filterType
    if (type === "total") return allData
    if (type === "laki") return allData.filter(d => {
      const g = (d.gender || "").toLowerCase().trim();
      return g === "laki-laki" || g === "l";
    })
    if (type === "perempuan") return allData.filter(d => {
      const g = (d.gender || "").toLowerCase().trim();
      return g === "perempuan" || g === "p";
    })
    if (type === "verified") return allData.filter(d => {
      const s = d.status || "";
      return ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish'].includes(s);
    })
    if (type === "rejected") return allData.filter(d => d.status?.toLowerCase().trim() === "rejected")
    if (type === "kelurahan") {
      return activeData.filter(d => {
        const k = d.kelurahan?.toLowerCase().trim() || "";
        const targetK = selectedFilter.name.toLowerCase().trim();
        if (targetK === "lainnya / kosong") {
          const listMap = new Set(KELURAHAN_LIST.map(item => item.toLowerCase().trim()));
          return k === "" || !listMap.has(k);
        }
        return k === targetK;
      })
    }
    if (type === "kategori") {
      return allData.filter(d => {
        const k = (d.businessCategory || "").toLowerCase().trim();
        const targetK = selectedFilter.name.toLowerCase().trim();
        if (targetK === "lainnya / kosong") {
          return k !== "kuliner" && k !== "bukan kuliner";
        }
        return k === targetK;
      })
    }
    return []
  }, [allData, activeData, selectedFilter])

  const handleCoordinatorClick = (name: string) => {
    router.push(`/actor-data?coordinator=${encodeURIComponent(name)}`);
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
      value: allData?.length ?? 0, 
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
      value: genderStats.laki, 
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
      value: genderStats.perempuan, 
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
      value: (allData || []).filter(d => {
        const s = d.status || "";
        return ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish'].includes(s);
      }).length, 
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
      value: allData?.filter(d => d.status?.toLowerCase().trim() === "rejected").length || 0, 
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
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto animate-in fade-in-up duration-700">
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
              <div className="text-xl md:text-3xl font-black text-white">{isLoading ? "..." : stat.value}</div>
              <div className="flex items-center gap-1 mt-1 text-[8px] md:text-[10px] font-bold text-white/70 uppercase">
                <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                Data Terkini
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass overflow-hidden transition-all hover:shadow-xl border-none h-fit">
            <CardHeader className="bg-primary/10 pb-4">
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2 text-primary">
                <BarChart3 className="w-5 h-5" /> KUOTA KOORDINATOR
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[40px] text-center font-black text-slate-800 text-[10px] md:text-xs">No</TableHead>
                      <TableHead className="font-black text-slate-800 text-[10px] md:text-xs min-w-[120px]">Nama Koordinator</TableHead>
                      <TableHead className="text-center font-black text-slate-800 text-[10px] md:text-xs">Kuota Koordinator</TableHead>
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
                    {combinedKuotaData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <BarChart3 className="w-10 h-10 text-slate-300 animate-pulse" />
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                              Data kuota koordinator belum dimasukkan.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
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
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
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
          <Card className="glass overflow-hidden transition-all hover:shadow-xl border-none">
            <CardHeader className="border-b border-slate-200/50 pb-4">
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Sebaran per Kelurahan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {kelurahanStats.map((item) => (
                  <div 
                    key={item.name} 
                    onClick={() => setSelectedFilter({ name: item.name, filterType: "kelurahan" })}
                    className="p-3 rounded-xl glass-panel flex flex-col justify-between hover:shadow-lg hover:border-white/80 hover:bg-white/90 active:scale-95 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase leading-tight group-hover:text-primary transition-colors pr-1">{item.name}</span>
                        <MapPin className="w-3 h-3 text-primary/30 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    <div className="text-lg font-black text-primary">{item.count}</div>
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



          <Card className="glass overflow-hidden transition-all hover:shadow-xl">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Kategori Usaha
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div 
                onClick={() => setSelectedFilter({ name: "Kuliner", filterType: "kategori" })}
                className="flex items-center justify-between p-3 rounded-xl glass-panel hover:bg-white/90 active:scale-95 transition-all duration-300 cursor-pointer group hover:shadow-md"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">Kuliner</span>
                  <span className="text-xl font-black text-primary">
                    {categoryStats.kuliner}
                  </span>
                </div>
                <div className="p-2 bg-white/50 backdrop-blur-sm rounded-lg shadow-sm group-hover:bg-primary/10 transition-colors">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <div 
                onClick={() => setSelectedFilter({ name: "Bukan Kuliner", filterType: "kategori" })}
                className="flex items-center justify-between p-3 rounded-xl glass-panel hover:bg-white/90 active:scale-95 transition-all duration-300 cursor-pointer group hover:shadow-md"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">Bukan Kuliner</span>
                  <span className="text-xl font-black text-slate-700">
                    {categoryStats.bukanKuliner}
                  </span>
                </div>
                <div className="p-2 bg-white/50 backdrop-blur-sm rounded-lg shadow-sm group-hover:bg-primary/10 transition-colors">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                </div>
              </div>
              {categoryStats.unknown > 0 && (
                <div 
                  onClick={() => setSelectedFilter({ name: "Lainnya / Kosong", filterType: "kategori" })}
                  className="flex items-center justify-between p-3 rounded-xl glass-panel hover:bg-white/90 active:scale-95 transition-all duration-300 cursor-pointer group hover:shadow-md border-dashed border-2"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">Lainnya / Kosong</span>
                    <span className="text-xl font-black text-slate-500">
                      {categoryStats.unknown}
                    </span>
                  </div>
                  <div className="p-2 bg-white/50 backdrop-blur-sm rounded-lg shadow-sm">
                    <DatabaseZap className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              )}
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
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                <TableRow>
                  <TableHead className="w-[50px] text-center font-black text-slate-800 text-xs">No</TableHead>
                  <TableHead className="font-black text-slate-800 text-xs">Nama Lengkap</TableHead>
                  <TableHead className="font-black text-slate-800 text-xs">NIK</TableHead>
                  <TableHead className="font-black text-slate-800 text-xs">Nama Usaha</TableHead>
                  <TableHead className="font-black text-slate-800 text-xs">Koordinator</TableHead>
                  <TableHead className="font-black text-slate-800 text-xs text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModalData.map((d, i) => (
                  <TableRow key={d.id} className="hover:bg-slate-50/80">
                    <TableCell className="text-center font-bold text-slate-600 text-xs">{i + 1}</TableCell>
                    <TableCell className="font-black text-slate-800 text-xs uppercase">{d.fullName || "-"}</TableCell>
                    <TableCell className="font-mono text-slate-600 text-xs">{d.nik || "-"}</TableCell>
                    <TableCell className="font-bold text-slate-700 text-xs uppercase">{d.businessName || "-"}</TableCell>
                    <TableCell className="font-bold text-primary text-xs uppercase">{d.coordinator || "-"}</TableCell>
                    <TableCell className="text-center">
                       <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full border bg-slate-100 text-slate-600">
                         {(d.status || "PENDING").replace(/_/g, " ")}
                       </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredModalData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground font-bold">
                      Tidak ada data yang ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
