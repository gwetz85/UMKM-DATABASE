"use client"

import { useState, useEffect, useMemo } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, deleteDocumentNonBlocking, useObject, updateDocumentNonBlocking } from "@/firebase"
import { ref, push, set } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { 
  UserPlus, 
  Trash2, 
  Loader2, 
  ShieldAlert, 
  BarChart3,
  Edit
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function KuotaKoordinatorPage() {
  const [mounted, setMounted] = useState(false)
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])

  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)
  
  const usersRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  
  const { data: allUsers } = useList(usersRef)
  const userProfile = allUsers?.find((u: any) => u.uid === user?.uid)
  
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin' || userProfile?.role === 'superadmin'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'koordinator_kuotas')
  }, [database])

  const { data: kuotaData, isLoading } = useList(memoQuery)

  const handleAddData = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database) return

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const quotaStr = formData.get("quota") as string
    const quota = parseInt(quotaStr, 10)

    if (!name || isNaN(quota)) return

    const newDataRef = push(ref(database, 'koordinator_kuotas'))
    set(newDataRef, {
      name,
      quota,
      addedAt: new Date().toISOString()
    })

    toast({ 
      title: "Kuota Ditambahkan", 
      description: `Data untuk ${name} berhasil disimpan.` 
    })
    setIsDialogOpen(false)
  }

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingData || !database) return

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const quotaStr = formData.get("quota") as string
    const quota = parseInt(quotaStr, 10)
    
    if (!name || isNaN(quota)) return

    const dataRef = ref(database, `koordinator_kuotas/${editingData.id}`)

    updateDocumentNonBlocking(dataRef, { 
      name,
      quota
    })

    toast({ title: "Data Diperbarui", description: `Data kuota untuk ${name} telah diubah.` })
    setEditingData(null)
  }

  const handleDelete = (id: string, name: string) => {
    if (!database) return
    if (confirm(`Hapus data kuota untuk ${name} secara permanen?`)) {
      deleteDocumentNonBlocking(ref(database, `koordinator_kuotas/${id}`))
      toast({ title: "Terhapus", description: "Data kuota telah dihapus." })
    }
  }

  const totalQuota = useMemo(() => {
    if (!kuotaData) return 0
    return kuotaData.reduce((acc: number, curr: any) => acc + (curr.quota || 0), 0)
  }, [kuotaData])

  if (!mounted) return null

  if (isAdminLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground max-md">Hanya Administrator yang dapat mengakses menu Kuota Koordinator.</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            Kuota Koordinator
          </h1>
          <p className="text-muted-foreground font-medium">Pengelolaan target data pencapaian masing-masing koordinator lapangan.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg font-bold">
              <UserPlus className="w-4 h-4 mr-2" /> Tambah Kuota Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddData}>
              <DialogHeader>
                <DialogTitle className="text-primary font-black uppercase">Tambah Data Kuota</DialogTitle>
                <CardDescription>Masukkan nama koordinator dan jumlah target kuotanya.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="font-bold">Nama Koordinator</Label>
                  <Input name="name" placeholder="Contoh: Budi Santoso" required />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Jumlah Kuota</Label>
                  <Input name="quota" type="number" min="0" placeholder="Misal: 100" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full font-bold">Simpan Data</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold uppercase text-[10px] w-[50px] text-center">No</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Nama Koordinator</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] text-center">Jumlah Kuota</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kuotaData && kuotaData.map((item: any, index: number) => (
                  <TableRow key={item.id} className="hover:bg-muted/10">
                    <TableCell className="font-bold text-slate-700 text-center">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-center font-black text-slate-800">
                      {item.quota}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingData(item)} className="h-8 text-[10px] font-bold border-primary/20 hover:bg-primary/5 text-primary">
                              <Edit className="w-3 h-3 mr-1" /> EDIT
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <form onSubmit={handleUpdate}>
                              <DialogHeader>
                                <DialogTitle className="text-primary font-black uppercase">Edit Data Kuota</DialogTitle>
                                <CardDescription>Ubah target kuota untuk <strong>{item.name}</strong>.</CardDescription>
                              </DialogHeader>
                              <div className="py-6">
                                <div className="grid gap-4 py-4">
                                  <div className="space-y-2">
                                    <Label className="font-bold">Nama Koordinator</Label>
                                    <Input name="name" defaultValue={item.name} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">Jumlah Kuota</Label>
                                    <Input name="quota" type="number" min="0" defaultValue={item.quota} required />
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="submit" className="w-full font-bold">Simpan Perubahan</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(item.id, item.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!kuotaData || kuotaData.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic font-medium">
                      Belum ada data target kuota yang didaftarkan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                  <TableCell colSpan={2} className="font-black text-slate-800 uppercase text-right text-xs">
                    Total Keseluruhan Kuota Data
                  </TableCell>
                  <TableCell className="text-center font-black text-primary text-base">
                    {totalQuota}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
