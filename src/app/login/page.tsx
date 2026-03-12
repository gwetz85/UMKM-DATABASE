
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useFirestore } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore"
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

    const username = identifier.toLowerCase().trim()
    const email = identifier.includes("@") ? identifier : `${username}@umkm.id`

    try {
      let user;

      // 1. Cek apakah ini login normal (Akun sudah ada di Auth)
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        user = userCredential.user
        toast({ title: "Login Berhasil", description: "Selamat datang kembali." })
      } catch (loginError: any) {
        // 2. Jika Gagal (User belum ada di Auth), Cek antrean pendaftaran dari Admin
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
          const tempUserRef = doc(firestore, 'system_users', username)
          const tempUserSnap = await getDoc(tempUserRef)

          if (tempUserSnap.exists()) {
            const preRegisteredData = tempUserSnap.data()
            
            // Validasi kata sandi yang dibuat Admin
            if (preRegisteredData.password === password) {
              // PROSES PROVISIONING OTOMATIS
              // Buat akun Firebase Auth resmi
              const newUserCred = await createUserWithEmailAndPassword(auth, email, password)
              user = newUserCred.user

              // Pindahkan data ke profil permanen (berbasis UID)
              const realUserRef = doc(firestore, 'system_users', user.uid)
              await setDoc(realUserRef, {
                uid: user.uid,
                fullName: preRegisteredData.fullName,
                role: preRegisteredData.role,
                addedAt: new Date().toISOString()
              })

              // Handle Admin Role jika perlu
              if (preRegisteredData.role === 'admin') {
                const roleRef = doc(firestore, 'roles_admin', user.uid)
                await setDoc(roleRef, { admin: true })
              }

              // Hapus data antrean sementara
              await deleteDoc(tempUserRef)

              toast({ 
                title: "Akses Diberikan", 
                description: `UID Anda (${user.uid}) telah berhasil didaftarkan otomatis.` 
              })
            } else {
              throw new Error("auth/wrong-password")
            }
          } else {
            // Jika tidak ada di antrean admin, coba registrasi normal jika isRegister aktif
            if (isRegister) {
              const userCredential = await createUserWithEmailAndPassword(auth, email, password)
              user = userCredential.user
              
              // Default role untuk registrasi mandiri adalah petugas
              const userRef = doc(firestore, 'system_users', user.uid)
              await setDoc(userRef, {
                uid: user.uid,
                fullName: identifier,
                role: 'petugas',
                addedAt: new Date().toISOString()
              })
              toast({ title: "Registrasi Berhasil", description: "Selamat datang!" })
            } else {
              throw loginError
            }
          }
        } else {
          throw loginError
        }
      }

      router.push("/")
    } catch (error: any) {
      let message = "Terjadi kesalahan. Silakan coba lagi."
      if (error.code === 'auth/email-already-in-use') message = "Username sudah digunakan."
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
            Sistem Manajemen Terpadu Pelaku Usaha
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
                  placeholder="Masukkan Nama Anda"
                  className="pl-10 h-11 border-slate-200"
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
                  className="pl-10 h-11 border-slate-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-10">
            <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-md font-bold shadow-lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <><LogIn className="w-5 h-5 mr-2" /> Masuk ke Sistem</>
              )}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="text-xs text-muted-foreground"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Sudah punya akun? Masuk" : "Belum terdaftar? Hubungi Admin atau Daftar Baru"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
