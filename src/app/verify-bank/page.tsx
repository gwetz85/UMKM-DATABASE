
"use client"

import { useMemoFirebase, useCollection, useUser, useFirestore, updateDocumentNonBlocking, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { CheckCircle, ShieldAlert, Loader2 } from "lucide-react"
import { BusinessActor } from "../lib/types"

export default function VerifyBankPage() {
  const { user } = useUser()
  const firestore = useFirestore()

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])

  const { data: adminRole } = useDoc(adminRef)
  const isAdmin = !!adminRole

  const memoQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'businessActors'), where('status', '==', 'bank_pending'))
  }, [firestore])

  const { data: actors, isLoading } = useCollection<BusinessActor>(memoQuery)

  const handleFinalVerify = (actorId: string) => {
    if (!isAdmin) return
    const actorRef = doc(firestore, 'businessActors', actorId)
    updateDocumentNonBlocking(actorRef, { status: 'finish' })
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-primary font-headline">Verifikasi Data (Rekening)</h1>
      <p className="text-muted-foreground">Admin mengecek validitas nomor rekening sebelum dinyatakan selesai.</p>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Nama Pelaku</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Nomor Rekening</TableHead>
                  <TableHead>Pemilik</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actors?.map((actor) => (
                  <TableRow key={actor.id}>
                    <TableCell className="font-medium">{actor.fullName}</TableCell>
                    <TableCell>{actor.bankName}</TableCell>
                    <TableCell className="font-mono">{actor.bankNumber}</TableCell>
                    <TableCell>{actor.bankOwner}</TableCell>
                    <TableCell className="text-right">
                      {isAdmin ? (
                        <Button size="sm" onClick={() => handleFinalVerify(actor.id)} className="bg-primary hover:bg-primary/90">
                          <CheckCircle className="w-4 h-4 mr-2" /> DATA TELAH SESUAI
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Menunggu Admin</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {actors?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Tidak ada data rekening menunggu verifikasi.</TableCell>
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
