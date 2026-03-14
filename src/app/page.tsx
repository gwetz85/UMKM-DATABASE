"use client"

import { useMemoFirebase, useCollection, useUser, useFirestore } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Activity, Loader2, Building2, TrendingUp, MapPin, BarChart3 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import { BusinessActor } from "./lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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
          <Card key={stat.name} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
              <CardTitle className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate mr-2">{stat.name}</CardTitle>
              <div className={`${stat.bg} p-1.5 md:p-2.5 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.color}`} />
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
        <Card className="border-none shadow-sm bg-white lg:col-span-2 overflow-hidden">
          <CardHeader className="border-b border-muted/50 pb-4">
            <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Sebaran Data per Kelurahan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/20 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Nama Kelurahan</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Jumlah Data</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase w-[100px]">Persentase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kelurahanStats.map((item) => {
                    const percentage = allData?.length ? (item.count / allData.length) * 100 : 0
                    return (
                      <TableRow key={item.name} className="hover:bg-muted/5">
                        <TableCell className="text-xs font-bold text-slate-700">{item.name}</TableCell>
                        <TableCell className="text-right font-black text-primary text-sm">{item.count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground">{percentage.toFixed(1)}%</span>
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                              <div className="bg-primary h-full" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(!kelurahanStats || kelurahanStats.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic text-xs">
                        Memuat data wilayah...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Progres Verifikasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600">Pending Admin</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px]">{allData?.filter(d => d.status === 'pending').length}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${((allData?.filter(d => d.status === 'pending').length || 0) / Math.max(allData?.length || 1, 1)) * 100}%` }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600">Pending Rekening</span>
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px]">{allData?.filter(d => d.status === 'bank_pending').length}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${((allData?.filter(d => d.status === 'bank_pending').length || 0) / Math.max(allData?.length || 1, 1)) * 100}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600">Selesai (Finish)</span>
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
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Kuliner</span>
                  <span className="text-xl font-black text-primary">{allData?.filter(d => d.businessCategory === "Kuliner").length}</span>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Bukan Kuliner</span>
                  <span className="text-xl font-black text-slate-700">{allData?.filter(d => d.businessCategory === "Bukan Kuliner").length}</span>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm">
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
