
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useFirestore } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Building2, Lock, Mail, Loader2, LogIn, MonitorOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const username = identifier.toLowerCase().trim().replace(/\s+/g, '_')
    const email = `${username}@umkm.id`

    try {
      let user;

      // 1. Cek apakah ini login normal (Akun sudah ada di Auth)
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        user = userCredential.user

        // 2. VALIDASI LOCK UID (1 User 1 Perangkat)
        const userRef = doc(firestore, 'system_users', username)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const userData = userSnap.data()
          
          if (!userData.uid) {
            // Jika UID belum terkunci (first login setelah reset), kunci ke UID sekarang
            await updateDoc(userRef, { uid: user.uid })
            toast({ title: "Perangkat Terkunci", description: "Akun Anda sekarang terikat pada perangkat ini." })
          } else if (userData.uid !== user.uid) {
            // Jika UID berbeda, tolak akses
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
        // 3. Jika Akun Auth belum ada, jalankan alur Provisioning dari Admin
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
          const tempUserRef = doc(firestore, 'system_users', username)
          const tempUserSnap = await getDoc(tempUserRef)

          if (tempUserSnap.exists()) {
            const preRegisteredData = tempUserSnap.data()
            
            if (preRegisteredData.password === password) {
              // Create Auth Account
              const newUserCred = await createUserWithEmailAndPassword(auth, email, password)
              user = newUserCred.user

              // Simpan UID pertama kali & tetapkan Role
              await updateDoc(tempUserRef, {
                uid: user.uid,
                addedAt: new Date().toISOString()
              })

              // Handle Admin Role jika perlu
              if (preRegisteredData.role === 'admin') {
                const roleRef = doc(firestore, 'roles_admin', user.uid)
                await setDoc(roleRef, { admin: true })
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
      let message = "Terjadi kesalahan. Silakan coba lagi."
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
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium justify-center">
              <MonitorOff className="w-3 h-3" /> Kebijakan 1 User 1 Perangkat Aktif
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
