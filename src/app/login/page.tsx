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
import { useOfficeStatus } from "@/hooks/useOfficeStatus"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Phone, MapPin, Building2, Code2, DoorOpen, DoorClosed, Clock } from "lucide-react"

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
  const status = useOfficeStatus()

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
    <div className="min-h-screen w-full flex items-center justify-center p-0 md:p-4 bg-transparent relative overflow-hidden font-body">
      {/* City Background Layer (Underlay) */}
      <div 
        className="absolute inset-0 bg-[url('/bg-app.png')] bg-cover bg-center z-[-1] transition-all duration-1000" 
        style={{ filter: showForm ? 'blur(30px) brightness(0.6)' : 'blur(4px) brightness(0.95)' }}
      />
      <div className="absolute inset-0 bg-white/10 z-[-1]" />

      {!showForm ? (
        <div 
          className="flex flex-col items-center gap-12 cursor-pointer group z-10 transition-all duration-700 hover:scale-105"
          onClick={() => setShowForm(true)}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl group-hover:bg-white/40 transition-all duration-500 scale-125" />
            <div className="w-64 h-64 md:w-80 md:h-80 overflow-hidden rounded-full border-[12px] border-white shadow-[0_45px_100px_-20px_rgba(0,0,0,0.3)] bg-white relative z-10 p-6 transition-all duration-1000 group-hover:rotate-[8deg] group-hover:scale-110 shadow-glow">
              <img 
                src="/logo.png" 
                alt="SIMPU Logo" 
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            <h1 className="text-5xl md:text-7xl font-black text-slate-800 tracking-tighter uppercase italic drop-shadow-[0_4px_12px_rgba(255,255,255,0.8)]">
              SIM<span className="text-primary tracking-widest not-italic">PU</span>
            </h1>

            {/* Glassmorphic Countdown Card like Image 1 */}
            {status && (
              <div className="bg-white/90 backdrop-blur-3xl rounded-[2.5rem] px-12 py-8 border border-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] flex flex-col items-center gap-2 min-w-[340px] transition-all group-hover:-translate-y-6 duration-700 hover:bg-white">
                 <div className="flex items-center gap-2 mb-1">
                    {status.isOpen ? <DoorOpen className="w-6 h-6 text-emerald-500" /> : <DoorClosed className="w-6 h-6 text-rose-500" />}
                    <span className={cn("text-sm font-black tracking-[0.3em] uppercase", status.isOpen ? "text-emerald-500" : "text-rose-500")}>
                      {status.label}
                    </span>
                 </div>
                 <div className="flex items-center gap-6">
                    <Clock className="w-10 h-10 text-slate-300 opacity-60" />
                    <span className="text-6xl md:text-7xl font-mono font-black text-slate-800 tracking-tighter leading-none">
                      {status.timeLeft}
                    </span>
                    <span className="text-[10px] font-black text-slate-400/80 uppercase tracking-widest vertical-text writing-mode-vertical-rl">
                       {status.isOpen ? "Menuju Tutup" : "Menuju Buka"}
                    </span>
                 </div>
              </div>
            )}

            <div className="px-10 py-3.5 bg-white/20 backdrop-blur-2xl rounded-full text-[12px] font-black text-slate-700 uppercase tracking-[0.4em] border border-white/50 shadow-2xl animate-bounce mt-10 hover:bg-white/40 transition-all cursor-pointer">
              Klik Logo Untuk Masuk
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-5xl h-full md:h-[680px] bg-white/90 backdrop-blur-3xl md:rounded-[3.5rem] shadow-[0_120px_250px_-50px_rgba(0,0,0,0.4)] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-1000 relative z-20 border border-white/60">
          
          {/* Left Panel: Branding & Countdown */}
          <div className="w-full md:w-[45%] bg-gradient-to-br from-[#7C3AED] via-[#4F46E5] to-[#4338CA] p-8 md:p-14 flex flex-col items-center justify-center text-center relative overflow-hidden shrink-0 border-r border-white/10">
            {/* Animated Background blobs */}
            <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-white/10 rounded-full -ml-40 -mt-40 blur-[100px] animate-pulse" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-black/10 rounded-full -mr-40 -mb-40 blur-[100px] animate-pulse duration-[4s]" />
            
            <div className="relative z-10 space-y-12 animate-in slide-in-from-left duration-1000">
              <div className="w-44 h-44 md:w-60 md:h-60 bg-white p-6 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] flex items-center justify-center mx-auto transition-all hover:rotate-[10deg] hover:scale-105 duration-700 group cursor-default">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-xl" />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-none">
                  SIM<span className="opacity-40 tracking-normal not-italic">PU</span>
                </h2>
                <div className="h-2 w-20 bg-white/30 mx-auto rounded-full" />
                <p className="text-white/80 text-sm md:text-base font-black uppercase tracking-[0.3em] leading-relaxed max-w-[240px] mx-auto opacity-80">
                  Sistem Informasi Pelaku Usaha
                </p>
              </div>

               {status && (
                <div className="bg-white/10 backdrop-blur-2xl rounded-[2rem] p-8 border border-white/20 shadow-inner group transition-all hover:bg-white/20 mt-8">
                  <div className="text-[11px] font-black text-white/50 uppercase tracking-[0.4em] mb-4">{status.label}</div>
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-4xl md:text-5xl font-mono font-black text-white tracking-tighter">
                      {status.timeLeft}
                    </span>
                    <span className="text-[11px] text-white/40 font-black uppercase tracking-[0.2em]">{status.isOpen ? "Close" : "Open"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Authentication */}
          <div className="flex-1 bg-white/40 p-10 md:p-16 flex flex-col justify-center relative animate-in slide-in-from-right duration-1000">
            {/* Top Navigation: Switch Mode */}
            <div className="absolute top-12 right-12 flex items-center gap-4">
               <span className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">
                  {isRegisteringView ? "Sudah punya akun?" : "Belum punya akun?"}
               </span>
               <button 
                  onClick={() => {
                    setIsRegisteringView(!isRegisteringView);
                    setIsRegistered(false);
                  }}
                  className="px-6 py-2 rounded-full bg-primary/10 border-2 border-primary/50 text-[11px] font-black text-primary uppercase hover:bg-primary hover:text-white transition-all transform active:scale-90"
               >
                  {isRegisteringView ? "Masuk" : "Daftar Akun"}
               </button>
            </div>

            <div className="max-w-md w-full mx-auto space-y-12">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
                  {isRegistered ? "BERHASIL!" : isRegisteringView ? "DAFTAR!" : "HALO"}
                </h1>
                <p className="text-slate-500 text-[13px] font-bold leading-relaxed uppercase tracking-widest opacity-80">
                  {isRegistered 
                    ? "Pendaftaran Anda sedang diproses." 
                    : isRegisteringView 
                      ? "Silakan buat akun untuk akses penuh." 
                      : "Sistem Informasi Pelaku Usaha."}
                </p>
              </div>

              {isRegistered ? (
                <div className="space-y-10 py-6 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-28 h-28 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner border-[6px] border-emerald-50">
                    <CheckCircle2 className="w-14 h-14 text-emerald-600" />
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-emerald-50/50 border-2 border-emerald-100 shadow-sm">
                    <p className="text-sm font-black text-emerald-800 leading-relaxed uppercase tracking-widest text-center">
                      REGISTRATION SUCCESSFUL.{"\n"}
                      PLEASE WAIT 1X24 HOUR FOR ADMIN APPROVAL.
                    </p>
                  </div>
                  <Button 
                    className="w-full h-16 rounded-[1.8rem] font-black text-lg bg-emerald-600 hover:bg-emerald-700 shadow-2xl transition-all active:scale-95"
                    onClick={() => {
                      setIsRegistered(false);
                      setIsRegisteringView(false);
                    }}
                  >
                    RETURN TO LOGIN
                  </Button>
                </div>
              ) : (
                <form 
                  onSubmit={isRegisteringView ? handleRegister : handleAuth} 
                  className="space-y-8"
                >
                  <div className="space-y-6">
                    <div className="space-y-3">
                       <Label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] ml-3">Username</Label>
                       <div className="relative group">
                          <div className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110">
                             {isRegisteringView ? <UserPlus className="w-7 h-7" /> : <Mail className="w-7 h-7" />}
                          </div>
                          <Input 
                            placeholder={isRegisteringView ? "Full Name" : "Username / Nickname"}
                            className="h-20 pl-20 pr-8 rounded-[2rem] border-slate-100 bg-slate-100/50 transition-all focus:ring-[15px] focus:ring-primary/5 focus:border-primary text-slate-800 font-black placeholder:text-slate-300 placeholder:font-black uppercase tracking-tighter text-lg"
                            value={isRegisteringView ? regName : identifier}
                            onChange={(e) => isRegisteringView ? setRegName(e.target.value) : setIdentifier(e.target.value)}
                            required
                          />
                       </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex justify-between items-center px-4">
                          <Label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Password</Label>
                          {!isRegisteringView && (
                             <button type="button" className="text-[11px] font-black text-primary hover:underline uppercase tracking-widest">Forgot?</button>
                          )}
                       </div>
                       <div className="relative group">
                          <div className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110">
                             <Lock className="w-7 h-7" />
                          </div>
                          <Input 
                            type="password"
                            placeholder="••••••••"
                            className="h-20 pl-20 pr-8 rounded-[2rem] border-slate-100 bg-slate-100/50 transition-all focus:ring-[15px] focus:ring-primary/5 focus:border-primary text-slate-800 font-black placeholder:text-slate-200 text-lg"
                            value={isRegisteringView ? regPass : password}
                            onChange={(e) => isRegisteringView ? setRegPass(e.target.value) : setPassword(e.target.value)}
                            required
                          />
                       </div>
                    </div>
                  </div>

                  <div className="pt-6 space-y-8">
                    <Button 
                      type="submit" 
                      className={cn(
                        "w-full h-20 rounded-[2rem] text-xl font-black shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 transform active:scale-95",
                        isRegisteringView ? "bg-indigo-600 hover:bg-indigo-700" : "bg-primary hover:bg-primary/90"
                      )}
                      disabled={loading || registering}
                    >
                      {loading || registering ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                      ) : (
                        <span className="tracking-[0.2em] uppercase">{isRegisteringView ? "REGISTER NOW" : "LOGIN NOW"}</span>
                      )}
                    </Button>

                    {!isRegisteringView && (
                      <div className="flex items-center gap-4 justify-center text-[11px] text-slate-300 font-black uppercase tracking-[0.4em] opacity-60">
                        <div className="h-px w-10 bg-slate-200" />
                        <span className="flex items-center gap-3">
                          <MonitorOff className="w-5 h-5 opacity-40" /> 1 DEVICE ONLY
                        </span>
                        <div className="h-px w-10 bg-slate-200" />
                      </div>
                    )}
                  </div>
                </form>
              )}

              <div className="pt-10 border-t border-slate-100 flex justify-center">
                <button 
                  onClick={() => setShowInfoModal(true)}
                  className="flex items-center gap-3 group p-4 rounded-2xl hover:bg-slate-50 transition-all"
                >
                  <Building2 className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                  <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em] group-hover:text-slate-600 transition-colors">OFFICE INFO</span>
                </button>
              </div>
            </div>
          </div>

          {/* Close Button: Transparent Glass */}
          <button 
            onClick={() => setShowForm(false)}
            className="absolute top-12 left-12 p-5 rounded-full bg-white/30 hover:bg-white/50 text-slate-900 transition-all backdrop-blur-3xl border border-white/40 shadow-2xl group flex items-center gap-3 z-30 transform hover:scale-110 active:scale-90"
          >
            <ArrowLeft className="w-7 h-7 transition-transform group-hover:-translate-x-3" />
            <span className="text-[12px] font-black uppercase tracking-[0.3em] hidden lg:block">Exit</span>
          </button>
        </div>
      )}

      {/* Info Modal remained consistent but updated with matching aesthetics */}
      <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-[0_50px_150px_-30px_rgba(0,0,0,0.6)] rounded-[3.5rem] bg-white backdrop-blur-3xl">
          <div className="bg-slate-950 p-16 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-transparent to-purple-500/30" />
             <div className="z-10 flex flex-col items-center gap-4">
               <div className="text-[12px] font-black text-white/40 uppercase tracking-[0.6em] mb-4">OFFICE HOURS STATUS</div>
               {status && (
                 <div className="text-5xl md:text-7xl font-mono font-black text-white tracking-[0.2em]">{status.timeLeft}</div>
               )}
               <div className={cn("px-8 py-2 rounded-full text-[12px] font-black uppercase tracking-[0.3em] border border-white/20 mt-4", status?.isOpen ? "bg-emerald-500 text-white" : "bg-rose-600 text-white")}>
                 {status?.label}
               </div>
             </div>
          </div>
          <div className="p-12 space-y-12 bg-white">
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-primary/15 rounded-[1.5rem] flex items-center justify-center text-primary shadow-inner">
                  <Building2 className="w-9 h-9" />
                </div>
                <h3 className="font-black text-3xl tracking-tighter text-slate-900 uppercase">LOCATION</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-5 text-[15px] font-black text-slate-600 leading-relaxed uppercase tracking-tight bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <MapPin className="w-7 h-7 mt-1.5 shrink-0 text-primary/30" />
                  <span className="opacity-80">JALAN GATOT SUBROTO ( DEPAN RAWASARI ) DEKAT CUCIAN MOBIL STARWASH</span>
                </div>
                <div className="flex items-center gap-5 text-2xl font-black text-primary px-8">
                  <Phone className="w-7 h-7" />
                  <span className="tracking-tighter">0823-2880-4478</span>
                </div>
              </div>
            </div>
            
            <Separator className="bg-slate-100" />
            
            <div className="flex items-center justify-between p-8 bg-slate-950 rounded-[2.8rem] text-white shadow-2xl">
                <div className="space-y-1">
                  <div className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em]">Developer Unit</div>
                  <div className="text-2xl font-black uppercase tracking-tighter">AGUS SURIYADI</div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="text-[11px] font-black text-white/30 uppercase mb-2">Support Line</div>
                   <div className="text-lg font-black text-primary">0817-319-885</div>
                </div>
            </div>
          </div>
          <div className="p-6 text-center bg-slate-50 border-t">
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">SIMPU ECOSYSTEM © 2026</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}