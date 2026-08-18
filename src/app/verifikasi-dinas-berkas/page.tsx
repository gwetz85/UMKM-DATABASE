"use client"

import { useState, useMemo, useEffect, useDeferredValue } from "react"
import { parsePobDob } from "@/lib/utils"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject } from "@/firebase"
import { ref, query, orderByChild, equalTo, get } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { BusinessActor, PejabatData, PejabatItem } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ShieldAlert, 
  Loader2, 
  Search, 
  Eye, 
  FileText, 
  User, 
  MapPin, 
  Building2, 
  CreditCard, 
  History, 
  ClipboardCheck,
  Check,
  Trash2,
  AlertTriangle,
  Folder,
  UserCheck,
  MessageCircle,
  Award,
  Briefcase,
  BadgeCheck,
  Filter,
  Users,
  Phone,
  Home,
  Landmark,
  CalendarDays,
  ShieldCheck,
  Info,
  ExternalLink,
  Camera,
  FileDown,
  Calendar,
  Key,
  Copy,
  Edit,
  RefreshCw,
  UserX
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { generateBeritaAcaraPDF, formatTanggalIndonesia } from "@/lib/generate-berita-acara-pdf"
import { ensureVerifikatorUser, regenerateVerifikatorUser, deleteVerifikatorUser } from "@/lib/verifikator-service"
import { ConfirmDialog } from "@/components/confirm-dialog"

