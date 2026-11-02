"use client"

import { useState, useEffect, useRef } from "react"
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
  ArrowLeft,
  User,
  Lock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  X,
  PhoneCall,
  Check,
  Building2,
  ChevronRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { logActivity, getDeviceType } from "@/lib/logger"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import "./login.css"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  // Animation states
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isEyeSpinning, setIsEyeSpinning] = useState(false)
  const [focusedField, setFocusedField] = useState<"identifier" | "password" | "regName" | "regPass" | null>(null)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  
  // Register States
  const [regName, setRegName] = useState("")
  const [regPass, setRegPass] = useState("")
  const [isRegisteringView, setIsRegisteringView] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  const auth = useAuth()
  const database = useDatabase()
  const router = useRouter()
  const { toast } = useToast()
  const { playSound } = useSoundEffect()
  const { user: existingUser, userProfile: existingProfile, isUserLoading, isProfileLoading } = useUser()

  // Load remembered username on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("simpu_remembered_username")
      if (savedUser) {
        setIdentifier(savedUser)
        setRememberMe(true)
      }
    } catch {
      // localStorage may fail in private mode
    }
  }, [])

  // Auto redirect if already authenticated with active role
  useEffect(() => {
    if (!isUserLoading && !isProfileLoading && existingUser && existingProfile) {
      const role = existingProfile.role || ""
      if (role === "petugas_survey" || role === "petugas") {
        router.push("/portal-survey")
      } else if (role === "petugas_absensi" || role === "petugas absensi" || role === "absensi") {
        router.push("/daftar-hadir")
      } else if (role === "dinas") {
        router.push("/verifikasi-dinas")
      } else if (role === "verifikator_dinas") {
        router.push("/verifikasi-dinas-berkas")
      } else if (role === "koordinator") {
        router.push("/actor-data")
      } else {
        router.push("/")
      }
    }
  }, [existingUser, existingProfile, isUserLoading, isProfileLoading, router])

  // Trigger eye spinning transition (video reference)
  const handleTogglePassword = () => {
    playSound("click", 0.3)
    setIsEyeSpinning(true)
    setShowPassword((prev) => !prev)
    setTimeout(() => {
      setIsEyeSpinning(false)
    }, 380)
  }

  // Trigger error shake animation
  const triggerErrorShake = (msg: string) => {
    playSound("error", 0.5)
    setErrorMessage(msg)
    setHasError(true)
    setTimeout(() => {
      setHasError(false)
    }, 550)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password) return
    
    setLoading(true)
    setErrorMessage(null)
    playSound("click", 0.4)

    const username = identifier.toLowerCase().trim().replace(/\s+/g, "_")
    const email = `${username}@umkm.id`

    try {
      let user: any
      let finalUserRole = ""
      let userNodeExists = false

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        user = userCredential.user

        const userRef = ref(database, `system_users/${username}`)
        const userSnap = await get(userRef)
        userNodeExists = userSnap.exists()

        if (userSnap.exists()) {
          const userData = userSnap.val()
          finalUserRole = userData.role || ""

          const isHardcodedAdmin = email === "agus@umkm.id"
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
            
            if (userData.status === "inactive") {
              await signOut(auth)
              triggerErrorShake("Akun ini telah dinonaktifkan oleh Administrator.")
              toast({
                variant: "destructive",
                title: "Akun Dinonaktifkan",
                description: "User ini telah dinonaktifkan oleh Administrator."
              })
              setLoading(false)
              return
            }

            if (userData.role === "pending") {
              await signOut(auth)
              triggerErrorShake("Akun Anda sedang menunggu persetujuan (Role) dari Admin.")
              toast({ 
                variant: "destructive", 
                title: "Akses Belum Aktif", 
                description: "Akun Anda sudah terdaftar. Silakan hubungi Admin untuk pemberian akses (Role)." 
              })
              setLoading(false)
              return
            }

            if (userData.role !== "dinas" && userData.role !== "verifikator_dinas") {
              if (!userData.uid) {
                await update(userRef, { uid: user.uid })
                toast({ title: "Perangkat Terkunci", description: "Akun Anda sekarang terikat pada perangkat ini." })
              } else if (userData.uid !== user.uid) {
                await signOut(auth)
                triggerErrorShake("Akun terikat pada perangkat lain. Hubungi Admin untuk reset.")
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
          const isHardcodedAdmin = email === "agus@umkm.id"
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
            triggerErrorShake("Username ini tidak terdaftar di sistem Manajemen User.")
            toast({ 
              variant: "destructive", 
              title: "Akses Ditolak", 
              description: "Username ini tidak terdaftar di sistem Manajemen User."
            })
            setLoading(false)
            return
          }
        }
      } catch (loginError: any) {
        if (
          loginError.code === "auth/user-not-found" || 
          loginError.code === "auth/invalid-credential" || 
          loginError.code === "auth/invalid-email" || 
          loginError.message === "auth/password-changed-by-admin"
        ) {
          const tempUserRef = ref(database, `system_users/${username}`)
          const tempUserSnap = await get(tempUserRef)

          if (tempUserSnap.exists()) {
            userNodeExists = true
            const preRegisteredData = tempUserSnap.val()
            
            if (preRegisteredData.role === "pending") {
              triggerErrorShake("Menunggu Administrator memberikan akses/role untuk akun ini.")
              toast({ 
                variant: "destructive", 
                title: "Akun Belum Siap", 
                description: "Menunggu Administrator memberikan akses/role untuk akun ini." 
              })
              setLoading(false)
              return
            }

            if (preRegisteredData.status === "inactive") {
              triggerErrorShake("User ini telah dinonaktifkan oleh Administrator.")
              toast({
                variant: "destructive",
                title: "Akun Dinonaktifkan",
                description: "User ini telah dinonaktifkan oleh Administrator."
              })
              setLoading(false)
              return
            }

            if (preRegisteredData.password === password) {
              let currentVersion = preRegisteredData.pwdVersion || 0
              let newUserCred: any = null
              let attempts = 0
              const maxAttempts = 15

              while (!newUserCred && attempts < maxAttempts) {
                attempts++
                const versionSuffix = currentVersion ? `_v${currentVersion}` : ""
                const actualEmail = `${username}${versionSuffix}@umkm.id`
                
                try {
                  newUserCred = await signInWithEmailAndPassword(auth, actualEmail, password)
                } catch (e: any) {
                  if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
                    try {
                      newUserCred = await createUserWithEmailAndPassword(auth, actualEmail, password)
                    } catch (createErr: any) {
                      if (createErr.code === "auth/email-already-in-use") {
                        currentVersion++
                        continue
                      } else {
                        throw createErr
                      }
                    }
                  } else {
                    throw e
                  }
                }
              }

              if (!newUserCred) {
                throw new Error("Gagal mengautentikasi akun. Silakan coba lagi.")
              }

              if (currentVersion !== (preRegisteredData.pwdVersion || 0)) {
                await update(tempUserRef, { pwdVersion: currentVersion })
              }

              user = newUserCred.user
              finalUserRole = preRegisteredData.role || ""

              await update(tempUserRef, {
                uid: user.uid,
                addedAt: new Date().toISOString()
              })

              if (preRegisteredData.role === "admin" || preRegisteredData.role === "superadmin") {
                const roleRef = ref(database, `roles_admin/${user.uid}`)
                await set(roleRef, { admin: true })
              }
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

      let targetUserKey: string | null = null
      if (userNodeExists) {
        targetUserKey = username
      } else if (user?.uid) {
        const uidSnap = await get(ref(database, `system_users/${user.uid}`))
        if (uidSnap.exists()) {
          targetUserKey = user.uid
        }
      }

      await logActivity({
        query: `LOGIN: ${username.toUpperCase()}`,
        results: "Berhasil Masuk",
        device: getDeviceType(navigator.userAgent),
        source: "Web",
        method: "LOGIN",
        userId: username.toUpperCase()
      }, database || undefined)

      const sessionId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36)
      localStorage.setItem("simpu_session_id", sessionId)

      // Handle remember me preference
      try {
        if (rememberMe) {
          localStorage.setItem("simpu_remembered_username", identifier.trim())
        } else {
          localStorage.removeItem("simpu_remembered_username")
        }
      } catch {
        // ignore
      }
      
      const loginUpdates: Record<string, any> = {
        lastLogin: new Date().toISOString(),
        isOnline: true,
        lastSeen: Date.now()
      }
      if (user?.uid) {
        loginUpdates.uid = user.uid
      }
      if (finalUserRole !== "admin" && email !== "agus@umkm.id") {
        loginUpdates.activeSessionId = sessionId
      }

      if (targetUserKey) {
        await update(ref(database, `system_users/${targetUserKey}`), loginUpdates).catch(console.error)
      }

      // Success animation trigger
      setLoginSuccess(true)
      playSound("success", 0.6)
      toast({ title: "Login Berhasil", description: "Selamat datang kembali di SIMPU." })

      // Smooth delayed redirect so user enjoys the success transition
      setTimeout(() => {
        if (finalUserRole === "petugas_survey" || finalUserRole === "petugas") {
          router.push("/portal-survey")
        } else if (finalUserRole === "petugas_absensi" || finalUserRole === "petugas absensi" || finalUserRole === "absensi") {
          router.push("/daftar-hadir")
        } else if (finalUserRole === "dinas") {
          router.push("/verifikasi-dinas")
        } else if (finalUserRole === "verifikator_dinas") {
          router.push("/verifikasi-dinas-berkas")
        } else if (finalUserRole === "koordinator") {
          router.push("/actor-data")
        } else {
          router.push("/")
        }
      }, 600)
    } catch (error: any) {
      let message = `Kesalahan: ${error.message || String(error)}`
      if (
        error.code === "auth/invalid-credential" || 
        error.message === "auth/wrong-password" || 
        error.code === "auth/email-already-in-use"
      ) {
        message = "Username atau kata sandi tidak sesuai."
      }
      
      triggerErrorShake(message)
      toast({
        variant: "destructive",
        title: "Gagal Masuk",
        description: message,
      })
    } finally {
      if (!loginSuccess) {
        setLoading(false)
      }
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!regName.trim() || !regPass) return
    
    setRegistering(true)
    playSound("click", 0.4)
    const username = regName.toLowerCase().trim().replace(/\s+/g, "_")
    const userRef = ref(database, `system_users/${username}`)

    try {
      const snap = await get(userRef)
      if (snap.exists()) {
        triggerErrorShake("Username tersebut sudah digunakan. Silakan pilih username lain.")
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

      playSound("success", 0.6)
      setIsRegistered(true)
      setRegName("")
      setRegPass("")
    } catch {
      triggerErrorShake("Terjadi kesalahan koneksi saat registrasi akun.")
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
    <div className="min-h-[100dvh] w-full relative flex flex-col justify-between overflow-x-hidden font-sans bg-[#042111] text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* =========================================================================
          BACKGROUND GRAPHIC & GLOWING AMBIENT LAYER (Flutter-Style Mesh Blobs)
          ========================================================================= */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {/* Authentic Background Graphic from App Assets */}
        <img 
          src="/bg-simpu-clean.png" 
          alt="Background SIMPU" 
          className="w-full h-full object-cover object-left md:object-center opacity-30 mix-blend-luminosity filter blur-[0.5px]"
          loading="eager"
        />

        {/* Ambient Moving Gradient Blobs */}
        <div 
          className="absolute -top-32 -left-32 w-96 sm:w-[520px] h-96 sm:h-[520px] rounded-full bg-emerald-500/20 blur-[100px] animate-blob-1"
          style={{ willChange: "transform" }}
        />
        <div 
          className="absolute top-1/3 -right-24 w-80 sm:w-[480px] h-80 sm:h-[480px] rounded-full bg-emerald-600/25 blur-[110px] animate-blob-2"
          style={{ willChange: "transform" }}
        />
        <div 
          className="absolute -bottom-36 left-1/3 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-amber-400/15 blur-[120px] animate-blob-3"
          style={{ willChange: "transform" }}
        />

        {/* Subtle Tech Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: "28px 28px"
          }}
        />

        {/* Vignette / Deepening Edge Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#041a0e] via-transparent to-[#041a0e]/70" />
      </div>

      {/* =========================================================================
          MAIN CONTAINER: 2-COLUMN SPLIT (Desktop) / 1-COLUMN (Mobile)
          ========================================================================= */}
      <div className="relative z-10 w-full flex-1 flex flex-col lg:grid lg:grid-cols-12 min-h-[100dvh]">
        
        {/* =======================================================================
            AREA KIRI / VISUAL (Desktop Showcase: Living Animation & Branding)
            ======================================================================= */}
        <section className="hidden lg:flex lg:col-span-7 xl:col-span-7 flex-col justify-center items-center p-8 xl:p-14 relative overflow-hidden select-none">
          {/* Centerpiece: Enriched & Enlarged Hero Animated Logo Emblem */}
          <div className="relative flex flex-col items-center justify-center my-auto">
            {/* Dynamic Orbit & Aura Container */}
            <div className="relative w-[440px] h-[440px] xl:w-[560px] xl:h-[560px] flex items-center justify-center">
              
              {/* Radar Wave Pulse Ring (Expanding Energy Wave) */}
              <div className="absolute inset-4 rounded-full border border-emerald-400/40 animate-radar-ping pointer-events-none" />

              {/* Ambient Glowing Halo Behind Logo */}
              <div className="absolute w-72 h-72 xl:w-96 xl:h-96 rounded-full bg-gradient-to-tr from-emerald-500/30 via-emerald-400/20 to-amber-400/30 blur-2xl animate-aura-pulse pointer-events-none" />

              {/* Outer Dashed Neon Orbit Ring (Spinning Clockwise) */}
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30 border-dashed animate-spin-very-slow pointer-events-none" />
              
              {/* Mid Amber/Gold Ring (Spinning Counter-Clockwise with Satellites) */}
              <div className="absolute inset-10 xl:inset-14 rounded-full border-2 border-amber-400/35 animate-spin-reverse-slow pointer-events-none">
                {/* Glowing Satellite Nodes on Mid Ring */}
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_18px_#fbbf24] border border-white/60" />
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_18px_#34d399] border border-white/60" />
              </div>

              {/* Inner Pulsing Accent Ring */}
              <div className="absolute inset-20 xl:inset-28 rounded-full border border-emerald-300/30 border-dotted animate-spin-very-slow pointer-events-none" />

              {/* Main Floating Shield / Disc with Breathing Animation */}
              <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 xl:w-88 xl:h-88 rounded-full bg-gradient-to-tr from-emerald-950 via-[#0a381f] to-emerald-800 p-2.5 shadow-[0_0_90px_rgba(16,185,129,0.45)] border-2 border-emerald-400/50 flex items-center justify-center animate-hero-float">
                <div className="w-full h-full rounded-full bg-gradient-to-b from-[#0e4828] via-[#082a17] to-[#041a0e] flex items-center justify-center p-5 relative overflow-hidden group">
                  {/* Internal Radiant Gradient Glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/25 via-transparent to-amber-400/15 pointer-events-none" />
                  
                  {/* Central Pure White Logo Container (Enlarged + Gold Ring + Shimmer) */}
                  <div className="w-44 h-44 sm:w-52 sm:h-52 xl:w-64 xl:h-64 rounded-full bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[3.5px] border-amber-400 ring-8 ring-amber-400/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 relative z-10 overflow-hidden">
                    {/* Light Sweep Reflection Sheen */}
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/40 to-transparent animate-logo-shine pointer-events-none" />

                    {/* The SIMPU Logo */}
                    <img 
                      src="/logo.png" 
                      alt="SIMPU Logo" 
                      className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)] relative z-10" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Left: Security indicator */}
          <div className="absolute bottom-6 left-8 right-8 hidden xl:flex items-center justify-between text-[11px] text-slate-400 font-medium border-t border-emerald-800/40 pt-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Koneksi Aman Terenkripsi SSL 256-bit</span>
            </div>
            <span>v0.1.1 Production</span>
          </div>
        </section>

        {/* =======================================================================
            AREA KANAN / LOGIN (Interactive Animated Card & Form)
            ======================================================================= */}
        <section className="flex-1 lg:col-span-5 xl:col-span-5 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-10 relative z-20">
          
          {/* Mobile Top Header (Visible on Mobile & Tablet only) */}
          <div className="lg:hidden w-full max-w-[420px] flex flex-col items-center text-center mb-6 pt-4 animate-entrance-scale">
            <div className="w-16 h-16 rounded-full bg-white p-2.5 shadow-2xl border-2 border-amber-400 flex items-center justify-center shrink-0 mb-3 hover:scale-105 transition-transform duration-300">
              <img 
                src="/logo.png" 
                alt="Logo SIMPU" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-black tracking-wider leading-none uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              SIMPU
            </h1>
            <p className="text-[11px] font-bold text-amber-300 tracking-wider uppercase mt-1 drop-shadow">
              Sistem Informasi Manajemen Pelaku Usaha
            </p>
          </div>

          {/* MAIN LOGIN CARD CONTAINER (Glassmorphism + Responsive Shadow + Shake on Error) */}
          <div 
            className={`w-full max-w-[420px] sm:max-w-[440px] login-glass-card rounded-3xl p-6 sm:p-9 border border-white/60 dark:border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-300 ${
              hasError ? "animate-shake" : "animate-entrance-up"
            }`}
          >
            {/* Top Glowing Ambient Border Ribbon */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-green-600" />

            {/* View 1: Pendaftaran Berhasil */}
            {isRegistered ? (
              <div className="text-center py-6 space-y-5 animate-entrance-scale">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-inner ring-8 ring-emerald-50 dark:ring-emerald-900/30 animate-success-ripple">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                    Pendaftaran Berhasil
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    Akun Anda telah tersimpan dengan status <span className="font-bold text-amber-600 dark:text-amber-400">Menunggu (Pending)</span>. Silakan hubungi Administrator untuk pemberian izin role akses sebelum dapat login.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playSound("click", 0.4)
                    setIsRegistered(false)
                    setIsRegisteringView(false)
                  }}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Halaman Login</span>
                </button>
              </div>
            ) : isRegisteringView ? (
              /* View 2: Registration Form (Daftar Akun Petugas) */
              <form onSubmit={handleRegister} className="space-y-4 animate-entrance-scale">
                <div className="text-left mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold mb-2">
                    <UserPlus className="w-3.5 h-3.5" />
                    Registrasi Petugas Baru
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Daftar Akun Petugas
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Silakan isi nama/username dan kata sandi untuk pengajuan akses petugas.
                  </p>
                </div>

                {/* Error Banner if registration fails */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span className="flex-1 font-medium">{errorMessage}</span>
                  </div>
                )}

                {/* Input Username Baru */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <span>Username Baru</span>
                    <span className="text-emerald-600 dark:text-emerald-400">*</span>
                  </label>
                  <div className={`login-input-wrapper flex items-center h-12 px-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border ${
                    focusedField === "regName" 
                      ? "border-emerald-600 ring-4 ring-emerald-500/15 bg-white dark:bg-slate-800" 
                      : "border-slate-200 dark:border-slate-700"
                  }`}>
                    <User className={`w-4 h-4 transition-colors ${
                      focusedField === "regName" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                    }`} />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      onFocus={() => setFocusedField("regName")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="contoh: budi_survey"
                      required
                      className="w-full bg-transparent border-none px-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Input Kata Sandi Baru */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <span>Kata Sandi Baru</span>
                    <span className="text-emerald-600 dark:text-emerald-400">*</span>
                  </label>
                  <div className={`login-input-wrapper flex items-center h-12 px-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border ${
                    focusedField === "regPass" 
                      ? "border-emerald-600 ring-4 ring-emerald-500/15 bg-white dark:bg-slate-800" 
                      : "border-slate-200 dark:border-slate-700"
                  }`}>
                    <Lock className={`w-4 h-4 transition-colors ${
                      focusedField === "regPass" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                    }`} />
                    <input
                      type="password"
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      onFocus={() => setFocusedField("regPass")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Minimal 6 karakter"
                      required
                      className="w-full bg-transparent border-none px-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {registering ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Mendaftarkan Akun...</span>
                      </>
                    ) : (
                      <>
                        <span>Ajukan Pendaftaran</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSound("click", 0.4)
                      setIsRegisteringView(false)
                      setErrorMessage(null)
                    }}
                    className="w-full py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                  >
                    Batal & Kembali ke Login
                  </button>
                </div>
              </form>
            ) : (
              /* View 3: Standard Interactive Login Form */
              <form onSubmit={handleAuth} className="space-y-4">
                
                {/* Form Header */}
                <div className="text-left mb-1 animate-entrance-up delay-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Portal Masuk Petugas
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Selamat Datang
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Silakan masukkan akun Anda untuk mengakses sistem SIMPU.
                  </p>
                </div>

                {/* Error Banner on incorrect credentials */}
                {errorMessage && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold block">Autentikasi Gagal</span>
                      <span className="font-medium">{errorMessage}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setErrorMessage(null)}
                      className="text-rose-500 hover:text-rose-700 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Field 1: Username / ID Input (With Interactive Focus & Glowing Ring) */}
                <div className="space-y-1 animate-entrance-up delay-100">
                  <label 
                    htmlFor="identifier"
                    className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1">
                      <span>Username / ID</span>
                      <span className="text-emerald-600 dark:text-emerald-400">*</span>
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      Contoh: agus, dewi_survey
                    </span>
                  </label>
                  <div className={`login-input-wrapper flex items-center h-12 px-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border transition-all duration-200 ${
                    focusedField === "identifier" 
                      ? "border-emerald-600 ring-4 ring-emerald-500/20 bg-white dark:bg-slate-800 shadow-sm" 
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}>
                    <User className={`w-4 h-4 transition-colors duration-200 shrink-0 ${
                      focusedField === "identifier" ? "text-emerald-600 dark:text-emerald-400 scale-110" : "text-slate-400"
                    }`} />
                    <input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onFocus={() => setFocusedField("identifier")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Masukkan username Anda"
                      autoComplete="username"
                      required
                      disabled={loading || loginSuccess}
                      className="w-full bg-transparent border-none px-3 text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
                    />
                    {identifier && !loading && (
                      <button
                        type="button"
                        onClick={() => {
                          setIdentifier("")
                          playSound("click", 0.2)
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full transition-colors"
                        title="Hapus username"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Field 2: Password Input (With Animated Spinning Eye Icon) */}
                <div className="space-y-1 animate-entrance-up delay-150">
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor="password"
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                    >
                      <span>Kata Sandi</span>
                      <span className="text-emerald-600 dark:text-emerald-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(true)}
                      className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline transition-colors cursor-pointer"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                  <div className={`login-input-wrapper flex items-center h-12 px-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border transition-all duration-200 ${
                    focusedField === "password" 
                      ? "border-emerald-600 ring-4 ring-emerald-500/20 bg-white dark:bg-slate-800 shadow-sm" 
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}>
                    <Lock className={`w-4 h-4 transition-colors duration-200 shrink-0 ${
                      focusedField === "password" ? "text-emerald-600 dark:text-emerald-400 scale-110" : "text-slate-400"
                    }`} />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      disabled={loading || loginSuccess}
                      className="w-full bg-transparent border-none px-3 text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
                    />
                    {/* Spinning Eye Toggle Button (Video Reference) */}
                    <button
                      type="button"
                      onClick={handleTogglePassword}
                      tabIndex={-1}
                      className={`text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1.5 rounded-full transition-colors cursor-pointer ${
                        isEyeSpinning ? "animate-eye-spin" : ""
                      }`}
                      title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1 animate-entrance-up delay-200">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => {
                        setRememberMe(e.target.checked)
                        playSound("click", 0.2)
                      }}
                      className="w-4 h-4 rounded text-emerald-600 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Ingat username saya
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                    Perangkat Aman
                  </span>
                </div>

                {/* Morphing Login Button (Idle -> Loading Spinner -> Success Checkmark) */}
                <div className="pt-2 animate-entrance-up delay-250">
                  <button
                    type="submit"
                    disabled={loading || loginSuccess || !identifier.trim() || !password}
                    className={`w-full h-12 rounded-2xl font-bold text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden cursor-pointer ${
                      loginSuccess
                        ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 scale-[1.01]"
                        : "bg-gradient-to-r from-emerald-600 via-emerald-700 to-green-700 hover:from-emerald-700 hover:to-green-800 active:scale-[0.98] text-white shadow-lg shadow-emerald-950/25 disabled:opacity-60 disabled:cursor-not-allowed"
                    }`}
                  >
                    {/* Shimmer light sweep animation */}
                    {!loading && !loginSuccess && (
                      <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-btn-shimmer pointer-events-none" />
                    )}

                    {loginSuccess ? (
                      <span className="inline-flex items-center gap-2 animate-entrance-scale">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Berhasil Masuk!</span>
                      </span>
                    ) : loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Memverifikasi Kredensial...</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 group">
                        <span>Masuk ke Sistem</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </button>
                </div>

                {/* Secondary Links & Divider */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-entrance-up delay-300">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click", 0.3)
                        router.push("/pendaftaran")
                      }}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-700/80 text-emerald-700 dark:text-emerald-400 transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">Daftar Pelaku Usaha</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSound("click", 0.3)
                        router.push("/cek-data")
                      }}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200/80 dark:border-slate-700/80 text-amber-700 dark:text-amber-400 transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <SearchCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate">Cek Data Publik</span>
                    </button>
                  </div>

                  {/* Staff Registration Link */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click", 0.3)
                        setIsRegisteringView(true)
                        setErrorMessage(null)
                      }}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
                    >
                      <span>Belum punya akun petugas?</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 underline decoration-emerald-500/50 hover:decoration-emerald-500">
                        Daftar di sini
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Footer Copyright on Bottom of Login */}
          <div className="mt-6 text-center select-none animate-entrance-up delay-350">
            <p className="text-xs text-slate-300/80 font-medium drop-shadow">
              © {new Date().getFullYear()} SIMPU Kota Tanjungpinang. All rights reserved.
            </p>
          </div>
        </section>
      </div>

      {/* =========================================================================
          MODAL: BANTUAN LUPA KATA SANDI (Official Helpdesk Contact)
          ========================================================================= */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-entrance-scale">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Pemulihan Kata Sandi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
              <p>
                Untuk menjaga keamanan dan integritas data UMKM, pemulihan akun petugas dilakukan secara terverifikasi melalui Administrator Resmi:
              </p>
              
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Dinas Tenaga Kerja, Koperasi & Usaha Mikro
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Kota Tanjungpinang • Bidang Pemberdayaan UMKM
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-1">
                  <PhoneCall className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Helpdesk Administrator SIMPU
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Silakan hubungi Superadmin / Koordinator Lapangan Anda untuk reset password.
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                * Pastikan Anda menyebutkan nama lengkap dan NIK resmi yang terdaftar saat mengajukan permohonan reset password.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs transition-colors"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
