"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useDatabase, useUser } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { ref, get, set, update } from "firebase/database"
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  UserPlus, 
  SearchCheck, 
  CheckCircle2, 
  ArrowLeft 
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { logActivity, getDeviceType } from "@/lib/logger"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
  // Register States
  const [regName, setRegName] = useState("")
  const [regPass, setRegPass] = useState("")
  const [isRegisteringView, setIsRegisteringView] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  const auth = useAuth()
  const database = useDatabase()
  const router = useRouter()
  const { toast } = useToast()
  const { user: existingUser, userProfile: existingProfile, isUserLoading, isProfileLoading } = useUser()

  // Auto redirect if already authenticated with active role
  useEffect(() => {
    if (!isUserLoading && !isProfileLoading && existingUser && existingProfile) {
      const role = existingProfile.role || ''
      if (role === 'petugas_survey' || role === 'petugas') {
        router.push("/portal-survey")
      } else if (role === 'dinas') {
        router.push("/verifikasi-dinas")
      } else if (role === 'verifikator_dinas') {
        router.push("/verifikasi-dinas-berkas")
      } else if (role === 'koordinator') {
        router.push("/actor-data")
      } else {
        router.push("/")
      }
    }
  }, [existingUser, existingProfile, isUserLoading, isProfileLoading, router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password) return
    setLoading(true)

    const username = identifier.toLowerCase().trim().replace(/\s+/g, '_')
    const email = `${username}@umkm.id`

    try {
      let user: any;
      let finalUserRole = '';
      let userNodeExists = false;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        user = userCredential.user

        const userRef = ref(database, `system_users/${username}`)
        const userSnap = await get(userRef)
        userNodeExists = userSnap.exists()

        if (userSnap.exists()) {
          const userData = userSnap.val()
          finalUserRole = userData.role || ''

          const isHardcodedAdmin = email === 'agus@umkm.id'
          let isRolesAdmin = false
          if (!isHardcodedAdmin && user.uid) {
            const roleRef = ref(database, `roles_admin/${user.uid}`)
            const roleSnap = await get(roleRef)
            if (roleSnap.exists() && roleSnap.val().admin === true) {
              isRolesAdmin = true
            }
          }
          const hasAdminBypass = isHardcodedAdmin || isRolesAdmin

          if (!hasAdminBypass) {
            if (userData.password && userData.password !== password) {
               throw new Error("auth/password-changed-by-admin")
            }
            
            if (userData.status === 'inactive') {
              await signOut(auth)
              toast({
                variant: "destructive",
                title: "Akun Dinonaktifkan",
                description: "User ini telah dinonaktifkan oleh Administrator."
              })
              setLoading(false)
              return
            }

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

            if (userData.role !== 'dinas' && userData.role !== 'verifikator_dinas') {
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
            } else if (!userData.uid && user.uid) {
              await update(userRef, { uid: user.uid })
            }
          } else if (!userData.uid && user.uid) {
            await update(userRef, { uid: user.uid })
          }
        } else {
          const isHardcodedAdmin = email === 'agus@umkm.id'
          let hasAdminBypass = isHardcodedAdmin
          if (!hasAdminBypass && user.uid) {
            const roleRef = ref(database, `roles_admin/${user.uid}`)
            const roleSnap = await get(roleRef)
            if (roleSnap.exists() && roleSnap.val().admin === true) {
              hasAdminBypass = true
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
        if (
          loginError.code === 'auth/user-not-found' || 
          loginError.code === 'auth/invalid-credential' || 
          loginError.code === 'auth/invalid-email' || 
          loginError.message === 'auth/password-changed-by-admin'
        ) {
          const tempUserRef = ref(database, `system_users/${username}`)
          const tempUserSnap = await get(tempUserRef)

          if (tempUserSnap.exists()) {
            userNodeExists = true
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

            if (preRegisteredData.status === 'inactive') {
              toast({
                variant: "destructive",
                title: "Akun Dinonaktifkan",
                description: "User ini telah dinonaktifkan oleh Administrator."
              })
              setLoading(false)
              return
            }

            if (preRegisteredData.password === password) {
              let currentVersion = preRegisteredData.pwdVersion || 0;
              let newUserCred: any = null;
              let attempts = 0;
              const maxAttempts = 15;

              while (!newUserCred && attempts < maxAttempts) {
                attempts++;
                const versionSuffix = currentVersion ? `_v${currentVersion}` : '';
                const actualEmail = `${username}${versionSuffix}@umkm.id`;
                
                try {
                  newUserCred = await signInWithEmailAndPassword(auth, actualEmail, password);
                } catch (e: any) {
                  if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
                    try {
                      newUserCred = await createUserWithEmailAndPassword(auth, actualEmail, password);
                    } catch (createErr: any) {
                      if (createErr.code === 'auth/email-already-in-use') {
                        currentVersion++;
                        continue;
                      } else {
                        throw createErr;
                      }
                    }
                  } else {
                    throw e;
                  }
                }
              }

              if (!newUserCred) {
                throw new Error("Gagal mengautentikasi akun. Silakan coba lagi.");
              }

              if (currentVersion !== (preRegisteredData.pwdVersion || 0)) {
                await update(tempUserRef, { pwdVersion: currentVersion });
              }

              user = newUserCred.user;
              finalUserRole = preRegisteredData.role || '';

              await update(tempUserRef, {
                uid: user.uid,
                addedAt: new Date().toISOString()
              })

              if (preRegisteredData.role === 'admin' || preRegisteredData.role === 'superadmin') {
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

      let targetUserKey: string | null = null;
      if (userNodeExists) {
        targetUserKey = username;
      } else if (user?.uid) {
        const uidSnap = await get(ref(database, `system_users/${user.uid}`));
        if (uidSnap.exists()) {
          targetUserKey = user.uid;
        }
      }

      await logActivity({
        query: `LOGIN: ${username.toUpperCase()}`,
        results: "Berhasil Masuk",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'LOGIN',
        userId: username.toUpperCase()
      }, database || undefined)

      const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36)
      localStorage.setItem('simpu_session_id', sessionId)
      
      const loginUpdates: Record<string, any> = {
        lastLogin: new Date().toISOString(),
        isOnline: true,
        lastSeen: Date.now()
      }
      if (user?.uid) {
        loginUpdates.uid = user.uid
      }
      if (finalUserRole !== 'admin' && email !== 'agus@umkm.id') {
        loginUpdates.activeSessionId = sessionId
      }

      if (targetUserKey) {
        await update(ref(database, `system_users/${targetUserKey}`), loginUpdates).catch(console.error);
      }

      if (finalUserRole === 'petugas_survey' || finalUserRole === 'petugas') {
        router.push("/portal-survey")
      } else if (finalUserRole === 'dinas') {
        router.push("/verifikasi-dinas")
      } else if (finalUserRole === 'verifikator_dinas') {
        router.push("/verifikasi-dinas-berkas")
      } else if (finalUserRole === 'koordinator') {
        router.push("/actor-data")
      } else {
        router.push("/")
      }
    } catch (error: any) {
      let message = `Kesalahan: ${error.message || String(error)}`
      if (error.code === 'auth/invalid-credential' || error.message === 'auth/wrong-password' || error.code === 'auth/email-already-in-use') {
        message = "Username atau kata sandi salah."
      }
      
      toast({
        variant: "destructive",
        title: "Gagal Masuk",
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!regName.trim() || !regPass) return
    
    setRegistering(true)
    const username = regName.toLowerCase().trim().replace(/\s+/g, '_')
    const userRef = ref(database, `system_users/${username}`)

    try {
      const snap = await get(userRef)
      if (snap.exists()) {
        toast({ 
          variant: "destructive", 
          title: "Username Sudah Digunakan", 
          description: "Silakan gunakan nama lain atau hubungi Admin." 
        })
        setRegistering(false)
        return
      }

      await set(userRef, {
        fullName: regName.trim(),
        password: regPass,
        role: "pending",
        uid: null,
        addedAt: new Date().toISOString()
      })

      setIsRegistered(true)
      setRegName("")
      setRegPass("")
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Gagal Mendaftar", 
        description: "Terjadi kesalahan koneksi saat registrasi." 
      })
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full relative flex flex-col justify-between overflow-x-hidden font-sans bg-[#0B3D21]">
      {/* Background Graphic Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <img 
          src="/bg-simpu-clean.png" 
          alt="Background SIMPU" 
          className="w-full h-full object-cover object-left md:object-center"
          loading="eager"
        />
        {/* Soft responsive overlay for mobile readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#0B3D21]/95 md:hidden" />
      </div>

      {/* TOP LEFT HEADER: Official Application Logo & Title */}
      <header className="relative z-30 pt-6 px-6 sm:pt-8 sm:px-10 flex items-center justify-between w-full">
        <div className="flex items-center gap-3 md:gap-4 select-none">
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-white/20 backdrop-blur-md border border-amber-400/60 p-1.5 shadow-xl flex items-center justify-center transition-transform hover:scale-105 duration-300">
            <img 
              src="/logo.png" 
              alt="Logo SIMPU" 
              className="w-full h-full object-contain drop-shadow"
            />
          </div>
          <div className="flex flex-col text-white drop-shadow-md">
            <span className="text-xl sm:text-2xl font-black tracking-wider leading-none uppercase text-white">
              SIMPU
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-amber-300 uppercase tracking-widest leading-tight mt-1">
              Sistem Informasi Manajemen Pelaku Usaha
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT: Right-aligned Login Section */}
      <main className="relative z-20 w-full flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-12 lg:pr-16 xl:pr-24 lg:items-end">
        <div className="w-full max-w-[360px] sm:max-w-[385px] flex flex-col items-center">
          {/* Greeting text above card */}
          <div className="text-center mb-6 sm:mb-7 select-none">
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-white leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              Selamat Datang
            </h1>
            <p className="text-xl sm:text-2xl lg:text-[26px] font-semibold text-amber-300 leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] mt-1">
              di Aplikasi SIMPU
            </p>
          </div>

          {/* Solid White Card: Tampak Sangat Jelas & Tegas */}
          <div className="w-full bg-white rounded-2xl sm:rounded-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.4)] p-6 sm:p-8 border border-slate-100 ring-1 ring-slate-900/5">
            {isRegistered ? (
              /* Success State */
              <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700 shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                    Pendaftaran Berhasil
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Akun Anda telah terdaftar dalam sistem. Menunggu aktivasi role oleh Administrator sebelum dapat digunakan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistered(false)
                    setIsRegisteringView(false)
                  }}
                  className="w-full h-11 sm:h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Login</span>
                </button>
              </div>
            ) : isRegisteringView ? (
              /* Registration Form */
              <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in duration-300">
                <div className="text-left mb-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Daftar Akun Petugas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Silakan isi identitas username dan kata sandi baru.
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Username Baru"
                    required
                    className="w-full h-11 sm:h-12 px-4 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] text-slate-900 placeholder:text-slate-400 font-semibold text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="Kata Sandi Baru"
                    required
                    className="w-full h-11 sm:h-12 px-4 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] text-slate-900 placeholder:text-slate-400 font-semibold text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full h-11 sm:h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {registering ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Mendaftarkan...</span>
                      </>
                    ) : (
                      "Simpan Pendaftaran"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRegisteringView(false)}
                    className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Batal & Kembali
                  </button>
                </div>
              </form>
            ) : (
              /* Standard Login Form (No Captcha) */
              <form onSubmit={handleAuth} className="space-y-4 animate-in fade-in duration-300">
                {/* Username Input */}
                <div>
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Username / ID"
                    autoComplete="username"
                    required
                    className="w-full h-11 sm:h-12 px-4 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] text-slate-900 placeholder:text-slate-400 font-semibold text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                  />
                </div>

                {/* Password Input */}
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full h-11 sm:h-12 px-4 pr-11 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] text-slate-900 placeholder:text-slate-400 font-semibold text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Login Action Button (Hanya Kuning & Hijau Theme: Solid Vibrant Emerald Green) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !identifier.trim() || !password}
                    className="w-full h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-emerald-950/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      "Login"
                    )}
                  </button>
                </div>

                {/* Secondary navigation & register link */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => router.push('/pendaftaran')}
                      className="text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Daftar Pelaku Usaha</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/cek-data')}
                      className="text-amber-700 hover:text-amber-800 transition-colors flex items-center gap-1.5"
                    >
                      <SearchCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Cek Data Publik</span>
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRegisteringView(true)}
                      className="text-[11px] text-slate-400 hover:text-emerald-700 transition-colors"
                    >
                      Belum punya akun petugas? <span className="font-semibold text-slate-700 underline hover:text-emerald-700">Daftar di sini</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER: Subtle copyright / info */}
      <footer className="relative z-30 pb-4 px-6 text-center lg:text-right lg:pr-16 xl:pr-24 select-none">
        <p className="text-[11px] text-white/80 font-medium drop-shadow">
          © {new Date().getFullYear()} SIMPU. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
