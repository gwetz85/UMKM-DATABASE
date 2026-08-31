"use client"

import { useState, useEffect } from "react"
import { useAuth, useDatabase, useUser, useObject, useMemoFirebase } from "@/firebase"
import { ref, get, set, update, remove } from "firebase/database"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Images, Trash2, Plus, Loader2, Info } from "lucide-react"

export default function SettingsSlideshowPage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const router = useRouter()
  const { toast } = useToast()

  const [slides, setSlides] = useState<{ id: string, base64: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Verify Admin Access
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login')
  }, [user, isUserLoading, router])

  useEffect(() => {
    if (database) {
      const slidesRef = ref(database, 'settings/login_slideshow')
      get(slidesRef).then(snap => {
        if (snap.exists()) {
          const data = snap.val()
          // Convert object to array sorted by keys if it's an object
          if (Array.isArray(data)) {
             setSlides(data.filter(Boolean))
          } else {
             const arr = Object.values(data)
             setSlides(arr as any)
          }
        }
        setIsLoading(false)
      })
    }
  }, [database])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (slides.length >= 6) {
      toast({ variant: "destructive", title: "Batas Maksimal", description: "Maksimal 6 gambar slideshow yang diperbolehkan." })
      return
    }

    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Format Tidak Valid", description: "Hanya menerima file gambar (JPG/PNG)." })
      return
    }

    setIsSaving(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // Resize to max 1280px width/height for lightweight background
        const MAX_DIM = 1280
        if (width > height && width > MAX_DIM) {
          height *= MAX_DIM / width
          width = MAX_DIM
        } else if (height > MAX_DIM) {
          width *= MAX_DIM / height
          height = MAX_DIM
        }
        
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        // Compress to 65% quality JPEG
        const base64Str = canvas.toDataURL('image/jpeg', 0.65)
        
        const newSlide = {
          id: Date.now().toString(),
          base64: base64Str
        }

        const newSlides = [...slides, newSlide]
        setSlides(newSlides)
        saveToDatabase(newSlides)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleDelete = (idToRemove: string) => {
    const newSlides = slides.filter(s => s.id !== idToRemove)
    setSlides(newSlides)
    saveToDatabase(newSlides)
  }

  const saveToDatabase = async (updatedSlides: any[]) => {
    if (!database) return
    try {
      await set(ref(database, 'settings/login_slideshow'), updatedSlides)
      toast({ title: "Berhasil", description: "Slideshow telah diperbarui." })
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menyimpan pengaturan." })
    } finally {
      setIsSaving(false)
    }
  }

  if (isUserLoading || isAdminLoading || isLoading) {
    return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
  }

  if (!adminRole && user?.email !== 'agus@umkm.id') {
    return <div className="p-20 text-center font-black text-2xl text-red-500">Akses Ditolak. Khusus Administrator.</div>
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <h1 className="text-3xl font-black text-primary font-headline uppercase">Pengaturan Slideshow</h1>
        </div>
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
          Kelola Gambar Background Halaman Login
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 text-blue-800">
        <Info className="w-6 h-6 shrink-0 text-blue-600" />
        <div className="space-y-1">
          <p className="font-bold text-sm">Informasi Penting</p>
          <p className="text-xs leading-relaxed">
            Gambar yang Anda unggah di sini akan ditampilkan sebagai latar belakang bergulir (slideshow) pada halaman Login. Maksimal 6 gambar diperbolehkan. Sistem akan otomatis memotong dan mengompres ukuran gambar agar database tetap ringan dan gratis.
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-black uppercase text-slate-800">Koleksi Gambar</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">({slides.length} dari maksimal 6)</p>
          </div>
          
          <div className="relative">
            <Input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              onChange={handleImageUpload}
              disabled={isSaving || slides.length >= 6}
            />
            <Button 
              type="button" 
              disabled={isSaving || slides.length >= 6}
              className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest relative z-0"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Unggah Gambar Baru
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
          {slides.map((slide, idx) => (
            <div key={slide.id} className="group relative rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm hover:border-primary/50 transition-colors aspect-[4/3] bg-slate-50">
              <img 
                src={slide.base64} 
                alt={`Slide ${idx + 1}`} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                <div className="bg-black/50 w-fit px-3 py-1 rounded-full text-[10px] font-black text-white tracking-widest">
                  GAMBAR {idx + 1}
                </div>
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm"
                  className="w-full font-bold uppercase"
                  onClick={() => handleDelete(slide.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Hapus
                </Button>
              </div>
            </div>
          ))}

          {slides.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 gap-3 border-2 border-dashed border-slate-200 rounded-3xl">
              <Images className="w-12 h-12" />
              <p className="text-sm font-bold uppercase tracking-widest text-center">Belum ada gambar slideshow.<br/>Gunakan background bawaan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
