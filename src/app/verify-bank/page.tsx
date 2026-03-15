"use client"

import { useMemoFirebase, useCollection, useUser, useFirestore, updateDocumentNonBlocking, useDoc, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc, limit } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { CheckCircle, ShieldAlert, Loader2, Trash2, RotateCcw } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"

export default function VerifyBankPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)

  const userProfileQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return query(collection(firestore, 'system_users'), where('uid', '==', user.uid), limit(1))
  }, [user, firestore])
  const { data: userProfiles } = useCollection(userProfileQuery)
  const userProfile = userProfiles?.[0]

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isMonitoring = userProfile?.role === 'monitoring'

  const memoQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'businessActors'), where('status', '==', 'bank_pending'))
  }, [firestore])

  const { data: actors, isLoading } = useCollection<BusinessActor>(memoQuery)

  const handleFinalVerify = (actorId: string) => {
    if (!isAdmin || !firestore) return
    const actorRef = doc(firestore, 'businessActors', actorId)
    updateDocumentNonBlocking(actorRef, { status: 'finish' })
    toast({ title: "Verifikasi Selesai", description: "Data telah diverifikasi penuh dan masuk tahap SELESAI." })
  }

  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !firestore) return
    if (confirm(`Kembalikan data pelaku "${fullName}" ke antrean verifikasi Admin awal?`)) {
      const actorRef = doc(firestore, 'businessActors', actorId)
      updateDocumentNonBlocking(actorRef, { status: 'pending' })
      toast({ title: "Verifikasi Dibatalkan", description: "Data dikembalikan ke antrean verifikasi awal." })
    }
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !firestore) return
    if (confirm(`Batalkan dan hapus data "${fullName}"? Data ini akan dihapus permanen dari sistem.`)) {
      const actorRef = doc(firestore, 'businessActors', actorId)
      deleteDocumentNonBlocking(actorRef)
      toast({ variant: "destructive", title: "Terhapus", description: "Data telah dihapus." })
    }
  }

  if (isMonitoring) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center text-emerald-600">
        <ShieldAlert className="w-16 h-16" />
        <h1 className="text-2xl font-bold">Akses Terbatas</h1>
        <p className="text-muted-foreground">Menu ini hanya untuk Administrator.</p>
      </div>
    )
  }

  if (!isAdmin && !isAdminLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center text-destructive">
        <ShieldAlert className="w-16 h-16" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground font-medium">Anda tidak memiliki izin Administrator untuk mengakses menu Verifikasi Data.</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-primary font-headline">Verifikasi Data (Final)</h1>
        <p className="text-muted-foreground">Persetujuan akhir sebelum data dinyatakan SELESAI.</p>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold">Nama Pelaku</TableHead>
                  <TableHead className="font-bold">Bank</TableHead>
                  <TableHead className="font-bold">Nomor Rekening</TableHead>
                  <TableHead className="font-bold">Pemilik</TableHead>
                  <TableHead className="text-right font-bold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actors?.map((actor) => (
                  <TableRow key={actor.id} className="hover:bg-muted/5">
                    <TableCell className="font-bold text-slate-700 uppercase">{actor.fullName}</TableCell>
                    <TableCell>{actor.bankName}</TableCell>
                    <TableCell className="font-mono text-sm">{actor.bankNumber}</TableCell>
                    <TableCell className="uppercase text-xs font-bold">{actor.bankOwner}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleRevert(actor.id, actor.fullName)}
                          className="border-amber-500 text-amber-600 hover:bg-amber-50 font-bold"
                        >
                          <RotateCcw className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">BATAL</span>
                        </Button>
                        <Button size="sm" onClick={() => handleFinalVerify(actor.id)} className="bg-primary hover:bg-primary/90 font-bold">
                          <CheckCircle className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">SETUJU</span>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(actor.id, actor.fullName)} className="font-bold h-9">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!actors || actors.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-medium italic">
                      Tidak ada data yang menunggu persetujuan final.
                    </TableCell>
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
