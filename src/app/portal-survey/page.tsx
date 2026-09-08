"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  useUser, 
  useDatabase, 
  useList, 
  useObject, 
  useMemoFirebase, 
  updateDocumentNonBlocking,
  useAuth
} from "@/firebase"
import { ref, update, get } from "firebase/database"
import { signOut } from "firebase/auth"
import { BusinessActor, PejabatData } from "../lib/types"
import { generateBeritaAcaraPDF, formatTanggalIndonesia } from "@/lib/generate-berita-acara-pdf"
import { ensureVerifikatorUser } from "@/lib/verifikator-service"
import { logActivity, getDeviceType } from "@/lib/logger"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { 
  LogOut, 
  UserCheck, 
  FileSignature, 
  Store, 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Search, 
  Phone, 
  CheckCircle2, 
  Clock3, 
  FileDown, 
  Camera, 
  Loader2, 
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  X
} from "lucide-react"

export default function PortalSurveyPage() {
  const { user, userProfile, isUserLoading } = useUser()
  const database = useDatabase()
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Realtime clock states
  const [currentDateTime, setCurrentDateTime] = useState<{ date: string; time: string }>({
    date: "",
    time: ""
  })

  // Modal States
  const [activeModal, setActiveModal] = useState<'pejabat' | 'pelaku-usaha' | 'rekapan' | null>(null)
  const [isSavingPejabat, setIsSavingPejabat] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)

  // Search queries
  const [searchPelakuQuery, setSearchPelakuQuery] = useState("")
  const [searchRekapanQuery, setSearchRekapanQuery] = useState("")
  const [pelakuFilterTab, setPelakuFilterTab] = useState<'all' | 'pending' | 'done'>('all')

  // Pejabat form state
  const [pejabatForm, setPejabatForm] = useState({
    verifikatorNama: "",
    verifikatorNipppk: "",
    verifikatorPangkat: "",
    verifikatorJabatan: "",
    petugasNama: "",
    petugasNipppk: "",
    petugasPangkat: "",
    petugasJabatan: ""
  })

  // Realtime clock interval
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }
      setCurrentDateTime({
        date: now.toLocaleDateString('id-ID', options),
        time: `${hours}.${minutes}.${seconds}`
      })
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Check login & roles
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  // Load Pejabat Data
  useEffect(() => {
    if (userProfile) {
      const pd = (userProfile as any).pejabatData as PejabatData | undefined
      const cached = typeof window !== 'undefined' 
        ? ((user?.uid ? localStorage.getItem(`pejabatData_${user.uid}`) : null) || localStorage.getItem('pejabatData')) 
        : null
      const cachedPd = cached ? JSON.parse(cached) : null
      const activePd = pd || cachedPd

      if (activePd?.verifikator?.nama || activePd?.petugas?.nama) {
        setPejabatForm({
          verifikatorNama: activePd.verifikator?.nama || "",
          verifikatorNipppk: activePd.verifikator?.nipppk || "",
          verifikatorPangkat: activePd.verifikator?.pangkat || "",
          verifikatorJabatan: activePd.verifikator?.jabatan || "",
          petugasNama: activePd.petugas?.nama || userProfile.fullName || "",
          petugasNipppk: activePd.petugas?.nipppk || (userProfile as any)?.nipppk || "",
          petugasPangkat: activePd.petugas?.pangkat || (userProfile as any)?.pangkat || "",
          petugasJabatan: activePd.petugas?.jabatan || (userProfile as any)?.jabatan || ""
        })
      } else {
        setPejabatForm(prev => ({
          ...prev,
          petugasNama: userProfile.fullName || "",
          petugasNipppk: (userProfile as any)?.nipppk || "",
          petugasPangkat: (userProfile as any)?.pangkat || "",
          petugasJabatan: (userProfile as any)?.jabatan || "Petugas Survey Lapangan"
        }))
      }
    }
  }, [userProfile, user?.uid])

  // Fetch Business Actors
  const actorsRef = useMemoFirebase(() => database ? ref(database, 'businessActors') : null, [database])
  const { data: rawActorsList, isLoading: isActorsLoading } = useList<BusinessActor>(actorsRef)

  // Strict Filter: ONLY data assigned to this officer!
  const myActors = useMemo(() => {
    if (!rawActorsList || !userProfile) return []
    
    const officerName = (userProfile.fullName || "").toUpperCase().trim()
    const officerId = (userProfile.id || "").toUpperCase().trim()
    const officerUsername = (userProfile.username || "").toUpperCase().trim()
    const normOfficer = officerName.replace(/[^A-Z0-9]/g, "")

    return rawActorsList.filter(a => {
      if (!a) return false
      const p = (a.petugasSurvey || "").toUpperCase().trim()
      if (!p || p === "-" || p === "BELUM ADA") return false

      if (officerName && p === officerName) return true
      if (officerId && p === officerId) return true
      if (officerUsername && p === officerUsername) return true

      const normActor = p.replace(/[^A-Z0-9]/g, "")
      if (normOfficer && normActor && normActor === normOfficer) return true

      return false
    })
  }, [rawActorsList, userProfile])

  // Filtered lists for Menu 2 (Data Pelaku Usaha)
  const filteredMyActors = useMemo(() => {
    let list = myActors
    if (pelakuFilterTab === 'pending') {
      list = list.filter(a => a.status === 'lpj_pending' || !a.surveyData?.hasilSurvey)
    } else if (pelakuFilterTab === 'done') {
      list = list.filter(a => a.status === 'verified_dinas' || a.status === 'finish' || !!a.surveyData?.hasilSurvey)
    }

    if (!searchPelakuQuery.trim()) return list
    const q = searchPelakuQuery.toLowerCase().trim()
    return list.filter(a => 
      (a.fullName && a.fullName.toLowerCase().includes(q)) ||
      (a.nik && a.nik.includes(q)) ||
      (a.businessName && a.businessName.toLowerCase().includes(q)) ||
      (a.kelurahan && a.kelurahan.toLowerCase().includes(q))
    )
  }, [myActors, pelakuFilterTab, searchPelakuQuery])

  // Completed surveys for Menu 3 (Rekapan Berita Acara awal s/d akhir)
  const completedBeritaAcaraList = useMemo(() => {
    const list = myActors.filter(a => 
      a.status === 'verified_dinas' || 
      a.status === 'finish' || 
      (a.surveyData && a.surveyData.hasilSurvey) ||
      Boolean(a.verifiedDinasAt)
    )

    if (!searchRekapanQuery.trim()) return list
    const q = searchRekapanQuery.toLowerCase().trim()
    return list.filter(a =>
      (a.fullName && a.fullName.toLowerCase().includes(q)) ||
      (a.nik && a.nik.includes(q)) ||
      (a.businessName && a.businessName.toLowerCase().includes(q)) ||
      (a.kelurahan && a.kelurahan.toLowerCase().includes(q))
    )
  }, [myActors, searchRekapanQuery])

  // Count statistics
  const totalAssigned = myActors.length
  const totalCompleted = useMemo(() => {
    return myActors.filter(a => 
      a.status === 'verified_dinas' || 
      a.status === 'finish' || 
      (a.surveyData && a.surveyData.hasilSurvey)
    ).length
  }, [myActors])

  const isPejabatComplete = Boolean(
    pejabatForm.verifikatorNama && 
    pejabatForm.verifikatorNipppk && 
    pejabatForm.petugasNama && 
    pejabatForm.petugasNipppk
  )

  // Logout handler
  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari SIMPU?")) {
      try {
        if (database && userProfile?.id) {
          await update(ref(database, `system_users/${userProfile.id}`), {
            isOnline: false,
            lastSeen: Date.now()
          }).catch(console.error)
        }
        await signOut(auth)
        toast({ title: "Berhasil Keluar", description: "Sesi Anda telah diakhiri." })
        router.push("/login")
      } catch (err: any) {
        toast({ variant: "destructive", title: "Gagal Keluar", description: err.message })
      }
    }
  }

  // Pejabat Save Handler
  const handleSavePejabat = async () => {
    if (!user || !database) return
    const { 
      verifikatorNama, verifikatorNipppk, verifikatorPangkat, verifikatorJabatan,
      petugasNama, petugasNipppk, petugasPangkat, petugasJabatan 
    } = pejabatForm

    if (!verifikatorNama.trim() || !verifikatorNipppk.trim() || !petugasNama.trim() || !petugasNipppk.trim()) {
      toast({
        variant: "destructive",
        title: "Kolom Belum Lengkap",
        description: "Nama dan NIP/NIPPPK untuk Petugas & Verifikator wajib diisi."
      })
      return
    }

    setIsSavingPejabat(true)
    try {
      const activePejabatData: PejabatData = {
        verifikator: { 
          nama: verifikatorNama.trim(), 
          nipppk: verifikatorNipppk.trim(), 
          pangkat: verifikatorPangkat.trim(), 
          jabatan: verifikatorJabatan.trim() || "Verifikator Dinas"
        },
        petugas: { 
          nama: petugasNama.trim(), 
          nipppk: petugasNipppk.trim(), 
          pangkat: petugasPangkat.trim(), 
          jabatan: petugasJabatan.trim() || "Petugas Survey Lapangan"
        },
        updatedAt: new Date().toISOString()
      }

      // Save to system_users
      if (userProfile?.id) {
        await update(ref(database, `system_users/${userProfile.id}`), {
          pejabatData: activePejabatData,
          nipppk: activePejabatData.petugas.nipppk,
          pangkat: activePejabatData.petugas.pangkat,
          jabatan: activePejabatData.petugas.jabatan
        })
      }

      if (user.uid && user.uid !== userProfile?.id) {
        await update(ref(database, `system_users/${user.uid}`), {
          pejabatData: activePejabatData
        }).catch(() => null)
      }

      // Save to localStorage for instant local access
      if (typeof window !== 'undefined') {
        localStorage.setItem(`pejabatData_${user.uid}`, JSON.stringify(activePejabatData))
        localStorage.setItem('pejabatData', JSON.stringify(activePejabatData))
      }

      // Ensure verifikator account exists in system
      ensureVerifikatorUser(database, activePejabatData.verifikator).catch(console.error)

      logActivity({
        query: `UPDATE PEJABAT BA: ${petugasNama} (Verifikator: ${verifikatorNama})`,
        results: "Berhasil Disimpan",
        device: getDeviceType(navigator.userAgent),
        source: "Web",
        method: "SAVE PEJABAT",
        userId: user.email || user.uid
      }, database)

      toast({
        title: "✅ Data Pejabat Disimpan",
        description: "Data Petugas Survey & Verifikator berhasil diperbarui."
      })
      setActiveModal(null)
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: err.message || "Terjadi kesalahan saat menyimpan data."
      })
    } finally {
      setIsSavingPejabat(false)
    }
  }

  // Photo Upload Handler (Hero Avatar)
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !database || !userProfile?.id) return

    setIsUploadingPhoto(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const rawResult = event.target?.result as string
      const img = new Image()
      img.src = rawResult
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas')
          const MAX_DIM = 400
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width)
              width = MAX_DIM
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height)
              height = MAX_DIM
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          const base64 = canvas.toDataURL('image/jpeg', 0.8)

          await update(ref(database, `system_users/${userProfile.id}`), {
            photoURL: base64
          })

          toast({
            title: "Foto Profil Diperbarui",
            description: "Foto petugas survey berhasil disimpan."
          })
        } catch (err: any) {
          toast({
            variant: "destructive",
            title: "Gagal Menyimpan Foto",
            description: err.message
          })
        } finally {
          setIsUploadingPhoto(false)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // PDF Berita Acara Generator
  const handlePrintBeritaAcara = async (actor: BusinessActor) => {
    if (!actor.surveyData) {
      toast({
        variant: "destructive",
        title: "Belum Disurvey",
        description: "Data survey belum lengkap untuk membuat Berita Acara."
      })
      return
    }

    setGeneratingPdfId(actor.id)
    try {
      const activePejabat: PejabatData = {
        verifikator: {
          nama: pejabatForm.verifikatorNama || actor.surveyData?.pejabatData?.verifikator?.nama || "Dinas Koperasi & UKM",
          nipppk: pejabatForm.verifikatorNipppk || actor.surveyData?.pejabatData?.verifikator?.nipppk || "-",
          pangkat: pejabatForm.verifikatorPangkat || actor.surveyData?.pejabatData?.verifikator?.pangkat || "-",
          jabatan: pejabatForm.verifikatorJabatan || actor.surveyData?.pejabatData?.verifikator?.jabatan || "Verifikator Dinas"
        },
        petugas: {
          nama: pejabatForm.petugasNama || userProfile?.fullName || actor.petugasSurvey || "-",
          nipppk: pejabatForm.petugasNipppk || (userProfile as any)?.nipppk || "-",
          pangkat: pejabatForm.petugasPangkat || (userProfile as any)?.pangkat || "-",
          jabatan: pejabatForm.petugasJabatan || (userProfile as any)?.jabatan || "Petugas Survey Lapangan"
        },
        updatedAt: new Date().toISOString()
      }

      const targetDate = actor.surveyData.tanggalSurvey || new Date().toISOString().split('T')[0]
      await generateBeritaAcaraPDF(actor, actor.surveyData, activePejabat, targetDate)
      toast({
        title: "✅ Berita Acara Diunduh",
        description: `Dokumen PDF Berita Acara untuk ${actor.fullName} berhasil dibuat.`
      })
    } catch (err: any) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Gagal Membuat PDF",
        description: err.message || "Terjadi kesalahan saat memproses dokumen."
      })
    } finally {
      setGeneratingPdfId(null)
    }
  }

  // WhatsApp Contact Helper
  const handleOpenWhatsApp = (actor: BusinessActor) => {
    if (!actor.phone || actor.phone.trim() === "" || actor.phone === "-") {
      toast({
        variant: "destructive",
        title: "Nomor WhatsApp Kosong",
        description: `Pelaku usaha ${actor.fullName} belum memiliki nomor HP/WA.`
      })
      return
    }
    let clean = actor.phone.replace(/\D/g, "")
    if (clean.startsWith("0")) clean = "62" + clean.slice(1)
    else if (!clean.startsWith("62")) clean = "62" + clean

    const namaPetugas = userProfile?.fullName || pejabatForm.petugasNama || "Petugas Survey"
    const message = `Selamat pagi, perkenalkan saya ${namaPetugas} dari Dinas Koperasi Usaha Kecil Menengah Provinsi Kepulauan Riau.\n\nPada kesempatan ini saya ditugaskan untuk melaksanakan Survey Lapangan ketempat usaha Bapak/Ibu ${actor.fullName} (${actor.businessName}) sebagai Calon Penerima Bantuan Penguatan Modal Usaha Provinsi Kepulauan Riau Tahun 2026.\n\nMohon konfirmasi kesediaan dan waktu kehadiran Bapak/Ibu. Terima kasih.`

    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank")
  }

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Memuat Portal SIMPU...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 antialiased p-3 md:p-6 flex justify-center items-start">
      
      {/* Hidden File Input for Avatar Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleAvatarUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Main Container Mockup (Mobile-first responsive card) */}
      <div className="w-full max-w-md bg-[#f8fafc] rounded-[2.5rem] shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col my-auto transition-all">
        
        {/* ================= TOP HEADER BAR ================= */}
        <header className="px-6 pt-6 pb-4 flex items-center justify-between bg-white border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              SIMPU
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              Pendataan Bantuan Dana Hibah UMKM
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              title="Keluar / Logout" 
              className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors shadow-xs border border-rose-100 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ================= MAIN CONTENT BODY ================= */}
        <main className="p-4 space-y-4 flex-1">

          {/* ================= HERO PROFILE CARD ================= */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/80 overflow-hidden relative">
            
            {/* Banner Header Gradient */}
            <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-3.5 flex justify-end items-start relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)]"></div>
              <span className="relative z-10 px-3 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-wider border border-white/20">
                DKUKM SURVEY
              </span>
            </div>

            {/* Avatar & Identity Info */}
            <div className="px-5 pb-5 pt-0 -mt-12 flex flex-col items-center text-center relative z-10">
              
              {/* Avatar Frame with Click-to-Upload Photo */}
              <div className="relative mb-2.5 group">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  title="Klik untuk mengubah foto profil"
                  className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white text-3xl font-black overflow-hidden cursor-pointer relative"
                >
                  {userProfile?.photoURL ? (
                    <img 
                      src={userProfile.photoURL} 
                      alt="Foto Petugas" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="uppercase">
                      {(userProfile?.fullName || "PS").slice(0, 2)}
                    </span>
                  )}

                  {/* Hover Overlay Camera */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold">
                    {isUploadingPhoto ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mb-0.5" />
                        <span>Ubah</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Online status indicator dot */}
                <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                </span>
              </div>

              {/* Petugas Full Name */}
              <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                {userProfile?.fullName || "PETUGAS SURVEY"}
              </h2>
              
              {/* Subtitle / Role Badge */}
              <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-xs">
                <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-full text-[11px]">
                  PETUGAS SURVEY LAPANGAN
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 font-medium text-[11px]">
                  {pejabatForm.petugasJabatan || "Dinas Koperasi & UKM"}
                </span>
              </div>

              {/* Detailed Data Box: Petugas & Verifikator */}
              <div className="w-full mt-4 bg-slate-50 rounded-2xl p-3.5 border border-slate-100 text-left space-y-3">
                
                {/* Data Petugas Survey */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    <span>NIP / NIPPPK PETUGAS</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> AKTIF
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {pejabatForm.petugasNipppk || (userProfile as any)?.nipppk || "(Belum Diisi)"}
                    </span>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {pejabatForm.petugasPangkat || (userProfile as any)?.pangkat || "Staff Survey"}
                    </span>
                  </div>
                </div>

                {/* Data Petugas Verifikator */}
                <div className="border-t border-slate-200/60 pt-2.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    <span className="flex items-center gap-1 text-slate-500 font-bold">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500 inline" /> PETUGAS VERIFIKATOR
                    </span>
                    <span className="text-[10px] text-slate-400">PEMERIKSA BERKAS</span>
                  </div>
                  
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/70 shadow-2xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-800">
                        {pejabatForm.verifikatorNama || "(Belum Diatur)"}
                      </span>
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                        {pejabatForm.verifikatorJabatan || "Verifikator Dinas"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>NIP: {pejabatForm.verifikatorNipppk || "-"}</span>
                      <span>{pejabatForm.verifikatorPangkat || "-"}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* ================= 3 MENU UTAMA BAGIAN BAWAH ================= */}
          <div className="space-y-3">

            {/* MENU 1: Input Data Pejabat Berita Acara */}
            <div 
              onClick={() => setActiveModal('pejabat')}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 flex items-center justify-between cursor-pointer hover:border-indigo-400 hover:shadow-md active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xl shadow-xs group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <FileSignature className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-wider text-indigo-500 uppercase">
                    MENU 1 • PENGATURAN BA
                  </span>
                  <h3 className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Input Data Pejabat Berita Acara
                  </h3>
                  <p className="text-[11px] text-slate-400">Data Verifikator & Petugas Survey</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {isPejabatComplete ? (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-black">
                    Lengkap
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[10px] font-black">
                    Perlu Diisi
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* MENU 2: Data Pelaku Usaha (Hanya yang atas nama petugas) */}
            <div 
              onClick={() => setActiveModal('pelaku-usaha')}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 flex items-center justify-between cursor-pointer hover:border-blue-400 hover:shadow-md active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-xl shadow-xs group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-wider text-blue-500 uppercase">
                    MENU 2 • TUGAS LAPANGAN
                  </span>
                  <h3 className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                    Data Pelaku Usaha
                  </h3>
                  <p className="text-[11px] text-slate-400">Daftar & Form Survey Lapangan</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[10px] font-black">
                  {totalAssigned} UMKM
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* MENU 3: Rekapan Berita Acara (Per Petugas Survey - dari awal s/d akhir) */}
            <div 
              onClick={() => setActiveModal('rekapan')}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 flex items-center justify-between cursor-pointer hover:border-amber-400 hover:shadow-md active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center text-xl shadow-xs group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-wider text-amber-500 uppercase">
                    MENU 3 • ARSIP & CETAK
                  </span>
                  <h3 className="text-sm font-black text-slate-800 group-hover:text-amber-600 transition-colors">
                    Rekapan Berita Acara
                  </h3>
                  <p className="text-[11px] text-slate-400">Riwayat Survey dari Awal s/d Akhir</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[10px] font-black">
                  {totalCompleted} Selesai
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

          </div>

          {/* ================= FOOTER REALTIME WIDGET ================= */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                <Calendar className="w-3 h-3 text-sky-400 inline" />
                <span>WAKTU & TANGGAL REALTIME</span>
              </div>
              <p className="text-sm font-black text-slate-100">
                {currentDateTime.date || "Memuat Tanggal..."}
              </p>
              <p className="text-[10px] text-slate-400">Waktu Indonesia Barat (WIB)</p>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono text-sm font-black text-sky-300 tracking-wider">
                {currentDateTime.time || "00.00.00"}
              </span>
              <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-sm uppercase animate-pulse">
                LIVE
              </span>
            </div>
          </div>

        </main>

      </div>

      {/* ========================================================================= */}
      {/* DIALOG 1: INPUT DATA PEJABAT BERITA ACARA                                 */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === 'pejabat'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-indigo-600" />
              Data Pejabat Berita Acara
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Lengkapi data Petugas Verifikator & Petugas Survey untuk lembar Berita Acara Survey (GBAS).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Box Petugas Verifikator */}
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-purple-900 font-bold border-b border-purple-200 pb-1.5">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>DATA PETUGAS VERIFIKATOR (Dinas)</span>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Nama Lengkap & Gelar Verifikator</Label>
                <Input 
                  placeholder="Contoh: DEDI SUPRIADI, S.E."
                  value={pejabatForm.verifikatorNama}
                  onChange={(e) => setPejabatForm(prev => ({ ...prev, verifikatorNama: e.target.value }))}
                  className="bg-white rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">NIP / NIPPPK Verifikator</Label>
                <Input 
                  placeholder="Contoh: 19820415 201001 1 012"
                  value={pejabatForm.verifikatorNipppk}
                  onChange={(e) => setPejabatForm(prev => ({ ...prev, verifikatorNipppk: e.target.value }))}
                  className="bg-white rounded-xl text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Pangkat / Golongan</Label>
                  <Input 
                    placeholder="Contoh: Pembina (IV/a)"
                    value={pejabatForm.verifikatorPangkat}
                    onChange={(e) => setPejabatForm(prev => ({ ...prev, verifikatorPangkat: e.target.value }))}
                    className="bg-white rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Jabatan</Label>
                  <Input 
                    placeholder="Contoh: Verifikator Dinas"
                    value={pejabatForm.verifikatorJabatan}
                    onChange={(e) => setPejabatForm(prev => ({ ...prev, verifikatorJabatan: e.target.value }))}
                    className="bg-white rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Box Petugas Survey */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-900 font-bold border-b border-indigo-200 pb-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>DATA PETUGAS SURVEY (Anda)</span>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Nama Lengkap Petugas</Label>
                <Input 
                  placeholder="Nama Lengkap Petugas Survey"
                  value={pejabatForm.petugasNama}
                  onChange={(e) => setPejabatForm(prev => ({ ...prev, petugasNama: e.target.value }))}
                  className="bg-white rounded-xl text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">NIP / NIPPPK Petugas</Label>
                <Input 
                  placeholder="Contoh: 19880512 202321 1 004"
                  value={pejabatForm.petugasNipppk}
                  onChange={(e) => setPejabatForm(prev => ({ ...prev, petugasNipppk: e.target.value }))}
                  className="bg-white rounded-xl text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Pangkat / Golongan</Label>
                  <Input 
                    placeholder="Contoh: Penata Muda (III/a)"
                    value={pejabatForm.petugasPangkat}
                    onChange={(e) => setPejabatForm(prev => ({ ...prev, petugasPangkat: e.target.value }))}
                    className="bg-white rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Jabatan</Label>
                  <Input 
                    placeholder="Contoh: Petugas Survey Lapangan"
                    value={pejabatForm.petugasJabatan}
                    onChange={(e) => setPejabatForm(prev => ({ ...prev, petugasJabatan: e.target.value }))}
                    className="bg-white rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setActiveModal(null)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button 
              onClick={handleSavePejabat}
              disabled={isSavingPejabat}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md"
            >
              {isSavingPejabat ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: DATA PELAKU USAHA (HANYA ATAS NAMA PETUGAS)                     */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === 'pelaku-usaha'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl w-[95vw] rounded-3xl p-5 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                Data Pelaku Usaha Tugas Anda
              </DialogTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
                {myActors.length} Pelaku Usaha
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Daftar pelaku usaha yang ditugaskan khusus atas nama <strong>{userProfile?.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Search & Tabs */}
          <div className="space-y-2.5 my-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input 
                placeholder="Cari nama pelaku, NIK, usaha, atau kelurahan..."
                value={searchPelakuQuery}
                onChange={(e) => setSearchPelakuQuery(e.target.value)}
                className="pl-9 bg-slate-50 rounded-xl text-xs"
              />
            </div>
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setPelakuFilterTab('all')}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                  pelakuFilterTab === 'all' ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Semua ({myActors.length})
              </button>
              <button 
                onClick={() => setPelakuFilterTab('pending')}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                  pelakuFilterTab === 'pending' ? "bg-white text-amber-700 shadow-xs" : "text-slate-500 hover:text-amber-700"
                )}
              >
                Belum Survey ({myActors.length - totalCompleted})
              </button>
              <button 
                onClick={() => setPelakuFilterTab('done')}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                  pelakuFilterTab === 'done' ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-emerald-700"
                )}
              >
                Selesai ({totalCompleted})
              </button>
            </div>
          </div>

          {/* Actor Items Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredMyActors.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Store className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Tidak ada data pelaku usaha yang cocok.</p>
              </div>
            ) : (
              filteredMyActors.map((actor) => {
                const isDone = actor.status === 'verified_dinas' || actor.status === 'finish' || !!actor.surveyData?.hasilSurvey
                return (
                  <div 
                    key={actor.id}
                    className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:border-blue-300 transition-all space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-slate-800 text-xs">{actor.fullName}</h4>
                          <span className="text-[10px] px-2 py-0.2 bg-slate-100 text-slate-600 rounded-md font-semibold">
                            {actor.businessCategory || "UMKM"}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-blue-600">{actor.businessName || "Usaha Mandiri"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">NIK: {actor.nik || "-"}</p>
                      </div>

                      <div>
                        {isDone ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Selesai Survey
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                            <Clock3 className="w-3 h-3" /> Belum Survey
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-xl flex justify-between items-center">
                      <span className="truncate max-w-[200px]">📍 Kel. {actor.kelurahan || "-"}, {actor.kecamatan || "-"}</span>
                      <span className="font-mono">{actor.phone || "-"}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      {actor.phone && actor.phone !== "-" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleOpenWhatsApp(actor)}
                          className="h-8 px-2.5 rounded-xl text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          <Phone className="w-3.5 h-3.5 mr-1" />
                          Hubungi WA
                        </Button>
                      )}

                      <Button 
                        size="sm" 
                        onClick={() => {
                          setActiveModal(null)
                          router.push(`/verifikasi-dinas?actorId=${actor.id}`)
                        }}
                        className={cn(
                          "h-8 px-3 rounded-xl text-[11px] font-bold shadow-xs",
                          isDone 
                            ? "bg-slate-700 hover:bg-slate-800 text-white" 
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        )}
                      >
                        {isDone ? "Tinjau Hasil Survey" : "Mulai Survey Lapangan"}
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => setActiveModal(null)} 
              className="w-full rounded-xl text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: REKAPAN BERITA ACARA (PER PETUGAS SURVEY DARI AWAL S/D AKHIR)   */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === 'rekapan'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl w-[95vw] rounded-3xl p-5 max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
                Rekapan Berita Acara Survey
              </DialogTitle>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold">
                {completedBeritaAcaraList.length} Dokumen Selesai
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Riwayat Berita Acara Survey (GBAS) yang telah Anda kerjakan dari awal hingga akhir.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar */}
          <div className="my-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input 
                placeholder="Cari nama pelaku usaha, NIK, atau kelurahan..."
                value={searchRekapanQuery}
                onChange={(e) => setSearchRekapanQuery(e.target.value)}
                className="pl-9 bg-slate-50 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Completed Actors List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {completedBeritaAcaraList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Belum ada rekapan Berita Acara yang diselesaikan.</p>
              </div>
            ) : (
              completedBeritaAcaraList.map((actor, idx) => {
                const isGenerating = generatingPdfId === actor.id
                return (
                  <div 
                    key={actor.id}
                    className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:border-amber-400 transition-all flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-black text-slate-800 text-xs">{actor.fullName}</h4>
                          <p className="text-[11px] font-bold text-slate-600">{actor.businessName || "Usaha Mandiri"}</p>
                          <p className="text-[10px] text-slate-400 font-mono">NIK: {actor.nik || "-"}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold inline-block">
                          {actor.status === 'verified_dinas' ? 'Lolos Dinas' : 'Selesai Survey'}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          📅 {actor.surveyData?.tanggalSurvey || "Sudah Disurvey"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-500 flex justify-between items-center">
                      <span>Kelurahan: <strong>{actor.kelurahan || "-"}</strong></span>
                      <span>Verifikator: <strong>{actor.surveyData?.pejabatData?.verifikator?.nama || pejabatForm.verifikatorNama || "-"}</strong></span>
                    </div>

                    {/* Download Button */}
                    <div className="flex justify-end pt-1">
                      <Button 
                        size="sm"
                        disabled={isGenerating}
                        onClick={() => handlePrintBeritaAcara(actor)}
                        className="h-8 px-3 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Memproses PDF...
                          </>
                        ) : (
                          <>
                            <FileDown className="w-3.5 h-3.5 mr-1.5" />
                            Unduh Berita Acara PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => setActiveModal(null)} 
              className="w-full rounded-xl text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
