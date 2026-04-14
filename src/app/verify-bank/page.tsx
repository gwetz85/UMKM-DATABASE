"use client"

import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject, deleteDocumentNonBlocking } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { ShieldAlert, Loader2, RotateCcw, CheckCircle, Trash2 } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function VerifyBankPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForProfile } = useList(userProfileRef)
  const userProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isMonitoring = userProfile?.role === 'monitoring'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  const actors = allActorsRaw?.filter(a => a.status === 'bank_pending')

  const handleFinalVerify = (actorId: string) => {
    if (!isAdmin || !database) return
    const actorRef = ref(database, `businessActors/${actorId}`)
    updateDocumentNonBlocking(actorRef, { 
      status: 'lpj_pending',
      lpjEntryDate: new Date().toISOString()
    })
    toast({ title: "Verifikasi Berhasil", description: "Data telah lolos verifikasi final dan masuk tahap LPJ." })
  }

  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    if (confirm(`Kembalikan ${fullName} ke antrean awal (Pending)?`)) {
      const actorRef = ref(database, `businessActors/${actorId}`)
      updateDocumentNonBlocking(actorRef, { status: 'pending' })
      toast({ title: "Verifikasi Dibatalkan", description: "Data dikembalikan ke antrean verifikasi awal." })
    }
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    if (confirm(`Hapus permanen ${fullName}? Semua data terkait akan hilang.`)) {
      const actorRef = ref(database, `businessActors/${actorId}`)
      deleteDocumentNonBlocking(actorRef)
      toast({ variant: "destructive", title: "Terhapus", description: "Data telah dihapus dari sistem." })
    }
  }

  if (!isAdmin && !isMonitoring && !isAdminLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center text-destructive">
        <ShieldAlert className="w-16 h-16" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground font-medium">Anda tidak memiliki izin Administrator untuk mengakses menu ini.</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <h1 className="text-3xl font-bold text-primary font-headline">Verifikasi Data (Final)</h1>
        </div>
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
                  <TableHead className="font-bold">Nama Lengkap</TableHead>
                  <TableHead className="font-bold">Bank</TableHead>
                  <TableHead className="font-bold">Nomor Rekening</TableHead>
                  <TableHead className="font-bold">Pemilik Rekening</TableHead>
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
                      {!isMonitoring && (
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
                      )}
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
