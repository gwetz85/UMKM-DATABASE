"use client"

import { useState, useEffect, useRef } from "react"
import { useDatabase, useUser, useObject, useMemoFirebase } from "@/firebase"
import { ref, get, set, update, remove } from "firebase/database"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  Play, 
  Link as LinkIcon,
  Sparkles
} from "lucide-react"

interface VideoMeta {
  url?: string;
  totalChunks?: number;
  mimeType?: string;
  name?: string;
  duration?: number;
  size?: number;
  updatedAt?: number;
  active?: boolean;
}

// Utility: Convert Base64 string to Blob Object URL for lightning-fast memory playback
function base64ToBlobUrl(base64Data: string, mimeType: string = "video/mp4"): string {
  try {
    const pureBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data
    const binaryString = window.atob(pureBase64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: mimeType })
    return URL.createObjectURL(blob)
  } catch (err) {
    console.error("Error creating video blob URL:", err)
    return ""
  }
}

// Utility: Auto-parse Google Drive shared link into direct CDN streaming link
function parseGoogleDriveUrl(url: string): { finalUrl: string; isGoogleDrive: boolean; fileId?: string } {
  if (!url) return { finalUrl: "", isGoogleDrive: false }
  const trimmed = url.trim()
  const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/
  const match = trimmed.match(driveRegex)
  if (match && match[1]) {
    return {
      finalUrl: `https://lh3.googleusercontent.com/d/${match[1]}`,
      isGoogleDrive: true,
      fileId: match[1]
    }
  }
  return { finalUrl: trimmed, isGoogleDrive: false }
}

