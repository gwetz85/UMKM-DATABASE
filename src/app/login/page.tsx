"use client"

import React, { useState } from "react"
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
  UserPlus,
  ArrowLeft,
  CheckCircle2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { OfficeHoursTimer } from "@/components/OfficeHoursTimer"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Phone, MapPin, Building2, Code2 } from "lucide-react"



export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  
  // Register States
  const [regName, setRegName] = useState("")
  const [regPass, setRegPass] = useState("")
  const [isRegisteringView, setIsRegisteringView] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)

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

          if (userData.role !== 'dinas') {
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

      setIsRegistered(true)
      setRegName("")
      setRegPass("")
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal Mendaftar", description: "Terjadi kesalahan koneksi." })
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 md:p-4 bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl -ml-64 -mb-64" />

      {!showForm ? (
        <div 
          className="flex flex-col items-center gap-12 cursor-pointer group z-10 transition-all duration-700 hover:scale-105"
          onClick={() => setShowForm(true)}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse group-hover:bg-primary/30 transition-colors" />
            <div className="w-56 h-56 md:w-64 md:h-64 overflow-hidden rounded-full border-8 border-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] bg-white relative z-10 p-4 transition-transform duration-500 group-hover:rotate-6">
              <img 
                src="/logo.png" 
                alt="SIMPU Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tighter uppercase italic">
              SIM<span className="text-primary tracking-widest not-italic">PU</span>
            </h1>
            <OfficeHoursTimer large />
            <div className="px-6 py-2 bg-slate-100 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border border-white/50 shadow-sm animate-bounce mt-4">
              Klik Logo Untuk Masuk
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-5xl h-full md:h-[650px] bg-white md:rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-700 relative z-20">
          
          {/* Left Panel: Branding & Countdown */}
          <div className="w-full md:w-[45%] bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0] p-8 md:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden shrink-0">
            {/* Animated Circles for Background */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-black/10 rounded-full -mr-32 -mb-32 blur-3xl" />
            
            <div className="relative z-10 space-y-8 animate-in slide-in-from-left duration-1000">
              <div className="w-32 h-32 md:w-48 md:h-48 bg-white p-4 rounded-3xl shadow-2xl flex items-center justify-center mx-auto transition-transform hover:scale-110 duration-500">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">SIMPU</h2>
                <div className="h-1.5 w-12 bg-white/30 mx-auto rounded-full" />
                <p className="text-white/60 text-xs md:text-sm font-black uppercase tracking-[0.2em] leading-relaxed">
                  Sistem Informasi Manajemen<br/>Pelaku Usaha
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-inner">
                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Waktu Operasional</div>
                <OfficeHoursTimer large />
              </div>
            </div>
          </div>

          {/* Right Panel: Authentication */}
          <div className="flex-1 bg-white p-8 md:p-12 flex flex-col justify-center relative animate-in slide-in-from-right duration-1000">
            {/* Top Navigation: Home Link */}
            <div className="absolute top-8 right-8 flex items-center gap-2">
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {isRegisteringView ? "Sudah punya akun?" : "Belum punya akun?"}
               </span>
               <button 
                  onClick={() => {
                    setIsRegisteringView(!isRegisteringView);
                    setIsRegistered(false);
                  }}
                  className="text-[11px] font-black text-primary uppercase hover:underline underline-offset-4 decoration-2"
               >
                  {isRegisteringView ? "Masuk Sekarang" : "Daftar Sekarang"}
               </button>
            </div>

            <div className="max-w-sm w-full mx-auto space-y-10">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-none">
                  {isRegistered ? "Berhasil!" : isRegisteringView ? "Bergabung!" : "Halo Kembali!"}
                </h1>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  {isRegistered 
                    ? "Pendaftaran Anda telah kami terima." 
                    : isRegisteringView 
                      ? "Silakan isi data diri Anda untuk pendaftaran user baru." 
                      : "Selamat datang kembali, silakan masuk untuk melanjutkan."}
                </p>
              </div>

              {isRegistered ? (
                <div className="space-y-8 py-4 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <p className="text-sm font-black text-slate-700 leading-relaxed uppercase whitespace-pre-line tracking-tight bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                    AKUN BERHASIL TERDAFTAR.{"\n"}
                    SILAHKAN LOGIN SETELAH ADMIN MEMVERIFIKASI AKUN KAMU MAKSIMAL 1X24JAM.
                  </p>
                  <Button 
                    className="w-full h-14 rounded-2xl font-black text-md bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                    onClick={() => {
                      setIsRegistered(false);
                      setIsRegisteringView(false);
                    }}
                  >
                    KEMBALI KE LOGIN
                  </Button>
                </div>
              ) : (
                <form 
                  onSubmit={isRegisteringView ? handleRegister : handleAuth} 
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Username / Nama</Label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                          {isRegisteringView ? <UserPlus className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                        </div>
                        <Input 
                          placeholder={isRegisteringView ? "Nama Lengkap" : "Masukkan Username"}
                          className="h-14 pl-14 pr-5 rounded-2xl border-slate-100 bg-slate-50/50 transition-all focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-800 font-bold placeholder:text-slate-300 placeholder:font-medium"
                          value={isRegisteringView ? regName : identifier}
                          onChange={(e) => isRegisteringView ? setRegName(e.target.value) : setIdentifier(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Kata Sandi</Label>
                        {!isRegisteringView && (
                          <button type="button" className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors uppercase">
                            Lupa sandi?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                          <Lock className="w-5 h-5" />
                        </div>
                        <Input 
                          type="password"
                          placeholder="••••••••"
                          className="h-14 pl-14 pr-5 rounded-2xl border-slate-100 bg-slate-50/50 transition-all focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-800 font-bold placeholder:text-slate-300 placeholder:font-medium"
                          value={isRegisteringView ? regPass : password}
                          onChange={(e) => isRegisteringView ? setRegPass(e.target.value) : setPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-6">
                    <Button 
                      type="submit" 
                      className={cn(
                        "w-full h-14 rounded-2xl text-md font-black shadow-xl transition-all duration-300",
                        isRegisteringView ? "bg-indigo-600 hover:bg-indigo-700" : "bg-[#FD6B6B] hover:bg-[#ff5a5a]"
                      )}
                      disabled={loading || registering}
                    >
                      {loading || registering ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>{isRegisteringView ? "SIMPAN PENDAFTARAN" : "MASUK SEKARANG"}</>
                      )}
                    </Button>

                    {!isRegisteringView && (
                      <div className="flex items-center gap-3 justify-center text-[10px] text-slate-400 font-bold uppercase tracking-tight opacity-50">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="flex items-center gap-1.5 shrink-0">
                          <MonitorOff className="w-3 h-3" /> Kebijakan 1 Perangkat Aktif
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                    )}
                  </div>
                </form>
              )}

              {/* Secretariat Info Toggle */}
              <div className="pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setShowInfoModal(true)}
                  className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Building2 className="w-3.5 h-3.5" /> Lihat Info Sekretariat
                </button>
              </div>
            </div>
          </div>

          {/* Close Button (for desktop returning to landing) */}
          <button 
            onClick={() => setShowForm(false)}
            className="absolute top-8 left-8 p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20 shadow-lg group hidden md:flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Kembali</span>
          </button>
        </div>
      )}

      {/* Information Modal (Unchanged functionality, styled consistency) */}
      <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem]">
          <div className="bg-slate-50 p-8 flex flex-col items-center justify-center border-b">
            <div className="mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Waktu Operasional</div>
            <OfficeHoursTimer large />
          </div>
          <div className="p-8 space-y-8 bg-white">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-black text-xl tracking-tight text-slate-800 uppercase">Sekretariat</h3>
              </div>
              <div className="space-y-4 pl-[3.5rem]">
                <div className="flex items-start gap-3 text-xs md:text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
                  <MapPin className="w-5 h-5 mt-1 shrink-0 text-slate-300" />
                  <span>JALAN GATOT SUBROTO ( DEPAN RAWASARI ) DEKAT CUCIAN MOBIL STARWASH</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-black text-primary">
                  <Phone className="w-5 h-5" />
                  <span>OFFICE : 0823-2880-4478</span>
                </div>
              </div>
            </div>
            <Separator className="bg-slate-100" />
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900/10 rounded-2xl">
                  <Code2 className="w-6 h-6 text-slate-900" />
                </div>
                <h3 className="font-black text-xl tracking-tight text-slate-800 uppercase">Pengembang</h3>
              </div>
              <div className="space-y-4 pl-[3.5rem]">
                <div className="space-y-1">
                  <div className="text-lg font-black text-slate-900 uppercase">AGUS SURIYADI</div>
                  <div className="flex items-start gap-3 text-xs font-bold text-slate-500 uppercase">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-300" />
                    <span>JL DAENG HAJI MEKAH NO 23 TANJUNGPINANG</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm font-black text-slate-700">
                  <Phone className="w-5 h-5" />
                  <span>KONTAK : 0817-319-885</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 bg-slate-50 border-t text-center">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">SIMPU © 2026</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}