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
  CalendarDays
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { OfficeHoursTimer } from "@/components/OfficeHoursTimer"
import { EventCountdown } from "@/components/event-countdown"
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
    <div 
      className="min-h-screen flex items-center justify-center p-4 cursor-default relative overflow-hidden"
      onClick={() => setShowForm(false)}
    >
      {/* Top Right Widgets (visible when form is shown) */}
      {showForm && (
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50 flex flex-col items-end gap-3 w-full md:w-auto max-w-[calc(100vw-2rem)] md:max-w-sm pointer-events-none">
          <div className="pointer-events-auto">
            <OfficeHoursTimer 
              large 
              onClick={(e: any) => {
                e?.stopPropagation?.()
                setShowInfoModal(true)
              }}
            />
          </div>

          {/* Event Info Card */}
          {eventInfo?.enabled && (eventInfo?.endDate || eventInfo?.date) && (
             <Card className="border-none shadow-xl bg-white/95 backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-top-8 duration-700 w-full pointer-events-auto">
               <div className="h-1 bg-gradient-to-r from-primary via-emerald-500 to-amber-500 w-full" />
               <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                 <div className="flex items-center gap-2 text-primary">
                   <CalendarDays className="w-4 h-4 animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{eventInfo.description || "EVENT MENDATANG"}</span>
                 </div>
                 <div className="scale-[0.80] sm:scale-90 md:scale-100 origin-center -my-2 md:-my-1">
                   <EventCountdown targetDate={eventInfo.endDate || eventInfo.date} startDate={eventInfo.startDate} />
                 </div>
               </CardContent>
             </Card>
          )}
        </div>
      )}

      {!showForm ? (
        <div 
          className="flex flex-col items-center gap-8 cursor-pointer group" 
          onClick={(e) => {
            e.stopPropagation();
            setShowForm(true);
          }}
        >
          <div className="w-48 h-48 overflow-hidden rounded-full border-8 border-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-white animate-pulse transition-transform group-hover:scale-105">
            <img 
              src="/logo.png" 
              alt="SIMPU Logo" 
              className="w-full h-full object-contain p-2"
            />
          </div>
          
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <OfficeHoursTimer 
              large 
              onClick={(e: any) => {
                e?.stopPropagation?.()
                setShowInfoModal(true)
              }}
            />
          </div>
        </div>
      ) : (
        <Card 
          className="w-full max-w-md border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-sm scale-in-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-2 bg-primary w-full" />
          <CardHeader className="space-y-1 text-center pt-8 cursor-pointer select-none" onClick={() => !isRegisteringView && !isRegistered && setShowForm(false)}>
            <div className="flex justify-center mb-2">
              <div className="w-24 h-24 overflow-hidden rounded-full border-4 border-white shadow-lg relative z-10 bg-white">
                <img 
                  src="/logo.png" 
                  alt="SIMPU Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-slate-800">
              {isRegistered ? "Pendaftaran Berhasil" : isRegisteringView ? "Pendaftaran User Baru" : "Masuk ke SIMPU"}
            </CardTitle>
          </CardHeader>
          {isRegistered ? (
            <CardContent className="py-10 text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-emerald-100 p-4 rounded-full">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm font-black text-slate-800 leading-relaxed uppercase px-4 whitespace-pre-line text-center">
                DATA PENDAFTARAN AKUN BARU KAMU TELAH BERHASIL.{"\n"}
                SILAHKAN LOGIN SETELAH ADMIN MEMVERIFIKASI AKUN KAMU MAKSIMAL 1X24JAM.{"\n"}
                HUBUNGI ADMIN JIKA SAMPAI BATAS WAKTU AKUN BELUM TERVERIFIKASI.
              </p>
              <Button 
                variant="outline" 
                className="mt-10 w-full h-12 font-bold border-primary text-primary"
                onClick={() => {
                  setIsRegistered(false);
                  setIsRegisteringView(false);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Login
              </Button>
            </CardContent>
          ) : isRegisteringView ? (
            <form onSubmit={handleRegister}>
              <CardContent className="grid gap-5 py-4 text-left">
                <div className="grid gap-2 text-left">
                  <Label className="font-bold text-slate-700 ml-1">Username</Label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Nama Lengkap Anda" 
                      className="pl-10 h-11 border-slate-200 focus:ring-primary"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required 
                    />
                  </div>
                </div>
                <div className="grid gap-2 text-left">
                  <Label className="font-bold text-slate-700 ml-1">Kata Sandi</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10 h-11 border-slate-200 focus:ring-primary"
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      required 
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pb-10">
                <Button type="submit" className="w-full font-bold h-12 bg-primary shadow-lg" disabled={registering}>
                  {registering ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                  Simpan Pendaftaran
                </Button>
                <Button 
                  variant="ghost" 
                  type="button" 
                  className="w-full text-muted-foreground font-bold"
                  onClick={() => setIsRegisteringView(false)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Batal & Kembali ke Login
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleAuth}>
              <CardContent className="grid gap-5 py-4 text-left">
                <div className="grid gap-2 text-left">
                  <Label htmlFor="identifier" className="font-bold text-slate-700 ml-1">Username</Label>
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
                <div className="grid gap-2 text-left">
                  <Label htmlFor="password" title="Kata sandi anda" className="font-bold text-slate-700 ml-1">Kata Sandi</Label>
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
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <><LogIn className="w-5 h-5 mr-2" /> Masuk</>
                    )}
                  </Button>

                  <Button 
                    variant="secondary" 
                    type="button" 
                    className="px-6 h-12 font-bold whitespace-nowrap shadow-sm"
                    onClick={() => setIsRegisteringView(true)}
                  >
                    <UserPlus className="w-5 h-5 mr-2" /> Daftar
                  </Button>
                </div>

                <div className="pt-2 flex flex-col items-center gap-3">


                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-medium tracking-tight">
                    <MonitorOff className="w-3 h-3" /> Kebijakan 1 User 1 Perangkat Aktif
                  </div>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      )}



      {/* Information Modal */}
      <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
          {/* Top Part - Countdown */}
          <div className="bg-slate-50 p-8 flex flex-col items-center justify-center border-b">
            <div className="mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Waktu Operasional Kantor</div>
            <OfficeHoursTimer large />
          </div>

          {/* Bottom Part - Info */}
          <div className="p-8 space-y-8 bg-white">
            {/* Secretariat */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-black text-lg tracking-tight text-slate-800 uppercase">Sekretariat</h3>
              </div>
              <div className="space-y-3 pl-11">
                <div className="flex items-start gap-2 text-sm font-bold text-slate-600 leading-relaxed uppercase">
                  <MapPin className="w-4 h-4 mt-1 shrink-0 text-slate-400" />
                  <span>JALAN GATOT SUBROTO ( DEPAN RAWASARI ) DEKAT CUCIAN MOBIL STARWASH</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-black text-primary">
                  <Phone className="w-4 h-4" />
                  <span>KONTAK OFFICE : 0823-2880-4478</span>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-100" />

            {/* Developer */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900/10 rounded-lg">
                  <Code2 className="w-5 h-5 text-slate-900" />
                </div>
                <h3 className="font-black text-lg tracking-tight text-slate-800 uppercase">Pengembang Aplikasi</h3>
              </div>
              <div className="space-y-3 pl-11">
                <div className="space-y-1">
                  <div className="text-md font-black text-slate-900 uppercase">AGUS SURIYADI</div>
                  <div className="flex items-start gap-2 text-xs font-bold text-slate-500 uppercase">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                    <span>JL DAENG HAJI MEKAH NO 23 TANJUNGPINANG</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                  <Phone className="w-4 h-4" />
                  <span>KONTAK : 0817319885</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-slate-50 border-t text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistem Informasi Manajemen Pelaku Usaha © 2026</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}