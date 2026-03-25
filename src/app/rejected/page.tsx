
"use client"

import { useState, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, useObject, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { ref, query, orderByChild, equalTo, limitToFirst } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Eye, Loader2, Ban, RotateCcw, Trash2, User, Building2, MapPin, AlertCircle } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"

function RejectedContent() {
  const { user } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  const userProfileQuery = useMemoFirebase(() => {
    if (!user || !database) return null
    return query(ref(database, 'system_users'), orderByChild('uid'), equalTo(user.uid), limitToFirst(1))
  }, [user, database])
  const { data: userProfiles } = useList(userProfileQuery)
  const userProfile = userProfiles?.[0]

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('rejected'))
  }, [database])

  const { data: actors, isLoading } = useList<BusinessActor>(memoQuery)

  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    if (confirm(`Kembalikan ${fullName} ke antrean awal (Pending)?`)) {
      updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), { status: 'pending' })
      toast({ title: "Berhasil", description: "Data dikembalikan ke antrean awal." })
    }
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    if (confirm(`Hapus permanen data "${fullName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
      toast({ variant: "destructive", title: "Terhapus", description: "Data telah dihapus permanen." })
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Ban className="w-8 h-8 text-red-600" />
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-primary font-headline">Ditolak / Cancell</h1>
            <p className="text-muted-foreground text-sm">Daftar pendaftaran yang ditolak oleh Administrator.</p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-red-50/50">
                  <TableRow>
                    <TableHead className="font-bold">Nama Pelaku</TableHead>
                    <TableHead className="font-bold">Usaha</TableHead>
                    <TableHead className="font-bold">Keterangan Penolakan</TableHead>
                    <TableHead className="text-right font-bold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actors?.map((actor) => (
                    <TableRow key={actor.id} className="hover:bg-red-50/20">
                      <TableCell className="font-bold uppercase text-slate-700">{actor.fullName}</TableCell>
                      <TableCell className="font-medium">{actor.businessName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-red-600 font-bold text-xs bg-red-50 px-3 py-1 rounded-full border border-red-100 w-fit">
                          <AlertCircle className="w-3 h-3" /> {actor.rejectionReason || "Tanpa keterangan"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => setViewingActor(actor)} className="text-primary font-bold">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              {viewingActor && (
                                <>
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl font-black text-red-600 uppercase flex items-center gap-2">
                                      <Ban className="w-6 h-6" /> Data Ditolak
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">Rincian data pelaku usaha yang ditolak.</DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-6 py-4">
                                    <section className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                                      <p className="text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest">Alasan Penolakan:</p>
                                      <p className="text-sm font-black text-red-700 leading-relaxed italic">
                                        "{viewingActor.rejectionReason || "Administrator tidak memberikan alasan spesifik."}"
                                      </p>
                                    </section>
                                    
                                    <div className="grid md:grid-cols-2 gap-6">
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-primary font-black text-xs uppercase border-b pb-1">
                                          <User className="w-3 h-3" /> Informasi Pribadi
                                        </div>
                                        <div className="space-y-2 text-sm">
                                          <div className="grid grid-cols-2">
                                            <span className="text-muted-foreground font-bold text-[10px] uppercase">Nama</span>
                                            <span className="font-bold">{viewingActor.fullName}</span>
                                          </div>
                                          <div className="grid grid-cols-2">
                                            <span className="text-muted-foreground font-bold text-[10px] uppercase">NIK</span>
                                            <span className="font-mono">{viewingActor.nik}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-primary font-black text-xs uppercase border-b pb-1">
                                          <Building2 className="w-3 h-3" /> Informasi Usaha
                                        </div>
                                        <div className="space-y-2 text-sm">
                                          <div className="grid grid-cols-2">
                                            <span className="text-muted-foreground font-bold text-[10px] uppercase">Nama Usaha</span>
                                            <span className="font-bold">{viewingActor.businessName}</span>
                                          </div>
                                          <div className="grid grid-cols-2">
                                            <span className="text-muted-foreground font-bold text-[10px] uppercase">Lokasi</span>
                                            <span className="font-bold">{viewingActor.businessLocation}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </DialogContent>
                          </Dialog>
                          {isAdmin && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleRevert(actor.id, actor.fullName)} className="text-amber-600 font-bold">
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(actor.id, actor.fullName)} className="text-red-600 font-bold">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!actors || actors.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic font-medium">
                        Tidak ada data yang ditolak.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function RejectedPage() {
  return (<Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}><RejectedContent /></Suspense>)
}