export default function VerifikasiDinasBerkasPage() {
  const { user, userProfile } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearch = useDeferredValue(searchQuery)
  const [selectedVerifikatorFilter, setSelectedVerifikatorFilter] = useState<string>("ALL")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [verifyingActor, setVerifyingActor] = useState<BusinessActor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [checks, setChecks] = useState({ ktp: false, kk: false, nib: false, foto: false })
  const [showChecklist, setShowChecklist] = useState(false)
  // State untuk modal View lengkap khusus admin
  const [adminViewActor, setAdminViewActor] = useState<BusinessActor | null>(null)
  // Print / Download Berita Acara Modal states
  const [printModalActor, setPrintModalActor] = useState<BusinessActor | null>(null)
  const [selectedPrintDate, setSelectedPrintDate] = useState<string>("")
  const [saveDateToSurvey, setSaveDateToSurvey] = useState<boolean>(true)
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)

  // Edit Pejabat Data Modal states (Admin / Verifikator)
  const [showEditPejabatDialog, setShowEditPejabatDialog] = useState(false)
  const [isSavingPejabat, setIsSavingPejabat] = useState(false)
  const [pejabatEditForm, setPejabatEditForm] = useState({
    verifikatorNama: "",
    verifikatorNipppk: "",
    verifikatorPangkat: "",
    verifikatorJabatan: "",
    petugasNama: "",
    petugasNipppk: "",
    petugasPangkat: "",
    petugasJabatan: "",
    targetGroupNipKey: "",
    targetActorId: "",
    syncAllInGroup: true
  })

  // Delete Account Verifikator Dinas states (Admin only)
  const [showDeleteVerifikatorDialog, setShowDeleteVerifikatorDialog] = useState(false)
  const [deleteVerifikatorTarget, setDeleteVerifikatorTarget] = useState<{ username: string; displayName: string } | null>(null)
  const [isDeletingVerifikator, setIsDeletingVerifikator] = useState(false)

  // Survey Photo Cache for on-demand photo loading
  const [surveyPhotoMap, setSurveyPhotoMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const targetId = verifyingActor?.id || adminViewActor?.id
    if (!targetId || !database) return
    if (surveyPhotoMap[targetId]) return

    const direct = verifyingActor?.surveyData?.fotoSurveyUrl || adminViewActor?.surveyData?.fotoSurveyUrl
    if (direct) {
      setSurveyPhotoMap(prev => ({ ...prev, [targetId]: direct }))
      return
    }

    const pRef = ref(database, `survey_photos/${targetId}/fotoSurveyUrl`)
    get(pRef).then(snap => {
      if (snap.exists()) {
        setSurveyPhotoMap(prev => ({ ...prev, [targetId]: snap.val() }))
      }
    }).catch(console.error)
  }, [verifyingActor?.id, adminViewActor?.id, database, verifyingActor?.surveyData?.fotoSurveyUrl, adminViewActor?.surveyData?.fotoSurveyUrl])

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin' || userProfile?.role === 'superadmin'
  const isVerifikatorDinas = userProfile?.role === 'verifikator_dinas' || userProfile?.role === 'dinas'
  const isPetugas = userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('verified_dinas'))
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const kuotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const systemUsersRef = useMemoFirebase(() => database ? ref(database, 'system_users') : null, [database])

  const { data: kuotaData } = useList<any>(kuotaRef)
  const { data: systemUsers } = useList<any>(systemUsersRef)

  // O(1) Precomputed Maps
  const kuotaMap = useMemo(() => {
    const map = new Map<string, string>()
    if (kuotaData) {
      kuotaData.forEach((q: any) => {
        const name = (q.name || q.coordinator || "").toUpperCase().trim()
        const phone = q.phone || q.noHp || q.hp || ""
        if (name && phone) map.set(name, phone)
      })
    }
    return map
  }, [kuotaData])

  const systemUsersMap = useMemo(() => {
    const byFullName = new Map<string, any>()
    const byNipppk = new Map<string, any>()
    const byUsername = new Map<string, any>()
    if (systemUsers) {
      systemUsers.forEach((u: any) => {
        if (u.fullName) byFullName.set(String(u.fullName).toUpperCase().trim(), u)
        if (u.id) byFullName.set(String(u.id).toUpperCase().trim(), u)
        if (u.nipppk) {
          const clean = String(u.nipppk).replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
          byNipppk.set(clean, u)
        }
        if (u.username) {
          const clean = String(u.username).toLowerCase().trim()
          byUsername.set(clean, u)
        }
      })
    }
    return { byFullName, byNipppk, byUsername }
  }, [systemUsers])

  // Helper untuk mendapatkan PejabatData (Verifikator & Petugas) dari actor atau fallback system_users
  const getActorPejabat = (actor: BusinessActor): PejabatData | undefined => {
    if (actor.pejabatData?.verifikator?.nama) return actor.pejabatData
    if (actor.surveyData?.pejabatData?.verifikator?.nama) return actor.surveyData.pejabatData

    const petugasUpper = String(actor.petugasSurvey || actor.createdBy || "").toUpperCase().trim()
    if (petugasUpper) {
      const found = systemUsersMap.byFullName.get(petugasUpper)
      if (found?.pejabatData?.verifikator?.nama) {
        return found.pejabatData
      }
    }
    return undefined
  }

  // Helper untuk mendapatkan NIPPPK Verifikator yang diisi oleh Petugas Survey
  const getVerifikatorNipppk = (actor: BusinessActor): string => {
    const pd = getActorPejabat(actor)
    const nip = pd?.verifikator?.nipppk ? String(pd.verifikator.nipppk).trim() : ""
    if (nip) return nip

    if (pd?.verifikator?.nama) {
      const nameUpper = String(pd.verifikator.nama).trim().toUpperCase()
      const found = systemUsersMap.byFullName.get(nameUpper)
      if (found?.role === 'verifikator_dinas' && found?.nipppk) return String(found.nipppk).trim()
    }

    if (pd?.verifikator?.nama && pd.verifikator.nama.trim()) {
      return pd.verifikator.nama.trim()
    }
    if (actor.verifikatorDinas && actor.verifikatorDinas.trim()) {
      return actor.verifikatorDinas.trim()
    }
    return "Belum Ditentukan"
  }

  // Helper untuk mendapatkan Nama Verifikator
  const getVerifikatorName = (actor: BusinessActor): string => {
    const pd = getActorPejabat(actor)
    if (pd?.verifikator?.nama && pd.verifikator.nama.trim()) {
      return pd.verifikator.nama.trim()
    }
    if (actor.verifikatorDinas && actor.verifikatorDinas.trim()) {
      return actor.verifikatorDinas.trim()
    }
    return "Belum Ditentukan"
  }

  // Auto-generate akun untuk Verifikator Dinas yang terdeteksi pada data (hanya jika Admin yang membuka)
  useEffect(() => {
    if (!isAdmin || !database || !allActorsRaw) return

    const verifikatorsToEnsure = new Map<string, PejabatItem>()

    allActorsRaw.forEach(actor => {
      const pd = getActorPejabat(actor)
      const v = pd?.verifikator
      if (v?.nama && v.nama.trim() && v.nama !== "Belum Ditentukan") {
        const key = v.nipppk ? v.nipppk.trim().toLowerCase() : v.nama.trim().toUpperCase()
        if (!verifikatorsToEnsure.has(key)) {
          verifikatorsToEnsure.set(key, v)
        }
      }
    })

    verifikatorsToEnsure.forEach(v => {
      ensureVerifikatorUser(database, v).catch(console.error)
    })
  }, [isAdmin, database, allActorsRaw])

  // Filter hanya data yang lolos survey dinas dan belum diverifikasi berkas
  const actors = useMemo(() => {
    const raw = allActorsRaw?.filter(a => a.status === 'verified_dinas' && a.hasilVerifikasiDinas === 'Lolos' && !(a as any).berkasDinasVerified)
    if (!raw) return []

    // ISOLASI DATA: Jika login sebagai Verifikator Dinas (dan bukan Admin), HANYA tampilkan data di bawah verifikator ini
    if (isVerifikatorDinas && !isAdmin) {
      const myNip = userProfile?.nipppk 
        ? String(userProfile.nipppk).trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase() 
        : (userProfile?.username ? String(userProfile.username).trim().toLowerCase() : "")
      const myName = String(userProfile?.fullName || userProfile?.name || "").trim().toUpperCase()

      return raw.filter(actor => {
        const aNip = getVerifikatorNipppk(actor).replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
        const pd = getActorPejabat(actor)
        const aName = String(pd?.verifikator?.nama || actor.verifikatorDinas || getVerifikatorName(actor) || "").trim().toUpperCase()

        if (myNip && aNip && myNip === aNip) return true
        if (myName && aName && (myName === aName || aName.includes(myName) || myName.includes(aName))) return true
        return false
      })
    }

    return raw
  }, [allActorsRaw, isVerifikatorDinas, isAdmin, userProfile, systemUsersMap])

  // Daftar opsi Verifikator (berdasarkan NIPPPK & Nama) yang ada pada data
  const verifikatorOptions = useMemo(() => {
    if (!actors) return []
    const map = new Map<string, { nipKey: string; name: string }>()
    actors.forEach(actor => {
      const nipKey = getVerifikatorNipppk(actor)
      const name = getVerifikatorName(actor)
      if (!map.has(nipKey)) {
        map.set(nipKey, { nipKey, name })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [actors])

  // Filter berdasarkan search query dan pilihan verifikator
  const filteredActors = useMemo(() => {
    if (!actors) return []
    return actors.filter(actor => {
      const nipKey = getVerifikatorNipppk(actor)
      const vName = getVerifikatorName(actor)
      
      // Filter Verifikator
      if (selectedVerifikatorFilter !== "ALL" && nipKey !== selectedVerifikatorFilter) {
        return false
      }

      // Filter Pencarian
      const q = deferredSearch.toLowerCase().trim()
      if (!q) return true

      const pd = getActorPejabat(actor)
      return (
        actor.fullName.toLowerCase().includes(q) ||
        actor.nik.includes(q) ||
        actor.businessName.toLowerCase().includes(q) ||
        (actor.kelurahan && actor.kelurahan.toLowerCase().includes(q)) ||
        (actor.coordinator && actor.coordinator.toLowerCase().includes(q)) ||
        (actor.petugasSurvey && actor.petugasSurvey.toLowerCase().includes(q)) ||
        vName.toLowerCase().includes(q) ||
        nipKey.toLowerCase().includes(q) ||
        (pd?.verifikator?.nipppk && pd.verifikator.nipppk.includes(q)) ||
        (pd?.verifikator?.jabatan && pd.verifikator.jabatan.toLowerCase().includes(q))
      )
    })
  }, [actors, deferredSearch, selectedVerifikatorFilter])

  // Mengelompokkan data berdasarkan NIPPPK Verifikator yang diisi oleh Petugas Survey
  const groupedActorsByVerifikator = useMemo(() => {
    if (!filteredActors) return {}
    return filteredActors.reduce((acc, actor) => {
      const nipKey = getVerifikatorNipppk(actor)
      const pd = getActorPejabat(actor)
      if (!acc[nipKey]) {
        acc[nipKey] = {
          nipKey,
          verifikatorInfo: pd?.verifikator,
          actors: []
        }
      }
      if ((!acc[nipKey].verifikatorInfo?.nama || !acc[nipKey].verifikatorInfo?.nipppk) && pd?.verifikator) {
        acc[nipKey].verifikatorInfo = pd.verifikator
      }
      acc[nipKey].actors.push(actor)
      return acc
    }, {} as Record<string, { nipKey: string; verifikatorInfo?: PejabatItem; actors: BusinessActor[] }>)
  }, [filteredActors])

  const handleVerifyBerkas = () => {
    if (!verifyingActor || !database || (!isAdmin && !isVerifikatorDinas && !isPetugas)) return
    if (!checks.ktp || !checks.kk || !checks.nib || !checks.foto) return

    setIsSubmitting(true)
    try {
      const actorRef = ref(database, `businessActors/${verifyingActor.id}`)
      updateDocumentNonBlocking(actorRef, {
        berkasDinasVerified: true,
        berkasDinasVerifiedAt: new Date().toISOString(),
        berkasDinasVerifiedBy: user?.email || user?.uid || 'Admin'
      })

      logActivity({
        query: `VERIFIKASI BERKAS DINAS: ${verifyingActor.fullName}`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'VERIFIKASI BERKAS',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({ title: "Berhasil Diverifikasi", description: `Data pelaku usaha ${verifyingActor.fullName} telah diverifikasi berkas.` })
      setVerifyingActor(null)
      setChecks({ ktp: false, kk: false, nib: false, foto: false })
    } catch (err: any) {
      console.error("Error verifying berkas:", err)
      toast({ variant: "destructive", title: "Gagal Verifikasi", description: err?.message || "Terjadi kesalahan saat memverifikasi berkas." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditPejabatForGroup = (nipKey: string, group: any, foundUser?: any) => {
    const vInfo = group.verifikatorInfo;
    const sampleActor = group.actors?.[0];
    const samplePd = sampleActor ? getActorPejabat(sampleActor) : undefined;

    setPejabatEditForm({
      verifikatorNama: vInfo?.nama && vInfo.nama !== "Belum Ditentukan" ? vInfo.nama : (foundUser?.fullName || samplePd?.verifikator?.nama || ""),
      verifikatorNipppk: vInfo?.nipppk || foundUser?.nipppk || samplePd?.verifikator?.nipppk || (nipKey !== "Belum Ditentukan" ? nipKey : ""),
      verifikatorPangkat: vInfo?.pangkat || foundUser?.pangkat || samplePd?.verifikator?.pangkat || "",
      verifikatorJabatan: vInfo?.jabatan || foundUser?.jabatan || samplePd?.verifikator?.jabatan || "Verifikator Dinas",
      petugasNama: samplePd?.petugas?.nama || sampleActor?.petugasSurvey || "",
      petugasNipppk: samplePd?.petugas?.nipppk || "",
      petugasPangkat: samplePd?.petugas?.pangkat || "",
      petugasJabatan: samplePd?.petugas?.jabatan || "Petugas Survey",
      targetGroupNipKey: nipKey,
      targetActorId: "",
      syncAllInGroup: true
    });
    setShowEditPejabatDialog(true);
  };

  // Handler untuk membuka dialog konfirmasi hapus akun verifikator
  const handleDeleteVerifikatorAccount = (username: string, displayName: string) => {
    setDeleteVerifikatorTarget({ username, displayName });
    setShowDeleteVerifikatorDialog(true);
  };

  // Handler eksekusi hapus akun verifikator dinas secara permanen
  const executeDeleteVerifikatorAccount = async () => {
    if (!deleteVerifikatorTarget || !database) return;
    const { username, displayName } = deleteVerifikatorTarget;
    setIsDeletingVerifikator(true);
    setShowDeleteVerifikatorDialog(false);
    try {
      const result = await deleteVerifikatorUser(database, username);
      if (result.success) {
        logActivity({
          query: `HAPUS AKUN VERIFIKATOR DINAS: ${displayName} (username: ${username})`,
          results: "Berhasil",
          device: getDeviceType(navigator.userAgent),
          source: "Web",
          method: "MANAJEMEN USER",
          userId: user?.email || user?.uid || "Admin"
        });
        toast({
          title: "✅ Akun Verifikator Dihapus",
          description: `Akun login ${displayName} telah dihapus permanen. Admin dapat generate ID baru kapan saja.`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Gagal Menghapus",
          description: result.error || "Terjadi kesalahan saat menghapus akun."
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "Terjadi kesalahan tidak terduga."
      });
    } finally {
      setIsDeletingVerifikator(false);
      setDeleteVerifikatorTarget(null);
    }
  };



  const openEditPejabatForActor = (actor: BusinessActor) => {
    const pd = getActorPejabat(actor);
    const nipKey = getVerifikatorNipppk(actor);
    setPejabatEditForm({
      verifikatorNama: pd?.verifikator?.nama || actor.verifikatorDinas || "",
      verifikatorNipppk: pd?.verifikator?.nipppk || (nipKey !== "Belum Ditentukan" ? nipKey : ""),
      verifikatorPangkat: pd?.verifikator?.pangkat || "",
      verifikatorJabatan: pd?.verifikator?.jabatan || "Verifikator Dinas",
      petugasNama: pd?.petugas?.nama || actor.petugasSurvey || "",
      petugasNipppk: pd?.petugas?.nipppk || "",
      petugasPangkat: pd?.petugas?.pangkat || "",
      petugasJabatan: pd?.petugas?.jabatan || "Petugas Survey",
      targetGroupNipKey: nipKey,
      targetActorId: actor.id,
      syncAllInGroup: false
    });
    setShowEditPejabatDialog(true);
  };

  const handleSavePejabatEdit = async () => {
    if (!database) return;
    const {
      verifikatorNama, verifikatorNipppk, verifikatorPangkat, verifikatorJabatan,
      petugasNama, petugasNipppk, petugasPangkat, petugasJabatan,
      targetGroupNipKey, targetActorId, syncAllInGroup
    } = pejabatEditForm;

    if (!verifikatorNama.trim()) {
      toast({ variant: "destructive", title: "Lengkapi Data", description: "Nama Verifikator wajib diisi." });
      return;
    }

    setIsSavingPejabat(true);
    try {
      const updatedPejabatData: PejabatData = {
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
          jabatan: petugasJabatan.trim() || "Petugas Survey"
        },
        updatedAt: new Date().toISOString()
      };

      const { ref: dbRef, update } = await import('firebase/database');

      // 1. Update individual actor if targetActorId is set and syncAllInGroup is false
      if (targetActorId && !syncAllInGroup) {
        const updates: any = {
          pejabatData: updatedPejabatData,
          "surveyData/pejabatData": updatedPejabatData,
          verifikatorDinas: updatedPejabatData.verifikator.nama
        };
        await update(dbRef(database, `businessActors/${targetActorId}`), updates);
      } else {
        // 2. Update all actors in the group
        const targetActors = allActorsRaw?.filter(a => {
          if (!a) return false;
          if (targetGroupNipKey && targetGroupNipKey !== "Belum Ditentukan") {
            return getVerifikatorNipppk(a) === targetGroupNipKey ||
                   (a.verifikatorDinas && a.verifikatorDinas.toUpperCase().trim() === verifikatorNama.toUpperCase().trim());
          }
          return (a.verifikatorDinas && a.verifikatorDinas.toUpperCase().trim() === verifikatorNama.toUpperCase().trim()) ||
                 (a.pejabatData?.verifikator?.nama && a.pejabatData.verifikator.nama.toUpperCase().trim() === verifikatorNama.toUpperCase().trim());
        }) || [];

        // If targetActorId was passed with syncAllInGroup, include it
        if (targetActorId && !targetActors.some(a => a.id === targetActorId)) {
          const specificActor = allActorsRaw?.find(a => a.id === targetActorId);
          if (specificActor) targetActors.push(specificActor);
        }

        const batchUpdates: any = {};
        targetActors.forEach(a => {
          batchUpdates[`businessActors/${a.id}/pejabatData`] = updatedPejabatData;
          batchUpdates[`businessActors/${a.id}/surveyData/pejabatData`] = updatedPejabatData;
          batchUpdates[`businessActors/${a.id}/verifikatorDinas`] = updatedPejabatData.verifikator.nama;
        });

        if (Object.keys(batchUpdates).length > 0) {
          await update(dbRef(database), batchUpdates);
        }
      }

      // 3. Update / regenerate system_users for the Verifikator agar ID Login otomatis terupdate mengikuti NIPPPK baru
      await regenerateVerifikatorUser(database, updatedPejabatData.verifikator, targetGroupNipKey);

      // 5. Update local storage if current user
      if (typeof window !== 'undefined' && user?.uid) {
        localStorage.setItem(`pejabatData_${user.uid}`, JSON.stringify(updatedPejabatData));
        localStorage.setItem('pejabatData', JSON.stringify(updatedPejabatData));
      }

      logActivity({
        query: `UPDATE PEJABAT / NIPPPK: ${updatedPejabatData.verifikator.nama} (NIP: ${updatedPejabatData.verifikator.nipppk})`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'VERIFIKASI DINAS BERKAS',
        userId: user?.email || user?.uid || 'Admin'
      });

      toast({
        title: "✅ Data Pejabat & NIPPPK Berhasil Diperbarui",
        description: `NIPPPK ${updatedPejabatData.verifikator.nipppk || "-"} telah tersimpan dan otomatis tergenerate ke Berita Acara Survey.`
      });

      setShowEditPejabatDialog(false);
    } catch (err: any) {
      console.error("Error saving pejabat edit:", err);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: err?.message || "Terjadi kesalahan saat memperbarui data pejabat."
      });
    } finally {
      setIsSavingPejabat(false);
    }
  };

  const resolvePejabatData = async (actor: BusinessActor): Promise<PejabatData | undefined> => {
    // 1. From actor's own pejabatData or surveyData.pejabatData
    const existing = getActorPejabat(actor);
    if (existing?.verifikator?.nama && existing?.petugas?.nama) {
      // Check if systemUsers has an updated NIPPPK for this verifikator or petugas
      if (systemUsers) {
        const vUpper = String(existing.verifikator.nama).trim().toUpperCase();
        const foundVerif = systemUsers.find((u: any) => u.fullName && String(u.fullName).trim().toUpperCase() === vUpper);
        if (foundVerif?.nipppk && !existing.verifikator.nipppk) {
          existing.verifikator.nipppk = String(foundVerif.nipppk).trim();
        }
      }
      return existing;
    }

    // 2. From logged in user profile
    const profilePd = (userProfile as any)?.pejabatData as PejabatData | undefined;
    if (profilePd?.verifikator?.nama && profilePd?.petugas?.nama) {
      return profilePd;
    }

    // 3. From localStorage
    if (typeof window !== 'undefined') {
      try {
        const cached = (user?.uid && localStorage.getItem(`pejabatData_${user.uid}`)) || localStorage.getItem('pejabatData');
        if (cached) {
          const parsed = JSON.parse(cached) as PejabatData;
          if (parsed?.verifikator?.nama && parsed?.petugas?.nama) {
            return parsed;
          }
        }
      } catch (e) {
        console.error("Error reading localStorage pejabatData:", e);
      }
    }

    // 4. Construct from available data
    const verifikatorNama = existing?.verifikator?.nama || (actor as any).verifikatorDinas || getVerifikatorName(actor);
    const petugasNama = existing?.petugas?.nama || actor.petugasSurvey;

    // Check systemUsers for NIPPPK
    let resolvedVerifNip = existing?.verifikator?.nipppk || "";
    let resolvedVerifPangkat = existing?.verifikator?.pangkat || "";
    let resolvedVerifJabatan = existing?.verifikator?.jabatan || "Verifikator Dinas";

    if (systemUsers && verifikatorNama && verifikatorNama !== "Belum Ditentukan") {
      const vUpper = verifikatorNama.toUpperCase().trim();
      const foundU = systemUsers.find((u: any) => u.fullName && String(u.fullName).trim().toUpperCase() === vUpper);
      if (foundU) {
        if (!resolvedVerifNip && foundU.nipppk) resolvedVerifNip = String(foundU.nipppk).trim();
        if (!resolvedVerifPangkat && foundU.pangkat) resolvedVerifPangkat = String(foundU.pangkat).trim();
        if (!resolvedVerifJabatan && foundU.jabatan) resolvedVerifJabatan = String(foundU.jabatan).trim();
      }
    }

    let resolvedPetugasNip = existing?.petugas?.nipppk || "";
    let resolvedPetugasPangkat = existing?.petugas?.pangkat || "";
    let resolvedPetugasJabatan = existing?.petugas?.jabatan || "Petugas Survey";

    if (systemUsers && petugasNama && petugasNama !== "-") {
      const pUpper = petugasNama.toUpperCase().trim();
      const foundP = systemUsers.find((u: any) => u.fullName && String(u.fullName).trim().toUpperCase() === pUpper);
      if (foundP) {
        if (!resolvedPetugasNip && foundP.nipppk) resolvedPetugasNip = String(foundP.nipppk).trim();
        if (!resolvedPetugasPangkat && foundP.pangkat) resolvedPetugasPangkat = String(foundP.pangkat).trim();
        if (!resolvedPetugasJabatan && foundP.jabatan) resolvedPetugasJabatan = String(foundP.jabatan).trim();
      }
    }

    if (verifikatorNama && verifikatorNama !== "Belum Ditentukan") {
      return {
        verifikator: {
          nama: verifikatorNama,
          nipppk: resolvedVerifNip,
          pangkat: resolvedVerifPangkat,
          jabatan: resolvedVerifJabatan
        },
        petugas: {
          nama: petugasNama || "-",
          nipppk: resolvedPetugasNip,
          pangkat: resolvedPetugasPangkat,
          jabatan: resolvedPetugasJabatan
        }
      };
    }

    return existing || profilePd;
  };

  const handleGeneratePDF = async (actor: BusinessActor, customDate?: string, saveToSurvey?: boolean) => {
    if (!actor.surveyData) {
      toast({ variant: "destructive", title: "Data Survey Belum Ada", description: "Lakukan survey terlebih dahulu sebelum mendownload Berita Acara." })
      return
    }
    setGeneratingPdfId(actor.id)
    try {
      const pejabatData = await resolvePejabatData(actor)
      const targetDate = customDate || actor.surveyData.tanggalSurvey || new Date().toISOString().split('T')[0]
      await generateBeritaAcaraPDF(actor, actor.surveyData, pejabatData, targetDate)

      // Simpan tanggal ke database jika dipilih
      if (saveToSurvey && customDate && database) {
        const actorRef = ref(database, `businessActors/${actor.id}`)
        updateDocumentNonBlocking(actorRef, {
          "surveyData/tanggalSurvey": customDate
        })
      }

      toast({ title: "PDF Berhasil Dibuat", description: `Berita Acara Survey untuk ${actor.fullName} telah diunduh.` })
      setPrintModalActor(null)
    } catch (err) {
      console.error(err)
      toast({ variant: "destructive", title: "Gagal Membuat PDF", description: "Terjadi kesalahan saat membuat dokumen PDF Berita Acara." })
    } finally {
      setGeneratingPdfId(null)
    }
  }

  const handleDeleteAll = () => {
    if (!database || !isAdmin || deleteConfirmText !== 'HAPUS SEMUA') return
    
    setIsDeletingAll(true)
    const pendingActors = actors || []
    let deletedCount = 0
    
    pendingActors.forEach((actor) => {
      const actorRef = ref(database, `businessActors/${actor.id}`)
      updateDocumentNonBlocking(actorRef, {
        status: 'dihapus_dinas',
        dihapusDinasAt: new Date().toISOString(),
        dihapusDinasBy: user?.email || user?.uid || 'Admin'
      })
      deletedCount++
    })

    logActivity({
      query: `HAPUS SEMUA DATA DARI MENU VERIFIKASI DINAS: ${deletedCount} data dihapus dari daftar`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'HAPUS DARI VERIFIKASI DINAS',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({ 
      title: "Data Berhasil Dihapus dari Daftar", 
      description: `${deletedCount} data pelaku usaha telah dihapus dari menu Verifikasi Dinas. Data tetap tersimpan di database.` 
    })
    setShowDeleteAllDialog(false)
    setDeleteConfirmText("")
    setIsDeletingAll(false)
  }

  if (!isAdmin && !isVerifikatorDinas && !isPetugas && !isAdminLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in-up duration-700">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-3xl font-bold text-primary font-headline">VERIFIKASI DINAS</h1>
            {filteredActors && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 shadow-sm flex items-center gap-2">
                <span>Total Berkas:</span>
                <span className="bg-primary text-white px-2 py-0.5 rounded-full">{filteredActors.length}</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Data dikelompokkan berdasarkan <strong>NIPPPK Verifikator</strong> yang diisi petugas survey pada Data Pejabat Berita Acara.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Dropdown Filter Verifikator - Hanya Admin */}
          {isAdmin && verifikatorOptions.length > 0 && (
            <div className="flex items-center gap-2 min-w-[200px]">
              <Select value={selectedVerifikatorFilter} onValueChange={setSelectedVerifikatorFilter}>
                <SelectTrigger className="h-11 rounded-xl border-purple-200 bg-purple-50/50 text-purple-900 font-semibold focus:ring-purple-500">
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="w-4 h-4 text-purple-600 shrink-0" />
                    <SelectValue placeholder="Pilih Verifikator" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="ALL" className="font-bold">
                    Semua Verifikator ({actors?.length || 0})
                  </SelectItem>
                  {verifikatorOptions.map((vOpt) => {
                    const count = actors?.filter(a => getVerifikatorNipppk(a) === vOpt.nipKey).length || 0
                    const label = vOpt.nipKey !== vOpt.name && !vOpt.nipKey.includes("Belum")
                      ? `${vOpt.name} (${vOpt.nipKey})`
                      : vOpt.name
                    return (
                      <SelectItem key={vOpt.nipKey} value={vOpt.nipKey} className="font-medium">
                        {label} ({count})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Cari Verifikator, NIPPPK, Nama, NIK..."
              className="flex h-11 w-full rounded-xl border border-primary/20 bg-card px-3 py-2 pl-9 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tombol Hapus Semua - Hanya Admin */}
          {isAdmin && filteredActors && filteredActors.length > 0 && (
            <Dialog open={showDeleteAllDialog} onOpenChange={(open) => { setShowDeleteAllDialog(open); if (!open) setDeleteConfirmText(""); }}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="h-11 gap-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 bg-red-600 hover:bg-red-700 font-bold shrink-0"
                  onClick={() => setShowDeleteAllDialog(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Hapus Semua Data</span>
                  <span className="sm:hidden">Hapus</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-red-600 uppercase flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6" /> Hapus Semua Data
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Tindakan ini akan menghapus semua data pelaku usaha yang berstatus <strong>verified_dinas</strong> secara permanen dan tidak dapat dibatalkan.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm font-bold uppercase">Peringatan!</span>
                    </div>
                    <p className="text-xs text-red-600">
                      Anda akan menghapus <strong className="text-red-800">{filteredActors?.length || 0} data</strong> pelaku usaha. Data yang sudah dihapus tidak dapat dikembalikan.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Ketik <span className="font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">HAPUS SEMUA</span> untuk konfirmasi:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Ketik HAPUS SEMUA"
                      className="flex h-11 w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="ghost" onClick={() => { setShowDeleteAllDialog(false); setDeleteConfirmText(""); }}>
                    Batal
                  </Button>
                  <Button 
                    type="button"
                    disabled={deleteConfirmText !== 'HAPUS SEMUA' || isDeletingAll}
                    onClick={handleDeleteAll}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold min-w-[180px] gap-2"
                  >
                    {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Hapus {filteredActors?.length || 0} Data
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded-full w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded-full w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-2.5 bg-slate-100 rounded w-full" />
                <div className="h-2.5 bg-slate-200 rounded w-full" />
                <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                <div className="h-2.5 bg-slate-200 rounded w-2/3" />
              </div>
              <div className="h-9 bg-slate-200 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : filteredActors?.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center py-20 text-muted-foreground bg-slate-50/50 rounded-3xl">
          <ClipboardCheck className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-bold uppercase tracking-widest text-xs">Tidak ada data untuk diverifikasi Dinas</p>
          {selectedVerifikatorFilter !== "ALL" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedVerifikatorFilter("ALL")}
              className="mt-4 text-xs font-bold rounded-xl"
            >
              Reset Filter Verifikator
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedActorsByVerifikator).sort().map(([nipKey, group]) => {
            const vInfo = group.verifikatorInfo
            const isUnassigned = nipKey === "Belum Ditentukan" || nipKey === "Belum Ada Verifikator"

            // Cari user verifikator di systemUsers berdasarkan NIPPPK, Username, atau Nama
            const foundUser = systemUsers?.find((u: any) => {
              if (u.role !== 'verifikator_dinas') return false
              const matchNip = nipKey && u.nipppk && String(u.nipppk).trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === String(nipKey).trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
              const matchUser = nipKey && u.username && String(u.username).trim().toLowerCase() === String(nipKey).trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
              const matchName = vInfo?.nama && u.fullName && String(u.fullName).trim().toUpperCase() === String(vInfo.nama).trim().toUpperCase()
              return matchNip || matchUser || matchName
            })

            const displayName = (vInfo?.nama && vInfo.nama !== "Belum Ditentukan")
              ? vInfo.nama
              : (foundUser?.fullName || (isUnassigned ? "Belum Ditentukan" : nipKey))

            return (
              <div key={nipKey} className="space-y-6">
                {/* ─── HEADER GRUP VERIFIKATOR ──────────────────────────── */}
                <div className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isUnassigned 
                    ? "bg-amber-50/70 border-amber-200 text-amber-950" 
                    : "bg-gradient-to-r from-purple-50 via-indigo-50/60 to-white border-purple-200/80 text-purple-950"
                }`}>
                  <div className="flex items-start md:items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      isUnassigned ? "bg-amber-500 text-white" : "bg-purple-600 text-white"
                    }`}>
                      <BadgeCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isUnassigned ? "bg-amber-200/80 text-amber-800" : "bg-purple-200/80 text-purple-800"
                        }`}>
                          Verifikator Dinas
                        </span>
                        <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-slate-900">
                          {displayName}
                        </h2>
                      </div>
                      
                      {/* Informasi NIPPPK, Pangkat, Jabatan Verifikator */}
                      {(vInfo || !isUnassigned) ? (
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap font-medium">
                          {(vInfo?.nipppk || !isUnassigned) && (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">NIPPPK:</span> {vInfo?.nipppk || nipKey}
                            </span>
                          )}
                          {vInfo?.pangkat && (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">•</span>
                              <span className="text-slate-400 font-bold">Pangkat:</span> {vInfo.pangkat}
                            </span>
                          )}
                          {vInfo?.jabatan && (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">•</span>
                              <span className="text-slate-400 font-bold">Jabatan:</span> {vInfo.jabatan}
                            </span>
                          )}
                        </div>
                      ) : isUnassigned ? (
                        <p className="text-xs text-amber-700 mt-0.5">
                          Petugas survey belum mengisi data Verifikator pada Data Pejabat Berita Acara
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
                    {/* Info Akses Akun Login Verifikator - Khusus Admin */}
                    {isAdmin && !isUnassigned && (() => {
                      const currentNip = vInfo?.nipppk || (nipKey !== "Belum Ditentukan" ? nipKey : "");
                      const currentNipClean = currentNip.trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                      const userNipClean = (foundUser?.username || foundUser?.nipppk || "").trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                      const isNipMismatch = !!(foundUser && currentNipClean && userNipClean && currentNipClean !== userNipClean);

                      return foundUser ? (
                        <div className="flex items-center gap-2 bg-white/95 border border-purple-200/90 px-3 py-1.5 rounded-xl text-xs shadow-sm flex-wrap">
                          <div className="flex items-center gap-1 text-purple-800 font-bold">
                            <Key className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="font-mono">User: <strong>{foundUser.username || foundUser.id}</strong></span>
                          </div>
                          <span className="text-slate-300">|</span>
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-slate-500 font-bold">Sandi:</span>
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{foundUser.password || "••••••"}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            className="h-6 px-2 text-[10px] font-black text-purple-700 hover:bg-purple-100 rounded-lg ml-1"
                            onClick={() => {
                              const origin = typeof window !== 'undefined' ? window.location.origin : 'https://umkm-database.web.app'
                              const textToCopy = `AKSES LOGIN VERIFIKATOR DINAS\nNama: ${displayName}\nUsername (NIPPPK): ${foundUser.username || foundUser.id}\nKata Sandi: ${foundUser.password}\nLink Login: ${origin}/login`
                              navigator.clipboard.writeText(textToCopy)
                              toast({ title: "Akses Tersalin", description: `Akses login untuk ${displayName} berhasil disalin.` })
                            }}
                            title="Salin Akun Login Verifikator"
                          >
                            <Copy className="w-3 h-3 mr-1" /> Salin Akses
                          </Button>
                          <Button
                            size="sm"
                            variant={isNipMismatch ? "default" : "outline"}
                            type="button"
                            className={`h-6 px-2.5 text-[10px] font-black rounded-lg gap-1 shadow-sm transition-all ${
                              isNipMismatch
                                ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 animate-pulse"
                                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                            }`}
                            onClick={async () => {
                              const targetPejabat = {
                                nama: displayName,
                                nipppk: currentNip || foundUser.nipppk || "",
                                pangkat: vInfo?.pangkat || foundUser.pangkat || "",
                                jabatan: vInfo?.jabatan || foundUser.jabatan || "Verifikator Dinas"
                              };
                              const res = await regenerateVerifikatorUser(database, targetPejabat, foundUser.username || foundUser.id);
                              if (res) {
                                toast({
                                  title: "✅ ID Login Berhasil Di-generate",
                                  description: `Username baru (NIPPPK): ${res.username} | Sandi: ${res.password}`
                                });
                              }
                            }}
                            title={isNipMismatch ? "NIPPPK telah berubah! Klik untuk generate ulang ID User Login" : "Generate / Refresh ID Login sesuai NIPPPK"}
                          >
                            <RefreshCw className="w-3 h-3" /> {isNipMismatch ? "Generate ID Baru" : "Generate ID"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            className="h-6 px-2 text-[10px] font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg gap-1 border border-rose-200"
                            onClick={() => handleDeleteVerifikatorAccount(foundUser.username || foundUser.id, displayName)}
                            title="Hapus Akun Verifikator Dinas Secara Permanen"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" /> Delete Account
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl gap-1 shadow-sm"
                          onClick={async () => {
                            const targetPejabat = vInfo || {
                              nama: displayName,
                              nipppk: currentNip || "",
                              pangkat: "",
                              jabatan: "Verifikator Dinas"
                            };
                            const res = await regenerateVerifikatorUser(database, targetPejabat, nipKey);
                            if (res) {
                              toast({ title: "Akun Dibuat", description: `Username: ${res.username} | Sandi: ${res.password}` });
                            }
                          }}
                        >
                          <Key className="w-3 h-3" /> Generate ID / Akun Login
                        </Button>
                      );
                    })()}

                    {/* Tombol Edit Pejabat / NIPPPK - Khusus Admin & Verifikator */}
                    {(isAdmin || isVerifikatorDinas) && (
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        className="h-8 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 font-bold rounded-xl gap-1.5 shadow-sm"
                        onClick={() => openEditPejabatForGroup(nipKey, group, foundUser)}
                        title="Edit NIPPPK, Nama, Pangkat & Jabatan Pejabat untuk Berita Acara Survey"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit NIPPPK Pejabat
                      </Button>
                    )}

                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <strong>{group.actors.length}</strong> Berkas
                    </span>
                  </div>
                </div>

                {/* ─── GRID KARTU PELAKU USAHA ─────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.actors.map((actor) => {
                    const actorPejabat = getActorPejabat(actor)
                    const vDinas = actorPejabat?.verifikator || (actor.verifikatorDinas ? { nama: actor.verifikatorDinas } : null)

                    return (
                      <Card key={actor.id} className="group relative overflow-hidden border-slate-200/60 hover:border-primary/50 hover:shadow-2xl transition-all duration-500 rounded-[2rem] bg-white/80 backdrop-blur-sm">
                        
                        <CardContent className="p-6">
                          <div className="flex flex-col h-full gap-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                                <User className="w-6 h-6" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-black text-slate-800 uppercase text-sm truncate" title={actor.fullName}>
                                  {actor.fullName}
                                </h3>
                                <p className="text-[10px] font-mono text-slate-500 mt-0.5 tracking-tighter">
                                  NIK: {actor.nik}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100">
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Usaha</span>
                                <p className="text-[11px] font-black text-slate-700 truncate uppercase">{actor.businessName}</p>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Kelurahan</span>
                                <p className="text-[11px] font-bold text-slate-600 truncate uppercase">{actor.kelurahan || "-"}</p>
                              </div>
                            </div>

                            {/* Section Info Aktor (USULAN, PETUGAS SURVEY, & VERIFIKATOR DINAS) */}
                            <div className="flex flex-col gap-2 mt-1">
                              <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                                {(() => {
                                  const found = kuotaData?.find((q: any) => (q.name || q.coordinator || "").toUpperCase().trim() === (actor.coordinator || "").toUpperCase().trim());
                                  const coordPhone = found?.phone || found?.noHp || found?.hp || "";
                                  const getWaLink = (phoneStr: string) => {
                                    if (!phoneStr) return "#";
                                    let clean = phoneStr.replace(/\D/g, "");
                                    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
                                    else if (!clean.startsWith("62")) clean = "62" + clean;
                                    return `https://wa.me/${clean}`;
                                  };

                                  return (
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">USULAN</span>
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className="text-[10px] font-black text-primary truncate uppercase" title={actor.coordinator || "Tanpa Korlap"}>
                                          {actor.coordinator || "Tanpa Korlap"}
                                        </span>
                                        {coordPhone && (
                                          <a
                                            href={getWaLink(coordPhone)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-700 hover:scale-105 transition-all bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/80 shrink-0"
                                            title={`Chat WA Usulan (${actor.coordinator}): ${coordPhone}`}
                                          >
                                            <MessageCircle className="w-3 h-3 text-emerald-600 fill-emerald-600/20" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div className="flex flex-col min-w-0">
                                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">PETUGAS SURVEY</span>
                                  {actor.petugasSurvey && actor.petugasSurvey.trim() !== '-' && actor.petugasSurvey.trim() !== '' ? (
                                    <span className="text-[10px] font-black text-emerald-700 truncate uppercase flex items-center gap-1" title={actor.petugasSurvey}>
                                      <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span className="truncate">{actor.petugasSurvey}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-rose-500 uppercase flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                                      Belum Ada
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Badge Info Verifikator Dinas pada Kartu */}
                              <div className="bg-purple-50/70 border border-purple-100 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <BadgeCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-[8px] font-bold text-purple-600 uppercase tracking-tight">Verifikator Dinas</p>
                                    <p className="text-[10px] font-black text-purple-950 truncate uppercase" title={vDinas?.nama || displayName}>
                                      {vDinas?.nama || displayName}
                                    </p>
                                  </div>
                                </div>
                                {(vDinas as any)?.nipppk && (
                                  <span className="text-[9px] font-mono font-bold text-purple-700 bg-white px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
                                    NIP: {(vDinas as any).nipppk}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 w-full pt-1">
                                {/* Tombol 1: VIEW DETAIL LENGKAP */}
                                <Button
                                  size="icon"
                                  variant="outline"
                                  type="button"
                                  onClick={() => setAdminViewActor(actor)}
                                  className="h-9 w-9 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border-blue-200 hover:border-blue-300 rounded-xl shadow-sm transition-all duration-200 shrink-0"
                                  title="Lihat Detail Lengkap Pelaku Usaha & Hasil Survey"
                                >
                                  <Eye className="w-4 h-4 shrink-0" />
                                </Button>

                                {/* Tombol PDF: DOWNLOAD / CETAK BERITA ACARA SURVEY */}
                                <Button
                                  size="icon"
                                  variant="outline"
                                  type="button"
                                  onClick={() => {
                                    setPrintModalActor(actor);
                                    setSelectedPrintDate(actor.surveyData?.tanggalSurvey || new Date().toISOString().split('T')[0]);
                                    setSaveDateToSurvey(true);
                                  }}
                                  disabled={generatingPdfId === actor.id || !actor.surveyData}
                                  className="h-9 w-9 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 border-purple-200 hover:border-purple-300 rounded-xl shadow-sm transition-all duration-200 shrink-0 disabled:opacity-40"
                                  title={actor.surveyData ? "Download Berita Acara Survey (PDF)" : "Data Survey belum ada"}
                                >
                                  {generatingPdfId === actor.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <FileDown className="w-4 h-4 shrink-0" />
                                  )}
                                </Button>

                                {/* Tombol 2: VERIFIKASI BERKAS */}
                                {(isAdmin || isVerifikatorDinas || isPetugas) && (
                                  <Button 
                                    size="sm" 
                                    type="button"
                                    onClick={() => { setVerifyingActor(actor); setShowChecklist(false); }} 
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 h-9"
                                    title="Verifikasi Berkas"
                                  >
                                    <ClipboardCheck className="w-4 h-4 shrink-0" />
                                    <span>Verifikasi Berkas</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── SINGLE ROOT LEVEL VERIFIKASI BERKAS DIALOG ───────────────── */}
      <Dialog open={!!verifyingActor} onOpenChange={(open) => {
        if (!open) {
          setVerifyingActor(null);
          setShowChecklist(false);
          setChecks({ ktp: false, kk: false, nib: false, foto: false });
        }
      }}>
        <DialogContent className={`max-h-[92dvh] overflow-y-auto transition-all duration-300 ${showChecklist ? 'max-w-[95vw] lg:max-w-7xl' : 'max-w-5xl'}`}>
          {verifyingActor && (() => {
            const modalPejabat = getActorPejabat(verifyingActor)

            return (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Kiri: Detail Pelaku Usaha */}
                <div className="flex flex-col flex-1">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                      <FileText className="w-6 h-6" /> Detail Data & Hasil Survey
                    </DialogTitle>
                    <DialogDescription className="sr-only">Detail Pelaku Usaha</DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-6 py-4">
                    {/* DATA PEJABAT BERITA ACARA SURVEY */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-1">
                        <div className="flex items-center gap-2 text-indigo-700 font-black text-sm uppercase">
                          <BadgeCheck className="w-4 h-4" /> Data Pejabat Berita Acara Survey
                        </div>
                        {(isAdmin || isVerifikatorDinas) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            className="h-7 px-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 rounded-lg gap-1"
                            onClick={() => openEditPejabatForActor(verifyingActor)}
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit NIPPPK
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Kolom 1 - Verifikator Dinas */}
                        <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-1">
                          <div className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs uppercase">
                            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
                            Verifikator Dinas
                          </div>
                          <p className="text-xs font-black text-indigo-950 uppercase">{modalPejabat?.verifikator?.nama || getVerifikatorName(verifyingActor)}</p>
                          <div className="text-[11px] text-indigo-900/80 space-y-0.5">
                            <p><span className="text-slate-500">NIPPPK:</span> {modalPejabat?.verifikator?.nipppk || "-"}</p>
                            <p><span className="text-slate-500">Pangkat/Gol:</span> {modalPejabat?.verifikator?.pangkat || "-"}</p>
                            <p><span className="text-slate-500">Jabatan:</span> {modalPejabat?.verifikator?.jabatan || "-"}</p>
                          </div>
                        </div>

                        {/* Kolom 2 - Petugas Survey */}
                        <div className="bg-violet-50/60 p-3 rounded-xl border border-violet-100 space-y-1">
                          <div className="flex items-center gap-1.5 text-violet-700 font-bold text-xs uppercase">
                            <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                            Petugas Survey
                          </div>
                          <p className="text-xs font-black text-violet-950 uppercase">{modalPejabat?.petugas?.nama || verifyingActor.petugasSurvey || "-"}</p>
                          <div className="text-[11px] text-violet-900/80 space-y-0.5">
                            <p><span className="text-slate-500">NIPPPK:</span> {modalPejabat?.petugas?.nipppk || "-"}</p>
                            <p><span className="text-slate-500">Pangkat/Gol:</span> {modalPejabat?.petugas?.pangkat || "-"}</p>
                            <p><span className="text-slate-500">Jabatan:</span> {modalPejabat?.petugas?.jabatan || "-"}</p>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* INFORMASI PRIBADI */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                        {(() => {
                          const parsed = parsePobDob(verifyingActor.pobDob || "")
                          return [
                            { label: "Nama Lengkap", value: verifyingActor.fullName },
                            { label: "NIK", value: verifyingActor.nik },
                            { label: "Nomor KK", value: verifyingActor.noKK },
                            { label: "Jenis Kelamin", value: verifyingActor.gender },
                            { label: "Tempat Lahir", value: verifyingActor.pob || parsed.pob || "-" },
                            { label: "Tanggal Lahir", value: verifyingActor.dob || parsed.dob || "-" },
                            { label: "Nomor HP", value: verifyingActor.phone, isPhone: true }
                          ]
                        })().map((item, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                            {(item as any).isPhone && item.value ? (
                              <a
                                href={`https://wa.me/${String(item.value).replace(/\D/g, "").replace(/^0/, "62")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                              >
                                {item.value}
                              </a>
                            ) : (
                              <p className="text-xs font-bold">{item.value || "-"}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* DATA HASIL SURVEY DINAS */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-600 font-black text-sm uppercase border-b pb-1"><ClipboardCheck className="w-4 h-4" /> Data Hasil Survey Dinas</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        {[
                          { label: "Tanggal Survey", value: verifyingActor.surveyData?.tanggalSurvey ? formatTanggalIndonesia(verifyingActor.surveyData.tanggalSurvey).fullText : "-" },
                          { label: "Nama Usaha", value: verifyingActor.surveyData?.namaUsaha },
                          { label: "Nama Pemilik", value: verifyingActor.surveyData?.namaPemilik },
                          { label: "Jenis Kelamin", value: verifyingActor.surveyData?.jenisKelamin },
                          { label: "Status", value: verifyingActor.surveyData?.status },
                          { label: "Alamat Rumah", value: verifyingActor.surveyData?.alamatRumah },
                          { label: "No HP", value: verifyingActor.surveyData?.noHp },
                          { label: "Email", value: verifyingActor.surveyData?.email },
                          { label: "Sosial Media", value: verifyingActor.surveyData?.sosmed },
                          { label: "DTKS", value: verifyingActor.surveyData?.dtks?.masuk ? `Ya (${verifyingActor.surveyData.dtks.jenis})` : 'Tidak' },
                          { label: "Bidang Usaha", value: verifyingActor.surveyData?.bidangUsaha },
                          { label: "Peralatan", value: verifyingActor.surveyData?.peralatan },
                          { label: "Tahun Berdiri", value: verifyingActor.surveyData?.tahunBerdiri },
                          { label: "Izin", value: verifyingActor.surveyData?.izin?.join(', ') },
                          { label: "Modal Usaha", value: verifyingActor.surveyData?.modalUsaha },
                          { label: "Omset", value: verifyingActor.surveyData?.omset },
                          { label: "Pernah Terima Hibah?", value: verifyingActor.surveyData?.hibah?.pernah ? `Ya (Dari: ${verifyingActor.surveyData.hibah.dariMana}, Tahun: ${verifyingActor.surveyData.hibah.tahun})` : 'Tidak' },
                          { label: "Rencana Penggunaan", value: verifyingActor.surveyData?.rencanaPenggunaan },
                          { label: "Hasil Survey", value: verifyingActor.surveyData?.hasilSurvey }
                        ].map((item, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-[10px] font-bold text-emerald-700/80 uppercase">{item.label}</p>
                            <p className="text-xs font-bold text-slate-800">{item.value || "-"}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* TITIK LOKASI & FOTO */}
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Titik Lokasi & Foto Survey</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Titik Lokasi Survey Dinas</p>
                          {verifyingActor.verificationLocationDinas ? (
                            <>
                              <p className="text-xs font-mono font-semibold">{verifyingActor.verificationLocationDinas.lat}, {verifyingActor.verificationLocationDinas.lon}</p>
                              <a href={`https://www.google.com/maps?q=${verifyingActor.verificationLocationDinas.lat},${verifyingActor.verificationLocationDinas.lon}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline inline-block mt-1">Buka di Google Maps</a>
                            </>
                          ) : (
                            <p className="text-xs font-medium text-slate-500">Belum ada titik lokasi yang direkam.</p>
                          )}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2 items-center justify-center">
                          <p className="text-[10px] font-bold text-slate-500 uppercase self-start">Foto Survey Dinas</p>
                          {(surveyPhotoMap[verifyingActor.id] || verifyingActor.surveyData?.fotoSurveyUrl || verifyingActor.photoUsahaUri || verifyingActor.comparisonPhotoUrl) ? (
                            <img src={surveyPhotoMap[verifyingActor.id] || verifyingActor.surveyData?.fotoSurveyUrl || verifyingActor.photoUsahaUri || verifyingActor.comparisonPhotoUrl} alt="Foto Survey" className="max-h-[200px] object-contain rounded-lg border border-slate-200" />
                          ) : (
                            <p className="text-xs font-medium text-slate-500">Tidak ada foto.</p>
                          )}
                        </div>
                      </div>
                    </section>

                    {verifyingActor.googleDriveLink && (
                      <section className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Folder className="w-4 h-4" /> Berkas Tambahan (Google Drive)</div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-blue-800 uppercase">Folder Google Drive Pelaku Usaha</p>
                            <p className="text-[10px] font-medium text-blue-600 mt-1">Berisi foto, video, dokumen usulan, atau file lainnya</p>
                          </div>
                          <a href={verifyingActor.googleDriveLink} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold px-4 py-2.5 rounded-lg text-xs shadow flex items-center justify-center min-w-[140px]">
                            Buka Folder Drive
                          </a>
                        </div>
                      </section>
                    )}
                  </div>
                  
                  {!showChecklist && (
                    <DialogFooter className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button type="button" variant="ghost" onClick={() => setVerifyingActor(null)}>Tutup</Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setPrintModalActor(verifyingActor);
                            setSelectedPrintDate(verifyingActor.surveyData?.tanggalSurvey || new Date().toISOString().split('T')[0]);
                            setSaveDateToSurvey(true);
                          }}
                          disabled={!verifyingActor.surveyData}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 font-bold"
                        >
                          <FileDown className="w-4 h-4 mr-1.5" /> Download Berita Acara
                        </Button>
                      </div>
                      <Button type="button" onClick={() => setShowChecklist(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                        Verifikasi Berkas <ClipboardCheck className="w-4 h-4 ml-2" />
                      </Button>
                    </DialogFooter>
                  )}
                </div>

                {/* Kanan: Checklist Berkas */}
                {showChecklist && (
                  <div className="w-full lg:w-[400px] shrink-0 lg:border-l lg:pl-6 flex flex-col gap-4 animate-in slide-in-from-right-8 duration-300">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black text-emerald-600 uppercase">Cek Kelengkapan Berkas</DialogTitle>
                      <DialogDescription>Pastikan 4 berkas ini lengkap.</DialogDescription>
                    </DialogHeader>
                    <div className="py-2 space-y-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                          <Checkbox id="ktp" checked={checks.ktp} onCheckedChange={(c) => setChecks(prev => ({...prev, ktp: !!c}))} />
                          <label htmlFor="ktp" className="text-sm font-semibold cursor-pointer select-none">KTP</label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                          <Checkbox id="kk" checked={checks.kk} onCheckedChange={(c) => setChecks(prev => ({...prev, kk: !!c}))} />
                          <label htmlFor="kk" className="text-sm font-semibold cursor-pointer select-none">KK</label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                          <Checkbox id="nib" checked={checks.nib} onCheckedChange={(c) => setChecks(prev => ({...prev, nib: !!c}))} />
                          <label htmlFor="nib" className="text-sm font-semibold cursor-pointer select-none">NIB</label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                          <Checkbox id="foto" checked={checks.foto} onCheckedChange={(c) => setChecks(prev => ({...prev, foto: !!c}))} />
                          <label htmlFor="foto" className="text-sm font-semibold cursor-pointer select-none">Fhoto Pelaku Usaha</label>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t flex flex-col gap-2">
                      {checks.ktp && checks.kk && checks.nib && checks.foto ? (
                        <Button 
                          type="button" 
                          onClick={handleVerifyBerkas}
                          disabled={isSubmitting} 
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} BERHASIL VERIFIKASI
                        </Button>
                      ) : (
                        <Button type="button" disabled className="w-full bg-slate-200 text-slate-500 font-bold">
                          Ceklist 4 Berkas
                        </Button>
                      )}
                      <Button type="button" variant="ghost" className="w-full" onClick={() => setShowChecklist(false)}>Tutup Checklist</Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG VIEW LENGKAP ADMIN ──────────────────────────────────── */}
      <Dialog open={!!adminViewActor} onOpenChange={(open) => !open && setAdminViewActor(null)}>
        <DialogContent className="max-w-5xl max-h-[92dvh] overflow-y-auto">
          {adminViewActor && (() => {
            const av = adminViewActor
            const avPejabat = getActorPejabat(av)
            const parsed = parsePobDob(av.pobDob || "")
            const vName = getVerifikatorName(av)

            const Section = ({ icon, title, color = "text-primary" }: { icon: React.ReactNode; title: string; color?: string }) => (
              <div className={`flex items-center gap-2 ${color} font-black text-sm uppercase border-b pb-2 mb-3`}>
                {icon} {title}
              </div>
            )

            const Field = ({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) => (
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className={`text-xs font-bold text-slate-800 break-words ${mono ? 'font-mono' : ''}`}>{value || "-"}</p>
              </div>
            )

            return (
              <div className="space-y-1">
                <DialogHeader className="pb-2 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Eye className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md uppercase tracking-wider">View Lengkap — Admin</span>
                      </div>
                      <DialogTitle className="text-xl font-black text-slate-900 uppercase mt-0.5">{av.fullName}</DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 font-mono">NIK: {av.nik} • ID: {av.id}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="grid gap-6 pt-4">

                  {/* 1. STATUS & TRACKING */}
                  <section>
                    <Section icon={<Info className="w-4 h-4" />} title="Status & Tracking" color="text-blue-700" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Field label="Status" value={(av.status || "-").replace(/_/g, " ").toUpperCase()} />
                      <Field label="Hasil Verifikasi Dinas" value={av.hasilVerifikasiDinas} />
                      <Field label="Keterangan Dinas" value={av.keteranganDinas} />
                      <Field label="Progress Survey" value={av.surveyProgress ? `${av.surveyProgress}%` : "-"} />
                      <Field label="Dibuat Pada" value={av.createdAt ? new Date(av.createdAt).toLocaleString('id-ID') : "-"} />
                      <Field label="Diinput Oleh" value={av.createdBy} />
                      <Field label="Kode Registrasi" value={av.registrationCode} />
                      <Field label="Ready LPJ" value={av.readyForLPJ ? "Ya" : "Tidak"} />
                    </div>
                  </section>

                  {/* 2. DATA PEJABAT BERITA ACARA */}
                  <section>
                    <div className="flex items-center justify-between border-b pb-1">
                      <Section icon={<BadgeCheck className="w-4 h-4" />} title="Data Pejabat Berita Acara Survey" color="text-indigo-700" />
                      {(isAdmin || isVerifikatorDinas) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          className="h-7 px-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 rounded-lg gap-1"
                          onClick={() => openEditPejabatForActor(av)}
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit NIPPPK
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 space-y-2">
                        <p className="text-[10px] font-black text-indigo-700 uppercase flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center">1</span>
                          Verifikator Dinas
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Nama" value={avPejabat?.verifikator?.nama || vName} />
                          <Field label="NIPPPK" value={avPejabat?.verifikator?.nipppk} mono />
                          <Field label="Pangkat / Golongan" value={avPejabat?.verifikator?.pangkat} />
                          <Field label="Jabatan" value={avPejabat?.verifikator?.jabatan} />
                        </div>
                      </div>
                      <div className="bg-violet-50 p-3 rounded-xl border border-violet-100 space-y-2">
                        <p className="text-[10px] font-black text-violet-700 uppercase flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center">2</span>
                          Petugas Survey
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Nama" value={avPejabat?.petugas?.nama || av.petugasSurvey} />
                          <Field label="NIPPPK" value={avPejabat?.petugas?.nipppk} mono />
                          <Field label="Pangkat / Golongan" value={avPejabat?.petugas?.pangkat} />
                          <Field label="Jabatan" value={avPejabat?.petugas?.jabatan} />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 3. INFORMASI PRIBADI */}
                  <section>
                    <Section icon={<User className="w-4 h-4" />} title="Informasi Pribadi" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border">
                      <Field label="Nama Lengkap" value={av.fullName} />
                      <Field label="NIK" value={av.nik} mono />
                      <Field label="Nomor KK" value={av.noKK} mono />
                      <Field label="Jenis Kelamin" value={av.gender} />
                      <Field label="Tempat Lahir" value={av.pob || parsed.pob} />
                      <Field label="Tanggal Lahir" value={av.dob || parsed.dob} />
                      <Field label="Nomor HP" value={av.phone} />
                      <Field label="Alamat" value={av.address} />
                      <Field label="RT/RW" value={av.rtRw} />
                      <Field label="Kelurahan" value={av.kelurahan} />
                      <Field label="Kecamatan" value={av.kecamatan} />
                    </div>
                  </section>

                  {/* 4. DATA USAHA */}
                  <section>
                    <Section icon={<Building2 className="w-4 h-4" />} title="Data Usaha" color="text-orange-700" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                      <Field label="Nama Usaha" value={av.businessName} />
                      <Field label="Kategori Usaha" value={av.businessCategory} />
                      <Field label="Lokasi Usaha" value={av.businessLocation} />
                      <Field label="Koordinator / Usulan" value={av.coordinator} />
                      <Field label="Petugas Survey" value={av.petugasSurvey} />
                    </div>
                  </section>

                  {/* 5. DATA HASIL SURVEY DINAS */}
                  {av.surveyData && (
                    <section>
                      <Section icon={<ClipboardCheck className="w-4 h-4" />} title="Data Hasil Survey Dinas" color="text-emerald-700" />
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <Field label="Tanggal Survey" value={av.surveyData.tanggalSurvey ? formatTanggalIndonesia(av.surveyData.tanggalSurvey).fullText : undefined} />
                        <Field label="Nama Usaha (Survey)" value={av.surveyData.namaUsaha} />
                        <Field label="Nama Pemilik" value={av.surveyData.namaPemilik} />
                        <Field label="Jenis Kelamin" value={av.surveyData.jenisKelamin} />
                        <Field label="Status Perkawinan" value={av.surveyData.status} />
                        <Field label="Alamat Rumah" value={av.surveyData.alamatRumah} />
                        <Field label="No HP" value={av.surveyData.noHp} />
                        <Field label="Email" value={av.surveyData.email} />
                        <Field label="Sosial Media" value={av.surveyData.sosmed} />
                        <Field label="DTKS" value={av.surveyData.dtks?.masuk ? `Ya — ${av.surveyData.dtks.jenis || "-"}` : "Tidak"} />
                        <Field label="Bidang Usaha" value={av.surveyData.bidangUsaha} />
                        <Field label="Peralatan Usaha" value={av.surveyData.peralatan} />
                        <Field label="Tahun Berdiri" value={av.surveyData.tahunBerdiri} />
                        <Field label="Izin Usaha" value={av.surveyData.izin?.join(', ')} />
                        <Field label="Modal Usaha" value={av.surveyData.modalUsaha} />
                        <Field label="Omset" value={av.surveyData.omset} />
                        <Field label="Pernah Terima Hibah" value={av.surveyData.hibah?.pernah ? `Ya — Dari: ${av.surveyData.hibah.dariMana || "-"}, Tahun: ${av.surveyData.hibah.tahun || "-"}` : "Tidak"} />
                        <Field label="Rencana Penggunaan" value={av.surveyData.rencanaPenggunaan} />
                        <Field label="Hasil Survey" value={av.surveyData.hasilSurvey} />
                      </div>
                    </section>
                  )}

                  {/* 6. REKENING BANK */}
                  <section>
                    <Section icon={<CreditCard className="w-4 h-4" />} title="Rekening Bank" color="text-cyan-700" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-cyan-50/50 p-4 rounded-xl border border-cyan-100">
                      <Field label="Nama Bank" value={av.bankName} />
                      <Field label="Nama Pemilik Rekening" value={av.bankOwner} />
                      <Field label="Nomor Rekening" value={av.bankNumber} mono />
                    </div>
                  </section>

                  {/* 7. DOKUMEN & FOTO */}
                  <section>
                    <Section icon={<Camera className="w-4 h-4" />} title="Dokumen & Foto" color="text-rose-700" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { label: "Foto KTP", url: av.ktpUri },
                        { label: "Foto KK", url: av.kkUri },
                        { label: "Foto NIB", url: av.nibUri },
                        { label: "Foto Usaha", url: av.photoUsahaUri },
                        { label: "Foto Perbandingan", url: av.comparisonPhotoUrl },
                        { label: "Foto Survey Dinas", url: surveyPhotoMap[av.id] || av.surveyData?.fotoSurveyUrl || av.photoUsahaUri || av.comparisonPhotoUrl },
                      ].map((doc, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-rose-700/80 uppercase">{doc.label}</p>
                          {doc.url ? (
                            <div className="space-y-1">
                              <img src={doc.url} alt={doc.label} className="w-full h-28 object-cover rounded-lg border border-slate-200" />
                              <a href={doc.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Buka penuh
                              </a>
                            </div>
                          ) : (
                            <div className="w-full h-14 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                              <p className="text-[10px] text-slate-400 font-medium">Belum ada</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {av.googleDriveLink && (
                      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-blue-800 uppercase">Folder Google Drive</p>
                          <p className="text-[10px] text-blue-600 mt-0.5">{av.googleDriveLink}</p>
                        </div>
                        <a href={av.googleDriveLink} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shrink-0 flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" /> Buka Drive
                        </a>
                      </div>
                    )}
                  </section>

                  {/* 8. LOKASI SURVEY */}
                  <section>
                    <Section icon={<MapPin className="w-4 h-4" />} title="Lokasi Survey Dinas" color="text-teal-700" />
                    <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 space-y-2">
                      {av.verificationLocationDinas ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Latitude" value={String(av.verificationLocationDinas.lat)} mono />
                            <Field label="Longitude" value={String(av.verificationLocationDinas.lon)} mono />
                          </div>
                          <a
                            href={`https://www.google.com/maps?q=${av.verificationLocationDinas.lat},${av.verificationLocationDinas.lon}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-white border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" /> Buka di Google Maps
                          </a>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500">Belum ada titik lokasi yang direkam.</p>
                      )}
                    </div>
                  </section>

                  {/* 9. CATATAN & INFORMASI TAMBAHAN */}
                  <section>
                    <Section icon={<History className="w-4 h-4" />} title="Catatan & Informasi Tambahan" color="text-slate-600" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border">
                      <Field label="Catatan Filing" value={av.filingNote} />
                      <Field label="Alasan Penolakan" value={av.rejectionReason} />
                      <Field label="Nominal LPJ" value={av.lpjNominal ? `Rp ${av.lpjNominal.toLocaleString('id-ID')}` : undefined} />
                      <Field label="Tanggal Entry LPJ" value={av.lpjEntryDate} />
                      <Field label="Owner ID" value={av.ownerId} mono />
                    </div>
                  </section>

                </div>

                <DialogFooter className="border-t pt-4 mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setPrintModalActor(av);
                      setSelectedPrintDate(av.surveyData?.tanggalSurvey || new Date().toISOString().split('T')[0]);
                      setSaveDateToSurvey(true);
                    }}
                    disabled={!av.surveyData}
                    className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" /> Download Berita Acara Survey (PDF)
                  </Button>
                  <Button variant="ghost" onClick={() => setAdminViewActor(null)}>Tutup</Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL CETAK / DOWNLOAD BERITA ACARA SURVEY ────────────────── */}
      <Dialog open={!!printModalActor} onOpenChange={(open) => !open && setPrintModalActor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700 font-black uppercase">
              <FileDown className="w-5 h-5" /> Download Berita Acara Survey
            </DialogTitle>
            <DialogDescription>
              Pilih atau sesuaikan tanggal pelaksanaan survey untuk dokumen Berita Acara PDF.
            </DialogDescription>
          </DialogHeader>

          {printModalActor && (() => {
            const pmPejabat = getActorPejabat(printModalActor)
            const pmVerifikator = pmPejabat?.verifikator?.nama || getVerifikatorName(printModalActor)
            const pmPetugas = pmPejabat?.petugas?.nama || printModalActor.petugasSurvey || "-"

            return (
              <div className="space-y-4 py-2">
                <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3.5 space-y-1">
                  <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Pelaku Usaha</p>
                  <p className="text-sm font-black text-purple-950 uppercase">{printModalActor.fullName}</p>
                  <p className="text-xs text-purple-700 font-medium">{printModalActor.businessName || printModalActor.surveyData?.namaUsaha || "Nama Usaha Belum Ada"}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="print-survey-date" className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-600" /> Tanggal Berita Acara / Survey
                  </Label>
                  <Input
                    id="print-survey-date"
                    type="date"
                    value={selectedPrintDate}
                    onChange={(e) => setSelectedPrintDate(e.target.value)}
                    className="bg-slate-50 border-slate-200 focus-visible:ring-purple-500 font-semibold"
                  />
                </div>

                {/* Preview teks format Bahasa Indonesia */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Bunyi Kalimat Pada Berita Acara
                  </p>
                  <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                    "Pada hari ini <strong className="text-purple-700 not-italic font-bold">{formatTanggalIndonesia(selectedPrintDate).hari}</strong>, tanggal <strong className="text-purple-700 not-italic font-bold">{formatTanggalIndonesia(selectedPrintDate).tanggal} {formatTanggalIndonesia(selectedPrintDate).bulan} {formatTanggalIndonesia(selectedPrintDate).tahun}</strong>, yang bertandatangan dibawah ini :"
                  </p>
                </div>

                {/* Info Pejabat Penandatangan */}
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Pejabat Penandatangan Berita Acara
                    </span>
                    {(isAdmin || isVerifikatorDinas) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        className="h-6 px-2 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 rounded-lg gap-1"
                        onClick={() => {
                          if (printModalActor) openEditPejabatForActor(printModalActor);
                        }}
                      >
                        <Edit className="w-3 h-3" /> Edit NIPPPK
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-indigo-100/80 space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">1. Verifikator</p>
                      <p className="font-bold text-indigo-950 truncate">{pmVerifikator}</p>
                      <p className="text-[9px] text-slate-500 truncate">{pmPejabat?.verifikator?.jabatan || (pmPejabat?.verifikator?.nipppk ? `NIP: ${pmPejabat.verifikator.nipppk}` : "Verifikator Dinas")}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-100/80 space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">2. Petugas Survey</p>
                      <p className="font-bold text-indigo-950 truncate">{pmPetugas}</p>
                      <p className="text-[9px] text-slate-500 truncate">{pmPejabat?.petugas?.jabatan || (pmPejabat?.petugas?.nipppk ? `NIP: ${pmPejabat.petugas.nipppk}` : "Petugas Survey")}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="save-date-checkbox"
                    checked={saveDateToSurvey}
                    onCheckedChange={(c) => setSaveDateToSurvey(!!c)}
                  />
                  <Label htmlFor="save-date-checkbox" className="text-xs text-slate-600 cursor-pointer font-medium">
                    Simpan tanggal ini ke data survey pelaku usaha
                  </Label>
                </div>
              </div>
            )
          })()}

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={() => setPrintModalActor(null)} disabled={!!generatingPdfId}>
              Batal
            </Button>
            <Button
              onClick={() => {
                if (printModalActor) {
                  handleGeneratePDF(printModalActor, selectedPrintDate, saveDateToSurvey);
                }
              }}
              disabled={!selectedPrintDate || (generatingPdfId === printModalActor?.id)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5"
            >
              {generatingPdfId === printModalActor?.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Download Berita Acara (PDF)</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL EDIT PEJABAT & NIPPPK (KHUSUS ADMIN / VERIFIKATOR) ──────────────── */}
      <Dialog open={showEditPejabatDialog} onOpenChange={setShowEditPejabatDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-indigo-700 flex items-center gap-2">
              <Edit className="w-5 h-5" /> Edit Data Pejabat & NIPPPK
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Perbarui NIPPPK, Nama, Pangkat, dan Jabatan pejabat. Perubahan otomatis tercetak pada dokumen Berita Acara Survey.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Kolom 1 – Verifikator Dinas */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">1</div>
                <h3 className="font-black text-sm uppercase tracking-wider text-indigo-800">Data Verifikator Dinas</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nama Lengkap <span className="text-red-500">*</span></Label>
                  <Input
                    value={pejabatEditForm.verifikatorNama}
                    onChange={e => setPejabatEditForm(prev => ({ ...prev, verifikatorNama: e.target.value }))}
                    placeholder="Nama lengkap verifikator"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">NIPPPK / NIP <span className="text-indigo-600 font-normal">(Otomatis ke Berita Acara)</span></Label>
                  <Input
                    value={pejabatEditForm.verifikatorNipppk}
                    onChange={e => setPejabatEditForm(prev => ({ ...prev, verifikatorNipppk: e.target.value }))}
                    placeholder="Nomor NIPPPK"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 font-mono text-sm focus-visible:ring-indigo-500 text-purple-700 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pangkat / Gol. Ruang</Label>
                  <Input
                    value={pejabatEditForm.verifikatorPangkat}
                    onChange={e => setPejabatEditForm(prev => ({ ...prev, verifikatorPangkat: e.target.value }))}
                    placeholder="Contoh: Penata, III/c"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Jabatan</Label>
                  <Input
                    value={pejabatEditForm.verifikatorJabatan}
                    onChange={e => setPejabatEditForm(prev => ({ ...prev, verifikatorJabatan: e.target.value }))}
                    placeholder="Contoh: Verifikator Dinas"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            {/* Kolom 2 – Petugas Survey */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center">2</div>
                <h3 className="font-black text-sm uppercase tracking-wider text-violet-800">Data Petugas Survey</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nama Petugas Survey</Label>
                  <Input
                    value={pejabatEditForm.petugasNama}
                    onChange={e => setPejabatEditForm(prev => ({ ...prev, petugasNama: e.target.value }))}
                    placeholder="Nama petugas survey"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">NIPPPK / NIP Petugas</Label>
                  <Input
                    value={pejabatEditForm.petugasNipppk}
                    onChange={e => setPejabatEditForm(prev => ({ ...prev, petugasNipppk: e.target.value }))}
                    placeholder="Nomor NIPPPK Petugas"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 font-mono text-sm focus-visible:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pangkat / Gol. Ruang</Label>
                  <Input
                    value={pejabatEditForm.petugasPangkat}
                    onChange={e => setPejabatEditForm(prev => ({ ...prev, petugasPangkat: e.target.value }))}
                    placeholder="Contoh: Pengatur, II/c"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Jabatan</Label>
                  <Input
                    value={pejabatEditForm.petugasJabatan}
                    onChange={e => setPejabatEditForm(prev => ({ ...prev, petugasJabatan: e.target.value }))}
                    placeholder="Contoh: Petugas Survey"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox Sinkronisasi ke Seluruh Berkas di Grup */}
            {pejabatEditForm.targetGroupNipKey && (
              <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 flex items-center space-x-2.5">
                <Checkbox
                  id="sync-all-checkbox"
                  checked={pejabatEditForm.syncAllInGroup}
                  onCheckedChange={(c) => setPejabatEditForm(prev => ({ ...prev, syncAllInGroup: !!c }))}
                />
                <Label htmlFor="sync-all-checkbox" className="text-xs font-semibold text-purple-900 cursor-pointer">
                  Terapkan perubahan NIPPPK ini secara otomatis ke seluruh berkas pelaku usaha di grup ini
                </Label>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
            <p className="text-xs text-slate-400 flex-1">
              Perubahan NIPPPK akan otomatis terupdate pada Berita Acara Survey PDF.
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setShowEditPejabatDialog(false)} disabled={isSavingPejabat}>
                Batal
              </Button>
              <Button
                onClick={handleSavePejabatEdit}
                disabled={isSavingPejabat}
                className="flex-1 sm:flex-initial min-w-[150px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold gap-2"
              >
                {isSavingPejabat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Simpan NIPPPK Pejabat
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Akun Verifikator Dinas */}
      <ConfirmDialog
        open={showDeleteVerifikatorDialog}
        onOpenChange={setShowDeleteVerifikatorDialog}
        title="Hapus Akun Verifikator"
        description={`Hapus akun ${deleteVerifikatorTarget?.displayName} (${deleteVerifikatorTarget?.username}) secara permanen dari sistem? Akun baru dapat di-generate ulang kapan saja.`}
        variant="destructive"
        confirmText="Ya, Hapus Permanen"
        icon={<UserX className="w-8 h-8 text-rose-500" />}
        onConfirm={executeDeleteVerifikatorAccount}
        isLoading={isDeletingVerifikator}
      />

    </div>
  )
}

