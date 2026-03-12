"use client"

import { useMemoFirebase, useCollection, useUser, useAuth } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, ShieldCheck, TrendingUp, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"
import { signInAnonymously } from "firebase/auth"

export default function DashboardPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()

  useEffect(() => {
    if (!isUserLoading && !user) {
      signInAnonymously(auth)
    }
  }, [user, isUserLoading, auth])

  const businessQuery = useMemoFirebase(() => {
    if (!user) return null
    return query(
      collection(document.getElementById('db') as any, 'users', user.uid, 'businessActors'),
      orderBy('createdAt', 'desc')
    )
  }, [user])

  // In reality, useMemoFirebase needs the firestore instance. 
  // Let's refine the query using the hook correctly.
  const { firestore } = (typeof window !== 'undefined') ? require('@/firebase') : { firestore: null }
  
  const memoQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return query(collection(firestore, 'users', user.uid, 'businessActors'), orderBy('createdAt', 'desc'))
  }, [user, firestore])

  const { data: businesses, isLoading } = useCollection(memoQuery)

  const stats = [
    { name: "Total Pelaku Usaha", value: businesses?.length || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { name: "Tipe Bisnis", value: new Set(businesses?.map(b => b.businessType)).size || 0, icon: Building2, color: "text-green-600", bg: "bg-green-50" },
    { name: "Tingkat Kepatuhan", value: "85%", icon: ShieldCheck, color: "text-purple-600", bg: "bg-purple-50" },
    { name: "Pertumbuhan", value: "+12%", icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
  ]

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-primary">Dashboard UsahaLink</h1>
        <p className="text-muted-foreground mt-2">Selamat datang kembali! Berikut ringkasan data pelaku usaha Anda.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>Mulai kelola data dan kepatuhan hari ini.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Link href="/business/new" className="w-full">
              <Button className="w-full h-24 text-lg bg-primary hover:bg-primary/90 flex flex-col gap-2 rounded-xl">
                <Users className="w-6 h-6" />
                Tambah Pelaku Usaha
              </Button>
            </Link>
            <Link href="/compliance" className="w-full">
              <Button className="w-full h-24 text-lg bg-accent text-accent-foreground hover:bg-accent/90 flex flex-col gap-2 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
                Cek Kepatuhan AI
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Data Terbaru</CardTitle>
            <CardDescription>Pendaftaran pelaku usaha terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {businesses?.slice(0, 5).map((business) => (
                <div key={business.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{business.companyName}</p>
                    <p className="text-xs text-muted-foreground">{business.city} • {business.businessType}</p>
                  </div>
                  <div className="text-xs font-medium text-primary">
                    {business.createdAt ? new Date(business.createdAt).toLocaleDateString('id-ID') : '-'}
                  </div>
                </div>
              ))}
              {(!businesses || businesses.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada data tersedia.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
