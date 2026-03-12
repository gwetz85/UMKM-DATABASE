"use client"

import { useMemoFirebase, useCollection, useUser, useAuth, useFirestore } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, ShieldCheck, Activity, Loader2 } from "lucide-react"
import { useEffect } from "react"
import { signInAnonymously } from "firebase/auth"
import { BusinessActor } from "./lib/types"

export default function DashboardPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()

  useEffect(() => {
    if (!isUserLoading && !user) {
      signInAnonymously(auth)
    }
  }, [user, isUserLoading, auth])
  
  const memoQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'businessActors'), orderBy('createdAt', 'desc'))
  }, [firestore])

  const { data: allData, isLoading } = useCollection<BusinessActor>(memoQuery)

  const stats = [
    { 
      name: "Total Data", 
      value: allData?.length || 0, 
      icon: Users, 
      color: "text-blue-600", 
      bg: "bg-blue-50" 
    },
    { 
      name: "Laki-laki", 
      value: allData?.filter(d => d.gender === "Laki-laki").length || 0, 
      icon: Users, 
      color: "text-cyan-600", 
      bg: "bg-cyan-50" 
    },
    { 
      name: "Perempuan", 
      value: allData?.filter(d => d.gender === "Perempuan").length || 0, 
      icon: Users, 
      color: "text-pink-600", 
      bg: "bg-pink-50" 
    },
    { 
      name: "Terverifikasi", 
      value: allData?.filter(d => d.status === "finish").length || 0, 
      icon: UserCheck, 
      color: "text-green-600", 
      bg: "bg-green-50" 
    },
  ]

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline text-primary">Dashboard UMKM Database</h1>
          <p className="text-muted-foreground mt-2">Ringkasan status data pelaku usaha saat ini.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border flex items-center gap-2 shadow-sm">
          <Activity className="w-4 h-4 text-green-500 animate-pulse" />
          <span className="text-xs font-medium">Status Server: <span className="text-green-600">Online</span></span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Progres Verifikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span>Menunggu Verifikasi Admin</span>
              <span className="font-bold">{allData?.filter(d => d.status === 'pending').length}</span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
               <div className="bg-blue-500 h-full" style={{ width: `${((allData?.filter(d => d.status === 'pending').length || 0) / (allData?.length || 1)) * 100}%` }}></div>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span>Menunggu Verifikasi Bank</span>
              <span className="font-bold">{allData?.filter(d => d.status === 'bank_pending').length}</span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
               <div className="bg-orange-500 h-full" style={{ width: `${((allData?.filter(d => d.status === 'bank_pending').length || 0) / (allData?.length || 1)) * 100}%` }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Kategori Usaha</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-8 items-center h-full pb-8">
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl font-bold text-primary">{allData?.filter(d => d.businessCategory === "Kuliner").length}</div>
              <div className="text-xs text-muted-foreground">Kuliner</div>
            </div>
            <div className="h-12 w-px bg-muted" />
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl font-bold text-primary">{allData?.filter(d => d.businessCategory === "Bukan Kuliner").length}</div>
              <div className="text-xs text-muted-foreground">Bukan Kuliner</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
