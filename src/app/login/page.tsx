"use client"

import { useState, useEffect } from "react"
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
  CheckCircle2,
  CalendarDays,
  Phone, 
  MapPin, 
  Building2, 
  Code2,
  X
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { OfficeHoursTimer } from "@/components/OfficeHoursTimer"
import { EventCountdown } from "@/components/event-countdown"
import { useActiveEvent } from "@/hooks/use-active-event"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { PublicCheckData } from "@/components/public-check-data"
import { logActivity, getDeviceType } from "@/lib/logger"

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
  const [showCheckDataModal, setShowCheckDataModal] = useState(false)
  const [showFullEvent, setShowFullEvent] = useState(false)

  const auth = useAuth()
  const database = useDatabase()
  const router = useRouter()
  const { toast } = useToast()

  const [eventInfo, setEventInfo] = useState<any>(null)
  
  useEffect(() => {
    if (!database) return;
    const evRef = ref(database, 'settings/event_info');
    get(evRef).then(snap => {
      if (snap.exists()) {
        setEventInfo(snap.val());
      }
    });
  }, [database]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFullEvent(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const activeEvent = useActiveEvent(eventInfo);

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
        } else {
          // KEY SECURITY FIX: Reject login if user is not found in system_users
          // Bypass for developer explicitly defined in the app
          let hasAdminBypass = email === 'agus@umkm.id';
          if (!hasAdminBypass && user.uid) {
            const roleRef = ref(database, `roles_admin/${user.uid}`);
            const roleSnap = await get(roleRef);
            if (roleSnap.exists() && roleSnap.val().admin === true) {
              hasAdminBypass = true;
            }
          }

          if (!hasAdminBypass) {
            await signOut(auth)
            toast({ 
              variant: "destructive", 
              title: "Akses Ditolak", 
              description: "Username ini tidak terdaftar di sistem Manajemen User."
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

      // Log Login Activity
      await logActivity({
        query: `LOGIN: ${username.toUpperCase()}`,
        results: "Berhasil Masuk",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'LOGIN',
        userId: username.toUpperCase()
      }, database || undefined)

      router.push("/")
    } catch (error: any) {
      let message = `Kesalahan: ${error.message || String(error)}`
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-sans bg-slate-950">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/macos_vibrant_background_1778161218419.png" 
          alt="Background" 
          className="w-full h-full object-cover scale-105 blur-sm"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Top Right Widgets */}
      <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-3 max-w-xs animate-in fade-in slide-in-from-right-8 duration-1000">
        {activeEvent && (
          <div 
            className="group cursor-pointer pointer-events-auto"
            onClick={() => setShowFullEvent(true)}
          >
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 shadow-2xl hover:bg-white/20 transition-all duration-300 active:scale-95">
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 text-white/90">
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{activeEvent.description || "EVENT"}</span>
                </div>
                <div className="mt-1">
                  <EventCountdown targetDate={activeEvent.endDate || activeEvent.date} startDate={activeEvent.startDate} size="sm" />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl px-4 py-2 shadow-xl">
          <OfficeHoursTimer 
            onClick={() => setShowInfoModal(true)}
          />
        </div>
      </div>

      {/* Center Content */}
      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-sm px-6 animate-in zoom-in-95 fade-in duration-1000">
        {/* Logo */}
        <div className="group relative">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-all duration-500" />
          <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full border-[10px] border-white/20 bg-white/10 backdrop-blur-md shadow-2xl p-6 overflow-hidden hover:scale-105 transition-transform duration-500">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight drop-shadow-lg">
              {isRegistered ? "Pendaftaran Berhasil" : isRegisteringView ? "Daftar Akun Baru" : "SIMPU Tanjungpinang"}
            </h1>
            {!isRegisteringView && !isRegistered && (
              <p className="text-white/60 text-sm font-medium uppercase tracking-[0.2em]">Silakan Masuk</p>
            )}
          </div>

          {isRegistered ? (
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-center">
              <div className="bg-emerald-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-white/90 leading-relaxed uppercase tracking-wider">
                PENDAFTARAN BERHASIL. SILAKAN LOGIN DALAM 24 JAM SEBELUM AKUN DIHAPUS OTOMATIS JIKA TIDAK AKTIF.
              </p>
              <Button 
                variant="ghost" 
                className="w-full text-white hover:bg-white/10 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                onClick={() => {
                  setIsRegistered(false);
                  setIsRegisteringView(false);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Login
              </Button>
            </div>
          ) : isRegisteringView ? (
            <form onSubmit={handleRegister} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <div className="relative group">
                  <Input 
                    placeholder="Username" 
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="h-12 bg-black/20 backdrop-blur-xl border-white/10 text-white placeholder:text-white/30 rounded-2xl px-6 focus:ring-white/20 focus:border-white/30 transition-all text-center font-bold"
                    required 
                  />
                </div>
                <div className="relative group">
                  <Input 
                    type="password" 
                    placeholder="Kata Sandi" 
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    className="h-12 bg-black/20 backdrop-blur-xl border-white/10 text-white placeholder:text-white/30 rounded-2xl px-6 focus:ring-white/20 focus:border-white/30 transition-all text-center font-bold"
                    required 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  type="submit" 
                  disabled={registering}
                  className="w-full h-12 bg-white text-slate-900 hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  {registering ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIMPAN PENDAFTARAN"}
                </Button>
                <Button 
                  variant="ghost" 
                  type="button"
                  className="w-full text-white/60 hover:text-white hover:bg-white/10 rounded-2xl font-bold"
                  onClick={() => setIsRegisteringView(false)}
                >
                  BATAL
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="Username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-14 bg-black/20 backdrop-blur-3xl border-white/10 text-white placeholder:text-white/30 rounded-2xl px-14 focus:ring-white/20 focus:border-white/30 transition-all font-bold text-lg"
                    required
                  />
                </div>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Kata Sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-black/20 backdrop-blur-3xl border-white/10 text-white placeholder:text-white/30 rounded-2xl px-14 focus:ring-white/20 focus:border-white/30 transition-all font-bold text-lg"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-xl flex items-center justify-center transition-all active:scale-90 border border-white/10"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 px-2">
                <button 
                  type="button"
                  onClick={() => setIsRegisteringView(true)}
                  className="text-[10px] font-black text-white/40 hover:text-white/80 uppercase tracking-[0.2em] transition-colors"
                >
                  Belum Punya Akun? Daftar
                </button>
                <button 
                  type="button"
                  onClick={() => setShowCheckDataModal(true)}
                  className="text-[10px] font-black text-white/40 hover:text-white/80 uppercase tracking-[0.2em] transition-colors"
                >
                  Cek Data Publik
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
        <div className="flex items-center gap-6 text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">
          <span>{eventInfo?.version || "SIMPU V4.0"}</span>
          <div className="w-1 h-1 rounded-full bg-white/20" />
          <span>© 2026 DINAS KOPERASI & UKM</span>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl bg-white/95 backdrop-blur-xl rounded-[2.5rem]">
          <div className="bg-slate-50/50 p-8 flex flex-col items-center justify-center border-b">
            <div className="mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Waktu Operasional Kantor</div>
            <OfficeHoursTimer large />
          </div>
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary"><Building2 className="w-5 h-5" /></div>
                <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">Sekretariat</h3>
              </div>
              <div className="pl-11 space-y-2">
                <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase">{eventInfo?.address || "JALAN GATOT SUBROTO ( DEPAN RAWASARI )"}</p>
                <p className="text-sm font-black text-primary">KONTAK : 0823-2880-4478</p>
              </div>
            </div>
            <Separator className="bg-slate-100" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900/10 rounded-xl text-slate-900"><Code2 className="w-5 h-5" /></div>
                <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">Pengembang</h3>
              </div>
              <div className="pl-11 space-y-2">
                <p className="text-sm font-black text-slate-900 uppercase">AGUS SURIYADI</p>
                <p className="text-sm font-black text-slate-700">KONTAK : 0817319885</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckDataModal} onOpenChange={setShowCheckDataModal}>
        <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl rounded-[2.5rem] bg-white/95 backdrop-blur-xl flex flex-col">
           <div className="p-8 overflow-y-auto flex-1">
             <PublicCheckData />
           </div>
        </DialogContent>
      </Dialog>

      {/* Full Screen Event View overlay */}
      {showFullEvent && activeEvent && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-2xl p-8 animate-in fade-in duration-500"
          onClick={() => setShowFullEvent(false)}
        >
          <button 
            className="absolute top-10 right-10 text-white/40 hover:text-white transition-colors"
            onClick={() => setShowFullEvent(false)}
          >
            <X className="w-10 h-10" />
          </button>
          <div className="flex flex-col items-center gap-12 max-w-4xl w-full text-center animate-in zoom-in-95 duration-500">
            <div className="space-y-4">
              <div className="inline-flex p-4 bg-white/10 rounded-3xl border border-white/20 mb-4">
                <CalendarDays className="w-12 h-12 text-white animate-pulse" />
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-2xl">
                {activeEvent.description}
              </h2>
              <div className="h-1.5 w-24 bg-white/20 mx-auto rounded-full" />
            </div>
            <div className="scale-150 py-12">
              <EventCountdown 
                targetDate={activeEvent.endDate || activeEvent.date} 
                startDate={activeEvent.startDate} 
                size="lg"
              />
            </div>
            <p className="text-white/60 text-lg md:text-xl font-bold uppercase tracking-[0.2em] max-w-2xl leading-relaxed">
              Persiapkan diri Anda untuk agenda penting ini. Pastikan data sudah terverifikasi di sistem SIMPU.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
