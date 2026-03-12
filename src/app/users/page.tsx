
"use client"

import { useState } from "react"
import { useMemoFirebase, useCollection, useUser, useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from "@/firebase"
import { collection, query, doc, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Trash2, Loader2, ShieldAlert, UserCheck, Shield, Key } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function UserManagementPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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

    // Gunakan fullName sebagai ID sementara untuk provisioning
    const tempId = fullName.toLowerCase().trim()
    const userRef = doc(firestore, 'system_users', tempId)
    
    setDocumentNonBlocking(userRef, {
      fullName,
      password, // Password disimpan untuk divalidasi saat login pertama kali
      role,
      addedAt: new Date().toISOString()
    }, { merge: true })

    toast({ 
      title: "User Didaftarkan", 
      description: `User ${fullName} berhasil dibuat. UID akan otomatis terbaca saat user login.` 
    })
    setIsDialogOpen(false)
  }

  const handleDelete = (id: string, fullName: string) => {
    if (id === user?.uid) {
      toast({ variant: "destructive", title: "Gagal", description: "Anda tidak bisa menghapus diri sendiri." })
      return
    }

    if (confirm(`Hapus akses untuk ${fullName}?`)) {
      deleteDocumentNonBlocking(doc(firestore, 'system_users', id))
      deleteDocumentNonBlocking(doc(firestore, 'roles_admin', id))
      toast({ title: "Terhapus", description: "Akses user telah dicabut." })
    }
  }

  if (isAdminLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground max-w-md">
          Hanya Administrator yang dapat mengakses menu Manajemen User. 
        </p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Manajemen User</h1>
          <p className="text-muted-foreground">Tambah user baru hanya dengan Nama & Kata Sandi tanpa perlu input UID.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <UserPlus className="w-4 h-4 mr-2" /> Tambah User Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddUser}>
              <DialogHeader>
                <DialogTitle>Registrasi User Baru</DialogTitle>
                <CardDescription>User baru bisa langsung login menggunakan data ini.</CardDescription>
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
                <Button type="submit" className="w-full">Buat User Baru</Button>
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
                  <TableHead>Identitas / UID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status Akun</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemUsers?.map((u: any) => (
                  <TableRow key={u.id} className="hover:bg-muted/10">
                    <TableCell className="font-bold text-slate-700">{u.fullName}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {u.uid || <span className="text-amber-600 font-bold italic">Menunggu Login...</span>}
                    </TableCell>
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
                        <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold uppercase">AKTIF</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold uppercase">PENDING</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(u.id, u.fullName)}
                        disabled={u.uid === user?.uid}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
