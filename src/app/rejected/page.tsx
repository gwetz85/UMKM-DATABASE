"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useObject } from "@/firebase"
import { ref, query, equalTo, limitToFirst, orderByChild, get } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Printer, Edit3, Loader2, Save, RotateCcw, Trash2, Eye, User, CreditCard, History, X, Building2, MapPin, Ban, AlertCircle, Search, Info, FileSpreadsheet, CheckCircle2, AlertTriangle, ChevronRight, Folder, ClipboardCheck, ShieldAlert, MessageCircle, Camera, Copy, Check, Phone, Store, ExternalLink, Calendar, Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckDataIndicator } from "@/components/check-data-indicator"
import { VerificationBadge } from "@/components/verification-badge"

import { cn, extractDobFromNik, parsePobDob, calculateAge } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { generateCancelDinasPDF } from "@/lib/generate-cancel-dinas-pdf"
import { normalizeCoordinator } from "@/lib/coordinator-utils"

export default function RejectedPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <RejectedContent />
    </Suspense>
  )
}

function RejectedContent() {
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterCoordinator = searchParams.get('coordinator')
  
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState<string>("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [printDate, setPrintDate] = useState<string>("")
  const [actorToPrint, setActorToPrint] = useState<BusinessActor | null>(null)
  const [activeTab, setActiveTab] = useState<'pendataan' | 'dinas'>('pendataan')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedKey(label)
    toast({
      title: "Tersalin ke Clipboard",
      description: `${label}: ${text}`,
    })
    setTimeout(() => {
      setCopiedKey(null)
    }, 2000)
  }

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('id-ID'))
  }, [])

  const handlePrintCancelDinas = async (actor: BusinessActor) => {
    setIsGeneratingPdf(true)
    try {
      toast({
        title: "Menyiapkan PDF...",
        description: `Sedang membuat formulir cancel dinas untuk ${actor.fullName || 'pelaku usaha'}.`,
      })
      await generateCancelDinasPDF(actor)
      toast({
        title: "PDF Berhasil Dibuat",
        description: "Formulir Pembatalan Dinas (A4) berhasil diunduh.",
      })
    } catch (error) {
      console.error("Error generating Cancel Dinas PDF:", error)
      toast({
        variant: "destructive",
        title: "Gagal Membuat PDF",
        description: "Terjadi kesalahan saat memproses file PDF.",
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }



  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin' || userProfile?.role === 'superadmin'
  const isDinas = userProfile?.role === 'dinas' || userProfile?.role === 'verifikator_dinas'
  const isKoordinator = userProfile?.role === 'koordinator'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('rejected'))
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)

  // Query for Dinas-cancelled data (indexed directly by hasilVerifikasiDinas === 'Tidak Lolos')
  const dinasQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, 'businessActors'), orderByChild('hasilVerifikasiDinas'), equalTo('Tidak Lolos'))
  }, [database])
  const { data: allActorsDinasRaw, isLoading: isLoadingDinas } = useList<BusinessActor>(dinasQuery)
  
  const kuotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const { data: kuotaData } = useList<any>(kuotaRef)

  // On-demand auxiliary data for selected actor detail & print
  const [activeDetailData, setActiveDetailData] = useState<{
    data2023: any[], data2024: any[], data2025: any[], dataBlacklist: any[]
  }>({ data2023: [], data2024: [], data2025: [], dataBlacklist: [] })

  const fetchAuxData = async (actor: BusinessActor) => {
    if (!database || !actor?.nik) return;
    const checkMaster = async (path: string, nik: string) => {
      try {
        const q = query(ref(database, path), orderByChild('nik'), equalTo(nik), limitToFirst(1))
        const snap = await get(q)
        return snap.exists() ? Object.values(snap.val()) : []
      } catch {
        return []
      }
    }
    const [d23, d24, d25, dBl] = await Promise.all([
      checkMaster('master_data_2023', actor.nik),
      checkMaster('master_data_2024', actor.nik),
      checkMaster('master_data_2025', actor.nik),
      checkMaster('blacklist_data', actor.nik)
    ])
    setActiveDetailData({ data2023: d23, data2024: d24, data2025: d25, dataBlacklist: dBl })
  }

  const [blacklistMatches, setBlacklistMatches] = useState<any[]>([])

  const handleOpenDetail = (actor: BusinessActor) => {
    setViewingActor(actor)
    setIsEditMode(false)
    fetchAuxData(actor)
  }

  const handlePrintActorForm = async (actor: BusinessActor) => {
    if (actor.status === 'verified_dinas' || (actor as any).alasanCancelDinas) {
      handlePrintCancelDinas(actor)
      return
    }
    if (database && actor.nik) {
      try {
        const q = query(ref(database, 'blacklist_data'), orderByChild('nik'), equalTo(actor.nik), limitToFirst(1))
        const snap = await get(q)
        setBlacklistMatches(snap.exists() ? Object.values(snap.val()) : [])
      } catch {
        setBlacklistMatches([])
      }
    }
    setActorToPrint(actor)
    setTimeout(() => {
      window.print()
      setActorToPrint(null)
    }, 250)
  }
  
  const actors = allActorsRaw ? allActorsRaw.filter(a => {
    const isRejected = a.status === 'rejected';
    if (!isRejected) return false;

    const matchesSearch = 
      a.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.nik?.includes(searchQuery)
    const matchesCategory = !category || a.businessCategory === category

    if (isKoordinator) {
      if (!a.coordinator || !userProfile?.fullName) return false;
      const matchesKoor = a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase();
      return matchesSearch && matchesCategory && matchesKoor;
    }
    if (filterCoordinator) {
      const matchesKoor = a.coordinator === filterCoordinator;
      return matchesSearch && matchesCategory && matchesKoor;
    }
    return matchesSearch && matchesCategory;
  }) : undefined

  // Dinas-cancelled actors
  const actorsDinas = allActorsDinasRaw ? allActorsDinasRaw.filter(a => {
    const isDinasCancelled = 
      (a.status === 'verified_dinas' && a.hasilVerifikasiDinas === 'Tidak Lolos') ||
      a.hasilVerifikasiDinas === 'Tidak Lolos' ||
      Boolean((a as any).alasanCancelDinas);
    if (!isDinasCancelled) return false;

    const matchesSearch = 
      a.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.nik?.includes(searchQuery)
    const matchesCategory = !category || a.businessCategory === category

    if (isKoordinator) {
      if (!a.coordinator || !userProfile?.fullName) return false;
      const matchesKoor = a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase();
      return matchesSearch && matchesCategory && matchesKoor;
    }
    if (filterCoordinator) {
      const matchesKoor = a.coordinator === filterCoordinator;
      return matchesSearch && matchesCategory && matchesKoor;
    }
    return matchesSearch && matchesCategory;
  }) : undefined

  const [isEditMode, setIsEditMode] = useState(false)

  // ConfirmDialog states
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const [revertPending, setRevertPending] = useState<{actorId: string, fullName: string} | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePending, setDeletePending] = useState<{actorId: string, fullName: string} | null>(null)
  const [showRestoreDinasDialog, setShowRestoreDinasDialog] = useState(false)
  const [restoreDinasPending, setRestoreDinasPending] = useState<BusinessActor | null>(null)
  const [isRestoringDinas, setIsRestoringDinas] = useState(false)
  const [editNik, setEditNik] = useState("")
  const [editPob, setEditPob] = useState("")
  const [editDob, setEditDob] = useState("")

  useEffect(() => {
    if (viewingActor) {
      const parsed = parsePobDob(viewingActor.pobDob || "")
      setEditNik(viewingActor.nik || "")
      setEditPob(parsed.pob || viewingActor.pob || "")
      setEditDob(parsed.dob || viewingActor.dob || "")
    } else {
      setEditNik("")
      setEditPob("")
      setEditDob("")
      setIsEditMode(false)
    }
  }, [viewingActor, isEditMode])

  const handleSaveFullEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAdmin || !database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    
    const updates: Partial<BusinessActor> = {
      fullName: formData.get('fullName') as string,
      nik: editNik,
      noKK: formData.get('noKK') as string,
      gender: formData.get('gender') as "Perempuan" | "Laki-laki",
      pobDob: `${editPob}, ${editDob}`,
      pob: editPob,
      dob: editDob,
      phone: formData.get('phone') as string,
      kecamatan: formData.get('kecamatan') as string,
      kelurahan: formData.get('kelurahan') as string,
      rtRw: formData.get('rtRw') as string,
      address: formData.get('address') as string,
      businessName: formData.get('businessName') as string,
      businessCategory: formData.get('businessCategory') as "Bukan Kuliner" | "Kuliner",
      businessLocation: formData.get('businessLocation') as string,
      coordinator: normalizeCoordinator(formData.get('coordinator') as string).toUpperCase().trim(),
      bankName: formData.get('bankName') as string,
      bankNumber: formData.get('bankNumber') as string,
      bankOwner: formData.get('bankOwner') as string,
      rejectionReason: formData.get('rejectionReason') as string,
    }

    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)
    
    logActivity({
      query: `EDIT DATA DITOLAK: ${viewingActor.fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA DITOLAK',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Tersimpan", description: "Data pelaku usaha berhasil diperbarui." })
    setIsEditMode(false)
    setViewingActor({ ...viewingActor, ...updates } as BusinessActor)
  }

  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setRevertPending({ actorId, fullName })
    setShowRevertDialog(true)
  }

  const executeRevert = () => {
    if (!revertPending || !database) return
    const { actorId, fullName } = revertPending
    const actorObj = allActorsRaw?.find(a => a.id === actorId) || allActorsDinasRaw?.find(a => a.id === actorId) || viewingActor || { id: actorId, status: 'rejected' }
    updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), { status: 'pending' })
    
    // Update global stats
    import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
      updateStatsOnStatusChange(database, actorObj, { ...actorObj, status: 'pending' }, actorObj).catch(e => console.error(e));
    });
    
    logActivity({
      query: `KEMBALIKAN DATA DITOLAK: ${fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA DITOLAK',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Berhasil", description: "Status dikembalikan ke Pending." })
    setViewingActor(null)
    setShowRevertDialog(false)
    setRevertPending(null)
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setDeletePending({ actorId, fullName })
    setShowDeleteDialog(true)
  }

  const executeDelete = () => {
    if (!deletePending || !database) return
    const { actorId, fullName } = deletePending
    const actorToDelete = allActorsRaw?.find(a => a.id === actorId) || allActorsDinasRaw?.find(a => a.id === actorId) || viewingActor || { id: actorId, status: 'rejected' };
    deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
    
    // Update global stats
    import("@/lib/stats-service").then(({ updateStatsOnDelete }) => {
      updateStatsOnDelete(database, actorToDelete).catch(err => console.error(err));
    });
    
    logActivity({
      query: `HAPUS DATA DITOLAK: ${fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'DATA DITOLAK',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ variant: "destructive", title: "Terhapus", description: "Data dihapus permanen." })
    setViewingActor(null)
    setShowDeleteDialog(false)
    setDeletePending(null)
  }

  const handleRestoreDinasToSurvey = (actor: BusinessActor) => {
    if (!isAdmin && !isDinas) return
    setRestoreDinasPending(actor)
    setShowRestoreDinasDialog(true)
  }

  const executeRestoreDinasToSurvey = async () => {
    if (!restoreDinasPending || !database) return
    const actor = restoreDinasPending
    setIsRestoringDinas(true)
    try {
      const updates: any = {
        status: 'lpj_pending',
        hasilVerifikasiDinas: null,
        alasanCancelDinas: null,
        cancelDinasAt: null,
        cancelDinasBy: null,
        rejectionReason: null,
        keteranganDinas: null,
      }

      // Pastikan nama petugas survey tersimpan agar langsung masuk ke antrean petugas survey bersangkutan
      const officerName = actor.petugasSurvey || actor.createdBy || (actor as any).surveyData?.pejabatData?.petugas?.nama || ''
      if (officerName && (!actor.petugasSurvey || actor.petugasSurvey.trim() === '-' || actor.petugasSurvey.trim() === '')) {
        updates.petugasSurvey = officerName.toUpperCase().trim()
      }

      updateDocumentNonBlocking(ref(database, `businessActors/${actor.id}`), updates)

      // Update global stats
      const { updateStatsOnStatusChange } = await import('@/lib/stats-service')
      await updateStatsOnStatusChange(database, actor, { ...actor, ...updates, status: 'lpj_pending' }, actor)

      logActivity({
        query: `KEMBALIKAN CANCEL DINAS KE PETUGAS SURVEY: ${actor.fullName}`,
        results: `Usaha: ${actor.businessName || '-'} | Petugas: ${updates.petugasSurvey || actor.petugasSurvey || 'Petugas Survey'}`,
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'KEMBALIKAN CANCEL DINAS',
        userId: userProfile?.fullName || user?.email || user?.uid || 'Admin'
      })

      toast({
        title: "✅ Berhasil Dikembalikan",
        description: `Data ${actor.fullName} telah dikembalikan ke antrean Petugas Survey dan info cancel telah dihapus.`
      })
    } catch (error) {
      console.error("Error restoring actor to survey:", error)
      toast({
        variant: "destructive",
        title: "Gagal Mengembalikan Data",
        description: "Terjadi kesalahan saat memproses pengembalian data."
      })
    } finally {
      setIsRestoringDinas(false)
      setShowRestoreDinasDialog(false)
      setRestoreDinasPending(null)
      if (viewingActor?.id === actor.id) {
        setViewingActor(null)
      }
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-4 md:space-y-6">
      <div className={cn("space-y-4 md:space-y-6", actorToPrint && "print:hidden")}>
        <div className="hidden print:block text-center space-y-2 mb-8 border-b-2 border-black pb-4">
          <h1 className="text-xl font-black uppercase">LAPORAN DATA DITOLAK / CANCEL (SIMPU)</h1>
          <p className="text-xs font-bold uppercase tracking-widest">Sistem Informasi Manajemen Pelaku Usaha</p>
        </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div className="flex items-start gap-3">
          <SidebarTrigger className="text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 p-2 rounded-xl transition-colors cursor-pointer mt-0.5" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-2xs">
                <Ban className="w-3.5 h-3.5" />
                Modul Arsip Penolakan
              </span>
              {filterCoordinator && (
                <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/60 px-2.5 py-0.5 rounded-lg border border-red-200 dark:border-red-800 text-xs">
                  <span className="font-bold text-red-700 dark:text-red-300 uppercase">Koordinator: {filterCoordinator}</span>
                  <Link href="/rejected" className="text-red-500 hover:text-red-700 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Data Ditolak / Batal
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Arsip data pelaku usaha yang ditolak pada tahap pendataan atau dibatalkan oleh dinas teknis.
            </p>
          </div>
        </div>

        <Button 
          onClick={() => window.print()} 
          className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm gap-2 h-10 px-5 cursor-pointer w-full sm:w-auto shrink-0"
        >
          <Printer className="w-4 h-4" /> CETAK LAPORAN
        </Button>
      </div>

      {/* Tabs Control (Pendataan vs Dinas) */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => { setActiveTab('pendataan'); setSearchQuery(''); setCategory(''); }}
          className={cn(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer",
            activeTab === 'pendataan'
              ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/25 ring-2 ring-red-500/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-800 hover:border-red-300 hover:bg-red-50/40"
          )}
        >
          <Ban className="w-4 h-4" />
          <span>Ditolak Pendataan</span>
          <span className={cn(
            "ml-1 px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-2xs",
            activeTab === 'pendataan' ? "bg-white/25 text-white" : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
          )}>
            {actors?.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('dinas'); setSearchQuery(''); setCategory(''); }}
          className={cn(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer",
            activeTab === 'dinas'
              ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-800 hover:border-orange-300 hover:bg-orange-50/40"
          )}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Dibatalkan Dinas</span>
          <span className={cn(
            "ml-1 px-2.5 py-0.5 rounded-full text-[11px] font-black shadow-2xs",
            activeTab === 'dinas' ? "bg-white/25 text-white" : "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300"
          )}>
            {actorsDinas?.length ?? 0}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 print:hidden">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input 
            placeholder="Cari Nama Pelaku / Nama Usaha / NIK..." 
            className="pl-10 pr-9 h-11 bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 focus-visible:ring-2 focus-visible:ring-red-500 rounded-xl text-xs sm:text-sm font-medium w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              title="Hapus Pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="w-full md:w-auto flex items-center gap-3 shrink-0">
          <select 
            className="w-full md:w-auto h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-700 dark:text-slate-200 cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Semua Kategori Usaha</option>
            <option value="Kuliner">Kuliner</option>
            <option value="Bukan Kuliner">Bukan Kuliner</option>
          </select>

          <div className="hidden lg:flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Total: <span className="ml-1 text-slate-800 dark:text-slate-200 font-black">
              {activeTab === 'pendataan' ? (actors?.length || 0) : (actorsDinas?.length || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table / Cards Container */}
      <div className={cn(
        "border-2 rounded-2xl md:rounded-3xl overflow-hidden shadow-xs bg-white dark:bg-slate-900 transition-all",
        activeTab === 'dinas' ? "border-orange-200 dark:border-orange-900/60" : "border-red-200 dark:border-red-900/60"
      )}>
        {/* Colored Top Stripe Indicator */}
        <div className={cn("h-1.5 w-full shrink-0", activeTab === 'dinas' ? "bg-orange-600" : "bg-red-600")} />

        {(activeTab === 'pendataan' ? isLoading : isLoadingDinas) ? (
          <div className="p-6 space-y-4">
            <div className="flex gap-4 border-b pb-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-5 flex-1 rounded-lg" />)}
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4 pt-2">
                {[...Array(6)].map((_, j) => <Skeleton key={j} className="h-10 flex-1 rounded-xl" />)}
              </div>
            ))}
          </div>
        ) : activeTab === 'pendataan' ? (
          /* ===== TAB PENDATAAN ===== */
          <>
            {/* Mobile Card List (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {actors && actors.length > 0 ? (
                actors.map((actor, index) => (
                  <div 
                    key={actor.id}
                    onClick={() => handleOpenDetail(actor)}
                    className="p-4 space-y-3 bg-white dark:bg-slate-900 active:bg-red-50/40 transition-colors cursor-pointer"
                  >
                    {/* Row 1: Nomor, Nama Usaha & Kategori */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-[11px] font-black inline-flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-black text-slate-900 dark:text-white text-sm uppercase leading-tight block">
                            {actor.businessName || "NAMA USAHA KOSONG"}
                          </span>
                          {actor.businessLocation && (
                            <span className="text-[10px] text-slate-400 font-medium line-clamp-1">
                              {actor.businessLocation}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0",
                        actor.businessCategory === 'Kuliner' 
                          ? "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" 
                          : "border-blue-300 text-blue-800 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                      )}>
                        {actor.businessCategory || "-"}
                      </span>
                    </div>

                    {/* Row 2: Pelaku Usaha & Koordinator */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pelaku Usaha</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 uppercase truncate block">{actor.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-mono font-bold block">{actor.nik}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Usulan Koordinator</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase truncate block">{normalizeCoordinator(actor.coordinator) || "-"}</span>
                      </div>
                    </div>

                    {/* Row 3: Alasan Penolakan */}
                    <div className="bg-red-50/80 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/40 rounded-xl p-3 flex items-start gap-2.5">
                      <Ban className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-0.5">
                        <span className="text-[10px] font-black text-red-700 dark:text-red-300 uppercase tracking-wider block">Alasan Penolakan:</span>
                        <p className="text-xs italic font-bold text-red-800 dark:text-red-400 leading-snug">
                          "{actor.rejectionReason || actor.keteranganDinas || "Tidak ada alasan spesifik."}"
                        </p>
                      </div>
                    </div>

                    {/* Row 4: Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8.5 text-xs font-bold border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 rounded-xl gap-1.5 cursor-pointer"
                        onClick={() => handlePrintActorForm(actor)}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Form</span>
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-8.5 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl gap-1.5 shadow-2xs cursor-pointer"
                        onClick={() => handleOpenDetail(actor)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Detail</span>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <Ban className="w-12 h-12 text-red-400/40" />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Tidak Ada Data Ditolak (Pendataan)</p>
                </div>
              )}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/90 dark:bg-slate-850/90 border-b border-slate-200 dark:border-slate-800">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[60px] font-black text-slate-600 dark:text-slate-300 text-center uppercase text-[11px] py-3.5">#</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] py-3.5">Nama Usaha</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] py-3.5">Pelaku Usaha</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] text-center py-3.5">Kategori</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] py-3.5">USULAN</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] py-3.5">Alasan Penolakan</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] text-right py-3.5 pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {actors && actors.length > 0 ? (
                    actors.map((actor, index) => (
                      <TableRow
                        key={actor.id}
                        className="cursor-pointer hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-colors group"
                        onClick={() => handleOpenDetail(actor)}
                      >
                        <TableCell className="text-center py-3.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs inline-flex items-center justify-center">
                            {index + 1}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-slate-900 dark:text-white uppercase text-sm leading-snug tracking-tight">
                              {actor.businessName || "NAMA USAHA KOSONG"}
                            </span>
                            {actor.businessLocation && (
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate max-w-[220px]">
                                {actor.businessLocation}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase">
                              {actor.fullName}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 font-mono tracking-wide">
                              {actor.nik || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-2xs",
                            actor.businessCategory === 'Kuliner' 
                              ? "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" 
                              : "border-blue-300 text-blue-800 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                          )}>
                            {actor.businessCategory || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="inline-flex items-center text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                            {normalizeCoordinator(actor.coordinator) || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex items-start gap-1.5 p-2 rounded-xl bg-red-50/80 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/40 max-w-[260px]">
                            <Ban className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-red-800 dark:text-red-300 leading-snug line-clamp-2 italic" title={actor.rejectionReason || actor.keteranganDinas}>
                              "{actor.rejectionReason || actor.keteranganDinas || "Tidak ada alasan spesifik."}"
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3.5 pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end items-center gap-1.5">
                            <Button 
                              size="sm"
                              variant="outline" 
                              className="h-8 px-2.5 text-xs font-bold border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 rounded-xl gap-1.5 cursor-pointer shadow-2xs" 
                              onClick={() => handlePrintActorForm(actor)} 
                              title="Cetak Form Pembatalan"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Cetak</span>
                            </Button>
                            <Button 
                              size="sm"
                              className="h-8 px-3 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl gap-1.5 cursor-pointer shadow-2xs" 
                              onClick={() => handleOpenDetail(actor)}
                              title="Lihat Detail Lengkap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                          <Ban className="w-12 h-12 text-red-400/30" />
                          <p className="font-black text-xs uppercase tracking-widest text-slate-400">Tidak Ada Data Ditolak (Pendataan)</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          /* ===== TAB DINAS ===== */
          <>
            {/* Mobile Card List for Tab Dinas (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {actorsDinas && actorsDinas.length > 0 ? (
                actorsDinas.map((actor, index) => (
                  <div 
                    key={actor.id}
                    onClick={() => handleOpenDetail(actor)}
                    className="p-4 space-y-3 bg-white dark:bg-slate-900 active:bg-orange-50/40 transition-colors cursor-pointer"
                  >
                    {/* Row 1: Nomor, Nama Usaha & Kategori */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-[11px] font-black inline-flex items-center justify-center shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-black text-slate-900 dark:text-white text-sm uppercase leading-tight block">
                            {actor.businessName || "NAMA USAHA KOSONG"}
                          </span>
                          {actor.businessLocation && (
                            <span className="text-[10px] text-slate-400 font-medium line-clamp-1">
                              {actor.businessLocation}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0",
                        actor.businessCategory === 'Kuliner' 
                          ? "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" 
                          : "border-blue-300 text-blue-800 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                      )}>
                        {actor.businessCategory || "-"}
                      </span>
                    </div>

                    {/* Row 2: Pelaku Usaha & Koordinator */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pelaku Usaha</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 uppercase truncate block">{actor.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-mono font-bold block">{actor.nik}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Usulan Koordinator</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase truncate block">{normalizeCoordinator(actor.coordinator) || "-"}</span>
                      </div>
                    </div>

                    {/* Row 3: Alasan Cancel Dinas & Dibatalkan Oleh */}
                    <div className="bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-0.5">
                          <span className="text-[10px] font-black text-orange-700 dark:text-orange-300 uppercase tracking-wider block">Alasan Cancel Dinas:</span>
                          <p className="text-xs italic font-bold text-orange-800 dark:text-orange-400 leading-snug">
                            "{(actor as any).alasanCancelDinas || actor.keteranganDinas || "Tidak ada alasan spesifik."}"
                          </p>
                        </div>
                      </div>
                      {Boolean((actor as any).cancelDinasBy) && (
                        <div className="text-[10px] text-slate-500 pt-2 border-t border-orange-200/60 dark:border-orange-900/40 flex items-center justify-between">
                          <span className="font-semibold">Dibatalkan Oleh:</span>
                          <span className="font-bold uppercase text-slate-800 dark:text-slate-200">
                            {(() => {
                              const raw = ((actor as any).cancelDinasBy || "").trim()
                              if (!raw || raw === '-') return "-"
                              if (!raw.includes('@')) return raw
                              return raw.split('@')[0].replace(/_/g, ' ').toUpperCase()
                            })()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Row 4: Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      {(isAdmin || isDinas) && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8.5 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl gap-1.5 cursor-pointer"
                          onClick={() => handleRestoreDinasToSurvey(actor)}
                          title="Kembalikan ke Petugas Survey"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kembalikan</span>
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8.5 text-xs font-bold border-orange-300 text-orange-700 hover:bg-orange-50 rounded-xl gap-1.5 cursor-pointer"
                        onClick={() => handlePrintCancelDinas(actor)}
                        disabled={isGeneratingPdf}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Form</span>
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-8.5 text-xs font-black bg-orange-600 hover:bg-orange-700 text-white rounded-xl gap-1.5 shadow-2xs cursor-pointer"
                        onClick={() => { setViewingActor(actor); setIsEditMode(false); }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Detail</span>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <ShieldAlert className="w-12 h-12 text-orange-400/40" />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Tidak Ada Data Cancel dari Dinas</p>
                </div>
              )}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/90 dark:bg-slate-850/90 border-b border-slate-200 dark:border-slate-800">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[60px] font-black text-slate-600 dark:text-slate-300 text-center uppercase text-[11px] py-3.5">#</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] py-3.5">Nama Usaha</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] py-3.5">Pelaku Usaha</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] text-center py-3.5">Kategori</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] py-3.5">USULAN</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] py-3.5">Alasan Cancel Dinas</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] py-3.5">Dibatalkan Oleh</TableHead>
                    <TableHead className="font-black text-slate-700 dark:text-slate-200 uppercase text-[11px] text-right py-3.5 pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {actorsDinas && actorsDinas.length > 0 ? (
                    actorsDinas.map((actor, index) => (
                      <TableRow
                        key={actor.id}
                        className="cursor-pointer hover:bg-orange-50/30 dark:hover:bg-orange-950/20 transition-colors group"
                        onClick={() => handleOpenDetail(actor)}
                      >
                        <TableCell className="text-center py-3.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs inline-flex items-center justify-center">
                            {index + 1}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-slate-900 dark:text-white uppercase text-sm leading-snug tracking-tight">
                              {actor.businessName || "NAMA USAHA KOSONG"}
                            </span>
                            {actor.businessLocation && (
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate max-w-[220px]">
                                {actor.businessLocation}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase">
                              {actor.fullName}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 font-mono tracking-wide">
                              {actor.nik || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-2xs",
                            actor.businessCategory === 'Kuliner' 
                              ? "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" 
                              : "border-blue-300 text-blue-800 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                          )}>
                            {actor.businessCategory || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="inline-flex items-center text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                            {normalizeCoordinator(actor.coordinator) || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex items-start gap-1.5 p-2 rounded-xl bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/40 max-w-[260px]">
                            <ShieldAlert className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-orange-800 dark:text-orange-300 leading-snug line-clamp-2 italic" title={(actor as any).alasanCancelDinas || actor.keteranganDinas}>
                              "{(actor as any).alasanCancelDinas || actor.keteranganDinas || "Tidak ada alasan spesifik."}"
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {(() => {
                              const raw = ((actor as any).cancelDinasBy || "").trim()
                              if (!raw || raw === '-') return "-"
                              if (!raw.includes('@')) return raw
                              return raw.split('@')[0].replace(/_/g, ' ').toUpperCase()
                            })()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3.5 pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end items-center gap-1.5">
                            {(isAdmin || isDinas) && (
                              <Button 
                                size="sm"
                                variant="outline" 
                                className="h-8 px-2.5 text-xs font-bold border-emerald-300 text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 rounded-xl gap-1.5 cursor-pointer shadow-2xs" 
                                onClick={() => handleRestoreDinasToSurvey(actor)} 
                                title="Kembalikan ke Petugas Survey"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">Kembalikan</span>
                              </Button>
                            )}
                            <Button 
                              size="sm"
                              variant="outline" 
                              className="h-8 px-2.5 text-xs font-bold border-orange-300 text-orange-700 bg-orange-50/70 hover:bg-orange-100 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300 rounded-xl gap-1.5 cursor-pointer shadow-2xs" 
                              onClick={() => handlePrintCancelDinas(actor)} 
                              title="Cetak Form Pembatalan Dinas (A4)"
                              disabled={isGeneratingPdf}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Cetak</span>
                            </Button>
                            <Button 
                              size="sm"
                              className="h-8 px-3 text-xs font-black bg-orange-600 hover:bg-orange-700 text-white rounded-xl gap-1.5 cursor-pointer shadow-2xs" 
                              onClick={() => { setViewingActor(actor); setIsEditMode(false); }}
                              title="Lihat Detail Lengkap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                          <ShieldAlert className="w-12 h-12 text-orange-400/30" />
                          <p className="font-black text-xs uppercase tracking-widest text-slate-400">Tidak Ada Data Cancel dari Dinas</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!viewingActor} onOpenChange={(open) => {
        if (!open) {
          setViewingActor(null)
          setIsEditMode(false)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-2 rounded-2xl shadow-2xl bg-white dark:bg-slate-950">
          {viewingActor && (() => {
            const isDinasActor = viewingActor.status === 'verified_dinas' || !!(viewingActor as any).alasanCancelDinas || activeTab === 'dinas'
            return (
              <div className="flex flex-col relative">
                {/* Top Accent Stripe */}
                <div className={cn("h-2.5 w-full shrink-0 rounded-t-2xl", isDinasActor ? "bg-orange-600" : "bg-red-600")} />

                <div className="p-5 sm:p-7 space-y-6">
                  {/* Modal Header */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4 pr-10">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-2xs",
                          isDinasActor 
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
                            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800"
                        )}>
                          {isDinasActor ? <ShieldAlert className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          {isDinasActor ? "Dibatalkan Dinas" : "Ditolak Pendataan"}
                        </span>
                        {viewingActor.businessCategory && (
                          <Badge variant="outline" className="text-[10px] font-black uppercase">
                            {viewingActor.businessCategory}
                          </Badge>
                        )}
                      </div>
                      <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {isEditMode ? "Edit Data Ditolak" : "Detail Lengkap Data Ditolak / Batal"}
                      </DialogTitle>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {isEditMode ? "Perbarui informasi penolakan atau data profil pelaku usaha" : "Informasi lengkap mengenai pembatalan berkas dan profil usaha"}
                      </p>
                    </div>
                <div className="flex flex-wrap gap-2">
                  {!isEditMode && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={isGeneratingPdf}
                      onClick={() => handlePrintActorForm(viewingActor)}
                      className={cn(
                        "font-bold",
                        (viewingActor.status === 'verified_dinas' || !!(viewingActor as any).alasanCancelDinas || activeTab === 'dinas')
                          ? "border-orange-500 text-orange-600 bg-orange-50 hover:bg-orange-100"
                          : "border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100"
                      )}
                      title="Cetak Form Pembatalan"
                    >
                      {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />} 
                      Cetak Form
                    </Button>
                  )}
                  {isAdmin && (
                    <Button 
                      variant={isEditMode ? "outline" : "default"} 
                      size="sm" 
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={cn("font-bold", isEditMode ? "border-amber-500 text-amber-600" : "bg-primary")}
                    >
                      {isEditMode ? "Batal Edit" : <><Edit3 className="w-4 h-4 mr-2"/> Edit Semua Data</>}
                    </Button>
                  )}
                  {(isAdmin || isDinas) && !isEditMode && (
                    <>
                      {((viewingActor.status === 'verified_dinas' && viewingActor.hasilVerifikasiDinas === 'Tidak Lolos') || !!(viewingActor as any).alasanCancelDinas || activeTab === 'dinas') ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleRestoreDinasToSurvey(viewingActor)} 
                          className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-bold" 
                          title="Kembalikan ke Petugas Survey"
                        >
                          <RotateCcw className="w-4 h-4 mr-1.5" /> Kembalikan ke Survey
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleRevert(viewingActor.id, viewingActor.fullName)} className="border-amber-500 text-amber-600 hover:bg-amber-50 font-bold" title="Kembalikan ke antrean awal (Pending)">
                          <RotateCcw className="w-4 h-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Kembalikan Pending</span><span className="sm:hidden">Revert</span>
                        </Button>
                      )}
                      {isAdmin && (
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(viewingActor.id, viewingActor.fullName)} className="font-bold shadow-xs" title="Hapus Permanen">
                          <Trash2 className="w-4 h-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Hapus Permanen</span><span className="sm:hidden">Hapus</span>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isEditMode ? (
                <form onSubmit={handleSaveFullEdit} className="grid gap-6 py-4">
                  <section className="p-4 bg-red-50 border border-red-200 rounded-2xl relative">
                    <p className="text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Alasan Penolakan (Edit)</p>
                    <Input name="rejectionReason" defaultValue={viewingActor.rejectionReason || viewingActor.keteranganDinas} className="font-bold text-red-700 bg-white" placeholder="Masukkan alasan penolakan" required />
                  </section>
                  
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Lengkap</Label><Input name="fullName" defaultValue={viewingActor.fullName} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">NIK</Label><Input value={editNik} onChange={(e) => { const v = e.target.value; setEditNik(v); const dob = extractDobFromNik(v); if (dob) setEditDob(dob); }} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor KK</Label><Input name="noKK" defaultValue={viewingActor.noKK} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Jenis Kelamin</Label>
                        <select name="gender" defaultValue={viewingActor.gender || ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                          <option value="L">Laki-Laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Tempat Lahir</Label><Input value={editPob} onChange={(e) => setEditPob(e.target.value)} placeholder="Masukkan tempat lahir" /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Tanggal Lahir</Label><Input value={editDob} readOnly className="bg-muted" /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor HP</Label><Input name="phone" defaultValue={viewingActor.phone} /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kecamatan</Label><Input name="kecamatan" defaultValue={viewingActor.kecamatan} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kelurahan</Label><Input name="kelurahan" defaultValue={viewingActor.kelurahan} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">RT/RW</Label><Input name="rtRw" defaultValue={viewingActor.rtRw} /></div>
                      <div className="space-y-1 md:col-span-3"><Label className="text-xs font-bold uppercase">Alamat Lengkap</Label><Input name="address" defaultValue={viewingActor.address} /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Usaha</Label><Input name="businessName" defaultValue={viewingActor.businessName} required /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Kategori</Label><Input name="businessCategory" defaultValue={viewingActor.businessCategory} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Lokasi Usaha</Label><Input name="businessLocation" defaultValue={viewingActor.businessLocation} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Koordinator</Label><Input name="coordinator" defaultValue={viewingActor.coordinator} /></div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Data Perbankan (Edit)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nama Bank</Label><Input name="bankName" defaultValue={viewingActor.bankName} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Nomor Rekening</Label><Input name="bankNumber" defaultValue={viewingActor.bankNumber} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold uppercase">Pemilik Rekening</Label><Input name="bankOwner" defaultValue={viewingActor.bankOwner} className="uppercase" /></div>
                    </div>
                  </section>

                  <div className="sticky bottom-0 bg-white dark:bg-zinc-950 p-4 border-t flex justify-end gap-2 mt-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] rounded-b-lg z-10">
                    <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} className="font-bold">Batal</Button>
                    <Button type="submit" className="bg-primary font-bold"><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</Button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-5 py-3">
                  {/* HERO ALERT: REJECTION REASON */}
                  <section className={cn(
                    "relative overflow-hidden rounded-2xl p-5 border-2 shadow-xs transition-all",
                    isDinasActor 
                      ? "bg-gradient-to-br from-orange-50/90 via-amber-50/30 to-white dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-950 border-orange-200 dark:border-orange-800/60"
                      : "bg-gradient-to-br from-red-50/90 via-rose-50/30 to-white dark:from-red-950/30 dark:via-slate-900 dark:to-slate-950 border-red-200 dark:border-red-800/60"
                  )}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center font-bold shadow-xs shrink-0",
                          isDinasActor ? "bg-orange-500 text-white" : "bg-red-500 text-white"
                        )}>
                          {isDinasActor ? <ShieldAlert className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className={cn(
                            "text-xs font-black uppercase tracking-wider block",
                            isDinasActor ? "text-orange-700 dark:text-orange-400" : "text-red-700 dark:text-red-400"
                          )}>
                            {isDinasActor ? "Alasan Pembatalan Dinas" : "Alasan Penolakan Pendataan"}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            Catatan resmi hasil verifikasi berkas
                          </span>
                        </div>
                      </div>

                      {((viewingActor as any).cancelDinasBy || (viewingActor as any).rejectedBy) && (
                        <span className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-2xs",
                          isDinasActor
                            ? "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800"
                            : "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
                        )}>
                          Dibatalkan oleh: {(viewingActor as any).cancelDinasBy || (viewingActor as any).rejectedBy}
                        </span>
                      )}
                    </div>

                    <div className={cn(
                      "p-4 rounded-xl border backdrop-blur-xs",
                      isDinasActor 
                        ? "bg-white/90 dark:bg-slate-900/90 border-orange-100 dark:border-orange-900/40" 
                        : "bg-white/90 dark:bg-slate-900/90 border-red-100 dark:border-red-900/40"
                    )}>
                      <p className={cn(
                        "text-sm sm:text-base font-bold leading-relaxed italic",
                        isDinasActor ? "text-orange-950 dark:text-orange-100" : "text-red-950 dark:text-red-100"
                      )}>
                        "{viewingActor.rejectionReason || viewingActor.keteranganDinas || (viewingActor as any).alasanCancelDinas || "Tidak ada alasan spesifik yang dicatat."}"
                      </p>
                    </div>
                  </section>

                  {/* FOTO BUKTI PEMBATALAN DINAS (jika ada) */}
                  {Boolean((viewingActor as any).cancelDinasPhotoUrl || (viewingActor as any).fotoCancelDinas) && (
                    <section className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-orange-50/20 dark:from-slate-900 dark:to-orange-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                            <Camera className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Foto Bukti Pembatalan Dinas
                          </p>
                        </div>
                        <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 font-bold px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                          Dokumentasi Petugas
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div 
                          className="relative group max-w-sm w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                          onClick={() => window.open((viewingActor as any).cancelDinasPhotoUrl || (viewingActor as any).fotoCancelDinas, '_blank')}
                        >
                          <img 
                            src={(viewingActor as any).cancelDinasPhotoUrl || (viewingActor as any).fotoCancelDinas} 
                            alt="Foto Bukti Cancel Dinas" 
                            className="w-full max-h-60 object-cover hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs">
                            <ExternalLink className="w-4 h-4" /> Buka Foto Ukuran Penuh
                          </div>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 mt-2">Klik foto untuk membuka resolusi penuh di tab baru</p>
                      </div>
                    </section>
                  )}

                  {/* INFORMASI PRIBADI */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span>Informasi Pribadi & Identitas</span>
                    </div>

                    {(() => {
                      const parsed = parsePobDob(viewingActor.pobDob || "")
                      const pob = viewingActor.pob || parsed.pob || ""
                      const dob = viewingActor.dob || parsed.dob || ""
                      const actorAge = calculateAge(dob || extractDobFromNik(viewingActor.nik || ""))
                      const genderText = viewingActor.gender ? (String(viewingActor.gender).toUpperCase().startsWith('L') ? 'Laki-Laki' : 'Perempuan') : '-'
                      const waNumber = viewingActor.phone ? String(viewingActor.phone).replace(/\D/g, "").replace(/^0/, "62") : ""

                      return (
                        <div className="space-y-3">
                          {/* Profile Header Bar */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center font-black text-base text-white shadow-xs shrink-0",
                                isDinasActor ? "bg-gradient-to-br from-orange-500 to-amber-600" : "bg-gradient-to-br from-red-500 to-rose-600"
                              )}>
                                {(viewingActor.fullName || "U").charAt(0).toUpperCase()}
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                                  {viewingActor.fullName || "-"}
                                </h3>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                    {genderText}
                                  </span>
                                  {actorAge ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                      {actorAge} Tahun
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {/* Direct WhatsApp Action */}
                            {waNumber ? (
                              <a
                                href={`https://wa.me/${waNumber}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all active:scale-95 shrink-0"
                                title="Kirim Pesan WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>{viewingActor.phone}</span>
                              </a>
                            ) : null}
                          </div>

                          {/* 3 Detail Cards: NIK, KK, Tempat & Tanggal Lahir */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* NIK */}
                            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <CreditCard className="w-3.5 h-3.5 text-slate-400" /> NIK
                                </span>
                                {viewingActor.nik && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(viewingActor.nik, 'nik')}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                                    title="Salin NIK"
                                  >
                                    {copiedKey === 'nik' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                              <div className="flex items-baseline justify-between">
                                <p className="text-sm font-mono font-black text-slate-900 dark:text-white tracking-wide">
                                  {viewingActor.nik || "-"}
                                </p>
                                {copiedKey === 'nik' && (
                                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                                )}
                              </div>
                            </div>

                            {/* Nomor KK */}
                            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-slate-400" /> Nomor KK
                                </span>
                                {viewingActor.noKK && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(viewingActor.noKK, 'noKK')}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                                    title="Salin Nomor KK"
                                  >
                                    {copiedKey === 'noKK' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                              <div className="flex items-baseline justify-between">
                                <p className="text-sm font-mono font-black text-slate-900 dark:text-white tracking-wide">
                                  {viewingActor.noKK || "-"}
                                </p>
                                {copiedKey === 'noKK' && (
                                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                                )}
                              </div>
                            </div>

                            {/* Tempat & Tgl Lahir */}
                            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tempat & Tgl Lahir
                              </span>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {pob || dob ? `${pob || "-"}, ${dob || "-"}` : "-"}
                              </p>
                            </div>
                          </div>

                          {/* Check Data Indicator */}
                          <div className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                            <CheckDataIndicator 
                              actor={viewingActor} 
                              data2023={activeDetailData.data2023}
                              data2024={activeDetailData.data2024}
                              data2025={activeDetailData.data2025}
                              dataBlacklist={activeDetailData.dataBlacklist}
                            />
                          </div>
                        </div>
                      )
                    })()}
                  </section>

                  {/* ALAMAT & DOMISILI */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span>Alamat & Wilayah Domisili</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kecamatan</p>
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{viewingActor.kecamatan || "-"}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kelurahan</p>
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{viewingActor.kelurahan || "-"}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">RT / RW</p>
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100">{viewingActor.rtRw || "-"}</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Alamat Lengkap</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{viewingActor.address || "-"}</p>
                    </div>
                  </section>

                  {/* INFORMASI USAHA & PENGUSUL */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <span>Informasi Usaha & Pengusul</span>
                    </div>

                    {(() => {
                      const found = kuotaData?.find((q: any) => (q.name || q.coordinator || "").toUpperCase().trim() === (viewingActor.coordinator || "").toUpperCase().trim());
                      const coordPhone = found?.phone || found?.noHp || found?.hp || "";
                      
                      const getWaLink = (phoneStr: string) => {
                        if (!phoneStr) return "#";
                        let clean = phoneStr.replace(/\D/g, "");
                        if (clean.startsWith("0")) clean = "62" + clean.slice(1);
                        else if (!clean.startsWith("62")) clean = "62" + clean;
                        return `https://wa.me/${clean}`;
                      };

                      const isBelumAdaPetugas = !viewingActor.petugasSurvey || viewingActor.petugasSurvey.trim() === "" || viewingActor.petugasSurvey.trim() === "-" || viewingActor.petugasSurvey.toUpperCase().trim() === "BELUM ADA";

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Kolom Kiri: Detail Usaha */}
                          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Usaha</span>
                              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{viewingActor.businessName || "-"}</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kategori Usaha</span>
                                <div>
                                  <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    {viewingActor.businessCategory || "-"}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lokasi Usaha</span>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{viewingActor.businessLocation || "-"}</p>
                              </div>
                            </div>
                          </div>

                          {/* Kolom Kanan: Pengusul & Petugas Survey */}
                          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usulan / Koordinator</span>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{viewingActor.coordinator || "-"}</p>
                                {coordPhone ? (
                                  <a
                                    href={getWaLink(coordPhone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs"
                                    title="Hubungi Koordinator via WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>{coordPhone}</span>
                                  </a>
                                ) : null}
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Petugas Survey</span>
                              <div>
                                {isBelumAdaPetugas ? (
                                  <div className="inline-flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400 uppercase bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                                    <span>BELUM ADA PETUGAS</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{viewingActor.petugasSurvey}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </section>

                  {/* DATA REKENING (jika ada) */}
                  {(viewingActor.bankName || viewingActor.bankNumber || viewingActor.bankOwner) && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <CreditCard className="w-3.5 h-3.5" />
                        </div>
                        <span>Data Perbankan & Rekening</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Nama Bank</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{viewingActor.bankName || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Nomor Rekening</p>
                            {viewingActor.bankNumber && (
                              <button
                                type="button"
                                onClick={() => handleCopy(viewingActor.bankNumber!, 'bank')}
                                className="text-slate-400 hover:text-indigo-600 p-0.5"
                                title="Salin Rekening"
                              >
                                {copiedKey === 'bank' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                          <p className="text-xs font-mono font-black text-slate-900 dark:text-white">{viewingActor.bankNumber || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Nama Pemilik</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{viewingActor.bankOwner || "-"}</p>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* DATA TITIK LOKASI VERIFIKASI */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span>Data Titik Lokasi Verifikasi</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(viewingActor as any).verificationLocation && (
                        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col justify-between space-y-2">
                          <div>
                            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Sumber: Verifikasi Admin</span>
                            <p className="text-xs font-mono text-emerald-900 dark:text-emerald-300 font-bold mt-1">{(viewingActor as any).verificationLocation.lat}, {(viewingActor as any).verificationLocation.lon}</p>
                          </div>
                          <a 
                            href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocation.lat},${(viewingActor as any).verificationLocation.lon}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Lihat di Google Maps
                          </a>
                        </div>
                      )}
                      {(viewingActor as any).verificationBypass?.isBypassed && (
                        <div className="bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200/80 dark:border-amber-800/60 space-y-2">
                          <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Sumber: Verifikasi Admin (Bypass)</span>
                          <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">Alasan: {(viewingActor as any).verificationBypass.reason}</p>
                          {(viewingActor as any).verificationBypass.fileBase64 && (
                            <a href={(viewingActor as any).verificationBypass.fileBase64} target="_blank" rel="noreferrer" className="text-[11px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-3 py-1 rounded-lg shadow-2xs hover:bg-amber-300 transition-colors inline-flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5" /> Lihat Bukti Lampiran
                            </a>
                          )}
                        </div>
                      )}
                      {(viewingActor as any).verificationLocationDinas && (
                        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col justify-between space-y-2">
                          <div>
                            <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Sumber: Verifikasi Dinas</span>
                            <p className="text-xs font-mono text-indigo-900 dark:text-indigo-300 font-bold mt-1">{(viewingActor as any).verificationLocationDinas.lat}, {(viewingActor as any).verificationLocationDinas.lon}</p>
                          </div>
                          <a 
                            href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocationDinas.lat},${(viewingActor as any).verificationLocationDinas.lon}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Lihat di Google Maps
                          </a>
                        </div>
                      )}
                      {!(viewingActor as any).verificationLocation && !(viewingActor as any).verificationLocationDinas && !(viewingActor as any).verificationBypass?.isBypassed && (
                        <div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 col-span-full text-center">
                          <p className="text-xs font-medium text-slate-500">Belum ada titik koordinat lokasi yang direkam.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* INFORMASI SISTEM & AUDIT */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                        <History className="w-3.5 h-3.5" />
                      </div>
                      <span>Informasi Sistem & Audit Trail</span>
                    </div>
                    <div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-xl text-xs grid grid-cols-1 sm:grid-cols-3 gap-3 border border-slate-200/80 dark:border-slate-800">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Terakhir</p>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md",
                          isDinasActor
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        )}>
                          {viewingActor.status === 'verified_dinas' ? 'Ditolak Dinas' : 'Ditolak Pendataan'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Petugas Input</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{viewingActor.createdBy || "System"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Waktu Pendaftaran</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {viewingActor.createdAt ? new Date(viewingActor.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : "-"}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
            </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={showRevertDialog}
        onOpenChange={(open) => {
          setShowRevertDialog(open)
          if (!open) setRevertPending(null)
        }}
        icon={<RotateCcw className="w-6 h-6" />}
        title="Kembalikan ke Pending?"
        description={`Kembalikan ${revertPending?.fullName || ''} ke antrean awal (Pending)?`}
        confirmText="Ya, Kembalikan"
        confirmIcon={<RotateCcw className="w-4 h-4" />}
        variant="default"
        onConfirm={executeRevert}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open)
          if (!open) setDeletePending(null)
        }}
        icon={<Trash2 className="w-6 h-6" />}
        title="Hapus Permanen?"
        description={`Hapus permanen ${deletePending?.fullName || ''}? Semua data terkait akan hilang.`}
        confirmText="Ya, Hapus"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        variant="destructive"
        onConfirm={executeDelete}
      />

      <ConfirmDialog
        open={showRestoreDinasDialog}
        onOpenChange={(open) => {
          setShowRestoreDinasDialog(open)
          if (!open) setRestoreDinasPending(null)
        }}
        icon={<RotateCcw className="w-6 h-6 text-emerald-600" />}
        title="Kembalikan ke Petugas Survey?"
        description={`Apakah Anda yakin ingin mengembalikan data "${restoreDinasPending?.fullName || ''}" (${restoreDinasPending?.businessName || ''}) ke antrean Petugas Survey? Seluruh data dan status pembatalan dinas akan dihapus.`}
        confirmText="Ya, Kembalikan ke Survey"
        confirmIcon={<RotateCcw className="w-4 h-4" />}
        variant="default"
        onConfirm={executeRestoreDinasToSurvey}
      />
      </div>

      {/* SECTION CETAK FORMULIR PENDAFTARAN - HANYA DI TAMPILAN PRINT */}
      {actorToPrint && (
        <div className="hidden print:block w-full bg-white text-black p-4 font-sans text-[11px] leading-snug">


          {/* Judul Formulir */}
          <div className="text-center mb-4">
            <h3 className="text-[13px] font-black uppercase underline underline-offset-4 decoration-2">FORMULIR PENDAFTARAN PELAKU USAHA MIKRO</h3>
            <p className="text-[8px] font-normal mt-1 text-slate-500">Sistem Informasi Manajemen Pelaku Usaha (SIMPU)</p>
          </div>

          {/* FORMULIR UTAMA - BORDERED TABLE */}
          <table className="w-full border-collapse border border-black mb-3">
            {/* Section A: Data Pribadi */}
            <tbody>
              <tr className="bg-gray-200">
                <td colSpan={4} className="border border-black px-2 py-1 font-black uppercase text-[10px] tracking-wider">
                  A. DATA PRIBADI
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] w-[30%] bg-gray-50">1. Nama Lengkap</td>
                <td colSpan={3} className="border border-black px-2 py-1.5 uppercase font-semibold">{actorToPrint.fullName || ""}</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">2. NIK</td>
                <td colSpan={3} className="border border-black px-2 py-1.5 font-mono font-semibold tracking-wider">{actorToPrint.nik || ""}</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">3. No. Kartu Keluarga</td>
                <td colSpan={3} className="border border-black px-2 py-1.5 font-mono font-semibold tracking-wider">{actorToPrint.noKK || ""}</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">4. Jenis Kelamin</td>
                <td colSpan={3} className="border border-black px-2 py-1.5 font-semibold">{actorToPrint.gender || ""}</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">5. Tempat Lahir</td>
                <td className="border border-black px-2 py-1.5 font-semibold uppercase w-[20%]">{actorToPrint.pob || (actorToPrint.pobDob ? actorToPrint.pobDob.split(',')[0]?.trim() : "") || ""}</td>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50 w-[18%]">6. Tanggal Lahir</td>
                <td className="border border-black px-2 py-1.5 font-semibold">{actorToPrint.dob || (actorToPrint.pobDob ? actorToPrint.pobDob.split(',')[1]?.trim() : "") || ""}</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">7. Nomor HP / WhatsApp</td>
                <td colSpan={3} className="border border-black px-2 py-1.5 font-semibold">{actorToPrint.phone || ""}</td>
              </tr>

              {/* Section B: Alamat */}
              <tr className="bg-gray-200">
                <td colSpan={4} className="border border-black px-2 py-1 font-black uppercase text-[10px] tracking-wider">
                  B. ALAMAT DOMISILI
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">8. Alamat / Jalan</td>
                <td colSpan={3} className="border border-black px-2 py-1.5 uppercase font-semibold">{actorToPrint.address || ""}</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">9. RT / RW</td>
                <td className="border border-black px-2 py-1.5 font-semibold">{actorToPrint.rtRw || ""}</td>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">10. Kelurahan</td>
                <td className="border border-black px-2 py-1.5 font-semibold uppercase">{actorToPrint.kelurahan || ""}</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">11. Kecamatan</td>
                <td className="border border-black px-2 py-1.5 font-semibold uppercase">{actorToPrint.kecamatan || ""}</td>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">12. Kota</td>
                <td className="border border-black px-2 py-1.5 font-semibold uppercase">TANJUNGPINANG</td>
              </tr>

              {/* Section C: Informasi Usaha */}
              <tr className="bg-gray-200">
                <td colSpan={4} className="border border-black px-2 py-1 font-black uppercase text-[10px] tracking-wider">
                  C. INFORMASI USAHA
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">13. Nama Usaha</td>
                <td colSpan={3} className="border border-black px-2 py-1.5 uppercase font-semibold">{actorToPrint.businessName || ""}</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">14. Kategori Usaha</td>
                <td className="border border-black px-2 py-1.5 uppercase font-semibold">{actorToPrint.businessCategory || ""}</td>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">15. Lokasi Usaha</td>
                <td className="border border-black px-2 py-1.5 uppercase font-semibold">{actorToPrint.businessLocation || ""}</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">16. Koordinator</td>
                <td colSpan={3} className="border border-black px-2 py-1.5 uppercase font-semibold">{actorToPrint.coordinator || ""}</td>
              </tr>

              {/* Section D: Data Perbankan */}
              <tr className="bg-gray-200">
                <td colSpan={4} className="border border-black px-2 py-1 font-black uppercase text-[10px] tracking-wider">
                  D. DATA PERBANKAN
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">17. Nama Bank</td>
                <td className="border border-black px-2 py-1.5 uppercase font-semibold">{actorToPrint.bankName || ""}</td>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">18. No. Rekening</td>
                <td className="border border-black px-2 py-1.5 font-mono font-semibold">{actorToPrint.bankNumber || ""}</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">19. Atas Nama Rekening</td>
                <td colSpan={3} className="border border-black px-2 py-1.5 uppercase font-semibold">{actorToPrint.bankOwner || ""}</td>
              </tr>

              {/* Section E: Alasan Pembatalan */}
              <tr className="bg-gray-200">
                <td colSpan={4} className="border border-black px-2 py-1 font-black uppercase text-[10px] tracking-wider">
                  E. STATUS & KETERANGAN
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1.5 font-bold text-[10px] bg-gray-50">20. Status</td>
                <td colSpan={3} className="border border-black px-2 py-1.5 font-black uppercase text-red-700">DIBATALKAN / DITOLAK</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-2 font-bold text-[10px] bg-gray-50 align-top">21. Alasan Pembatalan</td>
                <td colSpan={3} className="border border-black px-2 py-2 font-semibold italic leading-relaxed">{actorToPrint.rejectionReason || "Tidak ada keterangan spesifik dari Administrator."}</td>
              </tr>
            </tbody>
          </table>

          {/* Catatan Kaki */}
          <div className="border border-black px-3 py-2 mb-4 bg-gray-50 text-[8px]">
            <p className="font-black uppercase mb-1">DATA DI SHEET BLACKLIST YANG MENYEBABKAN DATA DITOLAK:</p>
            {blacklistMatches && blacklistMatches.length > 0 ? (
              <div className="space-y-1 mt-1 font-mono text-[7px] leading-tight">
                {blacklistMatches.map((match: any, index: number) => (
                  <div key={index} className="border-t border-dotted border-gray-400 pt-1 first:border-t-0 first:pt-0">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-semibold">
                      <div><span className="font-bold">NAMA DI BLACKLIST:</span> {match.nama || "-"}</div>
                      <div><span className="font-bold">NIK / KK:</span> {match.nik || "-"} / {match.noKK || "-"}</div>
                      <div><span className="font-bold">SEKTOR USAHA:</span> {match.usaha || "-"} ({match.nomor || "-"})</div>
                      <div><span className="font-bold">TAHUN / NOMINAL:</span> {match.tahunPengajuan || "-"} / {match.nominal ? `Rp ${Number(match.nominal).toLocaleString('id-ID')}` : "-"}</div>
                      <div><span className="font-bold">STATUS / LPJ:</span> <span className="text-red-700 font-bold">{match.status || "-"}</span> / <span className="text-amber-700 font-bold">{match.statusLpj || "-"}</span></div>
                      <div><span className="font-bold">ALAMAT:</span> {match.alamat || "-"}, {match.kelurahan || "-"}, {match.kecamatan || "-"}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="leading-relaxed italic text-red-600 font-semibold">Formulir ini dicetak secara otomatis dari Sistem Informasi Manajemen Pelaku Usaha (SIMPU). Data terindikasi terdaftar di database blacklist pembanding.</p>
            )}
          </div>

          {/* Lembar Tanda Tangan */}
          <div className="mt-6">
            <p className="text-right text-[10px] font-medium">Tanjungpinang, {printDate || new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
