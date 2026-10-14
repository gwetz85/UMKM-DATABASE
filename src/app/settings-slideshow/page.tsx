"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth, useDatabase, useStorage, useUser, useObject, useMemoFirebase } from "@/firebase"
import { ref, get, set, update, remove } from "firebase/database"
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { 
  Images, 
  Trash2, 
  Plus, 
  Loader2, 
  Info, 
  Video, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Link as LinkIcon,
  Sparkles,
  ShieldAlert
} from "lucide-react"

interface VideoConfig {
  url: string;
  name?: string;
  duration?: number;
  size?: number;
  updatedAt?: number;
  active?: boolean;
  storagePath?: string;
}

export default function SettingsSlideshowPage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const storage = useStorage()
  const router = useRouter()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<"slideshow" | "video">("video")
  const [backgroundMode, setBackgroundMode] = useState<"slideshow" | "video">("slideshow")
  
  // Slideshow States
  const [slides, setSlides] = useState<{ id: string, base64: string }[]>([])
  
  // Video States
  const [videoConfig, setVideoConfig] = useState<VideoConfig | null>(null)
  const [videoUrlInput, setVideoUrlInput] = useState("")
  const [isVerifyingUrl, setIsVerifyingUrl] = useState(false)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Verify Admin Access
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login')
  }, [user, isUserLoading, router])

  // Fetch initial data
  useEffect(() => {
    if (!database) return

    const fetchData = async () => {
      try {
        // 1. Fetch Slideshow
        const slidesRef = ref(database, 'settings/login_slideshow')
        const snapSlides = await get(slidesRef)
        if (snapSlides.exists()) {
          const data = snapSlides.val()
          if (Array.isArray(data)) {
            setSlides(data.filter(Boolean))
          } else {
            setSlides(Object.values(data) as any)
          }
        }

        // 2. Fetch Background Mode & Video
        const bgRef = ref(database, 'settings/login_background')
        const snapBg = await get(bgRef)
        if (snapBg.exists()) {
          const bgData = snapBg.val()
          if (bgData.mode) {
            setBackgroundMode(bgData.mode)
            setActiveTab(bgData.mode)
          }
          if (bgData.video) {
            setVideoConfig(bgData.video)
            setVideoPreviewUrl(bgData.video.url)
          }
        }

        // 3. Fallback / direct video node check
        const videoNodeRef = ref(database, 'settings/login_video')
        const snapVid = await get(videoNodeRef)
        if (snapVid.exists()) {
          const vidData = snapVid.val()
          if (vidData.url) {
            setVideoConfig(prev => prev || vidData)
            setVideoPreviewUrl(prev => prev || vidData.url)
          }
          if (vidData.active !== undefined) {
            const mode = vidData.active ? 'video' : 'slideshow'
            setBackgroundMode(mode)
            setActiveTab(mode)
          }
        }
      } catch (err) {
        console.error("Error loading slideshow/video settings:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [database])

  // Handler: Set Background Mode
  const handleSetMode = async (mode: "slideshow" | "video") => {
    if (!database) return
    setIsSaving(true)
    try {
      await update(ref(database, 'settings/login_background'), {
        mode,
        updatedAt: Date.now()
      })
      await update(ref(database, 'settings/login_video'), {
        active: mode === "video",
        updatedAt: Date.now()
      })
      setBackgroundMode(mode)
      toast({
        title: "Mode Latar Belakang Diperbarui",
        description: `Halaman login sekarang menggunakan mode: ${mode === "video" ? "Video Pendek" : "Slideshow Gambar"}`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal Mengubah Mode",
        description: "Terjadi kesalahan saat menyimpan pengaturan."
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handler: Upload Slideshow Image
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
        
        const base64Str = canvas.toDataURL('image/jpeg', 0.65)
        
        const newSlide = {
          id: Date.now().toString(),
          base64: base64Str
        }

        const newSlides = [...slides, newSlide]
        setSlides(newSlides)
        saveSlidesToDatabase(newSlides)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteSlide = (idToRemove: string) => {
    const newSlides = slides.filter(s => s.id !== idToRemove)
    setSlides(newSlides)
    saveSlidesToDatabase(newSlides)
  }

  const saveSlidesToDatabase = async (updatedSlides: any[]) => {
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

  // Handler: Upload Video with 10s Validation
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Format check
    if (!file.type.includes("video/mp4") && !file.type.includes("video/webm")) {
      toast({
        variant: "destructive",
        title: "Format Tidak Didukung",
        description: "Hanya mendukung berkas video berekstensi MP4 atau WebM."
      })
      if (videoInputRef.current) videoInputRef.current.value = ""
      return
    }

    // 2. Size check (max 15MB)
    const MAX_SIZE_MB = 15
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Ukuran File Terlalu Besar",
        description: `Ukuran file ${(file.size / (1024 * 1024)).toFixed(1)} MB melebihi batas maksimal ${MAX_SIZE_MB} MB.`
      })
      if (videoInputRef.current) videoInputRef.current.value = ""
      return
    }

    setIsUploadingVideo(true)

    // 3. Duration check via HTML5 Video metadata
    const objectUrl = URL.createObjectURL(file)
    const tempVideo = document.createElement("video")
    tempVideo.preload = "metadata"
    tempVideo.src = objectUrl

    tempVideo.onloadedmetadata = async () => {
      const duration = tempVideo.duration
      URL.revokeObjectURL(objectUrl)

      // Allow slight threshold e.g. 10.6s
      if (duration > 10.6) {
        setIsUploadingVideo(false)
        if (videoInputRef.current) videoInputRef.current.value = ""
        toast({
          variant: "destructive",
          title: "Durasi Melebihi 10 Detik!",
          description: `Durasi video ini ${duration.toFixed(1)} detik. Maksimal durasi video adalah 10 detik.`
        })
        return
      }

      // Valid duration! Proceed to upload
      try {
        let finalVideoUrl = ""
        let storagePath = ""

        // Try Firebase Storage first
        if (storage) {
          try {
            const fileName = `login_video_${Date.now()}.${file.name.split('.').pop() || 'mp4'}`
            const fileRef = storageRef(storage, `login_media/${fileName}`)
            await uploadBytes(fileRef, file)
            finalVideoUrl = await getDownloadURL(fileRef)
            storagePath = `login_media/${fileName}`
          } catch (storageError) {
            console.warn("Storage upload failed, attempting fallback to base64:", storageError)
          }
        }

        // Fallback to base64 if storage not available and size <= 8MB
        if (!finalVideoUrl) {
          if (file.size > 8 * 1024 * 1024) {
            throw new Error("Penyimpanan cloud gagal dan berkas terlalu besar untuk disimpan langsung. Harap gunakan video di bawah 8MB atau masukkan URL video.")
          }
          finalVideoUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        }

        const newVideoConfig: VideoConfig = {
          url: finalVideoUrl,
          name: file.name,
          duration: Number(duration.toFixed(1)),
          size: file.size,
          updatedAt: Date.now(),
          active: true,
          storagePath
        }

        // Save to Database
        if (database) {
          await update(ref(database, 'settings/login_background'), {
            mode: 'video',
            video: newVideoConfig,
            updatedAt: Date.now()
          })
          await set(ref(database, 'settings/login_video'), newVideoConfig)
        }

        setVideoConfig(newVideoConfig)
        setVideoPreviewUrl(finalVideoUrl)
        setBackgroundMode("video")

        toast({
          title: "Video Berhasil Diunggah!",
          description: `Video durasi ${duration.toFixed(1)} detik telah aktif sebagai latar belakang halaman login.`
        })
      } catch (err: any) {
        console.error("Error uploading video:", err)
        toast({
          variant: "destructive",
          title: "Gagal Mengunggah Video",
          description: err.message || "Terjadi kesalahan saat mengunggah video."
        })
      } finally {
        setIsUploadingVideo(false)
        if (videoInputRef.current) videoInputRef.current.value = ""
      }
    }

    tempVideo.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setIsUploadingVideo(false)
      if (videoInputRef.current) videoInputRef.current.value = ""
      toast({
        variant: "destructive",
        title: "Gagal Membaca Video",
        description: "Berkas video rusak atau format codec tidak didukung oleh browser."
      })
    }
  }

  // Handler: Save Video from direct URL
  const handleSaveVideoUrl = async () => {
    const rawUrl = videoUrlInput.trim()
    if (!rawUrl) {
      toast({ variant: "destructive", title: "URL Kosong", description: "Silakan masukkan link video yang valid." })
      return
    }

    setIsVerifyingUrl(true)
    const tempVideo = document.createElement("video")
    tempVideo.preload = "metadata"
    tempVideo.src = rawUrl

    tempVideo.onloadedmetadata = async () => {
      const duration = tempVideo.duration
      if (duration > 10.6) {
        setIsVerifyingUrl(false)
        toast({
          variant: "destructive",
          title: "Durasi Melebihi 10 Detik!",
          description: `Durasi video ini ${duration.toFixed(1)} detik. Maksimal durasi adalah 10 detik.`
        })
        return
      }

      try {
        const newVideoConfig: VideoConfig = {
          url: rawUrl,
          name: "Video URL",
          duration: Number(duration.toFixed(1)),
          updatedAt: Date.now(),
          active: true
        }

        if (database) {
          await update(ref(database, 'settings/login_background'), {
            mode: 'video',
            video: newVideoConfig,
            updatedAt: Date.now()
          })
          await set(ref(database, 'settings/login_video'), newVideoConfig)
        }

        setVideoConfig(newVideoConfig)
        setVideoPreviewUrl(rawUrl)
        setBackgroundMode("video")
        setVideoUrlInput("")

        toast({
          title: "URL Video Berhasil Disimpan",
          description: `Video durasi ${duration.toFixed(1)} detik telah diaktifkan di halaman login.`
        })
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Gagal Menyimpan URL",
          description: err.message || "Terjadi kesalahan saat menyimpan pengaturan."
        })
      } finally {
        setIsVerifyingUrl(false)
      }
    }

    tempVideo.onerror = () => {
      setIsVerifyingUrl(false)
      toast({
        variant: "destructive",
        title: "URL Video Tidak Dapat Diputar",
        description: "Pastikan URL mengarah langsung ke file video (.mp4/.webm) yang dapat diakses secara publik."
      })
    }
  }

  // Handler: Delete Video
  const handleDeleteVideo = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus video background ini?")) return

    setIsSaving(true)
    try {
      if (videoConfig?.storagePath && storage) {
        try {
          await deleteObject(storageRef(storage, videoConfig.storagePath))
        } catch (e) {
          console.warn("Storage deletion error (ignored):", e)
        }
      }

      if (database) {
        await remove(ref(database, 'settings/login_video'))
        await update(ref(database, 'settings/login_background'), {
          mode: 'slideshow',
          video: null,
          updatedAt: Date.now()
        })
      }

      setVideoConfig(null)
      setVideoPreviewUrl(null)
      setBackgroundMode("slideshow")
      setActiveTab("slideshow")

      toast({
        title: "Video Dihapus",
        description: "Latar belakang telah dikembalikan ke mode Slideshow Gambar."
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Video",
        description: "Terjadi kesalahan saat menghapus video."
      })
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
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <h1 className="text-2xl md:text-3xl font-black text-primary font-headline uppercase tracking-tight">
            Pengaturan Media Login
          </h1>
        </div>
        <p className="text-muted-foreground text-xs md:text-sm font-bold uppercase tracking-wider">
          Kelola Video Pendek (10s) & Slideshow Gambar Latar Belakang Login
        </p>
      </div>

      {/* Status Bar / Active Mode Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/30 rounded-3xl p-5 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
              Latar Belakang Login Saat Ini:
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl md:text-2xl font-black uppercase text-white tracking-wide">
              {backgroundMode === "video" && videoConfig?.url 
                ? "Video Pendek (Looping 10s)" 
                : "Slideshow Gambar"}
            </span>
            <Badge className={`${backgroundMode === "video" && videoConfig?.url ? "bg-emerald-500 text-slate-950" : "bg-blue-600 text-white"} font-black text-[11px] uppercase tracking-wider px-3 py-0.5`}>
              AKTIF
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {backgroundMode === "video" && videoConfig?.url ? (
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => handleSetMode("slideshow")}
              className="w-full sm:w-auto border-emerald-500/40 hover:bg-emerald-500/20 text-white text-xs font-bold uppercase tracking-wider"
            >
              <Images className="w-4 h-4 mr-1.5 text-blue-400" />
              Ganti Ke Slideshow Gambar
            </Button>
          ) : (
            videoConfig?.url && (
              <Button
                type="button"
                disabled={isSaving}
                onClick={() => handleSetMode("video")}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider"
              >
                <Video className="w-4 h-4 mr-1.5" />
                Aktifkan Video Background
              </Button>
            )
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl h-auto border border-slate-200">
          <TabsTrigger 
            value="video" 
            className="py-3 font-black text-xs md:text-sm uppercase tracking-wider rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2"
          >
            <Video className="w-4 h-4" />
            Video Pendek (10s)
            {backgroundMode === "video" && videoConfig?.url && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="slideshow" 
            className="py-3 font-black text-xs md:text-sm uppercase tracking-wider rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center justify-center gap-2"
          >
            <Images className="w-4 h-4" />
            Slideshow Gambar ({slides.length})
            {backgroundMode === "slideshow" && (
              <span className="w-2 h-2 rounded-full bg-blue-500 ml-1 animate-pulse" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: VIDEO PENDEK ===================== */}
        <TabsContent value="video" className="space-y-6 focus-visible:outline-none">
          {/* Rules & Requirements Alert */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 md:p-5 flex gap-3 text-emerald-900">
            <Info className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-black text-sm uppercase tracking-wide">Ketentuan Video Pendek Login</p>
              <ul className="text-xs space-y-1 list-disc list-inside leading-relaxed text-emerald-800">
                <li><strong>Durasi Maksimal 10 Detik</strong>: Sistem otomatis memvalidasi durasi dan menolak video yang lebih dari 10 detik.</li>
                <li><strong>Format Berkas</strong>: Mendukung video format <strong>MP4</strong> atau <strong>WebM</strong>.</li>
                <li><strong>Ukuran Berkas</strong>: Disarankan ukuran di bawah <strong>10 MB</strong> (resolusi 720p atau 1080p).</li>
                <li><strong>Pemutaran Otomatis</strong>: Video akan berputar otomatis (looping) secara <em>muted</em> (tanpa suara) agar sesuai standar browser modern dan hemat baterai.</li>
              </ul>
            </div>
          </div>

          {/* Current Video Preview Card */}
          {videoConfig?.url && (
            <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <h2 className="text-base font-black uppercase text-slate-800 flex items-center gap-2">
                    <Video className="w-5 h-5 text-emerald-600" />
                    Video yang Sedang Tersimpan
                  </h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    {videoConfig.name || "video-background.mp4"} • Durasi: {videoConfig.duration || "~10"}s
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {backgroundMode === "video" ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase px-3 py-1">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Sedang Aktif di Login
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 font-bold text-xs uppercase px-3 py-1">
                      Tersimpan (Tidak Aktif)
                    </Badge>
                  )}
                </div>
              </div>

              {/* Video Player */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-[380px] flex items-center justify-center border border-slate-200 shadow-inner">
                <video 
                  key={videoConfig.url}
                  src={videoConfig.url} 
                  controls 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  {backgroundMode !== "video" && (
                    <Button 
                      type="button" 
                      onClick={() => handleSetMode("video")}
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Jadikan Latar Belakang Login
                    </Button>
                  )}
                  {backgroundMode === "video" && (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => handleSetMode("slideshow")}
                      disabled={isSaving}
                      className="text-xs font-bold uppercase tracking-wider"
                    >
                      Nonaktifkan (Pakai Slideshow)
                    </Button>
                  )}
                </div>

                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteVideo}
                  disabled={isSaving}
                  className="font-bold text-xs uppercase tracking-wider"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Hapus Video Ini
                </Button>
              </div>
            </div>
          )}

          {/* Upload / Replace Video Card */}
          <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black uppercase text-slate-800">
                {videoConfig?.url ? "Ganti Berkas Video Baru" : "Unggah Video Pendek (Maks. 10s)"}
              </h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Pilih file MP4/WebM dari perangkat Anda
              </p>
            </div>

            <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 transition-all rounded-3xl p-8 flex flex-col items-center justify-center gap-4 text-center relative group">
              <input 
                ref={videoInputRef}
                type="file" 
                accept="video/mp4,video/webm"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isUploadingVideo || isSaving}
                onChange={handleVideoUpload}
              />
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                {isUploadingVideo ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>
              <div className="space-y-1">
                <p className="font-black text-sm md:text-base text-slate-800 uppercase tracking-wider">
                  {isUploadingVideo ? "Sedang Memvalidasi & Mengunggah Video..." : "Klik atau Tarik Berkas Video ke Sini"}
                </p>
                <p className="text-xs text-slate-500 font-bold">
                  MP4 atau WebM • Durasi maksimal 10 detik • Ukuran maksimal 15 MB
                </p>
              </div>
              <Button 
                type="button"
                disabled={isUploadingVideo || isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest pointer-events-none"
              >
                {isUploadingVideo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Pilih Berkas Video
              </Button>
            </div>

            {/* Alternative: Direct Video URL */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-slate-500" />
                <Label className="text-xs font-black uppercase text-slate-700">
                  Atau Masukkan Tautan / Link Video Langsung (Direct MP4 URL)
                </Label>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com/video-background.mp4"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  disabled={isVerifyingUrl || isSaving}
                  className="text-xs font-mono"
                />
                <Button
                  type="button"
                  onClick={handleSaveVideoUrl}
                  disabled={isVerifyingUrl || !videoUrlInput.trim()}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider shrink-0"
                >
                  {isVerifyingUrl ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  Simpan dari URL
                </Button>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Sistem akan memverifikasi durasi file langsung dari URL tersebut sebelum mengaktifkannya.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ===================== TAB 2: SLIDESHOW GAMBAR ===================== */}
        <TabsContent value="slideshow" className="space-y-6 focus-visible:outline-none">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 text-blue-800">
            <Info className="w-6 h-6 shrink-0 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">Informasi Slideshow Gambar</p>
              <p className="text-xs leading-relaxed">
                Gambar yang Anda unggah di sini akan ditampilkan sebagai latar belakang bergulir (slideshow) pada halaman Login. Maksimal 6 gambar diperbolehkan. Sistem otomatis mengompres gambar agar hemat kuota dan ringan.
              </p>
            </div>
          </div>

          <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-black uppercase text-slate-800">Koleksi Gambar Slideshow</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  ({slides.length} dari maksimal 6)
                  {backgroundMode === "slideshow" && (
                    <span className="text-blue-600 font-black ml-2">• Sedang Aktif di Login</span>
                  )}
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                {backgroundMode !== "slideshow" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSetMode("slideshow")}
                    disabled={isSaving}
                    className="text-xs font-bold uppercase tracking-wider text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    Aktifkan Slideshow Ini
                  </Button>
                )}
                
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
                    className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-xs relative z-0"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Unggah Gambar Baru
                  </Button>
                </div>
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
                      className="w-full font-bold uppercase text-xs"
                      onClick={() => handleDeleteSlide(slide.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Hapus
                    </Button>
                  </div>
                </div>
              ))}

              {slides.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 gap-3 border-2 border-dashed border-slate-200 rounded-3xl">
                  <Images className="w-12 h-12" />
                  <p className="text-sm font-bold uppercase tracking-widest text-center">
                    Belum ada gambar slideshow.<br/>Gunakan background bawaan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
