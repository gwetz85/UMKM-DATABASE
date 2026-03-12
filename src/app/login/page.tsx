
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useFirestore, setDocumentNonBlocking } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Building2, Lock, Mail, Loader2, UserPlus, LogIn } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Normalisasi input: 'agus' menjadi 'agus@umkm.id'
    const email = identifier.includes("@") ? identifier : `${identifier.toLowerCase().trim()}@umkm.id`
    const isAgus = identifier.toLowerCase().trim() === 'agus' || email.toLowerCase().trim() === 'agus@umkm.id'

    try {
      let user;
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        user = userCredential.user
        toast({ title: "Akun Berhasil Dibuat", description: `Selamat datang ${identifier}!` })
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        user = userCredential.user
        toast({ title: "Login Berhasil", description: "Selamat datang kembali." })
      }

      // SINKRONISASI LOGIKA ADMIN
      const userRef = doc(firestore, 'system_users', user.uid)
      const isAdmin = isAgus
      
      setDocumentNonBlocking(userRef, {
        uid: user.uid,
        fullName: identifier.charAt(0).toUpperCase() + identifier.slice(1),
        role: isAdmin ? 'admin' : 'petugas',
        addedAt: new Date().toISOString()
      }, { merge: true })

      if (isAdmin) {
        const roleRef = doc(firestore, 'roles_admin', user.uid)
        // Set eksplisit agar terdeteksi isAdmin
        setDocumentNonBlocking(roleRef, { admin: true }, { merge: true })
      }

      router.push("/")
    } catch (error: any) {
      let message = "Terjadi kesalahan. Silakan coba lagi."
      if (error.code === 'auth/email-already-in-use') message = "Username sudah digunakan."
      if (error.code === 'auth/invalid-credential') message = "Username atau kata sandi salah."
      
      toast({
        variant: "destructive",
        title: "Gagal",
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden">
        <div className="h-2 bg-primary w-full" />
        <CardHeader className="space-y-1 text-center pt-8">
          <div className="flex justify-center mb-6">
            <div className="bg-primary p-4 rounded-2xl shadow-xl shadow-primary/20 rotate-3 hover:rotate-0 transition-transform duration-300">
              <Building2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter text-primary">UMKM DATABASE</CardTitle>
          <CardDescription className="font-medium text-muted-foreground">
            {isRegister ? "Pendaftaran Akun Baru" : "Sistem Manajemen Terpadu Pelaku Usaha"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="grid gap-5 py-6">
            <div className="grid gap-2">
              <Label htmlFor="identifier" className="font-bold text-slate-700">Username</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Contoh: agus"
                  className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary/20"
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
                  className="pl-10 h-11 border-slate-200 focus:border-primary focus:ring-primary/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-10">
            <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-md font-bold shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                isRegister ? (
                  <><UserPlus className="w-5 h-5 mr-2" /> Daftar Akun</>
                ) : (
                  <><LogIn className="w-5 h-5 mr-2" /> Masuk ke Sistem</>
                )
              )}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="text-xs text-muted-foreground"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar di sini"}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <div className="fixed bottom-6 text-center w-full text-xs text-muted-foreground font-medium uppercase tracking-widest">
        &copy; {new Date().getFullYear()} UMKM Database • Versi 2.0
      </div>
    </div>
  )
}
