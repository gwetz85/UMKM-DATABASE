
"use client"

import { useState, useEffect } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, setDocumentNonBlocking, deleteDocumentNonBlocking, useObject, updateDocumentNonBlocking } from "@/firebase"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ref, query, remove } from "firebase/database"
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
  Copy,
  Mail,
  ShieldOff,
  KeyRound,
  QrCode,
  Smartphone,
  Edit3,
  CheckCircle2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTimeIndo } from "@/lib/utils"

function UserDeletionTimer({ 
  userId, 
  userUid, 
  addedAt, 
  lastLogin,
  isOnline,
  database, 
  isAdmin 
}: { 
  userId: string, 
  userUid: string | null, 
  addedAt: string, 
  lastLogin?: string,
  isOnline?: boolean,
  database: any,
  isAdmin: boolean 
}) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const hasLoggedIn = Boolean(
    userUid ||
    isOnline ||
    (lastLogin && (!addedAt || new Date(lastLogin).getTime() >= new Date(addedAt).getTime()))
  )

  useEffect(() => {
    // Timer hanya berjalan jika user belum login dan sudah ada addedAt
    if (!addedAt || hasLoggedIn || !isAdmin || !database) return

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
  }, [addedAt, userId, hasLoggedIn, isAdmin, database])

  // Jika sudah login, tidak perlu timer
  if (hasLoggedIn) return null

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
  const { user, userProfile } = useUser()
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

  const [show2FAToggleDialog, setShow2FAToggleDialog] = useState(false)
  const [target2FAToggle, setTarget2FAToggle] = useState<{id: string, fullName: string, currentEnabled: boolean} | null>(null)
  
  const [show2FAResetDialog, setShow2FAResetDialog] = useState(false)
  const [target2FAReset, setTarget2FAReset] = useState<{id: string, fullName: string} | null>(null)

  // Edit Email states (Menghindari saltik & pergantian email resmi petugas)
  const [editEmailUser, setEditEmailUser] = useState<any>(null)
  const [newEmailInput, setNewEmailInput] = useState("")
  const [isSavingEmail, setIsSavingEmail] = useState(false)

  // 2FA Configuration states (Google Authenticator / Email / Both)
  const [config2FAUser, setConfig2FAUser] = useState<any>(null)
  const [config2FAEnabled, setConfig2FAEnabled] = useState(true)
  const [config2FAMethod, setConfig2FAMethod] = useState<'email' | 'authenticator' | 'both'>('email')
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string, formattedSecret: string, qrCodeDataUrl: string } | null>(null)
  const [totpVerifyCode, setTotpVerifyCode] = useState("")
  const [isSettingUpTotp, setIsSettingUpTotp] = useState(false)
  const [isSaving2FAConfig, setIsSaving2FAConfig] = useState(false)

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
  const roleStr = String(userProfile?.role || '').toLowerCase().trim()
  const isAdmin = !!adminRole || 
    (user?.email?.toLowerCase() === 'agus@umkm.id') || 
    roleStr === 'admin' || 
    roleStr === 'administrator' || 
    roleStr === 'superadmin'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'system_users')
  }, [database])

  const { data: systemUsers, isLoading } = useList(memoQuery)

  const hasUserLoggedIn = (u: any) => {
    if (!u) return false
    if (u.uid) return true
    if (u.id && user?.uid && u.id === user.uid) return true
    if (u.isOnline) return true
    if (u.lastLogin && u.addedAt) {
      const lastLoginTime = new Date(u.lastLogin).getTime()
      const addedAtTime = new Date(u.addedAt).getTime()
      if (!isNaN(lastLoginTime) && !isNaN(addedAtTime) && lastLoginTime >= addedAtTime) {
        return true
      }
    } else if (u.lastLogin && !u.addedAt) {
      return true
    }
    return false
  }

  // Otomatis lengkapi field uid pada system_users jika akun yang sedang aktif / sudah login belum memiliki uid
  useEffect(() => {
    if (!database || !isAdmin || !systemUsers) return
    systemUsers.forEach((u: any) => {
      if (!u.uid && u.id && user?.uid && u.id === user.uid) {
        updateDocumentNonBlocking(ref(database, `system_users/${u.id}`), { uid: user.uid })
      }
    })
  }, [database, isAdmin, systemUsers, user?.uid])

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const fullName = formData.get("fullName") as string
    const email = (formData.get("email") as string || "").trim().toLowerCase()
    const password = formData.get("password") as string
    const role = formData.get("role") as string
    const nipppk = (formData.get("nipppk") as string || "").trim()
    const pangkat = (formData.get("pangkat") as string || "").trim()
    const jabatan = (formData.get("jabatan") as string || "").trim()

    if (!fullName || !password || !role) return

    if (!email || !email.includes('@')) {
      toast({
        variant: "destructive",
        title: "Email Wajib Diisi",
        description: "Email pengguna wajib diisi dengan format valid untuk keperluan Verifikasi 2FA."
      })
      return
    }

    const username = (nipppk && nipppk.length >= 4)
      ? nipppk.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      : fullName.toLowerCase().trim().replace(/\s+/g, '_')
    const userRef = ref(database, `system_users/${username}`)
    
    const newUserData: any = {
      fullName,
      email,
      twoFactorEnabled: true,
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
    const email = (formData.get("email") as string || "").trim().toLowerCase()
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

    if (email) {
      updates.email = email
      if (editingUser.email && editingUser.email !== email) {
        updates.twoFactorOtp = null
      }
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
      if (isCurrentSelfAccount(editingUser) && user?.uid) {
        updates.uid = user.uid
      } else {
        updates.uid = null
        updates.isOnline = false
        updates.activeSessionId = null
        updates.addedAt = new Date().toISOString()
      }
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
      isOnline: false,
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

  const handleToggle2FA = (u: any) => {
    const isCurrentlyEnabled = u.twoFactorEnabled !== false
    setTarget2FAToggle({
      id: u.id,
      fullName: u.fullName || u.id,
      currentEnabled: isCurrentlyEnabled
    })
    setShow2FAToggleDialog(true)
  }

  const executeToggle2FA = () => {
    if (!database || !target2FAToggle) return
    const { id, fullName, currentEnabled } = target2FAToggle
    setShow2FAToggleDialog(false)
    setTarget2FAToggle(null)

    const newEnabled = !currentEnabled
    const userRef = ref(database, `system_users/${id}`)
    const updates: Record<string, any> = { twoFactorEnabled: newEnabled }
    if (!newEnabled) {
      updates.twoFactorOtp = null
    }

    updateDocumentNonBlocking(userRef, updates)

    logActivity({
      query: `${newEnabled ? 'AKTIFKAN' : 'NONAKTIFKAN'} 2FA: ${id}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'MANAJEMEN USER',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({
      title: newEnabled ? "2FA Diaktifkan" : "2FA Dinonaktifkan",
      description: newEnabled 
        ? `Verifikasi 2FA untuk ${fullName} telah diaktifkan.` 
        : `Verifikasi 2FA untuk ${fullName} telah dinonaktifkan. Pengguna dapat login tanpa OTP.`
    })
  }

  const handleReset2FA = (u: any) => {
    setTarget2FAReset({
      id: u.id,
      fullName: u.fullName || u.id
    })
    setShow2FAResetDialog(true)
  }

  const executeReset2FA = () => {
    if (!database || !target2FAReset) return
    const { id, fullName } = target2FAReset
    setShow2FAResetDialog(false)
    setTarget2FAReset(null)

    const userRef = ref(database, `system_users/${id}`)
    updateDocumentNonBlocking(userRef, { 
      twoFactorOtp: null,
      twoFactorFailedAttempts: null 
    })

    // Also call API to ensure full reset
    fetch('/api/auth/2fa/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reset',
        userKey: id,
        adminId: user?.email || user?.uid || 'Admin'
      })
    }).catch(console.error)

    logActivity({
      query: `RESET 2FA: ${id}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'MANAJEMEN USER',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({
      title: "2FA Direset",
      description: `Sesi OTP dan batasan percobaan verifikasi untuk ${fullName} telah dibersihkan.`
    })
  }

  // ---------------------------------------------------------------------------
  // EDIT EMAIL HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenEditEmail = (u: any) => {
    setEditEmailUser(u)
    setNewEmailInput(u.email || "")
  }

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEmailUser || !database) return

    const cleanEmail = newEmailInput.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast({
        variant: "destructive",
        title: "Email Tidak Valid",
        description: "Harap masukkan format alamat email yang valid (contoh: user@gmail.com)."
      })
      return
    }

    setIsSavingEmail(true)
    try {
      const res = await fetch('/api/auth/2fa/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-email',
          userKey: editEmailUser.id,
          newEmail: cleanEmail,
          adminId: user?.email || user?.uid || 'Admin'
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memperbarui email.")
      }

      const userRef = ref(database, `system_users/${editEmailUser.id}`)
      updateDocumentNonBlocking(userRef, {
        email: cleanEmail,
        twoFactorOtp: null
      })

      if (detailUser && detailUser.id === editEmailUser.id) {
        setDetailUser({ ...detailUser, email: cleanEmail, twoFactorOtp: null })
      }

      toast({
        title: "Email Berhasil Diperbarui",
        description: `Email untuk ${editEmailUser.fullName} telah diubah menjadi ${cleanEmail}.`
      })
      setEditEmailUser(null)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Mengubah Email",
        description: err.message || "Terjadi kesalahan sistem saat memperbarui email."
      })
    } finally {
      setIsSavingEmail(false)
    }
  }

  // ---------------------------------------------------------------------------
  // 2FA CONFIGURATION & GOOGLE AUTHENTICATOR SETUP HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpen2FAConfig = (u: any) => {
    setConfig2FAUser(u)
    setConfig2FAEnabled(u.twoFactorEnabled !== false)
    setConfig2FAMethod(u.twoFactorMethod || 'email')
    setTotpSetupData(null)
    setTotpVerifyCode("")
  }

  const handleGenerateTotp = async () => {
    if (!config2FAUser) return
    setIsSettingUpTotp(true)
    try {
      const res = await fetch('/api/auth/2fa/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup-totp',
          userKey: config2FAUser.id
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghasilkan QR Code Authenticator.")
      }
      setTotpSetupData({
        secret: data.secret,
        formattedSecret: data.formattedSecret,
        qrCodeDataUrl: data.qrCodeDataUrl
      })
      toast({
        title: "Kunci QR Code Dihasilkan",
        description: "Pindai QR code atau masukkan kunci manual ke aplikasi Google Authenticator."
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Setup Authenticator",
        description: err.message || "Terjadi kendala saat membuat kunci Google Authenticator."
      })
    } finally {
      setIsSettingUpTotp(false)
    }
  }

  const handleSave2FAConfig = async () => {
    if (!config2FAUser || !database) return

    const isTotp = config2FAMethod === 'authenticator' || config2FAMethod === 'both'
    const currentSecret = totpSetupData?.secret || config2FAUser.twoFactorTotpSecret

    if (config2FAEnabled && isTotp && !currentSecret) {
      toast({
        variant: "destructive",
        title: "Kunci Authenticator Diperlukan",
        description: "Harap klik 'Buat Kunci / Pindai QR Code' terlebih dahulu untuk menghubungkan Google Authenticator."
      })
      return
    }

    setIsSaving2FAConfig(true)
    try {
      const res = await fetch('/api/auth/2fa/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-config',
          userKey: config2FAUser.id,
          enabled: config2FAEnabled,
          method: config2FAMethod,
          totpSecret: currentSecret,
          verifyCode: totpVerifyCode.trim() || undefined,
          adminId: user?.email || user?.uid || 'Admin'
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan konfigurasi 2FA.")
      }

      const updates: Record<string, any> = {
        twoFactorEnabled: config2FAEnabled,
        twoFactorMethod: config2FAMethod,
        twoFactorOtp: null,
        twoFactorFailedAttempts: null
      }
      if (isTotp && currentSecret) {
        updates.twoFactorTotpSecret = currentSecret
      }

      updateDocumentNonBlocking(ref(database, `system_users/${config2FAUser.id}`), updates)

      if (detailUser && detailUser.id === config2FAUser.id) {
        setDetailUser({
          ...detailUser,
          ...updates
        })
      }

      toast({
        title: "Konfigurasi 2FA Disimpan",
        description: data.message || "Pengaturan 2FA berhasil diperbarui."
      })
      setConfig2FAUser(null)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: err.message || "Terjadi kesalahan saat menyimpan pengaturan 2FA."
      })
    } finally {
      setIsSaving2FAConfig(false)
    }
  }

  const handleResetTotpSecret = async () => {
    if (!config2FAUser || !database) return
    try {
      const res = await fetch('/api/auth/2fa/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-totp',
          userKey: config2FAUser.id,
          adminId: user?.email || user?.uid || 'Admin'
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mereset kunci Authenticator.")
      }
      setTotpSetupData(null)
      setConfig2FAMethod('email')
      updateDocumentNonBlocking(ref(database, `system_users/${config2FAUser.id}`), {
        twoFactorTotpSecret: null,
        twoFactorMethod: 'email',
        twoFactorOtp: null
      })
      toast({
        title: "Kunci Authenticator Direset",
        description: `Kunci Google Authenticator untuk ${config2FAUser.fullName} berhasil dihapus. Metode kembali ke OTP Email.`
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Mereset",
        description: err.message || "Terjadi kesalahan."
      })
    }
  }

  const isCurrentSelfAccount = (u: any) => {
    if (!u) return false
    // Akun admin utama yang sedang aktif: ID di system_users sama dengan auth UID
    return u.id === user?.uid
  }

  const handleDelete = (id: string, fullName: string, userUid: string | null) => {
    if (id === user?.uid) {
      toast({ variant: "destructive", title: "Gagal", description: "Anda tidak dapat menghapus akun sendiri." })
      return
    }

    setDeleteTarget({ id, fullName: fullName || `@${id}`, userUid })
    setShowDeleteDialog(true)
  }

  const executeDelete = () => {
    if (!deleteTarget) return
    const { id, fullName, userUid } = deleteTarget
    setShowDeleteDialog(false)
    setDeleteTarget(null)

    deleteDocumentNonBlocking(ref(database, `system_users/${id}`))
    remove(ref(database, `system_users/${id}`)).catch(console.error)
    // PENTING: Jangan pernah menghapus roles_admin milik admin yang sedang login saat ini!
    if (userUid && userUid !== user?.uid) {
      deleteDocumentNonBlocking(ref(database, `roles_admin/${userUid}`))
      remove(ref(database, `roles_admin/${userUid}`)).catch(console.error)
    }
    
    logActivity({
      query: `HAPUS USER: ${fullName || id}`,
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
                  <Label className="font-bold flex items-center justify-between">
                    <span>Email Pengguna (Wajib untuk 2FA)</span>
                    <span className="text-[10px] text-amber-600 font-bold">*Wajib Diisi</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      name="email" 
                      type="email" 
                      placeholder="contoh: budi.santoso@gmail.com" 
                      className="pl-10" 
                      required 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Kode verifikasi 2FA akan dikirim ke email ini saat login. Email ini tidak dapat diubah sendiri oleh petugas.
                  </p>
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
                      <SelectItem value="petugas_absensi">Petugas Absensi</SelectItem>
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

      <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900 rounded-3xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {(systemUsers ? [...systemUsers].filter((u: any) => u.role !== 'petugas_survey').reverse() : []).map((u: any) => (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">
                          {u.fullName}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground font-mono mt-0.5">
                          {u.nipppk && (
                            <span className="text-purple-700 font-bold bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                              NIP: {u.nipppk}
                            </span>
                          )}
                          {u.pangkat && (
                            <span className="text-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {u.pangkat}
                            </span>
                          )}
                          <span className="text-slate-400 font-normal">@{u.username || u.id}</span>
                        </div>
                        {u.email && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-1">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{u.email}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        {u.status === 'inactive' ? (
                          <Badge variant="destructive" className="font-black uppercase text-[9px] gap-1 bg-red-100 text-red-600 border-red-200">Nonaktif</Badge>
                        ) : (
                          <Badge variant="secondary" className="font-black uppercase text-[9px] bg-green-100 text-green-700 border-green-200">Aktif</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div>
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
                        ) : u.role === 'petugas_absensi' ? (
                          <Badge variant="outline" className="text-cyan-700 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-300 font-black uppercase text-[9px] gap-1">
                            <ClipboardCheck className="w-3 h-3" /> Petugas Absensi
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
                        {(u.role === 'petugas' || u.role === 'petugas_survey' || u.role === 'admin' || u.role === 'superadmin') && (
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            {u.twoFactorEnabled === false ? (
                              <Badge variant="outline" className="text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-300 font-bold text-[9px] gap-1">
                                <ShieldOff className="w-3 h-3" /> 2FA Nonaktif
                              </Badge>
                            ) : u.twoFactorMethod === 'authenticator' ? (
                              <Badge variant="secondary" className="text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-300 font-bold text-[9px] gap-1">
                                <Smartphone className="w-3 h-3 text-blue-600" /> 2FA: Authenticator
                              </Badge>
                            ) : u.twoFactorMethod === 'both' ? (
                              <Badge variant="secondary" className="text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-300 font-bold text-[9px] gap-1">
                                <ShieldCheck className="w-3 h-3 text-purple-600" /> 2FA: Email &amp; App
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 font-bold text-[9px] gap-1">
                                <Mail className="w-3 h-3 text-emerald-600" /> 2FA: OTP Email
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {u.isOnline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[9px] uppercase border border-emerald-300 shadow-xs">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold text-[9px] uppercase border border-slate-200">
                            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-slate-400"></span>
                            Offline
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {u.lastLogin ? formatDateTimeIndo(u.lastLogin) : "Belum login"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {hasUserLoggedIn(u) ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-black uppercase w-fit">Terkunci di Perangkat</span>
                            {u.activeSessionId && (
                              <span className="text-[9px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-black uppercase border border-orange-200 w-fit flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse inline-block" />
                                AKTIF DI PERANGKAT LAIN
                              </span>
                            )}
                          </div>
                          {(u.uid || (u.id === user?.uid ? user?.uid : null)) && (
                            <span className="text-[8px] font-mono text-muted-foreground truncate max-w-[200px]">
                              {u.uid || user?.uid}
                            </span>
                          )}
                        </div>
                      ) : (
                        <UserDeletionTimer 
                          userId={u.id} 
                          userUid={u.uid} 
                          addedAt={u.addedAt} 
                          lastLogin={u.lastLogin}
                          isOnline={u.isOnline}
                          database={database} 
                          isAdmin={isAdmin} 
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { setDetailUser(u); setShowPassword(false); }} 
                        className="h-8 px-2.5 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleOpenEditEmail(u)} 
                          className="h-8 w-8 rounded-xl border-sky-200 text-sky-700 hover:bg-sky-50"
                          title="Edit Email Terdaftar (2FA)"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button 
                          variant={u.status === 'inactive' ? "secondary" : "destructive"} 
                          size="icon" 
                          onClick={() => handleToggleStatus(u.id, u.status)} 
                          className={`h-8 w-8 rounded-xl ${u.status === 'inactive' ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200' : ''}`}
                          title={u.status === 'inactive' ? 'Aktifkan' : 'Nonaktifkan'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {isAdmin && (u.role === 'petugas' || u.role === 'petugas_survey' || u.role === 'admin' || u.role === 'superadmin') && (
                        <>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleOpen2FAConfig(u)} 
                            className={`h-8 w-8 rounded-xl ${u.twoFactorEnabled === false ? 'border-amber-300 text-amber-700 hover:bg-amber-50' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
                            title="Pengaturan 2FA (Email / Google Authenticator)"
                          >
                            {u.twoFactorEnabled === false ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleReset2FA(u)} 
                            className="h-8 w-8 rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50"
                            title="Reset Sesi 2FA (Bersihkan OTP & Percobaan)"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setEditingUser(u)} 
                        className="h-8 w-8 border-primary/20 hover:bg-primary/5 text-primary rounded-xl" 
                        title="Ganti Role"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                      </Button>
                      {hasUserLoggedIn(u) && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-amber-600 hover:bg-amber-50 border-amber-200 rounded-xl"
                          onClick={() => handleResetUID(u.id, u.fullName)}
                          title="Reset Perangkat"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => handleDelete(u.id, u.fullName, u.uid)}
                        disabled={isCurrentSelfAccount(u)}
                        title={isCurrentSelfAccount(u) ? "Akun Anda Sendiri (Aktif)" : "Hapus Pengguna"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!systemUsers || systemUsers.length === 0) && (
                  <div className="text-center py-16 text-muted-foreground italic font-medium">
                    Belum ada data pengguna.
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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
                                <span className="text-slate-600 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  {u.pangkat}
                                </span>
                              )}
                              <span className="text-slate-400 font-normal">@{u.username || u.id}</span>
                            </div>
                            {u.email && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-1">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="font-mono truncate max-w-[220px]">{u.email}</span>
                              </div>
                            )}
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
                            <Badge variant="secondary" className="text-slate-600 dark:text-white bg-slate-100 dark:bg-slate-800 font-black uppercase text-[9px] gap-1">
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
                          ) : u.role === 'petugas_absensi' ? (
                            <Badge variant="outline" className="text-cyan-700 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-300 font-black uppercase text-[9px] gap-1">
                              <ClipboardCheck className="w-3 h-3" /> Petugas Absensi
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
                          {(u.role === 'petugas' || u.role === 'petugas_survey' || u.role === 'admin' || u.role === 'superadmin') && (
                            <div className="mt-1 flex items-center gap-1 flex-wrap">
                              {u.twoFactorEnabled === false ? (
                                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 font-bold text-[9px] gap-1">
                                  <ShieldOff className="w-3 h-3" /> 2FA Nonaktif
                                </Badge>
                              ) : u.twoFactorMethod === 'authenticator' ? (
                                <Badge variant="secondary" className="text-blue-700 bg-blue-50 border-blue-300 font-bold text-[9px] gap-1">
                                  <Smartphone className="w-3 h-3 text-blue-600" /> 2FA: Authenticator
                                </Badge>
                              ) : u.twoFactorMethod === 'both' ? (
                                <Badge variant="secondary" className="text-purple-700 bg-purple-50 border-purple-300 font-bold text-[9px] gap-1">
                                  <ShieldCheck className="w-3 h-3 text-purple-600" /> 2FA: Email &amp; App
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-emerald-700 bg-emerald-50 border-emerald-300 font-bold text-[9px] gap-1">
                                  <Mail className="w-3 h-3 text-emerald-600" /> 2FA: OTP Email
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            {/* Status Online / Offline & Terakhir Login */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {u.isOnline ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[9px] uppercase border border-emerald-300 shadow-xs">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                  </span>
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold text-[9px] uppercase border border-slate-200">
                                  <span className="inline-flex rounded-full h-1.5 w-1.5 bg-slate-400"></span>
                                  Offline
                                </span>
                              )}

                              <span className="text-[9px] text-slate-500 font-medium flex items-center gap-1" title={u.lastLogin ? formatDateTimeIndo(u.lastLogin) : "Belum pernah login"}>
                                <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[120px]">
                                  {u.lastLogin ? formatDateTimeIndo(u.lastLogin) : "Belum login"}
                                </span>
                              </span>
                            </div>

                            {hasUserLoggedIn(u) ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-black uppercase w-fit">Terkunci di Perangkat</span>
                                {u.activeSessionId && (
                                  <span className="text-[9px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-black uppercase border border-orange-200 w-fit flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse inline-block" />
                                    AKTIF DI PERANGKAT LAIN
                                  </span>
                                )}
                                {(u.uid || (u.id === user?.uid ? user?.uid : null)) && (
                                  <span className="text-[8px] font-mono text-muted-foreground truncate max-w-[100px]">
                                    {u.uid || user?.uid}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <UserDeletionTimer 
                                userId={u.id} 
                                userUid={u.uid} 
                                addedAt={u.addedAt} 
                                lastLogin={u.lastLogin}
                                isOnline={u.isOnline}
                                database={database} 
                                isAdmin={isAdmin} 
                              />
                            )}
                          </div>
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
                                variant="outline" 
                                size="icon" 
                                onClick={() => handleOpenEditEmail(u)} 
                                className="h-8 w-8 text-sky-700 hover:bg-sky-50 border-sky-200"
                                title="Edit Email Terdaftar (2FA)"
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                            )}
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
                            {isAdmin && (u.role === 'petugas' || u.role === 'petugas_survey' || u.role === 'admin' || u.role === 'superadmin') && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => handleOpen2FAConfig(u)} 
                                  className={`h-8 w-8 ${u.twoFactorEnabled === false ? 'border-amber-300 text-amber-700 hover:bg-amber-50' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
                                  title="Pengaturan 2FA (Email / Google Authenticator)"
                                >
                                  {u.twoFactorEnabled === false ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => handleReset2FA(u)} 
                                  className="h-8 w-8 text-purple-700 hover:bg-purple-50 border-purple-200"
                                  title="Reset Sesi 2FA (Bersihkan OTP & Percobaan)"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => setEditingUser(u)} 
                              className="h-8 w-8 border-primary/20 hover:bg-primary/5 text-primary" 
                              title="Ganti Role"
                            >
                              <UserCog className="w-4 h-4" />
                            </Button>

                            {hasUserLoggedIn(u) && (
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
                              disabled={isCurrentSelfAccount(u)}
                              title={isCurrentSelfAccount(u) ? "Akun Anda Sendiri (Aktif)" : "Hapus Pengguna"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!systemUsers || systemUsers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic font-medium">
                          Belum ada data pengguna.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shared Edit Role & Access Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null) }}>
        <DialogContent>
          {editingUser && (
            <form onSubmit={handleUpdateRole}>
              <DialogHeader>
                <DialogTitle className="text-primary font-black uppercase">Update Akses Pengguna</DialogTitle>
                <CardDescription>Ubah peranan akses untuk {editingUser.fullName}.</CardDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Nama Lengkap</Label>
                    <Input name="fullName" defaultValue={editingUser.fullName} key={`fn-${editingUser.id}`} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center justify-between">
                      <span>Email Terdaftar (2FA)</span>
                      <span className="text-[10px] text-muted-foreground">Ubah jika petugas kehilangan akses email lamanya</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        name="email" 
                        type="email" 
                        defaultValue={editingUser.email || ""} 
                        placeholder="contoh: user@gmail.com" 
                        className="pl-10" 
                        key={`em-${editingUser.id}`} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Nomor Ponsel</Label>
                    <Input name="phoneNumber" defaultValue={editingUser.phoneNumber} key={`pn-${editingUser.id}`} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">NIK</Label>
                    <Input name="nik" defaultValue={editingUser.nik} key={`nik-${editingUser.id}`} maxLength={16} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Alamat Lengkap</Label>
                    <Textarea name="address" defaultValue={editingUser.address} key={`addr-${editingUser.id}`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="font-bold text-xs">NIPPPK / NIP</Label>
                      <Input name="nipppk" defaultValue={editingUser.nipppk || editingUser.pejabatData?.verifikator?.nipppk || editingUser.pejabatData?.petugas?.nipppk || ""} placeholder="Nomor NIPPPK" className="font-mono text-xs" key={`nip-${editingUser.id}`} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs">Pangkat / Golongan</Label>
                      <Input name="pangkat" defaultValue={editingUser.pangkat || editingUser.pejabatData?.verifikator?.pangkat || editingUser.pejabatData?.petugas?.pangkat || ""} placeholder="Contoh: Penata, III/c" className="text-xs" key={`pkt-${editingUser.id}`} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs">Jabatan</Label>
                      <Input name="jabatan" defaultValue={editingUser.jabatan || editingUser.pejabatData?.verifikator?.jabatan || editingUser.pejabatData?.petugas?.jabatan || ""} placeholder="Contoh: Verifikator Dinas" className="text-xs" key={`jbt-${editingUser.id}`} />
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
                    <Select name="role" defaultValue={editingUser.role || "petugas"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petugas">Petugas Survey</SelectItem>
                        <SelectItem value="koordinator">USULAN</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="dinas">Dinas</SelectItem>
                        <SelectItem value="verifikator_dinas">Verifikator Dinas</SelectItem>
                        <SelectItem value="petugas_absensi">Petugas Absensi</SelectItem>
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
          )}
        </DialogContent>
      </Dialog>
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

      <ConfirmDialog
        open={show2FAToggleDialog}
        onOpenChange={setShow2FAToggleDialog}
        title={target2FAToggle?.currentEnabled ? "Nonaktifkan 2FA" : "Aktifkan 2FA"}
        description={target2FAToggle?.currentEnabled 
          ? `Nonaktifkan verifikasi 2FA untuk ${target2FAToggle?.fullName}? Petugas akan dapat login langsung menggunakan kata sandi tanpa kode OTP email.` 
          : `Aktifkan kembali verifikasi 2FA untuk ${target2FAToggle?.fullName}? Pastikan email terdaftar aktif untuk menerima kode OTP.`}
        onConfirm={executeToggle2FA}
        variant={target2FAToggle?.currentEnabled ? "destructive" : "default"}
        icon={target2FAToggle?.currentEnabled ? <ShieldOff className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
        confirmText={target2FAToggle?.currentEnabled ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
      />

      <ConfirmDialog
        open={show2FAResetDialog}
        onOpenChange={setShow2FAResetDialog}
        title="Reset Sesi 2FA"
        description={`Reset sesi 2FA untuk ${target2FAReset?.fullName}? Sesi OTP yang sedang aktif, riwayat percobaan salah, dan limit kirim ulang akan dibersihkan sehingga petugas dapat login dengan kode OTP baru.`}
        onConfirm={executeReset2FA}
        variant="default"
        icon={<KeyRound className="w-6 h-6" />}
        confirmText="Ya, Reset 2FA"
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
                  <span className="text-muted-foreground text-xs font-semibold">Email Terdaftar (2FA)</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono font-bold text-slate-800 text-xs">{detailUser.email || '- (Belum Diatur)'}</span>
                    </div>
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] font-bold text-sky-700 border-sky-200 hover:bg-sky-50 gap-1"
                        onClick={() => handleOpenEditEmail(detailUser)}
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Ubah Email
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">Status &amp; Metode 2FA</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                      detailUser.twoFactorEnabled === false 
                        ? 'bg-amber-100 text-amber-700' 
                        : detailUser.twoFactorMethod === 'authenticator'
                        ? 'bg-blue-100 text-blue-700'
                        : detailUser.twoFactorMethod === 'both'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {detailUser.twoFactorEnabled === false 
                        ? 'Nonaktif' 
                        : detailUser.twoFactorMethod === 'authenticator'
                        ? 'Google Authenticator'
                        : detailUser.twoFactorMethod === 'both'
                        ? 'Email & App'
                        : 'OTP Email'}
                    </span>
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] font-bold"
                        onClick={() => handleOpen2FAConfig(detailUser)}
                      >
                        Kelola 2FA
                      </Button>
                    )}
                  </div>
                </div>

                {detailUser.twoFactorOtp && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 bg-amber-50/50 p-2 rounded-lg">
                    <span className="text-amber-800 text-xs font-semibold">Sesi OTP Berjalan</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px] font-bold text-purple-700 border-purple-200 hover:bg-purple-50"
                      onClick={() => handleReset2FA(detailUser)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> Reset Sesi OTP
                    </Button>
                  </div>
                )}

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
                    {detailUser.uid || (detailUser.id === user?.uid ? user?.uid : null) || (hasUserLoggedIn(detailUser) ? 'Terkunci' : 'Belum Terkunci')}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">Status Kehadiran</span>
                  {detailUser.isOnline ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Online (Sedang Aktif)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      <span className="inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                      Offline
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-muted-foreground text-xs font-semibold">Terakhir Login</span>
                  <span className="text-xs text-slate-700 font-mono font-bold">
                    {detailUser.lastLogin ? formatDateTimeIndo(detailUser.lastLogin) : "Belum pernah login"}
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

      {/* =========================================================================
          MODAL: EDIT EMAIL TERDAFTAR (2FA)
          ========================================================================= */}
      <Dialog open={!!editEmailUser} onOpenChange={(open) => { if (!open) setEditEmailUser(null) }}>
        <DialogContent className="max-w-md">
          {editEmailUser && (
            <form onSubmit={handleSaveEmail}>
              <DialogHeader>
                <DialogTitle className="text-primary font-black uppercase flex items-center gap-2">
                  <Mail className="w-5 h-5" /> Edit Alamat Email Petugas
                </DialogTitle>
                <CardDescription>
                  Perbarui alamat email terdaftar untuk keperluan verifikasi 2FA jika terjadi kesalahan input atau pergantian email resmi.
                </CardDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Nama Petugas:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{editEmailUser.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Username / ID:</span>
                    <span className="font-mono font-bold bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 rounded">@{editEmailUser.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-semibold">Email Saat Ini:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {editEmailUser.email || '(Belum Didaftarkan)'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-xs flex items-center gap-1">
                    <span>Alamat Email Baru</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      placeholder="contoh: petugas.resmi@gmail.com"
                      className="pl-9 font-mono text-sm"
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                    Pastikan email aktif dan dapat menerima pesan. Sesi kode OTP yang sedang aktif akan dibersihkan secara otomatis saat email diubah.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditEmailUser(null)}
                  disabled={isSavingEmail}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingEmail || !newEmailInput.trim()}
                  className="font-bold bg-primary hover:bg-primary/90 text-white gap-2"
                >
                  {isSavingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Simpan Email</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: PENGATURAN KEAMANAN VERIFIKASI 2FA (EMAIL / AUTHENTICATOR / KEDUANYA)
          ========================================================================= */}
      <Dialog open={!!config2FAUser} onOpenChange={(open) => { if (!open) setConfig2FAUser(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {config2FAUser && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-primary font-black uppercase flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" /> Pengaturan Verifikasi 2FA
                </DialogTitle>
                <CardDescription>
                  Konfigurasi metode autentikasi dua langkah untuk akun <strong className="text-slate-800 dark:text-slate-100">{config2FAUser.fullName}</strong> (@{config2FAUser.id}).
                </CardDescription>
              </DialogHeader>

              {/* Status 2FA Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold text-sm block text-slate-800 dark:text-slate-200">Status 2FA</span>
                  <span className="text-xs text-muted-foreground">
                    {config2FAEnabled ? "Fitur verifikasi dua langkah aktif" : "Nonaktif (Login hanya dengan kata sandi)"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant={config2FAEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConfig2FAEnabled(!config2FAEnabled)}
                  className={`font-bold text-xs gap-1.5 ${config2FAEnabled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-amber-300 text-amber-700"}`}
                >
                  {config2FAEnabled ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                  <span>{config2FAEnabled ? "Aktif" : "Nonaktif"}</span>
                </Button>
              </div>

              {config2FAEnabled && (
                <div className="space-y-3">
                  <Label className="font-bold text-xs block text-slate-700 dark:text-slate-300">
                    Pilih Metode Autentikasi (2FA):
                  </Label>

                  {/* Method Option Cards */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Method 1: Email OTP */}
                    <div 
                      onClick={() => setConfig2FAMethod('email')}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                        config2FAMethod === 'email'
                          ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        config2FAMethod === 'email' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">1. OTP Email</span>
                          {config2FAMethod === 'email' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          Kode 6 angka dikirimkan ke email terdaftar ({config2FAUser.email || 'belum ada email'}). Berlaku 10 menit.
                        </p>
                      </div>
                    </div>

                    {/* Method 2: Google Authenticator */}
                    <div 
                      onClick={() => setConfig2FAMethod('authenticator')}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                        config2FAMethod === 'authenticator'
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        config2FAMethod === 'authenticator' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">2. Google Authenticator</span>
                          {config2FAMethod === 'authenticator' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          Kode 6 angka didapatkan langsung dari aplikasi Google Authenticator / Authy. Instan &amp; tanpa menunggu email.
                        </p>
                      </div>
                    </div>

                    {/* Method 3: Keduanya (Pilihan Saat Login) */}
                    <div 
                      onClick={() => setConfig2FAMethod('both')}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                        config2FAMethod === 'both'
                          ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        config2FAMethod === 'both' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">3. Keduanya (Pilihan Saat Login)</span>
                          {config2FAMethod === 'both' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          Petugas dapat memilih masuk via Google Authenticator atau via kode OTP Email pada saat login.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section: Google Authenticator Configuration */}
                  {(config2FAMethod === 'authenticator' || config2FAMethod === 'both') && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Konfigurasi Google Authenticator
                          </span>
                        </div>
                        {config2FAUser.twoFactorTotpSecret && !totpSetupData && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300">
                            Terkonfigurasi
                          </span>
                        )}
                      </div>

                      {/* Display QR code & secret */}
                      {totpSetupData ? (
                        <div className="space-y-3 animate-in fade-in">
                          <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <img
                              src={totpSetupData.qrCodeDataUrl}
                              alt="QR Code Google Authenticator"
                              className="w-44 h-44 object-contain rounded-lg"
                            />
                            <p className="text-[11px] text-muted-foreground mt-2 text-center">
                              Buka Google Authenticator &gt; Pindai Kode QR ini
                            </p>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              Kunci Rahasia (Setup Manual):
                            </Label>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs bg-slate-200/80 dark:bg-slate-700 px-3 py-1.5 rounded-lg flex-1 text-center tracking-wider text-slate-800 dark:text-slate-200 select-all">
                                {totpSetupData.formattedSecret}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(totpSetupData.secret);
                                  toast({ title: "Kunci Disalin", description: "Kunci rahasia Base32 berhasil disalin ke clipboard." });
                                }}
                                className="h-8 px-2.5 text-xs gap-1 border-slate-300"
                              >
                                <Copy className="w-3.5 h-3.5" /> Salin
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                              <span>Uji Coba Kode 6 Angka (Opsional):</span>
                              <span className="text-[10px] text-muted-foreground">Pastikan jam HP sinkron</span>
                            </Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={totpVerifyCode}
                              onChange={(e) => setTotpVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="Masukkan 6 angka dari HP"
                              className="font-mono text-center tracking-widest text-sm font-bold"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {config2FAUser.twoFactorTotpSecret
                              ? "Akun ini sudah memiliki kunci Google Authenticator. Anda dapat membuat kunci baru atau menghubungkan ulang perangkat baru."
                              : "Pengguna belum memiliki kunci Google Authenticator. Klik tombol di bawah untuk menghasilkan QR Code dan Kunci Rahasia."}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleGenerateTotp}
                              disabled={isSettingUpTotp}
                              className="font-bold text-xs gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              {isSettingUpTotp ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <QrCode className="w-3.5 h-3.5" />
                              )}
                              <span>{config2FAUser.twoFactorTotpSecret ? "Pindai / Hubungkan Ulang QR Code" : "Hasilkan QR Code & Kunci"}</span>
                            </Button>
                            {config2FAUser.twoFactorTotpSecret && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleResetTotpSecret}
                                className="font-bold text-xs text-destructive hover:bg-destructive/10"
                              >
                                Hapus Kunci Authenticator
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfig2FAUser(null)}
                  disabled={isSaving2FAConfig}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleSave2FAConfig}
                  disabled={isSaving2FAConfig}
                  className="font-bold bg-primary hover:bg-primary/90 text-white gap-2"
                >
                  {isSaving2FAConfig ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Simpan Pengaturan 2FA</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
