
"use client"

import { useState, useEffect } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, setDocumentNonBlocking, deleteDocumentNonBlocking, useObject, updateDocumentNonBlocking } from "@/firebase"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ref, query } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
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
  EyeOff,
  Clock, 
  UserCog,
  ShieldQuestion,
  Phone,
  CreditCard,
  MapPin,
  Building2,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  ClipboardCheck,
  Power,
  Copy
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

function UserDeletionTimer({ 
  userId, 
  userUid, 
  addedAt, 
  database, 
  isAdmin 
}: { 
  userId: string, 
  userUid: string | null, 
  addedAt: string, 
  database: any,
  isAdmin: boolean 
}) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    // Timer hanya berjalan jika user belum login (uid null) dan sudah ada addedAt
    if (!addedAt || userUid || !isAdmin || !database) return

    const addedAtTime = new Date(addedAt).getTime()
    const targetTime = addedAtTime + (24 * 60 * 60 * 1000) // 24 jam

    const calculateTimeLeft = () => {
      const now = Date.now()
      const diff = targetTime - now
      return diff > 0 ? diff : 0
    }

    const initialDiff = calculateTimeLeft()
    setTimeLeft(initialDiff)

    if (initialDiff <= 0) {
      deleteDocumentNonBlocking(ref(database, `system_users/${userId}`))
      return
    }

    const interval = setInterval(() => {
      const diff = calculateTimeLeft()
      setTimeLeft(diff)
      
      if (diff <= 0) {
        clearInterval(interval)
        deleteDocumentNonBlocking(ref(database, `system_users/${userId}`))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [addedAt, userId, userUid, isAdmin, database])

  // Jika sudah login, tidak perlu timer
  if (userUid) return null

  // Jika tidak ada data addedAt (data lama), tampilkan status standar
  if (!addedAt) {
    return (
      <span className="text-[9px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-black uppercase border border-amber-200">
        Menunggu Login Pertama
      </span>
    )
  }

  if (timeLeft === null) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
        <span className="text-[9px] text-amber-600 font-bold uppercase">Menghitung...</span>
      </div>
    )
  }

  if (timeLeft === 0) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin text-destructive" />
        <span className="text-[9px] text-destructive font-bold uppercase animate-pulse">Dihapus...</span>
      </div>
    )
  }

  const hours = Math.floor(timeLeft / 3600000)
  const minutes = Math.floor((timeLeft % 3600000) / 60000)
  const seconds = Math.floor((timeLeft % 60000) / 1000)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-black uppercase border border-amber-200 w-fit">
        Menunggu Login Pertama
      </span>
      <div className="flex items-center gap-1.5 text-[9px] font-mono text-amber-600 font-black bg-amber-50/50 px-2 py-1 rounded-lg border border-amber-200/50 w-fit shadow-sm">
        <Clock className="w-3 h-3" />
        <span className="tracking-tighter">HAPUS OTOMATIS: </span>
        <span className="tracking-widest bg-amber-100 px-1 rounded">
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

