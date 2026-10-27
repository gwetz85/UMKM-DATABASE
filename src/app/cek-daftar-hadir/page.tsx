"use client"

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  useUser, 
  useDatabase, 
  useMemoFirebase, 
  useList, 
  useObject 
} from "@/firebase"
import { ref, update } from "firebase/database"
import { getSurveyPhoto, isValidPhotoString } from "@/lib/survey-photo-service"
import { BusinessActor } from "@/app/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { cn } from "@/lib/utils"

// UI Components & Icons
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Search,
  User,
  Clock,
  Calendar,
  Megaphone,
  CheckCircle2,
  XCircle,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Share2,
  ArrowLeft,
  Loader2,
  Check,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Info
} from "lucide-react"

// Indonesian Days and Months
const DAYS_INDO = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const DAYS_INDO_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
const MONTHS_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]
const MONTHS_INDO_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
]

// Desk Icon Component matching the mock image (table / counter / bed shape)
function DeskIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Table top */}
      <path d="M3 8h18" />
      <path d="M4 8V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
      {/* Front panel & Legs */}
      <path d="M5 8v10" />
      <path d="M19 8v10" />
      <path d="M8 8v6h8V8" />
    </svg>
  )
}

// Avatar Illustration fallback matching the mock image exactly
function AvatarIllustration({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className}>
      {/* Head & Neck */}
      <rect width="120" height="120" rx="20" fill="#E2EDFB" />
      {/* Neck */}
      <path d="M52 64h16v18h-16z" fill="#FAD2B4" />
      {/* Head */}
      <ellipse cx="60" cy="46" rx="18" ry="21" fill="#FBD8C0" />
      {/* Hair */}
      <path
        d="M42 42c0-12 8-20 18-20s18 8 18 20c0 3-1 6-2 8-1-6-4-10-8-12-5-2-9 1-12 1-5 0-8-5-10-7-2 3-4 6-4 10z"
        fill="#1E293B"
      />
      {/* Ears */}
      <circle cx="41" cy="46" r="4" fill="#FBD8C0" />
      <circle cx="79" cy="46" r="4" fill="#FBD8C0" />
      {/* Blue Polo / Shirt */}
      <path
        d="M26 106c0-16 12-28 28-28h12c16 0 28 12 28 28v14H26v-14z"
        fill="#1E4E8C"
      />
      {/* Collar */}
      <path d="M50 78l10 12 10-12-4-5-6 6-6-6-4 5z" fill="#2563EB" />
    </svg>
  )
}

export default function CekDaftarHadirPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f0f4f9]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-[#0055b3]" />
            <p className="text-sm font-bold text-slate-600">Memuat Layar Pengecekan...</p>
          </div>
        </div>
      }
    >
      <CekDaftarHadirContent />
    </Suspense>
  )
}

function CekDaftarHadirContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const { playSound } = useSoundEffect()

  // Realtime clock
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  useEffect(() => {
    setCurrentTime(new Date())
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fullscreen toggle state
  const [isFullscreen, setIsFullscreen] = useState(false)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  // Sound effects toggle
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Fetch Business Actors list
  const actorsQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, "businessActors")
  }, [database])
  const { data: rawActors, isLoading: isActorsLoading } = useList<BusinessActor>(actorsQuery)

  // Fetch Running Text config
  const runningTextRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, "settings/running_text")
  }, [database])
  const { data: runningTextConfig } = useObject(runningTextRef)
  
  const defaultRunningText = "Mohon kepada seluruh peserta untuk tetap menjaga ketertiban selama proses absensi berlangsung. Siapkan berkas persyaratan dan nomor antrian Anda."
  const customRunningText = (typeof runningTextConfig === "string" ? runningTextConfig : runningTextConfig?.text) || ""
  const activeRunningText = customRunningText && customRunningText.trim() ? customRunningText : defaultRunningText

  // Search input state
  const [searchNik, setSearchNik] = useState("")
  const [searchStatus, setSearchStatus] = useState<"idle" | "found" | "not_found">("idle")
  const [selectedActor, setSelectedActor] = useState<BusinessActor | null>(null)
  const [surveyPhotoUrl, setSurveyPhotoUrl] = useState<string | null>(null)
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus search input on mount and keep it focused
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Read URL search param if provided (e.g. ?nik=317...)
  useEffect(() => {
    const paramNik = searchParams.get("nik")
    if (paramNik && rawActors && rawActors.length > 0) {
      const clean = paramNik.trim().replace(/\D/g, "")
      setSearchNik(clean)
      executeSearch(clean, rawActors)
    }
  }, [searchParams, rawActors])

  // Execute Search by NIK
  const executeSearch = (targetNik: string, actorList: BusinessActor[]) => {
    const cleanTarget = targetNik.trim().replace(/\D/g, "")
    if (!cleanTarget) {
      setSelectedActor(null)
      setSearchStatus("idle")
      setSurveyPhotoUrl(null)
      return
    }

    const found = actorList.find((actor) => {
      const actorNik = (actor.nik || "").trim().replace(/\D/g, "")
      return actorNik === cleanTarget || (cleanTarget.length >= 12 && actorNik.includes(cleanTarget))
    })

    if (found) {
      setSelectedActor(found)
      setSearchStatus("found")
      if (soundEnabled) playSound("select", 0.45)
      loadSurveyPhotoForActor(found)
    } else {
      setSelectedActor(null)
      setSearchStatus("not_found")
      setSurveyPhotoUrl(null)
      if (soundEnabled) playSound("error", 0.4)
    }
  }

  // Load Survey Photo asynchronously
  const loadSurveyPhotoForActor = async (actor: BusinessActor) => {
    // 1. Direct fields
    const directPhoto =
      actor.surveyData?.fotoSurveyUrl ||
      actor.photoSurveyUrl ||
      (actor.surveyData as any)?.photoSurvey
    if (directPhoto && directPhoto !== actor.comparisonPhotoUrl && isValidPhotoString(directPhoto)) {
      setSurveyPhotoUrl(directPhoto)
      setIsLoadingPhoto(false)
      return
    }

    // 2. Fetch via service
    setIsLoadingPhoto(true)
    try {
      const photo = await getSurveyPhoto(database, actor.id, actor)
      setSurveyPhotoUrl(photo)
    } catch {
      setSurveyPhotoUrl(null)
    } finally {
      setIsLoadingPhoto(false)
    }
  }

  // Handle Input Change with Auto Search on 16 digits
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 16)
    setSearchNik(val)

    if (val.length === 16 && rawActors) {
      executeSearch(val, rawActors)
    } else if (val.length === 0) {
      setSelectedActor(null)
      setSearchStatus("idle")
      setSurveyPhotoUrl(null)
    }
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (rawActors) {
        executeSearch(searchNik, rawActors)
      }
    }
  }

  // Reset search
  const handleResetSearch = () => {
    setSearchNik("")
    setSelectedActor(null)
    setSearchStatus("idle")
    setSurveyPhotoUrl(null)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Toggle Attendance Status (Tandai Hadir / Batal Hadir)
  const handleToggleAttendance = async () => {
    if (!database || !selectedActor) return
    setIsUpdatingAttendance(true)

    const currentStatus = (selectedActor as any).attendanceStatus
    const newStatus = currentStatus === "hadir" ? "belum_hadir" : "hadir"
    const officerName =
      userProfile?.fullName || user?.email || "Petugas Presensi (Layar Pengecekan)"
    const nowIso = new Date().toISOString()

    try {
      const actorRef = ref(database, `businessActors/${selectedActor.id}`)
      await update(actorRef, {
        attendanceStatus: newStatus,
        attendanceUpdatedAt: newStatus === "hadir" ? nowIso : null,
        attendanceUpdatedBy: newStatus === "hadir" ? officerName : null,
        attendanceNotes:
          newStatus === "hadir"
            ? "Presensi tercatat dari Layar Pengecekan Petugas"
            : "Absensi dibatalkan oleh petugas"
      })

      // Update local state immediately
      const updated = {
        ...selectedActor,
        attendanceStatus: newStatus,
        attendanceUpdatedAt: newStatus === "hadir" ? nowIso : undefined,
        attendanceUpdatedBy: newStatus === "hadir" ? officerName : undefined,
        attendanceNotes:
          newStatus === "hadir"
            ? "Presensi tercatat dari Layar Pengecekan Petugas"
            : "Absensi dibatalkan oleh petugas"
      }
      setSelectedActor(updated as BusinessActor)

      if (soundEnabled) {
        playSound(newStatus === "hadir" ? "success" : "click", 0.5)
      }

      toast({
        title: newStatus === "hadir" ? "Absensi Tercatat" : "Absensi Dibatalkan",
        description: `${selectedActor.fullName} berhasil ditandai ${newStatus === "hadir" ? "Hadir" : "Belum Hadir"}.`
      })
    } catch (err: any) {
      toast({
        title: "Gagal Mengubah Status",
        description: err?.message || "Terjadi kendala jaringan.",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingAttendance(false)
    }
  }

  // Copy Link Khusus to clipboard
  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link Khusus Disalin",
        description: "Tautan layar pengecekan berhasil disalin ke clipboard."
      })
    }
  }

  // Format Desk Number cleanly
  const formatDeskDisplay = (rawDesk?: string) => {
    if (!rawDesk || !rawDesk.trim()) {
      return { main: "--", sub: "Belum Ditentukan" }
    }
    const trimmed = rawDesk.trim()
    const numMatch = trimmed.match(/\d+/)
    if (numMatch) {
      const num = parseInt(numMatch[0], 10)
      const formattedNum = num < 10 ? `0${num}` : `${num}`
      return {
        main: formattedNum,
        sub: trimmed.toLowerCase().includes("meja") ? trimmed : `Meja ${trimmed}`
      }
    }
    return { main: trimmed, sub: "Loket Presensi" }
  }

  // Format DOB
  const formatDobDisplay = (actor: BusinessActor) => {
    if (actor.dob) {
      try {
        const d = new Date(actor.dob)
        if (!isNaN(d.getTime())) {
          return `${d.getDate()} ${MONTHS_INDO[d.getMonth()]} ${d.getFullYear()}`
        }
      } catch {}
      return actor.dob
    }
    if (actor.pobDob) {
      return actor.pobDob
    }
    return "-"
  }

  // Formatted Current Time & Date strings
  const timeString = useMemo(() => {
    if (!currentTime) return "--:--:--"
    const h = String(currentTime.getHours()).padStart(2, "0")
    const m = String(currentTime.getMinutes()).padStart(2, "0")
    const s = String(currentTime.getSeconds()).padStart(2, "0")
    return `${h}:${m}:${s}`
  }, [currentTime])

  const dateString = useMemo(() => {
    if (!currentTime) return ""
    const day = DAYS_INDO_SHORT[currentTime.getDay()]
    const d = currentTime.getDate()
    const month = MONTHS_INDO_SHORT[currentTime.getMonth()]
    const y = currentTime.getFullYear()
    return `${day}, ${d} ${month} ${y}`
  }, [currentTime])

  const fullDateString = useMemo(() => {
    if (!currentTime) return ""
    const day = DAYS_INDO[currentTime.getDay()]
    const d = currentTime.getDate()
    const month = MONTHS_INDO[currentTime.getMonth()]
    const y = currentTime.getFullYear()
    return `${day}, ${d} ${month} ${y}`
  }, [currentTime])

  // Desk display values
  const deskInfo = useMemo(() => {
    if (!selectedActor) return { main: "--", sub: "" }
    return formatDeskDisplay((selectedActor as any).attendanceDesk)
  }, [selectedActor])

  // Schedule display value
  const scheduleDisplay = useMemo(() => {
    if (!selectedActor) return "--"
    const sch = (selectedActor as any).attendanceSchedule
    if (sch && sch.trim()) return sch.trim()
    return fullDateString || "-"
  }, [selectedActor, fullDateString])

  const isHadir = (selectedActor as any)?.attendanceStatus === "hadir"

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#eef3f9] text-slate-800 font-sans overflow-hidden select-none">
      {/* ─── COMPACT TOP UTILITY BAR (FLOATING CONTROLS) ─── */}
      <header className="h-11 px-4 bg-white/90 backdrop-blur-md border-b border-blue-100 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <Link
            href="/daftar-hadir"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0055b3] transition-colors"
            title="Kembali ke Daftar Hadir"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Daftar Hadir</span>
          </Link>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#0055b3]">
              Layar Pengecekan Petugas
            </span>
          </div>

          {user && (
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Petugas: {userProfile?.fullName || user.email}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Link Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="h-7 px-2.5 text-[11px] font-bold text-slate-600 hover:text-[#0055b3] hover:bg-blue-50 gap-1 rounded-lg"
            title="Salin Link Khusus untuk Petugas Lain"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Salin Link</span>
          </Button>

          {/* Sound Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="h-7 w-7 p-0 text-slate-600 hover:text-[#0055b3] hover:bg-blue-50 rounded-lg"
            title={soundEnabled ? "Nonaktifkan Suara" : "Aktifkan Suara"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-7 px-2.5 text-[11px] font-bold text-slate-600 hover:text-[#0055b3] hover:bg-blue-50 gap-1 rounded-lg"
            title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh (F11)"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? "Keluar" : "Layar Penuh"}</span>
          </Button>
        </div>
      </header>

      {/* ─── MAIN LANDSCAPE CONTENT AREA ─── */}
      <main className="flex-1 min-h-0 p-3 sm:p-4 md:p-5 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* ══════════════════════════════════════════════════════════════
            KOLOM KIRI: SEARCH BAR (Auto Height) + DATA NIK (Mengisi Sisa)
            ══════════════════════════════════════════════════════════════ */}
        <section className="w-full lg:w-[42%] xl:w-[40%] flex flex-col gap-3 min-h-0 h-full">
          {/* 1. SEARCH BAR: Hanya seukuran search bar */}
          <div className="shrink-0 bg-white rounded-2xl border-2 border-[#bfdbfe] shadow-xs px-4 py-2.5 flex items-center gap-3">
            <Search className="w-6 h-6 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={16}
              value={searchNik}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Masukkan NIK..."
              className="w-full bg-transparent text-base sm:text-lg font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none tracking-wider"
              autoFocus
            />
            {searchNik && (
              <button
                type="button"
                onClick={handleResetSearch}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded transition-colors"
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
            <span className="text-[11px] font-mono font-semibold text-slate-400 shrink-0">
              {searchNik.length}/16
            </span>
          </div>

          {/* 2. DATA NIK: Mengisi sisa padding search bar */}
          <div className="flex-1 min-h-0 bg-white rounded-2xl border border-[#cfe1f5] shadow-xs flex flex-col overflow-hidden">
            {/* Header Data NIK */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0055b3]/10 flex items-center justify-center text-[#0055b3]">
                  <User className="w-4 h-4 text-[#0055b3]" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-[#004797] tracking-tight">
                  Data NIK
                </h2>
              </div>

              {selectedActor && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isUpdatingAttendance}
                    onClick={handleToggleAttendance}
                    className={cn(
                      "h-8 px-3 text-xs font-black rounded-lg shadow-2xs gap-1.5 transition-all",
                      isHadir
                        ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                  >
                    {isUpdatingAttendance ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isHadir ? (
                      <RotateCcw className="w-3.5 h-3.5" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{isHadir ? "Batal Hadir" : "Tandai Hadir"}</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Content Data NIK: Tampilkan hanya jika NIK sudah dicari dan data ditemukan */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
              {selectedActor ? (
                <div className="space-y-4">
                  {/* TOP PROFILE SECTION: FOTO SURVEY RATA TENGAH & DIPERBESAR */}
                  <div className="flex flex-col items-center text-center pb-3 border-b border-slate-100">
                    {/* Foto Survey Box Raksasa Rata Tengah */}
                    <div
                      onClick={() => {
                        if (surveyPhotoUrl) setIsPhotoModalOpen(true)
                      }}
                      className={cn(
                        "w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 rounded-3xl overflow-hidden shrink-0 border-4 border-blue-200 bg-[#E2EDFB] flex items-center justify-center relative shadow-md group mx-auto",
                        surveyPhotoUrl && "cursor-pointer hover:border-[#0055b3] hover:shadow-lg transition-all"
                      )}
                      title={surveyPhotoUrl ? "Klik untuk melihat foto survey ukuran penuh" : "Foto Pelaku Usaha"}
                    >
                      {isLoadingPhoto ? (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <Loader2 className="w-8 h-8 animate-spin text-[#0055b3]" />
                          <span className="text-xs font-bold">Memuat Foto Survey...</span>
                        </div>
                      ) : surveyPhotoUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={surveyPhotoUrl}
                            alt={selectedActor.fullName || "Foto Survey"}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black tracking-wider uppercase backdrop-blur-2xs">
                            🔍 Perbesar Foto
                          </div>
                        </>
                      ) : (
                        <AvatarIllustration />
                      )}
                    </div>

                    {/* Nama Lengkap & Badge Data Ditemukan */}
                    <div className="mt-3.5 space-y-1.5 w-full flex flex-col items-center">
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                        {selectedActor.fullName}
                      </h3>

                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-[#dcfce7] text-[#15803d] shadow-2xs">
                          <CheckCircle2 className="w-4 h-4" />
                          Data Ditemukan
                        </span>
                      </div>

                      {selectedActor.businessName && (
                        <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                          Usaha: <strong className="text-slate-900 font-black">{selectedActor.businessName}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* DETAIL ROWS TABLE MATCHING THE MOCKUP */}
                  <div className="divide-y divide-slate-100 text-xs sm:text-sm pt-1">
                    {/* NIK */}
                    <div className="py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-semibold w-28 shrink-0">NIK</span>
                      <span className="font-mono font-bold text-slate-800 text-right">
                        {selectedActor.nik}
                      </span>
                    </div>

                    {/* Nomor Ponsel */}
                    <div className="py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-semibold w-28 shrink-0">Nomor Ponsel</span>
                      <span className="font-semibold text-slate-800 text-right">
                        {selectedActor.phone || "-"}
                      </span>
                    </div>

                    {/* Alamat */}
                    <div className="py-2.5 flex items-start justify-between gap-3">
                      <span className="text-slate-500 font-semibold w-28 shrink-0 pt-0.5">Alamat</span>
                      <span className="font-medium text-slate-800 text-right leading-relaxed max-w-[65%]">
                        {selectedActor.address || "-"} {selectedActor.rtRw ? `(${selectedActor.rtRw})` : ""} Kec. {selectedActor.kecamatan || "-"} Kel. {selectedActor.kelurahan || "-"}
                      </span>
                    </div>

                    {/* Jenis Kelamin */}
                    <div className="py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-semibold w-28 shrink-0">Jenis Kelamin</span>
                      <span className="font-semibold text-slate-800 text-right">
                        {selectedActor.gender || "-"}
                      </span>
                    </div>

                    {/* Tanggal Lahir */}
                    <div className="py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-semibold w-28 shrink-0">Tanggal Lahir</span>
                      <span className="font-semibold text-slate-800 text-right">
                        {formatDobDisplay(selectedActor)}
                      </span>
                    </div>

                    {/* Status Hadir */}
                    <div className="py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-semibold w-28 shrink-0">Status</span>
                      <div className="text-right">
                        {isHadir ? (
                          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-black bg-[#dbeafe] text-[#1e40af]">
                            Hadir
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                            Belum Hadir
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Keterangan */}
                    <div className="py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-semibold w-28 shrink-0">Keterangan</span>
                      <span className="font-medium text-slate-800 text-right">
                        {(selectedActor as any).attendanceNotes ||
                          (isHadir ? "Absensi telah tercatat" : "Belum melakukan absensi")}
                      </span>
                    </div>
                  </div>
                </div>
              ) : searchStatus === "not_found" ? (
                /* STATE: DATA TIDAK DITEMUKAN */
                <div className="h-full flex flex-col items-center justify-center p-6 text-center min-h-[320px]">
                  <div className="w-20 h-20 rounded-3xl bg-rose-50 border-2 border-rose-200 flex items-center justify-center text-rose-500 mb-4 shadow-xs">
                    <XCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">Data Tidak Ditemukan</h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-2 leading-relaxed">
                    NIK <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{searchNik}</span> tidak terdaftar dalam database presensi atau belum diverifikasi dinas.
                  </p>
                </div>
              ) : (
                /* STATE: NIK KOSONG (STANDBY) - TIDAK MENAMPILKAN DATA APAPUN */
                <div className="h-full flex flex-col items-center justify-center p-6 text-center min-h-[320px]">
                  <div className="w-24 h-24 rounded-3xl bg-blue-50/70 border-2 border-blue-200/60 flex items-center justify-center text-[#0055b3] mb-4 shadow-xs">
                    <User className="w-12 h-12 text-[#0055b3]/40 stroke-[1.5]" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">
                    Menunggu Input NIK
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-xs sm:max-w-sm mt-2 leading-relaxed">
                    Silakan ketik atau scan 16 Digit NIK pelaku usaha pada kotak pencarian di atas untuk menampilkan data presensi.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Scanner Siap Digunakan</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            KOLOM KANAN: NOMOR MEJA (3/4 LAYAR ATAS) + JADWAL (SISANYA)
            ══════════════════════════════════════════════════════════════ */}
        <section className="w-full lg:w-[58%] xl:w-[60%] flex flex-col gap-3 min-h-0 h-full">
          {/* 3. NOMOR MEJA: Lebarnya mengisi 3/4 layar untuk sebelah kanan atas */}
          <div className="flex-[3] min-h-0 bg-white rounded-2xl border border-[#cfe1f5] shadow-xs flex flex-col overflow-hidden">
            {/* Header Banner Solid Royal Blue */}
            <div className="bg-[#0055b3] text-white px-5 py-3.5 flex items-center gap-2.5 shrink-0 shadow-xs">
              <DeskIcon className="w-6 h-6 text-white" />
              <h2 className="text-lg sm:text-xl font-bold tracking-wide">Meja</h2>
            </div>

            {/* Body: Super Giant Desk Number */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center min-h-0">
              <div className="text-8xl sm:text-9xl md:text-[140px] xl:text-[160px] font-black font-mono text-[#0055b3] tracking-tighter leading-none select-all drop-shadow-2xs">
                {deskInfo.main}
              </div>
              <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-400 mt-2">
                {selectedActor ? (deskInfo.sub || "Loket / Meja Presensi") : "Menunggu Input NIK"}
              </p>
            </div>
          </div>

          {/* 4. JADWAL: Mengisi sisanya dari Nomor Meja */}
          <div className="flex-[1] min-h-0 bg-white rounded-2xl border border-[#cfe1f5] shadow-xs flex flex-col overflow-hidden">
            {/* Header Banner Solid Royal Blue */}
            <div className="bg-[#0055b3] text-white px-5 py-2.5 flex items-center gap-2.5 shrink-0 shadow-xs">
              <Calendar className="w-5 h-5 text-white" />
              <h2 className="text-base sm:text-lg font-bold tracking-wide">Tanggal</h2>
            </div>

            {/* Body: Schedule / Date Information */}
            <div className="flex-1 flex items-center justify-center p-4 text-center min-h-0">
              <div className="flex items-center justify-center gap-3">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#0055b3] shrink-0" />
                <span className="text-base sm:text-lg md:text-xl font-black text-slate-800 tracking-tight">
                  {scheduleDisplay}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── 5. BOTTOM BAR: REALTIME JAM & RUNNING TEKS ─── */}
      <footer className="w-full bg-[#004797] text-white shrink-0 h-16 sm:h-18 flex items-center px-4 sm:px-6 shadow-2xl z-20 border-t border-blue-400/20 overflow-hidden">
        {/* Realtime Jam & Tanggal on Left */}
        <div className="flex items-center gap-3 shrink-0 pr-4 sm:pr-6 border-r border-white/25">
          <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-white shrink-0" />
          <div className="flex flex-col">
            <span className="text-lg sm:text-2xl font-black font-mono tracking-wider tabular-nums leading-none text-white">
              {timeString}
            </span>
            <span className="text-[11px] sm:text-xs font-semibold text-blue-100 tracking-wide mt-0.5">
              {dateString}
            </span>
          </div>
        </div>

        {/* Running Text Marquee on Right */}
        <div className="flex-1 h-full flex items-center overflow-hidden pl-4 sm:pl-6 min-w-0">
          <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0 mr-3 animate-pulse" />
          <div className="relative flex-1 h-full flex items-center overflow-hidden">
            <div className="animate-marquee whitespace-nowrap text-xs sm:text-sm font-bold text-white tracking-wide">
              <span className="inline-block px-6">{activeRunningText}</span>
              <span className="text-blue-300 font-black">•</span>
              <span className="inline-block px-6">{activeRunningText}</span>
              <span className="text-blue-300 font-black">•</span>
              <span className="inline-block px-6">{activeRunningText}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS Keyframe for Marquee */}
      <style jsx>{`
        .animate-marquee {
          display: inline-flex;
          animation: marquee-scroll 45s linear infinite;
        }
        @keyframes marquee-scroll {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      {/* ─── MODAL PREVIEW FOTO SURVEY FULL RESOLUSI ─── */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="max-w-2xl p-4 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-800">
              Foto Survey: {selectedActor?.fullName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-mono">
              NIK: {selectedActor?.nik}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 w-full max-h-[70vh] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
            {surveyPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={surveyPhotoUrl}
                alt="Foto Survey Full"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
