
"use client"

import { useState, useEffect, useMemo } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject, deleteDocumentNonBlocking } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Check, ShieldAlert, Loader2, Trash2, Eye, Search, User, FileText, Building2, MapPin, History, Edit, XCircle, Clock, AlertTriangle } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { CheckDataIndicator } from "@/components/check-data-indicator"
import { VerificationBadge } from "@/components/verification-badge"
import { cn } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"

function VerificationTimer({ actorId, createdAt, matches, database, isAdmin, actor, dataReady }: { 
  actorId: string, 
  createdAt: string, 
  matches: { has2023: boolean, has2024: boolean, has2025: boolean, hasBlacklist: boolean }, 
  database: any,
  isAdmin: boolean,
  actor: BusinessActor,
  dataReady: boolean
}) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  
  // Priority Logic (sesuai rules baru):
  // 1. Sheet 4 (Blacklist) -> 10 detik   -> Rejected
  // 2. Sheet 3 (2025)      -> Hold        -> Verifikasi Manual (24 jam)
  // 3. Sheet 1 (2024)      -> 3 menit     -> Verified (Data Pelaku Usaha)
  // 4. Sheet 2 (2023)      -> 1 menit     -> Verified (Data Pelaku Usaha)
  // 5. Tidak ada match     -> 45 detik    -> Verified (Verifikasi Manual/Verified)
  
  const hasAnyMatch = matches.hasBlacklist || matches.has2025 || matches.has2024 || matches.has2023;
  const targetMins = matches.hasBlacklist ? (10/60) : 
                     (matches.has2025 ? 1440 : 
                     (matches.has2024 ? 3 : 
                     (matches.has2023 ? 1 : 0.75))); 
  const isHold = !matches.hasBlacklist && matches.has2025;

  // Validation: Check if all mandatory fields are present
  const isDataComplete = !!(
    actor.fullName && actor.nik && actor.noKK && actor.gender && 
    actor.pobDob && actor.phone && actor.address && actor.rtRw && 
    actor.kelurahan && actor.kecamatan && actor.businessCategory && 
    actor.businessName && actor.businessLocation && actor.coordinator
  );

  useEffect(() => {
    // ⚠️ Tunggu semua data master selesai dimuat sebelum mulai timer
    if (!dataReady) return;

    if (!isDataComplete) {
      if (actor.status !== 'lengkapi_data' && isAdmin && database) {
        updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), { status: 'lengkapi_data' });
      }
      return;
    }

    if (isHold) {
       if (actor.status !== 'hold' && actor.status !== 'verifikasi_manual' && isAdmin && database) {
         updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), { status: 'hold' });
       }
       // Don't return, let the timer run to move it to manual after 24h
    }


    const createdAtTimestamp = new Date(createdAt).getTime()
    const validCreatedAt = isNaN(createdAtTimestamp) ? Date.now() : createdAtTimestamp
    const targetTime = validCreatedAt + (targetMins * 60000)
    
    const triggerProcess = () => {
      if (isAdmin && database) {
        if (matches.hasBlacklist) {
          // Rule 1: Blacklist -> Rejected
          updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), {
            status: 'rejected',
            rejectionReason: 'Ditolak Otomatis: Terdaftar di Data Blacklist (Sheet 4).'
          })
        } else if (matches.has2025) {
          // Rule 2: Sheet 3 (2025) -> sudah Hold, pindah ke Verifikasi Manual setelah 24h
          updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), {
            status: 'verifikasi_manual'
          })
        } else if (matches.has2024 || matches.has2023) {
          // Rule 3 & 4: Sheet 1 (2024) atau Sheet 2 (2023) -> Verified
          updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), {
            status: 'verified_actor'
          })
        } else {
          // Rule 5: Tidak ada match -> 45 detik -> Pelaku Usaha (Verified)
          updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), {
            status: 'verified_actor'
          })
        }
      }
    }

    const initialDiff = targetTime - Date.now()
    if (initialDiff <= 0) {
      setTimeLeft(0)
      triggerProcess()
      return
    }

    setTimeLeft(initialDiff)

    const interval = setInterval(() => {
      const now = Date.now()
      const diff = targetTime - now
      
      if (diff <= 0) {
        setTimeLeft(0)
        clearInterval(interval)
        triggerProcess()
      } else {
        setTimeLeft(diff)
      }
    }, 1000)

    return () => clearInterval(interval)
  // ⚠️ actor.status SENGAJA TIDAK ADA di dependency array.
  // Memasukkannya menyebabkan timer reset setiap kali status berubah di Firebase
  // (misal: pending->hold), yang mengakibatkan keterlambatan 5-10 menit.
  // dataReady memastikan timer hanya dimulai sekali saat semua data referensi siap.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady, createdAt, targetMins, isHold, isAdmin, database, actorId, isDataComplete, matches.hasBlacklist])

  if (!isDataComplete) {
    return (
      <div className="flex items-center gap-1.5 text-amber-600 font-black text-[9px] uppercase bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg shadow-sm animate-pulse">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>LENGKAPI DATA</span>
      </div>
    )
  }

  if (timeLeft === 0) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>PROSES...</span>
      </div>
    )
  }

  const formatLargeTime = (ms: number | null) => {
    if (ms === null) return "--:--:--";
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  if (timeLeft === null) return <div className="flex items-center gap-1.5 opacity-20"><Loader2 className="w-3 h-3 animate-spin" /></div>

  if (isHold) {
    return (
      <div className="flex items-center gap-1.5 text-blue-600 font-black text-[9px] uppercase bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg shadow-sm">
        <Clock className="w-3.5 h-3.5" />
        <span>HOLD: {formatLargeTime(timeLeft)}</span>
      </div>
    );
  }

  const hours = Math.floor(timeLeft / 3600000)
  const minutes = Math.floor((timeLeft % 3600000) / 60000)
  const seconds = Math.floor((timeLeft % 60000) / 1000)

  const timerColor = matches.hasBlacklist ? "text-rose-600 border-rose-400 bg-rose-50 animate-pulse" : 
                     timeLeft < 60000 ? "text-amber-600 border-amber-200 bg-amber-50" : 
                     "text-primary border-primary/20 bg-slate-50"

  return (
    <div className={`flex items-center gap-2 font-mono text-[10px] font-black ${timerColor} border px-2.5 py-1.5 rounded-lg shadow-sm transition-all`}>
      <Clock className="w-3 h-3" />
      <span className="tracking-widest">
        {hours > 0 ? `${hours}:` : ""}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

const normalizeGender = (g: string) => {
  const val = (g || "").toLowerCase().trim();
  if (val === "l" || val === "laki-laki") return "Laki-laki";
  if (val === "p" || val === "perempuan") return "Perempuan";
  return "";
};

export default function VerifyActorPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [editingActor, setEditingActor] = useState<BusinessActor | null>(null)
  const [editingOnlyActor, setEditingOnlyActor] = useState<BusinessActor | null>(null)
  const [rejectingActor, setRejectingActor] = useState<BusinessActor | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isBypassMode, setIsBypassMode] = useState(false)
  const [bypassKeterangan, setBypassKeterangan] = useState("")
  const [bypassFileBase64, setBypassFileBase64] = useState("")

  const [editKelurahan, setEditKelurahan] = useState<string>("")
  const [editKecamatan, setEditKecamatan] = useState<string>("")

  const [activeTab, setActiveTab] = useState<'pending' | 'hold' | 'manual'>('pending')

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForProfile } = useList(userProfileRef)
  const userProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isMonitoring = userProfile?.role === 'monitoring'
  const isPetugas = userProfile?.role === 'petugas'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)

  const master2023Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2023') : null, [database])
  const master2024Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2024') : null, [database])
  const master2025Ref = useMemoFirebase(() => database ? ref(database, 'master_data_2025') : null, [database])
  const blacklistRef = useMemoFirebase(() => database ? ref(database, 'blacklist_data') : null, [database])

  const { data: data2023 } = useList<any>(master2023Ref)
  const { data: data2024 } = useList<any>(master2024Ref)
  const { data: data2025 } = useList<any>(master2025Ref)
  const { data: dataBlacklist } = useList<any>(blacklistRef)

  // dataReady = true hanya setelah semua data referensi sudah dimuat dari Firebase.
  // useList() mengembalikan null saat loading, lalu array [] setelah selesai (meski kosong).
  // Ini mencegah timer dimulai dengan data yang masih null/belum siap.
  const dataReady = data2023 !== null && data2024 !== null && data2025 !== null && dataBlacklist !== null

  const actors = allActorsRaw?.filter(a => {
    if (activeTab === 'pending') return a.status === 'pending' || a.status === 'lengkapi_data';
    if (activeTab === 'hold') return a.status === 'hold';
    if (activeTab === 'manual') return a.status === 'verifikasi_manual';
    return false;
  })

  const filteredActors = actors?.filter(actor =>
    (actor.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (actor.nik || "").includes(searchQuery) ||
    (actor.businessName || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const kelurahanList = [
    "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
    "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
    "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
    "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
  ]

  useEffect(() => {
    if (!editKelurahan) {
      setEditKecamatan("")
      return
    }
    const groupKota = ["Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat"]
    const groupBarat = ["Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru"]
    const groupTimur = ["Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana", "Air Raja"]
    const groupBestari = ["Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"]

    if (groupKota.includes(editKelurahan)) setEditKecamatan("Tanjungpinang Kota")
    else if (groupBarat.includes(editKelurahan)) setEditKecamatan("Tanjungpinang Barat")
    else if (groupTimur.includes(editKelurahan)) setEditKecamatan("Tanjungpinang Timur")
    else if (groupBestari.includes(editKelurahan)) setEditKecamatan("Bukit Bestari")
    else setEditKecamatan("")
  }, [editKelurahan])

  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const fetchLocation = () => {
    setIsFetchingLocation(true);

    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation tidak didukung", description: "Browser Anda tidak mendukung fitur lokasi." });
      setIsFetchingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setIsFetchingLocation(false);
        toast({ title: "Lokasi berhasil diambil", description: `Akurasi: ${pos.coords.accuracy ? Math.round(pos.coords.accuracy) + ' meter' : 'Tinggi'}` });
      },
      (err) => {
        setIsFetchingLocation(false);
        let errorMsg = err.message;
        if (err.code === err.PERMISSION_DENIED) errorMsg = "Izin akses lokasi ditolak. Izinkan akses lokasi di pengaturan browser Anda.";
        else if (err.code === err.POSITION_UNAVAILABLE) errorMsg = "Sinyal GPS tidak ditemukan. Harap gunakan perangkat HP/Smartphone atau pastikan GPS aktif.";
        else if (err.code === err.TIMEOUT) errorMsg = "Waktu habis mencari sinyal GPS. Harap gunakan perangkat HP/Smartphone di tempat terbuka.";
        
        toast({ variant: "destructive", title: "Gagal ambil lokasi akurat", description: errorMsg });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSaveAndVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  if (!editingActor || !database || (!isAdmin && !isPetugas)) return

  if (isBypassMode) {
    if (!bypassKeterangan) {
      toast({ variant: "destructive", title: "Gagal", description: "Keterangan bypass wajib diisi." })
      return;
    }
  } else {
    if (!location) {
      toast({ variant: "destructive", title: "Lokasi belum diambil", description: "Harap ambil lokasi sebelum verifikasi." })
      return;
    }
  }

  setIsVerifying(true)
  const formData = new FormData(e.currentTarget)
  const actorRef = ref(database, `businessActors/${editingActor.id}`)
  
  const updatePayload: any = {
    fullName: formData.get("fullName"),
    nik: formData.get("nik"),
    noKK: formData.get("noKK"),
    gender: formData.get("gender"),
    pobDob: formData.get("pobDob"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    rtRw: formData.get("rtRw"),
    kelurahan: editKelurahan,
    kecamatan: editKecamatan,
    businessCategory: formData.get("businessCategory"),
    businessName: formData.get("businessName"),
    businessLocation: formData.get("businessLocation"),
    coordinator: formData.get("coordinator"),
    status: 'verified_actor'
  }

  if (isBypassMode) {
    updatePayload.verificationBypass = {
      isBypassed: true,
      reason: bypassKeterangan,
      fileBase64: bypassFileBase64 || null
    }
    updatePayload.verificationLocation = null
  } else {
    updatePayload.verificationLocation = { lat: location?.lat || 0, lon: location?.lon || 0 }
    updatePayload.verificationBypass = null
  }

  updateDocumentNonBlocking(actorRef, updatePayload)
    
    logActivity({
      query: `VERIFIKASI ADMIN: ${editingActor.fullName} - DITERIMA`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'VERIFIKASI ADMIN',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Berhasil diverifikasi", description: "Data pelaku telah diverifikasi oleh Admin." })
    setEditingActor(null)
    setIsVerifying(false)
  }

  const handleSaveOnly = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingOnlyActor || !database || !isAdmin) return

    setIsVerifying(true)
    const formData = new FormData(e.currentTarget)
    const actorRef = ref(database, `businessActors/${editingOnlyActor.id}`)
    updateDocumentNonBlocking(actorRef, {
      fullName: formData.get("fullName"),
      nik: formData.get("nik"),
      noKK: formData.get("noKK"),
      gender: formData.get("gender"),
      pobDob: formData.get("pobDob"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      rtRw: formData.get("rtRw"),
      kelurahan: editKelurahan,
      kecamatan: editKecamatan,
      businessCategory: formData.get("businessCategory"),
      businessName: formData.get("businessName"),
      businessLocation: formData.get("businessLocation"),
      coordinator: formData.get("coordinator")
    })
    
    logActivity({
      query: `EDIT DATA PENDING: ${editingOnlyActor.fullName}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'VERIFIKASI ADMIN',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Data diperbarui", description: "Perubahan data berhasil disimpan (Status tetap Pending)." })
    setEditingOnlyActor(null)
    setIsVerifying(false)
  }

  const handleReject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!rejectingActor || !database || !isAdmin) return

    const formData = new FormData(e.currentTarget)
    const reason = formData.get("rejectionReason") as string
    const actorRef = ref(database, `businessActors/${rejectingActor.id}`)

    updateDocumentNonBlocking(actorRef, {
      status: 'rejected',
      rejectionReason: reason || "Tanpa keterangan"
    })

    logActivity({
      query: `VERIFIKASI ADMIN: ${rejectingActor.fullName} - DITOLAK`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'VERIFIKASI ADMIN',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({ variant: "destructive", title: "Data Ditolak", description: "Data telah dipindahkan ke menu Ditolak / Cancell." })
    setRejectingActor(null)
  }

  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin) return
    if (confirm(`Hapus data pending milik "${fullName}"?`)) {
      deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
      
      logActivity({
        query: `HAPUS DATA PENDING: ${fullName}`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'VERIFIKASI ADMIN',
        userId: user?.email || user?.uid || 'Admin'
      })
      
      toast({ variant: "destructive", title: "Data Dibatalkan", description: "Data telah dihapus." })
    }
  }

  const openEditDialog = (actor: BusinessActor, type: 'verify' | 'edit') => {
    if (type === 'verify') setEditingActor(actor)
    else setEditingOnlyActor(actor)

    setEditKelurahan(actor.kelurahan || "")
    setEditKecamatan(actor.kecamatan || "")
    setLocation(null)
    setIsBypassMode(false)
    setBypassKeterangan("")
    setBypassFileBase64("")
  }

  if (!isAdmin && !isMonitoring && !isPetugas && !isAdminLoading) return <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center"><ShieldAlert className="w-16 h-16 text-destructive" /><h1 className="text-2xl font-bold">Akses Ditolak</h1></div>

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-3xl font-bold text-primary font-headline">Verifikasi Admin</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-xs uppercase font-black tracking-widest">Manajemen Verifikasi Data Pelaku Usaha</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          {[
            { id: 'pending', label: 'Menunggu', count: (allActorsRaw?.filter(a => a.status === 'pending' || a.status === 'lengkapi_data').length || 0) },
            { id: 'hold', label: 'HOLD', count: (allActorsRaw?.filter(a => a.status === 'hold').length || 0) },
            { id: 'manual', label: 'Manual', count: (allActorsRaw?.filter(a => a.status === 'verifikasi_manual').length || 0) }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab.label}
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[8px]",
                activeTab === tab.id ? "bg-primary text-white" : "bg-slate-200 text-slate-500"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Cari..."
            className="flex h-10 w-full rounded-xl border border-primary/20 bg-card px-3 py-2 pl-9 text-xs text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="border border-slate-200/60 shadow-md overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold">Nama Lengkap</TableHead>
                  <TableHead className="font-bold">NIK</TableHead>
                  <TableHead className="font-bold">Kategori</TableHead>
                   <TableHead className="font-bold">Usaha</TableHead>
                   <TableHead className="font-bold">Koordinator</TableHead>
                   <TableHead className="font-bold text-center">Countdown</TableHead>
                   <TableHead className="text-right font-bold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActors?.map((actor) => {
                  return (
                  <TableRow key={actor.id} className={cn(
                    "hover:bg-primary/5 transition-colors border-b border-slate-100",
                    actor.status === 'verifikasi_manual' && "bg-rose-50/30"
                  )}>
                    <TableCell className="font-bold text-slate-800">{actor.fullName}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      <div className="font-semibold text-slate-700">{actor.nik}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">KK: {actor.noKK}</div>
                      <VerificationBadge actor={actor} />
                      <CheckDataIndicator 
                        actor={actor} 
                        data2023={data2023}
                        data2024={data2024}
                        data2025={data2025}
                        dataBlacklist={dataBlacklist}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">
                        {actor.businessCategory}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">{actor.businessName}</TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-600 uppercase">
                        {actor.coordinator || "-"}
                      </span>
                    </TableCell>
                     <TableCell>
                      <div className="flex justify-center">
                         <VerificationTimer 
                          actorId={actor.id} 
                          createdAt={actor.createdAt} 
                          {...(() => {
                            const checkMatch = (data: any[] | null) => (data || []).some((m: any) => 
                              (m.nik && m.nik === actor.nik) || (m.noKK && m.noKK === actor.noKK)
                            );
                            
                            return {
                              matches: {
                                has2023: checkMatch(data2023),
                                has2024: checkMatch(data2024),
                                has2025: checkMatch(data2025),
                                hasBlacklist: checkMatch(dataBlacklist),
                              }
                            }
                          })()}
                          database={database}
                          isAdmin={isAdmin || isPetugas}
                          actor={actor}
                          dataReady={dataReady}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                        <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => setViewingActor(actor)} className="h-8 w-8 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg shadow-sm" title="Lihat Detail">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            {viewingActor && (
                              <>
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                                    <FileText className="w-6 h-6" /> Detail Pelaku Usaha
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-6 py-4">
                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                      {[
                                        { label: "Nama Lengkap", value: viewingActor.fullName },
                                        { label: "NIK", value: viewingActor.nik },
                                        { label: "Nomor KK", value: viewingActor.noKK },
                                        { label: "Jenis Kelamin", value: viewingActor.gender },
                                        { label: "Tempat/Tgl Lahir", value: viewingActor.pobDob },
                                        { label: "Nomor HP", value: viewingActor.phone }
                                      ].map((item, i) => (
                                        <div key={i} className="space-y-1">
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                          <p className="text-xs font-bold">{item.value || "-"}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                      {[
                                        { label: "Kecamatan", value: viewingActor.kecamatan },
                                        { label: "Kelurahan", value: viewingActor.kelurahan },
                                        { label: "RT/RW", value: viewingActor.rtRw },
                                        { label: "Alamat Lengkap", value: viewingActor.address, fullWidth: true }
                                      ].map((item, i) => (
                                        <div key={i} className={item.fullWidth ? "md:col-span-3 space-y-1" : "space-y-1"}>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                          <p className="text-xs font-bold">{item.value || "-"}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
                                      {[
                                        { label: "Usaha", value: viewingActor.businessName },
                                        { label: "Kategori Usaha", value: viewingActor.businessCategory },
                                        { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                                        { label: "KORLAP / DEWAN AKTIF", value: viewingActor.coordinator }
                                      ].map((item, i) => (
                                        <div key={i} className="space-y-1">
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                          <p className="text-xs font-bold">{item.value || "-"}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Data Titik Lokasi Verifikasi</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {(viewingActor as any).verificationLocation && (
                                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                          <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Sumber: Verifikasi Admin</p>
                                          <p className="text-xs font-mono text-emerald-800 font-semibold">{(viewingActor as any).verificationLocation.lat}, {(viewingActor as any).verificationLocation.lon}</p>
                                          <a href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocation.lat},${(viewingActor as any).verificationLocation.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-2 inline-block">Lihat di Peta</a>
                                        </div>
                                      )}
                                      {(viewingActor as any).verificationBypass?.isBypassed && (
                                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                          <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Sumber: Verifikasi Admin (Bypass)</p>
                                          <p className="text-xs text-amber-800 font-medium mb-2">Alasan: {(viewingActor as any).verificationBypass.reason}</p>
                                          {(viewingActor as any).verificationBypass.fileBase64 && (
                                            <a href={(viewingActor as any).verificationBypass.fileBase64} target="_blank" rel="noreferrer" className="text-[10px] font-bold bg-amber-200 text-amber-800 px-3 py-1 rounded shadow-sm hover:bg-amber-300 transition-colors inline-block mt-1">Lihat Bukti Lampiran</a>
                                          )}
                                        </div>
                                      )}
                                      {(viewingActor as any).verificationLocationDinas && (
                                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                          <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Sumber: Verifikasi Dinas</p>
                                          <p className="text-xs font-mono text-indigo-800 font-semibold">{(viewingActor as any).verificationLocationDinas.lat}, {(viewingActor as any).verificationLocationDinas.lon}</p>
                                          <a href={`https://www.google.com/maps?q=${(viewingActor as any).verificationLocationDinas.lat},${(viewingActor as any).verificationLocationDinas.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline mt-2 inline-block">Lihat di Peta</a>
                                        </div>
                                      )}
                                      {!(viewingActor as any).verificationLocation && !(viewingActor as any).verificationLocationDinas && !(viewingActor as any).verificationBypass?.isBypassed && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-full">
                                          <p className="text-xs font-medium text-slate-500 text-center">Belum ada titik lokasi yang direkam.</p>
                                        </div>
                                      )}
                                    </div>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Audit Sistem</div>
                                    <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground uppercase">Status</p>
                                        <p className="text-primary">{(viewingActor.status || "").toUpperCase()}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground uppercase">Diinput Oleh</p>
                                        <p>{viewingActor.createdBy || "System"}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground uppercase">Waktu Input</p>
                                        <p>{viewingActor.createdAt ? new Date(viewingActor.createdAt).toLocaleString('id-ID') : "-"}</p>
                                      </div>
                                    </div>
                                  </section>
                                </div>
                              </>
                            )}
                          </DialogContent>
                        </Dialog>

                        {isAdmin && !isMonitoring && (
                          <Dialog open={!!editingOnlyActor && editingOnlyActor.id === actor.id} onOpenChange={(open) => !open && setEditingOnlyActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="outline" onClick={() => openEditDialog(actor, 'edit')} className="h-8 w-8 border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg shadow-sm" title="Edit Data">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              {editingOnlyActor && (
                                <form onSubmit={handleSaveOnly}>
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl font-black text-amber-600 uppercase flex items-center gap-2">
                                      <Edit className="w-6 h-6" /> Edit Data Pelaku (Tanpa Verifikasi)
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-6 py-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Nama Lengkap</Label>
                                        <Input name="fullName" defaultValue={editingOnlyActor.fullName} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">NIK (16 Digit)</Label>
                                        <Input name="nik" defaultValue={editingOnlyActor.nik} maxLength={16} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">No. KK (16 Digit)</Label>
                                        <Input name="noKK" defaultValue={editingOnlyActor.noKK} maxLength={16} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Jenis Kelamin</Label>
                                        <Select name="gender" defaultValue={normalizeGender(editingOnlyActor.gender)}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                            <SelectItem value="Perempuan">Perempuan</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Tempat/Tgl Lahir</Label>
                                        <Input name="pobDob" defaultValue={editingOnlyActor.pobDob} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">No. HP</Label>
                                        <Input name="phone" defaultValue={editingOnlyActor.phone} required />
                                      </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Kelurahan</Label>
                                        <Select value={editKelurahan} onValueChange={setEditKelurahan}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent className="max-h-[200px]">
                                            {kelurahanList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold text-muted-foreground">Kecamatan (Otomatis)</Label>
                                        <Input value={editKecamatan} readOnly className="bg-muted" />
                                      </div>
                                      <div className="space-y-2 md:col-span-2">
                                        <Label className="font-bold">Alamat Lengkap</Label>
                                        <Input name="address" defaultValue={editingOnlyActor.address} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">RT / RW</Label>
                                        <Input name="rtRw" defaultValue={editingOnlyActor.rtRw} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Koordinator</Label>
                                        <Input name="coordinator" defaultValue={editingOnlyActor.coordinator} required />
                                      </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Jenis Usaha</Label>
                                        <Select name="businessCategory" defaultValue={editingOnlyActor.businessCategory}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Kuliner">Kuliner</SelectItem>
                                            <SelectItem value="Bukan Kuliner">Bukan Kuliner</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Usaha</Label>
                                        <Input name="businessName" defaultValue={editingOnlyActor.businessName} required />
                                      </div>
                                      <div className="space-y-2 md:col-span-2">
                                        <Label className="font-bold">Lokasi Usaha</Label>
                                        <Input name="businessLocation" defaultValue={editingOnlyActor.businessLocation} required />
                                      </div>
                                    </div>
                                  </div>
                                  <DialogFooter className="gap-2">
                                    <Button type="button" variant="outline" onClick={() => setEditingOnlyActor(null)}>Batal</Button>
                                    <Button type="submit" disabled={isVerifying} className="bg-amber-600 hover:bg-amber-700 text-white font-bold min-w-[150px]">
                                      {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit className="w-4 h-4 mr-2" />} SIMPAN PERUBAHAN
                                    </Button>
                                  </DialogFooter>
                                </form>
                              )}
                            </DialogContent>
                          </Dialog>
                        )}

                        {(isAdmin || isPetugas) && !isMonitoring && (
                          <Dialog open={!!editingActor && editingActor.id === actor.id} onOpenChange={(open) => !open && setEditingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="outline" onClick={() => openEditDialog(actor, 'verify')} className="h-8 w-8 border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg shadow-sm" title="Verifikasi">
                                <Check className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              {editingActor && (
                                <form onSubmit={handleSaveAndVerify}>
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                                      <ShieldAlert className="w-6 h-6" /> Verifikasi Admin
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-6 py-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Nama Lengkap</Label>
                                        <Input name="fullName" defaultValue={editingActor.fullName} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">NIK (16 Digit)</Label>
                                        <Input name="nik" defaultValue={editingActor.nik} maxLength={16} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">No. KK (16 Digit)</Label>
                                        <Input name="noKK" defaultValue={editingActor.noKK} maxLength={16} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Jenis Kelamin</Label>
                                        <Select name="gender" defaultValue={normalizeGender(editingActor.gender)}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                            <SelectItem value="Perempuan">Perempuan</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Tempat/Tgl Lahir</Label>
                                        <Input name="pobDob" defaultValue={editingActor.pobDob} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">No. HP</Label>
                                        <Input name="phone" defaultValue={editingActor.phone} required />
                                      </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Kelurahan</Label>
                                        <Select value={editKelurahan} onValueChange={setEditKelurahan}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent className="max-h-[200px]">
                                            {kelurahanList.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold text-muted-foreground">Kecamatan (Otomatis)</Label>
                                        <Input value={editKecamatan} readOnly className="bg-muted" />
                                      </div>
                                      <div className="space-y-2 md:col-span-2">
                                        <Label className="font-bold">Alamat Lengkap</Label>
                                        <Input name="address" defaultValue={editingActor.address} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">RT / RW</Label>
                                        <Input name="rtRw" defaultValue={editingActor.rtRw} required />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Koordinator</Label>
                                        <Input name="coordinator" defaultValue={editingActor.coordinator} required />
                                      </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="font-bold">Jenis Usaha</Label>
                                        <Select name="businessCategory" defaultValue={editingActor.businessCategory}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Kuliner">Kuliner</SelectItem>
                                            <SelectItem value="Bukan Kuliner">Bukan Kuliner</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="font-bold">Usaha</Label>
                                        <Input name="businessName" defaultValue={editingActor.businessName} required />
                                      </div>
                                      <div className="space-y-2 md:col-span-2">
                                        <Label className="font-bold">Lokasi Usaha</Label>
                                        <Input name="businessLocation" defaultValue={editingActor.businessLocation} required />
                                      </div>
                                    </div>
                                    
                                    {/* Location / Bypass Section */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100 md:col-span-2">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <Label className="font-bold text-primary flex items-center gap-2">
                                          <MapPin className="w-4 h-4" /> Validasi Lokasi (Wajib)
                                        </Label>
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm w-fit">
                                          <Label htmlFor="bypass-mode" className="text-xs font-bold text-slate-700 cursor-pointer">Bypass Lokasi</Label>
                                          <Switch id="bypass-mode" checked={isBypassMode} onCheckedChange={setIsBypassMode} />
                                        </div>
                                      </div>
                                      
                                      {!isBypassMode ? (
                                        <div className="flex flex-col gap-3">
                                          {location ? (
                                             <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                                               <div className="flex items-center gap-3">
                                                 <div className="bg-emerald-100 p-2 rounded-lg">
                                                   <Check className="w-5 h-5 text-emerald-600" />
                                                 </div>
                                                 <div className="space-y-1">
                                                   <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Lokasi Tersimpan</p>
                                                   <p className="text-[10px] text-emerald-600 font-mono bg-emerald-100/50 px-2 py-0.5 rounded w-fit">
                                                     Lat: {location.lat.toFixed(6)}, Lon: {location.lon.toFixed(6)}
                                                   </p>
                                                 </div>
                                               </div>
                                               <Button type="button" variant="outline" size="sm" onClick={fetchLocation} disabled={isFetchingLocation} className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                                                 {isFetchingLocation ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Ubah Titik
                                               </Button>
                                             </div>
                                          ) : (
                                            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                                              <MapPin className="w-8 h-8 text-slate-400 mb-2" />
                                              <p className="text-xs font-medium text-slate-500 mb-4 text-center">Data titik lokasi tempat usaha wajib diambil untuk keperluan validasi.</p>
                                              <Button type="button" onClick={fetchLocation} disabled={isFetchingLocation} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                                                {isFetchingLocation ? (
                                                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sedang Mengambil...</>
                                                ) : "Ambil Lokasi Sekarang"}
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                                          <div className="flex items-center gap-2 text-amber-600 border-b border-amber-200/50 pb-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span className="text-xs font-black uppercase tracking-wider">Bypass Validasi Lokasi Aktif</span>
                                          </div>
                                          <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                              <Label className="text-xs font-bold text-slate-700">Upload Keterangan / Bukti (Opsional)</Label>
                                              <Input type="file" accept="image/*, .pdf" className="bg-white" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if(file) {
                                                  if (file.type.startsWith('image/')) {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                      const img = new Image();
                                                      img.onload = () => {
                                                        const canvas = document.createElement('canvas');
                                                        let width = img.width;
                                                        let height = img.height;
                                                        const MAX_DIM = 800;
                                                        if (width > height && width > MAX_DIM) {
                                                          height *= MAX_DIM / width;
                                                          width = MAX_DIM;
                                                        } else if (height > MAX_DIM) {
                                                          width *= MAX_DIM / height;
                                                          height = MAX_DIM;
                                                        }
                                                        canvas.width = width;
                                                        canvas.height = height;
                                                        const ctx = canvas.getContext('2d');
                                                        ctx?.drawImage(img, 0, 0, width, height);
                                                        setBypassFileBase64(canvas.toDataURL('image/jpeg', 0.6));
                                                      };
                                                      img.src = ev.target?.result as string;
                                                    };
                                                    reader.readAsDataURL(file);
                                                  } else {
                                                    if (file.size > 2 * 1024 * 1024) {
                                                      toast({ variant: "destructive", title: "File terlalu besar", description: "Ukuran maksimal PDF adalah 2MB." });
                                                      e.target.value = '';
                                                      return;
                                                    }
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => setBypassFileBase64(ev.target?.result as string);
                                                    reader.readAsDataURL(file);
                                                  }
                                                } else {
                                                  setBypassFileBase64("");
                                                }
                                              }} />
                                              <p className="text-[9px] text-muted-foreground">Format gambar atau PDF jika diperlukan.</p>
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="text-xs font-bold text-slate-700">Keterangan Bypass (Wajib)</Label>
                                              <Textarea 
                                                value={bypassKeterangan} 
                                                onChange={e => setBypassKeterangan(e.target.value)} 
                                                placeholder="Contoh: Titik lokasi sedang bermasalah / Usaha berpindah..." 
                                                className="min-h-[80px] bg-white resize-none"
                                                required={isBypassMode} 
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <DialogFooter className="gap-2 pt-4 border-t">
                                    <Button type="button" variant="outline" onClick={() => setEditingActor(null)}>Batal</Button>
                                    <Button type="submit" disabled={isVerifying} className="bg-primary font-bold min-w-[150px]">
                                      {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} SIMPAN & VERIFIKASI
                                    </Button>
                                  </DialogFooter>
                                </form>
                              )}
                            </DialogContent>
                          </Dialog>
                        )}

                        {isAdmin && !isMonitoring && (
                          <Dialog open={!!rejectingActor && rejectingActor.id === actor.id} onOpenChange={(open) => !open && setRejectingActor(null)}>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="outline" onClick={() => setRejectingActor(actor)} className="h-8 w-8 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg shadow-sm" title="Tolak Data">
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <form onSubmit={handleReject}>
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-black text-red-600 uppercase">Konfirmasi Penolakan</DialogTitle>
                                  <DialogDescription>Berikan keterangan atau sebab mengapa data ini ditolak.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Nama Pelaku</p>
                                    <p className="text-sm font-bold text-slate-800">{actor.fullName}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">Keterangan / Sebab Ditolak</Label>
                                    <Textarea name="rejectionReason" placeholder="Contoh: Berkas tidak jelas, NIK tidak sesuai, dll..." className="min-h-[100px]" required />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-bold">SIMPAN PENOLAKAN</Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        )}

                        {isAdmin && !isMonitoring && (
                          <Button size="icon" variant="destructive" onClick={() => handleDelete(actor.id, actor.fullName)} className="h-8 w-8 bg-slate-100 text-red-500 hover:bg-red-500 hover:text-white border-0 shadow-sm" title="Hapus Permanen">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
