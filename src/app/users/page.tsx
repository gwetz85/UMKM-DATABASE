"use client"

import { useState, useEffect } from "react"
import { useMemoFirebase, useCollection, useUser, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, doc, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Trash2, Loader2, ShieldAlert, UserCheck, Shield, Key, RefreshCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function UserManagementPage() {
  const [mounted, setMounted] = useState(false)
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const adminRef = useMemoFirebase(() => {
    if (!user || !firestore) return null
    return doc(firestore, 'roles_admin', user.uid)
  }, [user, firestore])

  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  const memoQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, 'system_users'), orderBy('addedAt', 'desc'))
  }, [firestore])

  const { data: systemUsers, isLoading } = useCollection(memoQuery)

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const fullName = formData.get("fullName") as string
    const password = formData.get("password") as string
    const role = formData.get("role") as string

    if (!fullName || !password || !role) return

    const username = fullName.toLowerCase().trim().replace(/\s+/g, '_')
    const userRef = doc(firestore, 'system_users', username)
    
    setDocumentNonBlocking(userRef, {
      fullName,
      password,
      role,
      uid: null,
      addedAt: new Date().toISOString()
    }, { merge: true })

    toast({ 
      title: "User Didaftarkan", 
      description: `User ${fullName} berhasil dibuat. Perangkat akan terkunci saat login pertama.` 
    })
    setIsDialogOpen(false)
  }

  const handleResetUID = (id: string, fullName: string) => {
    if (!firestore) return
    if (confirm(`Reset penguncian perangkat untuk ${fullName}? User akan bisa login kembali di perangkat baru.`)) {
      const userRef = doc(firestore, 'system_users', id)
      updateDocumentNonBlocking(userRef, { uid: null })
      toast({ title: "Perangkat Direset", description: `UID untuk ${fullName} telah dihapus.` })
    }
  }

  const handleDelete = (id: string, fullName: string, userUid: string | null) => {
    if (userUid === user?.uid) {
      toast({ variant: "destructive", title: "Gagal", description: "Anda tidak bisa menghapus diri sendiri." })
      return
    }

    if (confirm(`Hapus akses untuk ${fullName} secara permanen?`)) {
      deleteDocumentNonBlocking(doc(firestore, 'system_users', id))
      if (userUid) {
        deleteDocumentNonBlocking(doc(firestore, 'roles_admin', userUid))
      }
      toast({ title: "Terhapus", description: "Akses user telah dicabut." })
    }
  }

  if (!mounted) return null

  if (isAdminLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground max-md">Hanya Administrator yang dapat mengakses menu Manajemen User.</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Manajemen User</h1>
          <p className="text-muted-foreground">Kelola hak akses dan kebijakan satu perangkat (1 User 1 UID).</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg">
              <UserPlus className="w-4 h-4 mr-2" /> Tambah User Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddUser}>
              <DialogHeader>
                <DialogTitle>Registrasi User Baru</DialogTitle>
                <CardDescription>User akan terikat pada perangkat pertama yang digunakan untuk login.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nama Lengkap (Username)</Label>
                  <Input name="fullName" placeholder="Contoh: Budi Santoso" required />
                </div>
                <div className="space-y-2">
                  <Label>Kata Sandi</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="password" type="password" placeholder="Buat kata sandi..." className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role / Jabatan</Label>
                  <Select name="role" defaultValue="petugas" required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petugas">Petugas Input</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">Simpan Data User</Button>
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
                  <TableHead>Nama Pengguna</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status Perangkat (UID)</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemUsers?.map((u: any) => (
                  <TableRow key={u.id} className="hover:bg-muted/10">
                    <TableCell className="font-bold text-slate-700">{u.fullName}</TableCell>
                    <TableCell>
                      {u.role === 'admin' ? (
                        <div className="flex items-center gap-1 text-primary font-black uppercase text-[10px] bg-primary/10 px-2 py-0.5 rounded w-fit">
                          <Shield className="w-3 h-3" /> Admin
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-600 font-bold uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded w-fit">
                          <UserCheck className="w-3 h-3" /> Petugas
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.uid ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold uppercase w-fit">TERKUNCI</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{u.uid}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold uppercase">BELUM TERIKAT</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {u.uid && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-amber-600 hover:bg-amber-50"
                            onClick={() => handleResetUID(u.id, u.fullName)}
                            title="Reset UID (Pindah Perangkat)"
                          >
                            <RefreshCcw className="w-3 h-3 mr-1" /> Reset UID
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(u.id, u.fullName, u.uid)}
                          disabled={u.uid === user?.uid}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}