export default function SettingsSlideshowPage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const router = useRouter()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<"slideshow" | "video">("video")
  const [backgroundMode, setBackgroundMode] = useState<"slideshow" | "video">("slideshow")
  
  // Slideshow States
  const [slides, setSlides] = useState<{ id: string, base64: string }[]>([])
  
  // Video States
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [videoUrlInput, setVideoUrlInput] = useState("")
  const [isVerifyingUrl, setIsVerifyingUrl] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatusText, setUploadStatusText] = useState("")
  
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
        // 1. Fetch Slideshow Images
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

        // 2. Fetch Background Mode
        const bgRef = ref(database, 'settings/login_background')
        const snapBg = await get(bgRef)
        if (snapBg.exists()) {
          const bgData = snapBg.val()
          if (bgData.mode) {
            setBackgroundMode(bgData.mode)
            setActiveTab(bgData.mode)
          }
          if (bgData.video?.url) {
            setVideoPreviewUrl(bgData.video.url)
            setVideoMeta(bgData.video)
          }
        }

        // 3. Fetch Video Meta (Chunked or Direct)
        const metaRef = ref(database, 'settings/login_video_meta')
        const snapMeta = await get(metaRef)
        if (snapMeta.exists()) {
          const meta = snapMeta.val() as VideoMeta
          setVideoMeta(meta)

          if (meta.url) {
            setVideoPreviewUrl(meta.url)
          } else if (meta.totalChunks && meta.totalChunks > 0) {
            // Load chunks and reconstruct preview
            const chunksRef = ref(database, 'settings/login_video_chunks')
            const snapChunks = await get(chunksRef)
            if (snapChunks.exists()) {
              const chunkObj = snapChunks.val()
              const chunkArr: string[] = []
              for (let i = 0; i < meta.totalChunks; i++) {
                if (chunkObj[i]) chunkArr.push(chunkObj[i])
              }
              const fullBase64 = chunkArr.join('')
              if (fullBase64) {
                const blobUrl = base64ToBlobUrl(fullBase64, meta.mimeType || 'video/mp4')
                setVideoPreviewUrl(blobUrl)
              }
            }
          }

          if (meta.active !== undefined) {
            const mode = meta.active ? 'video' : 'slideshow'
            setBackgroundMode(mode)
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
      await update(ref(database, 'settings/login_video_meta'), {
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

  // Handler: Upload Video with Chunked Storage (100% Native Firebase Realtime Database)
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Format check (permissive: video/* or common video extensions)
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(file.name)
    if (!isVideo) {
      toast({
        variant: "destructive",
        title: "Format Tidak Didukung",
        description: "Silakan pilih berkas video (MP4, WebM, atau MOV)."
      })
      if (videoInputRef.current) videoInputRef.current.value = ""
      return
    }

    // 2. Size check (max 12 MB)
    const MAX_SIZE_MB = 12
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
    setUploadProgress(5)
    setUploadStatusText("Membaca data video...")

    // 3. Duration check with timeout fallback
    let detectedDuration = 10
    try {
      const objectUrl = URL.createObjectURL(file)
      const tempVideo = document.createElement("video")
      tempVideo.preload = "metadata"
      tempVideo.muted = true
      tempVideo.playsInline = true
      tempVideo.src = objectUrl

      await Promise.race([
        new Promise<void>((resolve) => {
          tempVideo.onloadedmetadata = () => {
            detectedDuration = Number(tempVideo.duration.toFixed(1))
            resolve()
          }
          tempVideo.onerror = () => resolve()
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 3500))
      ])

      URL.revokeObjectURL(objectUrl)
    } catch {
      // ignore, continue with default 10s
    }

    // If duration > 10.5, inform user that login will loop per 10 seconds
    if (detectedDuration > 10.5) {
      toast({
        title: `Durasi Video: ${detectedDuration} Detik`,
        description: "Halaman login akan memutar video ini berulang (looping 10 detik)."
      })
    }

    // 4. Read file into Base64
    setUploadProgress(15)
    setUploadStatusText("Memproses berkas...")

    try {
      const base64DataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // 5. Split base64 into safe 200KB chunks for Realtime Database
      const CHUNK_SIZE = 200 * 1024
      const chunks: string[] = []
      for (let i = 0; i < base64DataUrl.length; i += CHUNK_SIZE) {
        chunks.push(base64DataUrl.slice(i, i + CHUNK_SIZE))
      }

      setUploadStatusText(`Mengunggah 0/${chunks.length} bagian video...`)

      if (!database) throw new Error("Koneksi database tidak tersedia.")

      // Clear previous chunks
      await remove(ref(database, 'settings/login_video_chunks'))

      // Upload each chunk sequentially
      for (let i = 0; i < chunks.length; i++) {
        await set(ref(database, `settings/login_video_chunks/${i}`), chunks[i])
        const progress = Math.min(95, Math.round(20 + ((i + 1) / chunks.length) * 75))
        setUploadProgress(progress)
        setUploadStatusText(`Mengunggah bagian ${i + 1} dari ${chunks.length}...`)
      }

      // 6. Save Metadata & Activate
      const newMeta: VideoMeta = {
        totalChunks: chunks.length,
        mimeType: file.type || "video/mp4",
        name: file.name,
        duration: detectedDuration,
        size: file.size,
        updatedAt: Date.now(),
        active: true
      }

      await set(ref(database, 'settings/login_video_meta'), newMeta)
      await update(ref(database, 'settings/login_background'), {
        mode: 'video',
        updatedAt: Date.now()
      })

      setUploadProgress(100)
      setUploadStatusText("Selesai!")

      const previewBlob = base64ToBlobUrl(base64DataUrl, file.type || "video/mp4")
      setVideoPreviewUrl(previewBlob)
      setVideoMeta(newMeta)
      setBackgroundMode("video")

      toast({
        title: "Video Berhasil Diunggah!",
        description: `Video durasi ${detectedDuration}s telah aktif sebagai latar belakang halaman login.`
      })
    } catch (err: any) {
      console.error("Upload video failed:", err)
      toast({
        variant: "destructive",
        title: "Gagal Mengunggah Video",
        description: err.message || "Terjadi kesalahan saat memproses video."
      })
    } finally {
      setIsUploadingVideo(false)
      setUploadProgress(0)
      setUploadStatusText("")
      if (videoInputRef.current) videoInputRef.current.value = ""
    }
  }

  // Handler: Save Video from direct URL or Google Drive link
  const handleSaveVideoUrl = async () => {
    const rawInput = videoUrlInput.trim()
    if (!rawInput) {
      toast({ variant: "destructive", title: "URL Kosong", description: "Silakan masukkan link video atau link Google Drive." })
      return
    }

    const { finalUrl, isGoogleDrive } = parseGoogleDriveUrl(rawInput)
    setIsVerifyingUrl(true)

    const tempVideo = document.createElement("video")
    tempVideo.preload = "metadata"
    tempVideo.muted = true
    tempVideo.playsInline = true
    tempVideo.src = finalUrl

    let saved = false
    const commitSave = async (duration: number = 10) => {
      if (saved) return
      saved = true
      try {
        const newMeta: VideoMeta = {
          url: finalUrl,
          name: isGoogleDrive ? "Video Google Drive" : "Video URL",
          duration,
          updatedAt: Date.now(),
          active: true
        }

        if (database) {
          await remove(ref(database, 'settings/login_video_chunks'))
          await set(ref(database, 'settings/login_video_meta'), newMeta)
          await update(ref(database, 'settings/login_background'), {
            mode: 'video',
            updatedAt: Date.now()
          })
        }

        setVideoMeta(newMeta)
        setVideoPreviewUrl(finalUrl)
        setBackgroundMode("video")
        setVideoUrlInput("")

        toast({
          title: isGoogleDrive ? "Link Google Drive Berhasil Terhubung!" : "URL Video Berhasil Disimpan",
          description: "Video telah diaktifkan sebagai latar belakang halaman login."
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

    tempVideo.onloadedmetadata = () => {
      const dur = Number(tempVideo.duration.toFixed(1)) || 10
      commitSave(dur)
    }

    // Safety timeout in case CORS delays metadata loading for external links
    setTimeout(() => {
      if (!saved) {
        commitSave(10)
      }
    }, 2500)

    tempVideo.onerror = () => {
      if (saved) return
      if (isGoogleDrive) {
        // Still save it because Google Drive stream URLs play directly in the login video player
        commitSave(10)
      } else {
        setIsVerifyingUrl(false)
        toast({
          variant: "destructive",
          title: "URL Video Tidak Dapat Dimuat",
          description: "Pastikan URL mengarah ke berkas video publik yang valid."
        })
      }
    }
  }

  // Handler: Delete Video
  const handleDeleteVideo = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus video background ini?")) return

    setIsSaving(true)
    try {
      if (database) {
        await remove(ref(database, 'settings/login_video_chunks'))
        await remove(ref(database, 'settings/login_video_meta'))
        await remove(ref(database, 'settings/login_video'))
        await update(ref(database, 'settings/login_background'), {
          mode: 'slideshow',
          video: null,
          updatedAt: Date.now()
        })
      }

      setVideoMeta(null)
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
              {backgroundMode === "video" && videoPreviewUrl 
                ? "Video Pendek (Looping 10s)" 
                : "Slideshow Gambar"}
            </span>
            <Badge className={`${backgroundMode === "video" && videoPreviewUrl ? "bg-emerald-500 text-slate-950" : "bg-blue-600 text-white"} font-black text-[11px] uppercase tracking-wider px-3 py-0.5`}>
              AKTIF
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {backgroundMode === "video" && videoPreviewUrl ? (
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
            videoPreviewUrl && (
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
            {backgroundMode === "video" && videoPreviewUrl && (
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
                <li><strong>Durasi Ideal 10 Detik</strong>: Video akan berputar secara looping (berulang) di halaman login.</li>
                <li><strong>Format Berkas</strong>: Mendukung video format <strong>MP4</strong>, <strong>WebM</strong>, atau <strong>MOV</strong>.</li>
                <li><strong>Ukuran Berkas</strong>: Maksimal <strong>12 MB</strong> (disarankan resolusi 720p atau 1080p).</li>
                <li><strong>Otomatis Muted & Looping</strong>: Diputar tanpa suara agar mematuhi aturan browser modern di desktop maupun smartphone.</li>
              </ul>
            </div>
          </div>

          {/* Current Video Preview Card */}
          {videoPreviewUrl && (
            <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <h2 className="text-base font-black uppercase text-slate-800 flex items-center gap-2">
                    <Video className="w-5 h-5 text-emerald-600" />
                    Video yang Sedang Tersimpan
                  </h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    {videoMeta?.name || "video-background.mp4"} • Durasi: {videoMeta?.duration || "~10"}s
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
                  key={videoPreviewUrl}
                  src={videoPreviewUrl} 
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
                {videoPreviewUrl ? "Ganti Berkas Video Baru" : "Unggah Video Pendek (Maks. 12 MB)"}
              </h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Pilih file MP4/WebM/MOV dari perangkat Anda
              </p>
            </div>

            <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 transition-all rounded-3xl p-8 flex flex-col items-center justify-center gap-4 text-center relative group">
              <input 
                ref={videoInputRef}
                type="file" 
                accept="video/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
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
                  {isUploadingVideo ? (uploadStatusText || "Sedang Mengunggah...") : "Klik atau Tarik Berkas Video ke Sini"}
                </p>
                <p className="text-xs text-slate-500 font-bold">
                  MP4, WebM, MOV • Disarankan durasi ~10 detik • Ukuran maksimal 12 MB
                </p>
              </div>

              {isUploadingVideo && (
                <div className="w-full max-w-xs space-y-2">
                  <Progress value={uploadProgress} className="h-2.5 bg-emerald-200" />
                  <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">
                    {uploadProgress}% Selesai
                  </p>
                </div>
              )}

              <Button 
                type="button"
                disabled={isUploadingVideo || isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest pointer-events-none"
              >
                {isUploadingVideo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Pilih Berkas Video
              </Button>
            </div>

            {/* Alternative: Direct Video URL or Google Drive Link */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-emerald-600" />
                <Label className="text-xs font-black uppercase text-slate-800">
                  Atau Tempel Link Google Drive / Link Video Langsung (URL)
                </Label>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="url"
                  placeholder="https://drive.google.com/file/d/.../view atau https://example.com/video.mp4"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  disabled={isVerifyingUrl || isSaving}
                  className="text-xs font-mono"
                />
                <Button
                  type="button"
                  onClick={handleSaveVideoUrl}
                  disabled={isVerifyingUrl || !videoUrlInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shrink-0"
                >
                  {isVerifyingUrl ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  Terapkan Video
                </Button>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">💡 Cara Menggunakan Link Google Drive:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-500">
                  <li>Buka video di Google Drive Anda.</li>
                  <li>Klik tombol <strong>Bagikan (Share)</strong>.</li>
                  <li>Ubah akses umum menjadi <strong>"Siapa saja yang memiliki link"</strong> (Anyone with the link).</li>
                  <li>Klik <strong>Salin Link</strong> lalu tempelkan di kolom di atas. Sistem otomatis mengonversinya menjadi video background login.</li>
                </ol>
              </div>
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
