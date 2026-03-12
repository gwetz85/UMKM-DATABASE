
"use client"

import { useMemoFirebase, useCollection, useUser, useFirestore, updateDocumentNonBlocking, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Check, ShieldAlert, Loader2 } from "lucide-react"
import { BusinessActor } from "../lib/types"

export default function VerifyActorPage() {
  const { user } = useUser()
  const firestore = useFirestore()

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])

  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)
  const isAdmin = !!adminRole

  const memoQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'businessActors'), where('status', '==', 'pending'))
  }, [firestore])

  const { data: actors, isLoading } = useCollection<BusinessActor>(memoQuery)

  const handleVerify = (actorId: string) => {
    const actorRef = doc(firestore, 'businessActors', actorId)
    updateDocumentNonBlocking(actorRef, { status: 'verified_actor' })
  }

  if (!isAdmin && !isAdminLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground">Hanya akun ADMIN yang dapat mengakses menu Verifikasi Admin.</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-primary font-headline">Verifikasi Admin</h1>
      <p className="text-muted-foreground">Cek ketikkan data dan lakukan verifikasi untuk melanjutkan ke tahap berikutnya.</p>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Usaha</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actors?.map((actor) => (
                  <TableRow key={actor.id}>
                    <TableCell className="font-medium">{actor.fullName}</TableCell>
                    <TableCell>{actor.nik}</TableCell>
                    <TableCell>{actor.businessCategory}</TableCell>
                    <TableCell>{actor.businessName}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleVerify(actor.id)} className="bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4 mr-2" /> VERIFIKASI
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {actors?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Tidak ada data menunggu verifikasi.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
