"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useDatabase } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { ref, get, set, update } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
  Lock, 
  Mail, 
  Loader2, 
  LogIn, 
  MonitorOff, 
  SearchCheck, 
  DatabaseZap, 
  UserPlus 
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  
  // Register States
  const [regName, setRegName] = useState("")
  const [regPass, setRegPass] = useState("")
  const [isRegOpen, setIsRegOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const auth = useAuth()
  const database = useDatabase()
  const router = useRouter()
  const { toast } = useToast()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const username = identifier.toLowerCase().trim().replace(/\s+/g, '_')
    const email = `${username}@umkm.id`

    try {
      let user;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        user = userCredential.user

        const userRef = ref(database, `system_users/${username}`)
        const userSnap = await get(userRef)

        if (userSnap.exists()) {
          const userData = userSnap.val()
          
          if (userData.role === 'pending') {
            await signOut(auth)
            toast({ 
              variant: "destructive", 
              title: "Akses Belum Aktif", 
              description: "Akun Anda sudah terdaftar. Silakan hubungi Admin untuk pemberian akses (Role)." 
            })
            setLoading(false)
            return
          }

          if (!userData.uid) {
            await update(userRef, { uid: user.uid })
            toast({ title: "Perangkat Terkunci", description: "Akun Anda sekarang terikat pada perangkat ini." })
          } else if (userData.uid !== user.uid) {
            await signOut(auth)
            toast({ 
              variant: "destructive", 
              title: "Akses Ditolak", 
              description: "Akun terikat pada perangkat lain. Hubungi Admin untuk reset." 
            })
            setLoading(false)
            return
          }
        }
        
        toast({ title: "Login Berhasil", description: "Selamat datang kembali." })
      } catch (loginError: any) {
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential' || loginError.code === 'auth/invalid-email') {
          const tempUserRef = ref(database, `system_users/${username}`)
          const tempUserSnap = await get(tempUserRef)

          if (tempUserSnap.exists()) {
            const preRegisteredData = tempUserSnap.val()
            
            if (preRegisteredData.role === 'pending') {
              toast({ 
                variant: "destructive", 
                title: "Akun Belum Siap", 
                description: "Menunggu Administrator memberikan akses/role untuk akun ini." 
              })
              setLoading(false)
              return
            }

            if (preRegisteredData.password === password) {
              const newUserCred = await createUserWithEmailAndPassword(auth, email, password)
              user = newUserCred.user

              await update(tempUserRef, {
                uid: user.uid,
                addedAt: new Date().toISOString()
              })

              if (preRegisteredData.role === 'admin') {
                const roleRef = ref(database, `roles_admin/${user.uid}`)
                await set(roleRef, { admin: true })
              }

              toast({ 
                title: "Akses Diberikan", 
                description: "Akun berhasil didaftarkan dan dikunci ke perangkat ini." 
              })
            } else {
              throw new Error("auth/wrong-password")
            }
          } else {
            throw loginError
          }
        } else {
          throw loginError
        }
      }

      router.push("/")
    } catch (error: any) {
      let message = `Terjadi kesalahan: ${error.message || String(error)}`
      if (error.code === 'auth/invalid-credential' || error.message === 'auth/wrong-password') message = "Username atau kata sandi salah."
      
      toast({
        variant: "destructive",
        title: "Gagal",
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!regName || !regPass) return
    
    setRegistering(true)
    const username = regName.toLowerCase().trim().replace(/\s+/g, '_')
    const userRef = ref(database, `system_users/${username}`)

    try {
      const snap = await get(userRef)
      if (snap.exists()) {
        toast({ variant: "destructive", title: "Username Sudah Ada", description: "Silakan gunakan nama lain atau hubungi Admin." })
        setRegistering(false)
        return
      }

      await set(userRef, {
        fullName: regName,
        password: regPass,
        role: "pending",
        uid: null,
        addedAt: new Date().toISOString()
      })

      toast({ 
        title: "Pendaftaran Berhasil", 
        description: "Akun telah dibuat dengan status 'Pending'. Segera lapor ke Admin untuk pemberian akses (Role)." 
      })
      setIsRegOpen(false)
      setRegName("")
      setRegPass("")
      setIdentifier(username)
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal Mendaftar", description: "Terjadi kesalahan koneksi." })
    } finally {
      setRegistering(false)
    }
  }

  const seedMonitoringUser = async () => {
    setSeeding(true)
    try {
      const userRef = ref(database, `system_users/monitoring`)
      await update(userRef, {
        fullName: "Monitoring",
        password: "monitoring",
        role: "monitoring",
        uid: null,
        addedAt: new Date().toISOString()
      })
      
      toast({ title: "Inisialisasi Berhasil", description: "User 'monitoring' telah ditambahkan ke database. Silakan login." })
      setIdentifier("monitoring")
      setPassword("monitoring")
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal Inisialisasi", description: "Pastikan Anda memiliki koneksi internet." })
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {!showForm ? (
        <div 
          className="flex flex-col items-center cursor-pointer animate-pulse transition-transform hover:scale-105" 
          onClick={() => setShowForm(true)}
        >
          <div className="w-48 h-48 overflow-hidden rounded-full border-8 border-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-white">
            <img 
              src="/logo.png" 
              alt="SIMPU Logo" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      ) : (
        <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-sm scale-in-center">
          <div className="h-2 bg-primary w-full" />
          <CardHeader className="space-y-1 text-center pt-8 cursor-pointer select-none" onClick={() => setShowForm(false)}>
            <div className="flex justify-center mb-2">
              <div className="w-24 h-24 overflow-hidden rounded-full border-4 border-white shadow-lg relative z-10 bg-white">
                <img 
                  src="/logo.png" 
                  alt="SIMPU Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-slate-800">Masuk ke SIMPU</CardTitle>
          </CardHeader>
          <form onSubmit={handleAuth}>
            <CardContent className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="identifier" className="font-bold text-slate-700">Username</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="Masukkan Nama Anda"
                    className="pl-10 h-11 border-slate-200 focus:ring-primary"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" title="Kata sandi anda" className="font-bold text-slate-700">Kata Sandi</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11 border-slate-200 focus:ring-primary"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-10">
              <div className="flex gap-2 w-full">
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90 h-12 text-md font-bold shadow-lg transition-all" 
                  disabled={loading || seeding}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <><LogIn className="w-5 h-5 mr-2" /> Masuk</>
                  )}
                </Button>

                <Dialog open={isRegOpen} onOpenChange={setIsRegOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" type="button" className="px-4 h-12 font-bold whitespace-nowrap shadow-sm">
                      <UserPlus className="w-5 h-5 mr-2" /> Daftar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[400px]">
                    <form onSubmit={handleRegister}>
                      <DialogHeader>
                        <DialogTitle className="text-primary font-black uppercase tracking-tight">Pendaftaran User</DialogTitle>
                        <DialogDescription className="text-xs">
                          Akun akan aktif setelah disetujui Administrator.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-bold">Username</Label>
                          <Input 
                            placeholder="Nama Lengkap Anda" 
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            required 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-bold">Kata Sandi</Label>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            value={regPass}
                            onChange={(e) => setRegPass(e.target.value)}
                            required 
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full font-bold h-11" disabled={registering}>
                          {registering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                          Simpan Pendaftaran
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Link href="/check-data" className="w-full">
                <Button variant="outline" type="button" className="w-full h-11 border-primary/20 text-primary font-bold hover:bg-primary/5 transition-colors">
                  <SearchCheck className="w-4 h-4 mr-2" /> Cek Data Pengajuan
                </Button>
              </Link>

              <div className="pt-2 flex flex-col items-center gap-3">
                <Button 
                  variant="ghost" 
                  type="button" 
                  onClick={seedMonitoringUser} 
                  disabled={seeding}
                  className="text-[10px] text-muted-foreground/40 hover:text-emerald-600 transition-colors h-auto p-0"
                >
                  {seeding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <DatabaseZap className="w-3 h-3 mr-1" />} Inisialisasi Monitoring
                </Button>

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-medium tracking-tight">
                  <MonitorOff className="w-3 h-3" /> Kebijakan 1 User 1 Perangkat Aktif
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  )
}