export default function UserManagementPage() {
  const [mounted, setMounted] = useState(false)
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [statusTarget, setStatusTarget] = useState<{id: string, status: string} | null>(null)
  
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetTarget, setResetTarget] = useState<{id: string, fullName: string} | null>(null)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{id: string, fullName: string, userUid: string | null} | null>(null)

  const [detailUser, setDetailUser] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)

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
    const nipppk = (formData.get("nipppk") as string || "").trim()
    const pangkat = (formData.get("pangkat") as string || "").trim()
    const jabatan = (formData.get("jabatan") as string || "").trim()

    if (!fullName || !password || !role) return

    const username = (nipppk && nipppk.length >= 4)
      ? nipppk.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      : fullName.toLowerCase().trim().replace(/\s+/g, '_')
    const userRef = ref(database, `system_users/${username}`)
    
    const newUserData: any = {
      fullName,
      password,
      role,
      nipppk,
      pangkat,
      jabatan,
      uid: null,
      addedAt: new Date().toISOString(),
      status: 'active'
    }

    if (role === 'verifikator_dinas') {
      newUserData.pejabatData = {
        verifikator: { nama: fullName, nipppk, pangkat, jabatan: jabatan || "Verifikator Dinas" },
        petugas: { nama: "", nipppk: "", pangkat: "", jabatan: "Petugas Survey" },
        updatedAt: new Date().toISOString()
      }
    } else if (role === 'petugas') {
      newUserData.pejabatData = {
        verifikator: { nama: "", nipppk: "", pangkat: "", jabatan: "Verifikator Dinas" },
        petugas: { nama: fullName, nipppk, pangkat, jabatan: jabatan || "Petugas Survey" },
        updatedAt: new Date().toISOString()
      }
    }

    setDocumentNonBlocking(userRef, newUserData)

    logActivity({
      query: `TAMBAH USER: ${username} (NIP: ${nipppk || '-'})`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'MANAJEMEN USER',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({ 
      title: "User Terdaftar", 
      description: `Akun untuk ${fullName} (NIP: ${nipppk || '-'}) berhasil dibuat.`
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
    const nipppk = (formData.get("nipppk") as string || "").trim()
    const pangkat = (formData.get("pangkat") as string || "").trim()
    const jabatan = (formData.get("jabatan") as string || "").trim()
    
    const userRef = ref(database, `system_users/${editingUser.id}`)

    const newPassword = formData.get("newPassword") as string
    
    const updates: any = { 
      role,
      fullName,
      phoneNumber,
      nik,
      address,
      nipppk,
      pangkat,
      jabatan
    }

    // Update pejabatData if exists or applicable
    const existingPd = editingUser.pejabatData || {}
    if (role === 'verifikator_dinas' || existingPd.verifikator) {
      updates.pejabatData = {
        ...existingPd,
        verifikator: {
          nama: fullName,
          nipppk: nipppk,
          pangkat: pangkat,
          jabatan: jabatan || "Verifikator Dinas"
        },
        petugas: existingPd.petugas || { nama: "", nipppk: "", pangkat: "", jabatan: "Petugas Survey" },
        updatedAt: new Date().toISOString()
      }
    } else if (role === 'petugas' || existingPd.petugas) {
      updates.pejabatData = {
        ...existingPd,
        verifikator: existingPd.verifikator || { nama: "", nipppk: "", pangkat: "", jabatan: "Verifikator Dinas" },
        petugas: {
          nama: fullName,
          nipppk: nipppk,
          pangkat: pangkat,
          jabatan: jabatan || "Petugas Survey"
        },
        updatedAt: new Date().toISOString()
      }
    }

    if (newPassword && newPassword.trim() !== '') {
      updates.password = newPassword.trim()
      updates.pwdVersion = (editingUser.pwdVersion || 0) + 1
      updates.uid = null
      updates.addedAt = new Date().toISOString()
    }

    updateDocumentNonBlocking(userRef, updates)

    // Jika diupdate jadi admin, pastikan masuk ke roles_admin kalau UID sudah ada
    if ((role === 'admin' || role === 'superadmin') && editingUser.uid) {
      const roleRef = ref(database, `roles_admin/${editingUser.uid}`)
      setDocumentNonBlocking(roleRef, { admin: true })
    }

    logActivity({
      query: `UBAH AKSES / PEJABAT: ${editingUser.fullName} (NIP: ${nipppk || '-'})`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'MANAJEMEN USER',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({ title: "Akses & Data Pejabat Diperbarui", description: `Data untuk ${editingUser.fullName} berhasil diperbarui.` })
    setEditingUser(null)
  }

  const handleToggleStatus = (id: string, currentStatus: string) => {
    if (!database) return;
    setStatusTarget({ id, status: currentStatus })
    setShowStatusDialog(true)
  };

  const executeToggleStatus = () => {
    if (!database || !statusTarget) return;
    const { id, status: currentStatus } = statusTarget
    setShowStatusDialog(false)
    setStatusTarget(null)

    const isCurrentlyActive = currentStatus !== 'inactive';
    const newStatus = isCurrentlyActive ? 'inactive' : 'active';
    
    const userRef = ref(database, `system_users/${id}`);
    updateDocumentNonBlocking(userRef, { status: newStatus });
    
    logActivity({
      query: `${isCurrentlyActive ? 'NONAKTIFKAN' : 'AKTIFKAN'} USER: ${id}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'MANAJEMEN USER',
      userId: user?.email || user?.uid || 'Admin'
    });
    
    toast({ 
      title: isCurrentlyActive ? 'User Dinonaktifkan' : 'User Diaktifkan', 
      description: isCurrentlyActive ? `Pengguna ${id} tidak dapat login.` : `Pengguna ${id} kini dapat login kembali.` 
    });
  };

  const handleResetUID = (id: string, fullName: string) => {
    setResetTarget({id, fullName})
    setShowResetDialog(true)
  }

  const executeResetUID = () => {
    if (!database || !resetTarget) return
    const { id, fullName } = resetTarget
    setShowResetDialog(false)
    setResetTarget(null)

    const userRef = ref(database, `system_users/${id}`)
    updateDocumentNonBlocking(userRef, { 
      uid: null,
      activeSessionId: null, // Also clear session so user is logged out on other device
      addedAt: new Date().toISOString() 
    })
    
    logActivity({
      query: `RESET PERANGKAT: ${fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'MANAJEMEN USER',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Perangkat Direset", description: `Penguncian perangkat ${fullName} telah dihapus dan memiliki 24 jam untuk login kembali.` })
  }

  const handleDelete = (id: string, fullName: string, userUid: string | null) => {
    if (userUid === user?.uid) {
      toast({ variant: "destructive", title: "Gagal", description: "Anda tidak dapat menghapus akun sendiri." })
      return
    }

    setDeleteTarget({id, fullName, userUid})
    setShowDeleteDialog(true)
  }

  const executeDelete = () => {
    if (!deleteTarget) return
    const { id, fullName, userUid } = deleteTarget
    setShowDeleteDialog(false)
    setDeleteTarget(null)

    deleteDocumentNonBlocking(ref(database, `system_users/${id}`))
    if (userUid) {
      deleteDocumentNonBlocking(ref(database, `roles_admin/${userUid}`))
    }
    
    logActivity({
      query: `HAPUS USER: ${fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'MANAJEMEN USER',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Terhapus", description: "Akses pengguna telah dicabut." })
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
        <p className="text-muted-foreground max-md">Hanya Administrator yang dapat mengakses menu ini.</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <h1 className="text-3xl font-bold text-primary font-headline">Manajemen User</h1>
        </div>
        <p className="text-muted-foreground font-medium">Kelola akses dan peranan pengguna dalam sistem.</p>
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
                <DialogTitle className="text-primary font-black uppercase">Pendaftaran User Baru</DialogTitle>
                <CardDescription>Buat akun pengguna baru dengan peranan tertentu.</CardDescription>
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
                    <Input name="password" type="password" placeholder="Buat Kata Sandi" className="pl-10" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="font-bold text-xs">NIPPPK / NIP</Label>
                    <Input name="nipppk" placeholder="Nomor NIPPPK" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs">Pangkat / Golongan</Label>
                    <Input name="pangkat" placeholder="Contoh: Penata, III/c" className="text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs">Jabatan</Label>
                    <Input name="jabatan" placeholder="Contoh: Verifikator Dinas" className="text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Peranan / Jabatan</Label>
                  <Select name="role" defaultValue="petugas" required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petugas">Petugas Survey</SelectItem>
                      <SelectItem value="koordinator">USULAN</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="dinas">Dinas</SelectItem>
                      <SelectItem value="verifikator_dinas">Verifikator Dinas</SelectItem>
                      <SelectItem value="inspektorat">Inspektorat</SelectItem>
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
                  <TableHead className="font-bold uppercase text-[10px]">Nama User & NIPPPK</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Status</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Role</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Keamanan Perangkat</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(systemUsers ? [...systemUsers].filter((u: any) => u.role !== 'petugas_survey').reverse() : []).map((u: any) => (
                  <TableRow key={u.id} className="hover:bg-muted/10">
                    <TableCell className="font-bold text-slate-700">
                      <div className="flex flex-col">
                        <span>{u.fullName}</span>
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground font-mono">
                          {u.nipppk && (
                            <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              NIP: {u.nipppk}
                            </span>
                          )}
                          {u.pangkat && (
                            <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {u.pangkat}
                            </span>
                          )}
                          <span className="text-slate-400 font-normal">@{u.username || u.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.status === 'inactive' ? (
                        <Badge variant="destructive" className="font-black uppercase text-[9px] gap-1 bg-red-100 text-red-600 border-red-200">Nonaktif</Badge>
                      ) : (
                        <Badge variant="secondary" className="font-black uppercase text-[9px] bg-green-100 text-green-700 border-green-200">Aktif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.role === 'admin' ? (
                        <Badge className="bg-primary hover:bg-primary font-black uppercase text-[9px] gap-1">
                          <Shield className="w-3 h-3" /> Administrator
                        </Badge>
                      ) : u.role === 'monitoring' ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-black uppercase text-[9px] gap-1">
                          <Eye className="w-3 h-3" /> Monitoring
                        </Badge>
                      ) : u.role === 'koordinator' ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-black uppercase text-[9px] gap-1">
                          <UserCheck className="w-3 h-3" /> USULAN
                        </Badge>
                      ) : u.role === 'petugas' ? (
                        <Badge variant="secondary" className="text-slate-600 bg-slate-100 font-black uppercase text-[9px] gap-1">
                          <UserCheck className="w-3 h-3" /> Petugas Survey
                        </Badge>
                      ) : u.role === 'dinas' ? (
                        <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50 font-black uppercase text-[9px] gap-1">
                          <Building2 className="w-3 h-3" /> Dinas
                        </Badge>
                      ) : u.role === 'verifikator_dinas' ? (
                        <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 font-black uppercase text-[9px] gap-1">
                          <ClipboardCheck className="w-3 h-3" /> Verifikator Dinas
                        </Badge>
                      ) : u.role === 'inspektorat' ? (
                        <Badge variant="outline" className="text-slate-600 border-slate-300 bg-slate-50 font-black uppercase text-[9px] gap-1">
                          <ShieldCheck className="w-3 h-3" /> Inspektorat
                        </Badge>
                      ) : u.role === 'staff' ? (
                        <Badge variant="outline" className="text-teal-700 border-teal-300 bg-teal-50 font-black uppercase text-[9px] gap-1">
                          <UserCheck className="w-3 h-3" /> Staff
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="animate-pulse font-black uppercase text-[9px] gap-1 bg-red-100 text-red-600 border-red-200">
                          <ShieldQuestion className="w-3 h-3" /> Menunggu Aktivasi
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.uid ? (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-black uppercase w-fit">Terkunci di Perangkat</span>
                          {u.activeSessionId && (
                            <span className="text-[9px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-black uppercase border border-orange-200 w-fit flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse inline-block" />
                              AKTIF DI PERANGKAT LAIN
                            </span>
                          )}
                          <span className="text-[8px] font-mono text-muted-foreground truncate max-w-[100px]">{u.uid}</span>
                        </div>
                      ) : (
                        <UserDeletionTimer 
                          userId={u.id} 
                          userUid={u.uid} 
                          addedAt={u.addedAt} 
                          database={database} 
                          isAdmin={isAdmin} 
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => { setDetailUser(u); setShowPassword(false); }} 
                          className="h-8 w-8 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                          title="Lihat Data"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant={u.status === 'inactive' ? "secondary" : "destructive"} 
                            size="icon" 
                            onClick={() => handleToggleStatus(u.id, u.status)} 
                            className={`h-8 w-8 ${u.status === 'inactive' ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200' : ''}`}
                            title={u.status === 'inactive' ? 'Aktifkan' : 'Nonaktifkan'}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => setEditingUser(u)} className="h-8 w-8 border-primary/20 hover:bg-primary/5 text-primary" title="Ganti Role">
                              <UserCog className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <form onSubmit={handleUpdateRole}>
                              <DialogHeader>
                                <DialogTitle className="text-primary font-black uppercase">Update Akses Pengguna</DialogTitle>
                                <CardDescription>Ubah peranan akses untuk {u.fullName}.</CardDescription>
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
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-2">
                                      <Label className="font-bold text-xs">NIPPPK / NIP</Label>
                                      <Input name="nipppk" defaultValue={u.nipppk || u.pejabatData?.verifikator?.nipppk || u.pejabatData?.petugas?.nipppk || ""} placeholder="Nomor NIPPPK" className="font-mono text-xs" />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold text-xs">Pangkat / Golongan</Label>
                                      <Input name="pangkat" defaultValue={u.pangkat || u.pejabatData?.verifikator?.pangkat || u.pejabatData?.petugas?.pangkat || ""} placeholder="Contoh: Penata, III/c" className="text-xs" />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold text-xs">Jabatan</Label>
                                      <Input name="jabatan" defaultValue={u.jabatan || u.pejabatData?.verifikator?.jabatan || u.pejabatData?.petugas?.jabatan || ""} placeholder="Contoh: Verifikator Dinas" className="text-xs" />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold text-amber-600">Reset Kata Sandi</Label>
                                    <Input name="newPassword" placeholder="Biarkan kosong jika tidak ingin mengubah" />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      Jika diisi, kata sandi lama akan hangus dan perangkat pengguna akan direset (logout otomatis).
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">Peranan / Jabatan</Label>
                                    <Select name="role" defaultValue={u.role || "petugas"}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="petugas">Petugas Survey</SelectItem>
                                        <SelectItem value="koordinator">USULAN</SelectItem>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                        <SelectItem value="monitoring">Monitoring</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="dinas">Dinas</SelectItem>
                                        <SelectItem value="verifikator_dinas">Verifikator Dinas</SelectItem>
                                        <SelectItem value="inspektorat">Inspektorat</SelectItem>
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
                            size="icon" 
                            className="h-8 w-8 text-amber-600 hover:bg-amber-50 border-amber-200"
                            onClick={() => handleResetUID(u.id, u.fullName)}
                            title="Reset Perangkat"
                          >
                            <RefreshCcw className="w-4 h-4" />
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
                      Belum ada data pengguna.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        title={statusTarget?.status === 'inactive' ? 'Aktifkan User' : 'Nonaktifkan User'}
        description={statusTarget?.status === 'inactive' 
          ? 'Aktifkan user ini? User akan bisa login kembali.' 
          : 'Nonaktifkan user ini? User tidak akan bisa login.'}
        onConfirm={executeToggleStatus}
        variant={statusTarget?.status === 'inactive' ? 'default' : 'destructive'}
        icon={<AlertCircle className="w-6 h-6" />}
        confirmText={statusTarget?.status === 'inactive' ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan'}
      />

      <ConfirmDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        title="Reset Perangkat"
        description={`Reset penguncian perangkat untuk ${resetTarget?.fullName}?`}
        onConfirm={executeResetUID}
        variant="default"
        icon={<RotateCcw className="w-6 h-6" />}
        confirmText="Ya, Reset"
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Hapus Akses Sistem"
        description={`Hapus akses sistem untuk ${deleteTarget?.fullName} secara permanen?`}
        onConfirm={executeDelete}
        variant="destructive"
        icon={<Trash2 className="w-6 h-6" />}
        confirmText="Ya, Hapus"
      />

      <Dialog open={!!detailUser} onOpenChange={(open) => { if (!open) { setDetailUser(null); setShowPassword(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary font-black uppercase flex items-center gap-2">
              <Eye className="w-5 h-5" /> Detail Data Pengguna
            </DialogTitle>
            <CardDescription>
              Informasi data pendaftaran user <span className="font-bold text-slate-800">{detailUser?.fullName}</span>
            </CardDescription>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-3 py-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">Username / ID</span>
                  <span className="font-mono font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded text-xs">{detailUser.id}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">Nama Lengkap</span>
                  <span className="font-bold text-slate-800">{detailUser.fullName || '-'}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">Kata Sandi Login</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs tracking-wider">
                      {showPassword ? (detailUser.password || '(Tidak Diset)') : '••••••••••••'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-slate-800"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Sembunyikan Kata Sandi" : "Tampilkan Kata Sandi"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">Peranan / Role</span>
                  <span className="font-bold text-slate-800 uppercase text-xs">{detailUser.role || '-'}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">Status Akun</span>
                  <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${detailUser.status === 'inactive' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {detailUser.status === 'inactive' ? 'Nonaktif' : 'Aktif'}
                  </span>
                </div>

                {detailUser.nipppk && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <span className="text-muted-foreground text-xs font-semibold">NIPPPK / NIP</span>
                    <span className="font-mono font-bold text-purple-700 text-xs">{detailUser.nipppk}</span>
                  </div>
                )}

                {detailUser.pangkat && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <span className="text-muted-foreground text-xs font-semibold">Pangkat / Gol. Ruang</span>
                    <span className="font-semibold text-slate-800 text-xs">{detailUser.pangkat}</span>
                  </div>
                )}

                {detailUser.jabatan && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <span className="text-muted-foreground text-xs font-semibold">Jabatan</span>
                    <span className="font-semibold text-slate-800 text-xs">{detailUser.jabatan}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">Nomor HP / WhatsApp</span>
                  <span className="font-medium text-slate-800 text-xs">{detailUser.phoneNumber || '-'}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">NIK</span>
                  <span className="font-mono text-slate-800 text-xs">{detailUser.nik || '-'}</span>
                </div>

                <div className="flex flex-col gap-1 pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">Alamat Lengkap</span>
                  <span className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">{detailUser.address || '-'}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">Status Perangkat (UID)</span>
                  <span className="font-mono text-[10px] text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded truncate max-w-[180px]">
                    {detailUser.uid || 'Belum Terkunci'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs font-semibold">Tanggal Pendaftaran</span>
                  <span className="text-xs text-slate-600 font-mono">
                    {detailUser.addedAt ? new Date(detailUser.addedAt).toLocaleString('id-ID') : '-'}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {detailUser && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://umkm-database.web.app'
                  const textToCopy = `AKSES LOGIN PENGGUNA\nNama: ${detailUser.fullName}\nUsername: ${detailUser.username || detailUser.id}\nKata Sandi: ${detailUser.password || '-'}\nRole: ${detailUser.role || '-'}\nLink: ${origin}/login`
                  navigator.clipboard.writeText(textToCopy)
                  toast({ title: "Akses Tersalin", description: `Akses login untuk ${detailUser.fullName} berhasil disalin.` })
                }}
                className="w-full sm:w-auto font-bold border-purple-200 text-purple-700 hover:bg-purple-50 gap-1.5"
              >
                <Copy className="w-4 h-4" /> Salin Akses
              </Button>
            )}
            <Button variant="outline" onClick={() => { setDetailUser(null); setShowPassword(false); }} className="w-full sm:w-auto font-bold">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
