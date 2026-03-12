"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Building2, Lock, Mail, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Logika: Jika user hanya memasukkan username tanpa @, tambahkan domain default
    const email = identifier.includes("@") ? identifier : `${identifier}@umkm.id`

    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({
        title: "Login Berhasil",
        description: "Selamat datang kembali di UMKM Database.",
      })
      router.push("/")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: "Username/Email atau kata sandi salah. Silakan coba lagi.",
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
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-5 py-6">
            <div className="grid gap-2">
              <Label htmlFor="identifier" className="font-bold text-slate-700">Username / Email</Label>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" title="Kata sandi anda" className="font-bold text-slate-700">Kata Sandi</Label>
              </div>
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
          <CardFooter className="pb-10">
            <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-md font-bold shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                "Masuk ke Sistem"
              )}
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