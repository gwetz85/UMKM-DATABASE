
"use client"

import { useState, useEffect } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, setDocumentNonBlocking, deleteDocumentNonBlocking, useObject, updateDocumentNonBlocking } from "@/firebase"
import { ref, query } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  UserPlus, 
  Trash2, 
  Loader2, 
  ShieldAlert, 
  UserCheck, 
  Shield, 
  Key, 
  RefreshCcw, 
  Eye, 
  Clock, 
  UserCog,
  ShieldQuestion,
  Phone,
  CreditCard,
  MapPin
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

export default function UserManagementPage() {
  const [mounted, setMounted] = useState(false)
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])

  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'system_users')
  }, [database])

  const { data: systemUsers, isLoading } = useList(memoQuery)

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const fullName = formData.get("fullName") as string
    const password = formData.get("password") as string
    const role = formData.get("role") as string

    if (!fullName || !password || !role) return

    const username = fullName.toLowerCase().trim().replace(/\s+/g, '_')
    const userRef = ref(database, `system_users/${username}`)
    
    setDocumentNonBlocking(userRef, {
      fullName,
      password,
      role,
      uid: null,
      addedAt: new Date().toISOString()
    })

    toast({ 
      title: "User Didaftarkan", 
      description: `User ${fullName} berhasil dibuat.` 
    })
    setIsDialogOpen(false)
  }

  const handleUpdateRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingUser) return

    const formData = new FormData(e.currentTarget)
    const role = formData.get("role") as string
    const fullName = formData.get("fullName") as string
    const phoneNumber = formData.get("phoneNumber") as string
    const nik = formData.get("nik") as string
    const address = formData.get("address") as string
    
    const userRef = ref(database, `system_users/${editingUser.id}`)

    updateDocumentNonBlocking(userRef, { 
      role,
      fullName,
      phoneNumber,
      nik,
      address
    })

    // Jika diupdate jadi admin, pastikan masuk ke roles_admin kalau UID sudah ada
    if (role === 'admin' && editingUser.uid) {
      const roleRef = ref(database, `roles_admin/${editingUser.uid}`)
      setDocumentNonBlocking(roleRef, { admin: true })
    }

    toast({ title: "Role Diperbarui", description: `Akses untuk ${editingUser.fullName} telah diubah.` })
    setEditingUser(null)
  }

  const handleResetUID = (id: string, fullName: string) => {
    if (!database) return
    if (confirm(`Reset penguncian perangkat untuk ${fullName}? User akan bisa login kembali di perangkat baru.`)) {
      const userRef = ref(database, `system_users/${id}`)
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
      deleteDocumentNonBlocking(ref(database, `system_users/${id}`))
      if (userUid) {
        deleteDocumentNonBlocking(ref(database, `roles_admin/${userUid}`))
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
          <p className="text-muted-foreground font-medium">Aktifkan pendaftar mandiri atau tambahkan user internal.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg font-bold">
              <UserPlus className="w-4 h-4 mr-2" /> Tambah User Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddUser}>
              <DialogHeader>
                <DialogTitle className="text-primary font-black uppercase">Registrasi User Baru</DialogTitle>
                <CardDescription>Pendaftaran user internal dengan Role yang langsung ditentukan.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="font-bold">Nama Lengkap (Username)</Label>
                  <Input name="fullName" placeholder="Contoh: Budi Santoso" required />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Kata Sandi</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="password" type="password" placeholder="Buat kata sandi..." className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Role / Jabatan</Label>
                  <Select name="role" defaultValue="petugas" required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petugas">Petugas Input</SelectItem>
                      <SelectItem value="koordinator">Koordinator Lapangan</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="dinas">Dinas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full font-bold">Simpan Data User</Button>
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
                  <TableHead className="font-bold uppercase text-[10px]">Nama Pengguna</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Status & Role</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Keamanan Perangkat</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(systemUsers ? [...systemUsers].reverse() : []).map((u: any) => (
                  <TableRow key={u.id} className="hover:bg-muted/10">
                    <TableCell className="font-bold text-slate-700">
                      <div className="flex flex-col">
                        <span>{u.fullName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{u.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.role === 'admin' ? (
                        <Badge className="bg-primary hover:bg-primary font-black uppercase text-[9px] gap-1">
                          <Shield className="w-3 h-3" /> Admin
                        </Badge>
                      ) : u.role === 'monitoring' ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-black uppercase text-[9px] gap-1">
                          <Eye className="w-3 h-3" /> Monitoring
                        </Badge>
                      ) : u.role === 'koordinator' ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-black uppercase text-[9px] gap-1">
                          <UserCheck className="w-3 h-3" /> Koordinator
                        </Badge>
                      ) : u.role === 'petugas' ? (
                        <Badge variant="secondary" className="text-slate-600 bg-slate-100 font-black uppercase text-[9px] gap-1">
                          <UserCheck className="w-3 h-3" /> Petugas
                        </Badge>
                      ) : u.role === 'dinas' ? (
                        <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50 font-black uppercase text-[9px] gap-1">
                          <Building2 className="w-3 h-3" /> Dinas
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="animate-pulse font-black uppercase text-[9px] gap-1 bg-red-100 text-red-600 border-red-200">
                          <ShieldQuestion className="w-3 h-3" /> Pending Activation
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.uid ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-black uppercase w-fit">Locked to Device</span>
                          <span className="text-[8px] font-mono text-muted-foreground truncate max-w-[100px]">{u.uid}</span>
                        </div>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-black uppercase border border-amber-200">Waiting for Login</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingUser(u)} className="h-8 text-[10px] font-bold border-primary/20 hover:bg-primary/5 text-primary">
                              <UserCog className="w-3 h-3 mr-1" /> UBAH ROLE
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <form onSubmit={handleUpdateRole}>
                              <DialogHeader>
                                <DialogTitle className="text-primary font-black uppercase">Update Akses User</DialogTitle>
                                <CardDescription>Berikan atau ubah akses aplikasi untuk user <strong>{u.fullName}</strong>.</CardDescription>
                              </DialogHeader>
                              <div className="py-6">
                                <div className="grid gap-4 py-4">
                                  <div className="space-y-2">
                                    <Label className="font-bold">Nama Lengkap</Label>
                                    <Input name="fullName" defaultValue={u.fullName} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">Nomor Ponsel</Label>
                                    <Input name="phoneNumber" defaultValue={u.phoneNumber} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">NIK</Label>
                                    <Input name="nik" defaultValue={u.nik} maxLength={16} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">Alamat Lengkap</Label>
                                    <Textarea name="address" defaultValue={u.address} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">Role / Akses</Label>
                                    <Select name="role" defaultValue={u.role || "petugas"}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="petugas">Petugas Input</SelectItem>
                                        <SelectItem value="koordinator">Koordinator Lapangan</SelectItem>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                        <SelectItem value="monitoring">Monitoring</SelectItem>
                                        <SelectItem value="dinas">Dinas</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="submit" className="w-full font-bold">Simpan Akses</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        {u.uid && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-amber-600 hover:bg-amber-50 border-amber-200 text-[10px] font-bold"
                            onClick={() => handleResetUID(u.id, u.fullName)}
                            title="Reset UID (Pindah Perangkat)"
                          >
                            <RefreshCcw className="w-3 h-3 mr-1" /> RESET DEVICE
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(u.id, u.fullName, u.uid)}
                          disabled={u.uid === user?.uid}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!systemUsers || systemUsers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic font-medium">
                      Belum ada data user dalam sistem.
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
