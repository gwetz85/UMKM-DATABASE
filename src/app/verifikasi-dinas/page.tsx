"use client"

import { useState, useMemo, useEffect, useDeferredValue } from "react"
import { parsePobDob } from "@/lib/utils"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject, sanitizeForFirebase } from "@/firebase"
import { ref, query, orderByChild, equalTo } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import { SurveyDinasData, PejabatData } from "../lib/types"

import { Textarea } from "@/components/ui/textarea"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"

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
  Camera,
  Upload,
  Folder,
  FileDown,
  Edit,
  RotateCcw,
  UserCheck,
  MessageCircle,
  Calendar,
  Image as ImageIcon
} from "lucide-react"
import { generateBeritaAcaraPDF, formatTanggalIndonesia } from "@/lib/generate-berita-acara-pdf"
import { ensureVerifikatorUser } from "@/lib/verifikator-service"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function VerifikasiDinasPage() {
  const { user, userProfile, isProfileLoading } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearch = useDeferredValue(searchQuery)
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [verifyingActor, setVerifyingActor] = useState<BusinessActor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false)
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)
  const [resetSurveyActor, setResetSurveyActor] = useState<BusinessActor | null>(null)
  const [isResettingSurvey, setIsResettingSurvey] = useState(false)

  // Print Berita Acara Modal states
  const [printModalActor, setPrintModalActor] = useState<BusinessActor | null>(null)
  const [selectedPrintDate, setSelectedPrintDate] = useState<string>("")
  const [saveDateToSurvey, setSaveDateToSurvey] = useState(true)

  // Choice dialog states
  const [choiceActor, setChoiceActor] = useState<BusinessActor | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<'survey' | 'cancel' | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

  // Pejabat Modal (First Login for Petugas Survey)
  const [showPejabatModal, setShowPejabatModal] = useState(false)
  const [isSavingPejabat, setIsSavingPejabat] = useState(false)
  const [pejabatForm, setPejabatForm] = useState({
    verifikatorNama: "",
    verifikatorNipppk: "",
    verifikatorPangkat: "",
    verifikatorJabatan: "",
    petugasNama: "",
    petugasNipppk: "",
    petugasPangkat: "",
    petugasJabatan: "",
  })

  const [surveyData, setSurveyData] = useState<Partial<SurveyDinasData>>({})
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  
  // Format rupiah
  const formatRupiah = (value: string) => {
    const numberString = value.replace(/[^,\d]/g, '').toString();
    const split = numberString.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    if (ribuan) {
      const separator = sisa ? '.' : '';
      rupiah += separator + ribuan.join('.');
    }
    return split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
  };

  // Calculate progress
  const calculateProgress = () => {
    let requiredFields = 18; // email tidak wajib
    let filled = 0;
    if (surveyData.tanggalSurvey) filled++;
    if (surveyData.namaUsaha) filled++;
    if (surveyData.namaPemilik) filled++;
    if (surveyData.jenisKelamin) filled++;
    if (surveyData.status) filled++;
    if (surveyData.alamatRumah) filled++;
    if (surveyData.noHp) filled++;
    // email: opsional, tidak dihitung dalam progress
    if (surveyData.sosmed) filled++;
    if (surveyData.dtks?.masuk !== undefined) {
      filled++;
      if (surveyData.dtks.masuk) {
        requiredFields++;
        if (surveyData.dtks.jenis) filled++;
      }
    }
    if (surveyData.bidangUsaha) filled++;
    if (surveyData.peralatan) filled++;
    if (surveyData.tahunBerdiri) filled++;
    if (surveyData.izin && surveyData.izin.length > 0) filled++;
    if (surveyData.modalUsaha) filled++;
    if (surveyData.omset) filled++;
    if (surveyData.hibah?.pernah !== undefined) {
      filled++;
      if (surveyData.hibah.pernah) {
        requiredFields += 2;
        if (surveyData.hibah.dariMana) filled++;
        if (surveyData.hibah.tahun) filled++;
      }
    }
    if (surveyData.rencanaPenggunaan) filled++;
    if (surveyData.hasilSurvey) filled++;
    
    // Photo and location
    requiredFields += 2;
    if (surveyData.fotoSurveyUrl) filled++;
    if (location) filled++;
    
    return Math.min(100, Math.round((filled / requiredFields) * 100));
  };

  const surveyProgress = useMemo(() => {
    if (!verifyingActor) return 0;
    return calculateProgress();
  }, [surveyData, location, verifyingActor]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const rawResult = event.target?.result as string
        const img = new window.Image()
        img.src = rawResult
        img.onload = () => {
          try {
            // Target: max 1MB raw ≈ 1,398,101 bytes base64
            const MAX_B64_BYTES = 1_398_101
            const canvas = document.createElement('canvas')
            // Start with max 1200px longest side
            const MAX_DIM = 1200
            let width = img.width
            let height = img.height
            if (width > height) {
              if (width > MAX_DIM) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
            } else {
              if (height > MAX_DIM) { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
            }
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx?.drawImage(img, 0, 0, width, height)
            // Try decreasing quality until under 1MB
            let result = ''
            for (const q of [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]) {
              result = canvas.toDataURL('image/jpeg', q)
              if (result.length <= MAX_B64_BYTES) break
            }
            // If still over 1MB, reduce dimensions
            if (result.length > MAX_B64_BYTES) {
              const s2 = document.createElement('canvas')
              s2.width = Math.round(width * 0.7); s2.height = Math.round(height * 0.7)
              s2.getContext('2d')?.drawImage(canvas, 0, 0, s2.width, s2.height)
              result = s2.toDataURL('image/jpeg', 0.5)
            }
            setPhotoPreview(result)
            setSurveyData(prev => ({ ...prev, fotoSurveyUrl: result }))
          } catch {
            setPhotoPreview(rawResult)
            setSurveyData(prev => ({ ...prev, fotoSurveyUrl: rawResult }))
          }
        }
        img.onerror = () => {
          setPhotoPreview(rawResult)
          setSurveyData(prev => ({ ...prev, fotoSurveyUrl: rawResult }))
        }
      }
      reader.readAsDataURL(file)
      e.target.value = ''
    }
  }

  const openChoiceDialog = (actor: BusinessActor) => {
    setChoiceActor(actor)
    setSelectedChoice(null)
    setCancelReason("")
  }

  const handleProceedToSurvey = () => {
    if (!choiceActor) return
    const targetActor = choiceActor
    setChoiceActor(null)
    openSurveyDialog(targetActor)
  }

  const handleSubmitCancel = () => {
    if (!choiceActor || !database || !cancelReason.trim()) return
    setIsSubmittingCancel(true)

    const actorRef = ref(database, `businessActors/${choiceActor.id}`)
    updateDocumentNonBlocking(actorRef, {
      status: 'verified_dinas',
      hasilVerifikasiDinas: 'Tidak Lolos',
      alasanCancelDinas: cancelReason.trim(),
      cancelDinasAt: new Date().toISOString(),
      cancelDinasBy: user?.email || user?.uid || 'Dinas'
    })

    logActivity({
      query: `CANCEL SURVEY DINAS: ${choiceActor.fullName} - Alasan: ${cancelReason.trim()}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'CANCEL SURVEY DINAS',
      userId: user?.email || user?.uid || 'Dinas'
    })

    toast({ title: "Data Berhasil Di-Cancel", description: `Data ${choiceActor.fullName} telah dipindahkan ke daftar Ditolak.` })
    setChoiceActor(null)
    setSelectedChoice(null)
    setCancelReason("")
    setIsSubmittingCancel(false)
  }

  const openSurveyDialog = (actor: BusinessActor) => {
    setVerifyingActor(actor);
    const existingLoc = actor.verificationLocationDinas || (actor.surveyData as any)?.location || null;
    setLocation(existingLoc);
    setPhotoPreview(actor.surveyData?.fotoSurveyUrl || actor.photoUsahaUri || actor.comparisonPhotoUrl || null);
    
    // Auto fill data from surveyData or actor's existing profile
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = actor.surveyData || {} as Partial<SurveyDinasData>;
    
    let defaultGender = '';
    if (existing.jenisKelamin) {
      defaultGender = existing.jenisKelamin;
    } else if (actor.gender) {
      defaultGender = actor.gender.toLowerCase().includes('perempuan') ? 'Perempuan' : 'Laki-Laki';
    }

    setSurveyData({
      tanggalSurvey: existing.tanggalSurvey || todayStr,
      namaUsaha: existing.namaUsaha || actor.businessName || '',
      namaPemilik: existing.namaPemilik || actor.fullName || '',
      jenisKelamin: defaultGender,
      status: existing.status || '',
      alamatRumah: existing.alamatRumah || actor.address || '',
      noHp: existing.noHp || actor.phone || '',
      email: existing.email || '',
      sosmed: existing.sosmed || '',
      bidangUsaha: existing.bidangUsaha || actor.businessCategory || '',
      peralatan: existing.peralatan || '',
      tahunBerdiri: existing.tahunBerdiri || '',
      modalUsaha: existing.modalUsaha || '',
      omset: existing.omset || '',
      rencanaPenggunaan: existing.rencanaPenggunaan || '',
      hasilSurvey: existing.hasilSurvey || '',
      dtks: existing.dtks || { masuk: false },
      hibah: existing.hibah || { pernah: false },
      izin: existing.izin || [],
      fotoSurveyUrl: existing.fotoSurveyUrl || actor.photoUsahaUri || actor.comparisonPhotoUrl || undefined,
      pejabatData: existing.pejabatData || actor.pejabatData || undefined
    });
  };

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

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin' || userProfile?.role === 'superadmin'
  const isDinas = userProfile?.role === 'dinas' || userProfile?.role === 'verifikator_dinas'
  const isPetugas = userProfile?.role === 'petugas_survey' || userProfile?.role === 'petugas'

  // Auto-show pejabat modal on first petugas login if not yet filled, or load existing pejabatData
  useEffect(() => {
    if (userProfile) {
      const pd = (userProfile as any).pejabatData as PejabatData | undefined;
      const cached = typeof window !== 'undefined' ? ((user?.uid ? localStorage.getItem(`pejabatData_${user.uid}`) : null) || localStorage.getItem('pejabatData')) : null;
      const cachedPd = cached ? JSON.parse(cached) : null;
      const activePd = pd || cachedPd;

      if (activePd?.verifikator?.nama || activePd?.petugas?.nama) {
        setPejabatForm({
          verifikatorNama: activePd.verifikator?.nama || "",
          verifikatorNipppk: activePd.verifikator?.nipppk || "",
          verifikatorPangkat: activePd.verifikator?.pangkat || "",
          verifikatorJabatan: activePd.verifikator?.jabatan || "",
          petugasNama: activePd.petugas?.nama || userProfile.fullName || "",
          petugasNipppk: activePd.petugas?.nipppk || "",
          petugasPangkat: activePd.petugas?.pangkat || "",
          petugasJabatan: activePd.petugas?.jabatan || "",
        });
      } else if (isPetugas) {
        // Pre-fill petugas nama from profile
        setPejabatForm(prev => ({ ...prev, petugasNama: userProfile.fullName || "" }));
        setShowPejabatModal(true);
      }
    }
  }, [isPetugas, userProfile?.id, user?.uid, userProfile])

  // Always query by indexed 'status: lpj_pending' to avoid downloading entire businessActors collection
  const memoQuery = useMemoFirebase(() => {
    if (!database || isProfileLoading || !userProfile) return null
    return query(ref(database, 'businessActors'), orderByChild('status'), equalTo('lpj_pending'))
  }, [database, isProfileLoading, userProfile])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const kuotaRef = useMemoFirebase(() => database ? ref(database, 'koordinator_kuotas') : null, [database])
  const { data: kuotaData } = useList<any>(kuotaRef)

  // O(1) Lookup Map for Coordinator Phone Numbers
  const kuotaMap = useMemo(() => {
    const map = new Map<string, string>();
    if (kuotaData) {
      kuotaData.forEach((q: any) => {
        const name = (q.name || q.coordinator || "").toUpperCase().trim();
        const phone = q.phone || q.noHp || q.hp || "";
        if (name && phone) map.set(name, phone);
      });
    }
    return map;
  }, [kuotaData]);

  const actors = useMemo(() => {
    if (!allActorsRaw) return []
    return allActorsRaw.filter(a => {
      if (!a) return false;
      if (isPetugas) {
        if (!userProfile?.fullName) return false;
        const userPetugasUpper = String(userProfile.fullName).toUpperCase().trim();
        const actorPetugasUpper = String(a.petugasSurvey || a.createdBy || "").toUpperCase().trim();
        return actorPetugasUpper === userPetugasUpper;
      }
      return a.status === 'lpj_pending';
    })
  }, [allActorsRaw, isPetugas, userProfile?.fullName])

  const filteredActors = useMemo(() => {
    if (!actors) return []
    const q = deferredSearch.toLowerCase().trim()
    if (!q) return actors
    return actors.filter(actor =>
      (actor.fullName && actor.fullName.toLowerCase().includes(q)) ||
      (actor.nik && actor.nik.includes(q)) ||
      (actor.businessName && actor.businessName.toLowerCase().includes(q)) ||
      (actor.kelurahan && actor.kelurahan.toLowerCase().includes(q))
    )
  }, [actors, deferredSearch])

  const groupedActors = useMemo(() => {
    if (!filteredActors) return {}
    return filteredActors.reduce((acc, actor) => {
      const kel = actor.kelurahan || "Lainnya"
      if (!acc[kel]) acc[kel] = []
      acc[kel].push(actor)
      return acc
    }, {} as Record<string, BusinessActor[]>)
  }, [filteredActors])

  const getWaLink = (phoneStr: string) => {
    if (!phoneStr) return "#";
    let clean = phoneStr.replace(/\D/g, "");
    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
    else if (!clean.startsWith("62")) clean = "62" + clean;
    return `https://wa.me/${clean}`;
  };

  const handleVerifyDinas = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!verifyingActor || !database || (!isAdmin && !isDinas && !isPetugas)) return;
    if (surveyProgress < 100) {
      toast({ variant: "destructive", title: "Data Belum Lengkap", description: "Progress harus 100% untuk menyimpan verifikasi." });
      return;
    }
    if (!location) {
      toast({ variant: "destructive", title: "Lokasi belum diambil", description: "Harap ambil lokasi sebelum menyimpan keputusan verifikasi." });
      return;
    }

    setIsSubmittingVerify(true);

    try {
      const activePejabat = (pejabatForm.verifikatorNama && pejabatForm.petugasNama)
        ? {
            verifikator: { 
              nama: pejabatForm.verifikatorNama || '', 
              nipppk: pejabatForm.verifikatorNipppk || '', 
              pangkat: pejabatForm.verifikatorPangkat || '', 
              jabatan: pejabatForm.verifikatorJabatan || '' 
            },
            petugas: { 
              nama: pejabatForm.petugasNama || '', 
              nipppk: pejabatForm.petugasNipppk || '', 
              pangkat: pejabatForm.petugasPangkat || '', 
              jabatan: pejabatForm.petugasJabatan || '' 
            }
          }
        : ((userProfile as any)?.pejabatData || null);

      const mergedSurveyData: any = {
        ...surveyData,
      };
      if (activePejabat) {
        mergedSurveyData.pejabatData = activePejabat;
      }
      if (location) {
        mergedSurveyData.location = location;
      }

      const actorRef = ref(database, `businessActors/${verifyingActor.id}`);
      const currentOfficerName = isPetugas ? (userProfile?.fullName || pejabatForm.petugasNama) : (pejabatForm.petugasNama || userProfile?.fullName);
      const updateData: any = {
        status: 'verified_dinas',
        hasilVerifikasiDinas: 'Lolos',
        surveyData: mergedSurveyData,
        surveyProgress: 100,
        verificationLocationDinas: { lat: location.lat, lon: location.lon },
        verifiedDinasAt: new Date().toISOString(),
        verifiedDinasBy: userProfile?.fullName || user?.email || user?.uid || 'Admin',
      };
      if (currentOfficerName && (!verifyingActor.petugasSurvey || verifyingActor.petugasSurvey === '-' || verifyingActor.petugasSurvey.trim() === '')) {
        updateData.petugasSurvey = currentOfficerName.toUpperCase().trim();
      }
      if (activePejabat?.verifikator?.nama) {
        updateData.verifikatorDinas = activePejabat.verifikator.nama;
        updateData.pejabatData = activePejabat;
      }

      const cleanData = sanitizeForFirebase(updateData);
      const { update } = await import('firebase/database');
      await update(actorRef, cleanData);

      // Update global stats
      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        updateStatsOnStatusChange(database, verifyingActor.status || 'lpj_pending', 'verified_dinas', verifyingActor).catch(e => console.error(e));
      });

      logActivity({
        query: `SURVEY DINAS: ${verifyingActor.fullName} - LOLOS`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'SURVEY DINAS',
        userId: user?.email || user?.uid || 'Admin'
      });

      // Auto-generate account for Verifikator Dinas if present
      if (activePejabat?.verifikator?.nama) {
        ensureVerifikatorUser(database, activePejabat.verifikator).catch(console.error);
      }

      toast({ title: "Survey Berhasil Disimpan", description: `Data pelaku usaha telah di-update.` });
      setVerifyingActor(null);
    } catch (err: any) {
      console.error("Error saving survey verification:", err);
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err?.message || "Terjadi kesalahan saat menyimpan verifikasi." });
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  const handleSimpanDraft = async () => {
    if (!verifyingActor || !database) return;
    if (!isAdmin && !isDinas && !isPetugas) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki akses untuk menyimpan draft survey." });
      return;
    }
    setIsSubmittingDraft(true);

    try {
      const activePejabat = (pejabatForm.verifikatorNama && pejabatForm.petugasNama)
        ? {
            verifikator: { 
              nama: pejabatForm.verifikatorNama || '', 
              nipppk: pejabatForm.verifikatorNipppk || '', 
              pangkat: pejabatForm.verifikatorPangkat || '', 
              jabatan: pejabatForm.verifikatorJabatan || '' 
            },
            petugas: { 
              nama: pejabatForm.petugasNama || '', 
              nipppk: pejabatForm.petugasNipppk || '', 
              pangkat: pejabatForm.petugasPangkat || '', 
              jabatan: pejabatForm.petugasJabatan || '' 
            }
          }
        : ((userProfile as any)?.pejabatData || null);

      const currentProgress = calculateProgress();
      const mergedSurveyData: any = {
        ...surveyData,
      };
      if (activePejabat) {
        mergedSurveyData.pejabatData = activePejabat;
      }
      if (location) {
        mergedSurveyData.location = location;
      }

      const actorRef = ref(database, `businessActors/${verifyingActor.id}`);
      const currentOfficerName = isPetugas ? (userProfile?.fullName || pejabatForm.petugasNama) : (pejabatForm.petugasNama || userProfile?.fullName);
      const updateData: any = {
        surveyData: mergedSurveyData,
        surveyProgress: currentProgress,
        lastDraftBy: userProfile?.fullName || user?.email || 'Petugas',
        lastDraftAt: new Date().toISOString(),
      };
      if (currentOfficerName && (!verifyingActor.petugasSurvey || verifyingActor.petugasSurvey === '-' || verifyingActor.petugasSurvey.trim() === '')) {
        updateData.petugasSurvey = currentOfficerName.toUpperCase().trim();
      }
      if (activePejabat?.verifikator?.nama) {
        updateData.verifikatorDinas = activePejabat.verifikator.nama;
        updateData.pejabatData = activePejabat;
      }
      if (location) {
        updateData.verificationLocationDinas = { lat: location.lat, lon: location.lon };
      }

      const cleanData = sanitizeForFirebase(updateData);
      const { update } = await import('firebase/database');
      await update(actorRef, cleanData);

      toast({ 
        title: "Draft Tersimpan", 
        description: `Draft progress survey (${currentProgress}%) telah berhasil disimpan dan dapat dilanjutkan kapan saja.` 
      });
      setVerifyingActor(null);
    } catch (err: any) {
      console.error("Error saving draft:", err);
      toast({ 
        variant: "destructive", 
        title: "Gagal Menyimpan Draft", 
        description: err?.message || "Terjadi kesalahan saat menyimpan draft survey." 
      });
    } finally {
      setIsSubmittingDraft(false);
    }
  };

  const resolvePejabatData = async (actor: BusinessActor): Promise<PejabatData | undefined> => {
    // 1. From surveyData or actor's own pejabatData
    const surveyPd = (actor.surveyData as any)?.pejabatData as PejabatData | undefined;
    const actorPd = actor.pejabatData;
    const directPd = surveyPd || actorPd;

    if (directPd?.verifikator?.nama && directPd?.petugas?.nama) {
      // Check if system_users has updated NIPPPK
      if (database) {
        try {
          const { ref: dbRef, get: dbGet } = await import('firebase/database');
          const usersSnap = await dbGet(dbRef(database, 'system_users'));
          if (usersSnap.exists()) {
            const allUsers = usersSnap.val();
            const vUpper = String(directPd.verifikator.nama).toUpperCase().trim();
            for (const k of Object.keys(allUsers)) {
              const u = allUsers[k];
              if (u?.fullName && u.fullName.toUpperCase().trim() === vUpper && u.nipppk) {
                directPd.verifikator.nipppk = String(u.nipppk).trim();
                if (u.pangkat) directPd.verifikator.pangkat = String(u.pangkat).trim();
                if (u.jabatan) directPd.verifikator.jabatan = String(u.jabatan).trim();
                break;
              }
            }
          }
        } catch (e) {
          console.error("Error finding updated NIPPPK in system_users:", e);
        }
      }
      return directPd;
    }

    // 2. Current form state if filled
    if (pejabatForm.verifikatorNama && pejabatForm.petugasNama) {
      return {
        verifikator: {
          nama: pejabatForm.verifikatorNama,
          nipppk: pejabatForm.verifikatorNipppk,
          pangkat: pejabatForm.verifikatorPangkat,
          jabatan: pejabatForm.verifikatorJabatan
        },
        petugas: {
          nama: pejabatForm.petugasNama,
          nipppk: pejabatForm.petugasNipppk,
          pangkat: pejabatForm.petugasPangkat,
          jabatan: pejabatForm.petugasJabatan
        }
      };
    }

    // 3. From system_users matching actor.petugasSurvey or actor.verifikatorDinas
    if (database && (actor.petugasSurvey || actor.verifikatorDinas)) {
      try {
        const { ref: dbRef, get: dbGet } = await import('firebase/database');
        const usersSnap = await dbGet(dbRef(database, 'system_users'));
        if (usersSnap.exists()) {
          const allUsers = usersSnap.val();
          const pTarget = (actor.petugasSurvey || "").toUpperCase().trim();
          const vTarget = (actor.verifikatorDinas || "").toUpperCase().trim();
          for (const k of Object.keys(allUsers)) {
            const u = allUsers[k];
            if (pTarget && u?.fullName && u.fullName.toUpperCase().trim() === pTarget && u.pejabatData) {
              return u.pejabatData;
            }
            if (vTarget && u?.fullName && u.fullName.toUpperCase().trim() === vTarget && u.pejabatData) {
              return u.pejabatData;
            }
          }
        }
      } catch (e) {
        console.error("Error finding petugas/verifikator survey pejabatData:", e);
      }
    }

    // 4. From logged in user profile
    const profilePd = (userProfile as any)?.pejabatData as PejabatData | undefined;
    if (profilePd?.verifikator?.nama && profilePd?.petugas?.nama) {
      return profilePd;
    }

    // 5. From localStorage
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

    if (profilePd) return profilePd;
    return undefined;
  };

  const handleGeneratePDF = async (actor: BusinessActor, customDate?: string, saveToSurvey?: boolean) => {
    if (!actor.surveyData) {
      toast({ variant: "destructive", title: "Data Survey Belum Ada", description: "Lakukan survey terlebih dahulu sebelum mencetak Berita Acara." })
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
      toast({ variant: "destructive", title: "Gagal Membuat PDF", description: "Terjadi kesalahan saat membuat dokumen PDF." })
    } finally {
      setGeneratingPdfId(null)
    }
  }

  const handleSavePejabat = async () => {
    if (!user || !database) return
    const { verifikatorNama, verifikatorNipppk, verifikatorPangkat, verifikatorJabatan,
            petugasNama, petugasNipppk, petugasPangkat, petugasJabatan } = pejabatForm
    if (!verifikatorNama || !verifikatorNipppk || !verifikatorPangkat || !verifikatorJabatan ||
        !petugasNama || !petugasNipppk || !petugasPangkat || !petugasJabatan) {
      toast({ variant: "destructive", title: "Lengkapi Data", description: "Semua kolom wajib diisi." })
      return
    }
    setIsSavingPejabat(true)
    const pejabatData: PejabatData = {
      verifikator: { nama: verifikatorNama.trim(), nipppk: verifikatorNipppk.trim(), pangkat: verifikatorPangkat.trim(), jabatan: verifikatorJabatan.trim() },
      petugas: { nama: petugasNama.trim(), nipppk: petugasNipppk.trim(), pangkat: petugasPangkat.trim(), jabatan: petugasJabatan.trim() },
      updatedAt: new Date().toISOString()
    }
    const { ref: dbRef, update } = await import('firebase/database')

    // 1. Simpan ke database berdasarkan userProfile.id (key username di system_users)
    if (userProfile?.id) {
      await update(dbRef(database, `system_users/${userProfile.id}`), {
        pejabatData,
        nipppk: isPetugas ? pejabatData.petugas.nipppk : pejabatData.verifikator.nipppk,
        pangkat: isPetugas ? pejabatData.petugas.pangkat : pejabatData.verifikator.pangkat,
        jabatan: isPetugas ? pejabatData.petugas.jabatan : pejabatData.verifikator.jabatan
      }).catch(console.error)
    }
    // 2. Simpan juga berdasarkan email username
    const emailUser = user?.email?.split('@')[0]?.toLowerCase()
    if (emailUser && emailUser !== userProfile?.id) {
      await update(dbRef(database, `system_users/${emailUser}`), { pejabatData }).catch(console.error)
    }
    // 3. Simpan juga berdasarkan user.uid
    if (user.uid) {
      await update(dbRef(database, `system_users/${user.uid}`), { pejabatData }).catch(console.error)
    }
    
    // 4. Simpan ke LocalStorage agar langsung aktif secara instan pada browser petugas
    if (typeof window !== 'undefined') {
      localStorage.setItem(`pejabatData_${user.uid}`, JSON.stringify(pejabatData))
      localStorage.setItem('pejabatData', JSON.stringify(pejabatData))
    }

    // 5. Update aktor yang sedang diverifikasi / dicetak jika ada
    if (verifyingActor) {
      updateDocumentNonBlocking(ref(database, `businessActors/${verifyingActor.id}`), {
        pejabatData,
        "surveyData/pejabatData": pejabatData,
        verifikatorDinas: pejabatData.verifikator.nama
      });
    }
    if (printModalActor) {
      updateDocumentNonBlocking(ref(database, `businessActors/${printModalActor.id}`), {
        pejabatData,
        "surveyData/pejabatData": pejabatData,
        verifikatorDinas: pejabatData.verifikator.nama
      });
    }

    // 6. Auto-generate / ensure akun untuk Verifikator Dinas jika belum ada
    if (pejabatData.verifikator?.nama) {
      await ensureVerifikatorUser(database, pejabatData.verifikator).catch(console.error);
    }

    toast({ title: "✅ Data Pejabat & NIPPPK Tersimpan", description: "Data pejabat berhasil disimpan dan akan otomatis tergenerate pada Berita Acara Survey." })
    setIsSavingPejabat(false)
    setShowPejabatModal(false)
  }

  const handleResetSurveyData = async () => {
    if (!resetSurveyActor || !database) return
    setIsResettingSurvey(true)
    const actorRef = ref(database, `businessActors/${resetSurveyActor.id}`)
    await import('firebase/database').then(({ update }) =>
      update(actorRef, {
        surveyData: null,
        surveyProgress: null,
        verificationLocationDinas: null,
      })
    )
    toast({ title: "✅ Data Survey Direset", description: `Data survey ${resetSurveyActor.fullName} berhasil dihapus (0%).` })
    setIsResettingSurvey(false)
    setResetSurveyActor(null)
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

  if (!isAdmin && !isDinas && !isPetugas && !isAdminLoading) return <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center"><ShieldAlert className="w-16 h-16 text-destructive" /><h1 className="text-2xl font-bold">Akses Ditolak</h1></div>

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in-up duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-3xl font-bold text-primary font-headline">Survey Dinas</h1>
            {filteredActors && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 shadow-sm flex items-center gap-2">
                <span>Total Data:</span>
                <span className="bg-primary text-white px-2 py-0.5 rounded-full">{filteredActors.length}</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Lakukan verifikasi tingkat dinas untuk data pelaku usaha yang telah diloloskan Admin.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Edit Pejabat Data Button for Petugas Survey / Admin / Dinas */}
          {(isAdmin || isDinas || isPetugas) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const pd = (userProfile as any)?.pejabatData as PejabatData | undefined
                const cached = typeof window !== 'undefined' ? ((user?.uid ? localStorage.getItem(`pejabatData_${user.uid}`) : null) || localStorage.getItem('pejabatData')) : null;
                const cachedPd = cached ? JSON.parse(cached) : null;
                const activePd = pd || cachedPd;
                if (activePd) {
                  setPejabatForm({
                    verifikatorNama: activePd.verifikator?.nama || "",
                    verifikatorNipppk: activePd.verifikator?.nipppk || "",
                    verifikatorPangkat: activePd.verifikator?.pangkat || "",
                    verifikatorJabatan: activePd.verifikator?.jabatan || "",
                    petugasNama: activePd.petugas?.nama || userProfile?.fullName || "",
                    petugasNipppk: activePd.petugas?.nipppk || "",
                    petugasPangkat: activePd.petugas?.pangkat || "",
                    petugasJabatan: activePd.petugas?.jabatan || "",
                  })
                }
                setShowPejabatModal(true)
              }}
              className="h-11 gap-2 rounded-xl border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold shrink-0"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Data Pejabat Berita Acara</span>
              <span className="sm:hidden">Pejabat</span>
            </Button>
          )}
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Cari Nama, NIK, atau Usaha..."
              className="flex h-11 w-full rounded-md border border-primary/20 bg-card px-3 py-2 pl-9 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                    Tindakan ini akan menghapus semua data pelaku usaha yang berstatus <strong>lpj_pending</strong> secara permanen dan tidak dapat dibatalkan.
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

      {(isLoading || isProfileLoading) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-[2rem] border border-slate-200/60 bg-white/80 p-6 space-y-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 bg-slate-200 rounded-full w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded-full w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-2 bg-slate-100 rounded w-1/3" />
                  <div className="h-2 bg-slate-200 rounded w-10" />
                </div>
                <div className="h-2 bg-slate-200 rounded-full w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100">
                <div className="space-y-1.5">
                  <div className="h-2 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-slate-100 rounded w-1/2" />
                  <div className="h-5 bg-slate-200 rounded-full w-2/3" />
                </div>
              </div>
              <div className="h-9 bg-slate-200 rounded-2xl w-full" />
            </div>
          ))}
        </div>
      ) : filteredActors?.length === 0 ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center py-20 text-muted-foreground bg-slate-50/50 rounded-3xl">
          <ClipboardCheck className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-bold uppercase tracking-widest text-xs">Tidak ada data untuk diverifikasi Dinas</p>
        </Card>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedActors).sort().map(([kelurahan, groupActors]) => (
            <div key={kelurahan} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary bg-primary/5 px-6 py-2 rounded-full border border-primary/10 shadow-sm">
                  Kelurahan {kelurahan}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <span className="text-[10px] font-bold text-muted-foreground bg-white border px-3 py-1 rounded-full shadow-sm">
                  {groupActors.length} Data
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupActors.map((actor) => {
                  const coordPhone = kuotaMap.get((actor.coordinator || "").toUpperCase().trim()) || "";
                  const actorProg = verifyingActor?.id === actor.id ? surveyProgress : (actor.surveyProgress || 0);

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

                          <div className="pb-3">
                            <div className="flex justify-between items-center text-[10px] font-bold mb-1.5">
                              <span className="text-slate-600 uppercase tracking-wider">Progress Pengisian</span>
                              <div className="flex items-center gap-1.5">
                                {actorProg > 0 && actorProg < 100 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    DRAFT
                                  </span>
                                )}
                                <span className={actorProg >= 100 ? 'text-emerald-600' : 'text-amber-600'}>
                                  {actorProg}%
                                </span>
                              </div>
                            </div>
                            <Progress value={actorProg} className="h-2" />
                            {actor.lastDraftBy && (
                              <p className="text-[9px] text-slate-400 mt-1 truncate">Draft oleh: <span className="font-medium text-slate-600">{actor.lastDraftBy}</span></p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100">
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Usaha</span>
                              <p className="text-[11px] font-black text-slate-700 truncate uppercase">{actor.businessName}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Kategori</span>
                              <div className="flex">
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                                  {actor.businessCategory}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
                            <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
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

                            <div className="flex items-center justify-end gap-2 pt-1">
                              {/* Tombol Reset Survey Data - Admin Only */}
                              {isAdmin && actor.surveyProgress != null && actor.surveyProgress > 0 && (
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => setResetSurveyActor(actor)}
                                  className="h-9 w-9 border-orange-100 text-orange-500 bg-orange-50 hover:bg-orange-500 hover:text-white rounded-xl shadow-sm transition-all duration-300"
                                  title="Reset Data Survey (Admin)"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Tombol Generate PDF Berita Acara */}
                              {(isAdmin || isDinas || isPetugas) && (
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => {
                                    setPrintModalActor(actor);
                                    setSelectedPrintDate(actor.surveyData?.tanggalSurvey || new Date().toISOString().split('T')[0]);
                                    setSaveDateToSurvey(true);
                                  }}
                                  disabled={generatingPdfId === actor.id || !actor.surveyData}
                                  className="h-9 w-9 border-purple-100 text-purple-600 bg-purple-50 hover:bg-purple-600 hover:text-white rounded-xl shadow-sm transition-all duration-300 disabled:opacity-40"
                                  title={actor.surveyData ? "Cetak Berita Acara Survey (PDF)" : "Survey belum diisi"}
                                >
                                  {generatingPdfId === actor.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <FileDown className="w-4 h-4" />}
                                </Button>
                              )}

                              {/* Viewer Trigger */}
                              <Button 
                                size="icon" 
                                variant="outline" 
                                onClick={() => setViewingActor(actor)} 
                                className="h-9 w-9 border-blue-100 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl shadow-sm transition-all duration-300" 
                                title="Lihat Detail"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              {/* Verifikasi / Tindakan Dinas Trigger */}
                              {(isAdmin || isDinas || isPetugas) && (
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => openChoiceDialog(actor)}
                                  className="h-9 w-9 border-emerald-100 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl shadow-sm transition-all duration-300"
                                  title="Verifikasi Dinas"
                                >
                                  <ClipboardCheck className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── SINGLE ROOT LEVEL DETAIL VIEWER MODAL ─────────────────────── */}
      <Dialog open={!!viewingActor} onOpenChange={(open) => !open && setViewingActor(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingActor && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                  <FileText className="w-6 h-6" /> Detail Pelaku Usaha
                </DialogTitle>
                <DialogDescription className="sr-only">Detail Pelaku Usaha</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                    {(() => {
                      const parsed = parsePobDob(viewingActor.pobDob || "")
                      return [
                        { label: "Nama Lengkap", value: viewingActor.fullName },
                        { label: "NIK", value: viewingActor.nik },
                        { label: "Nomor KK", value: viewingActor.noKK },
                        { label: "Jenis Kelamin", value: viewingActor.gender },
                        { label: "Tempat Lahir", value: viewingActor.pob || parsed.pob || "-" },
                        { label: "Tanggal Lahir", value: viewingActor.dob || parsed.dob || "-" },
                        { label: "Nomor HP", value: viewingActor.phone, isPhone: true }
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

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                    {[
                      { label: "Kecamatan", value: viewingActor.kecamatan },
                      { label: "Kelurahan", value: viewingActor.kelurahan },
                      { label: "RT/RW", value: viewingActor.rtRw },
                      { label: "Alamat", value: viewingActor.address, fullWidth: true }
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
                    {(() => {
                      const coordPhone = kuotaMap.get((viewingActor.coordinator || "").toUpperCase().trim()) || "";
                      return [
                        { label: "Usaha", value: viewingActor.businessName },
                        { label: "Kategori Usaha", value: viewingActor.businessCategory },
                        { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                        { label: "USULAN", value: viewingActor.coordinator },
                        { label: "NO. HP USULAN", value: coordPhone, isPhone: true },
                        { label: "PETUGAS SURVEY", value: viewingActor.petugasSurvey || "Belum ada" }
                      ].map((item: any, i: number) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                          {item.isPhone && item.value ? (
                            <a
                              href={getWaLink(item.value)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm transition-all active:scale-95 w-fit"
                              title="Klik untuk membuka obrolan WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20" />
                              <span>{item.value}</span>
                            </a>
                          ) : (
                            <p className="text-xs font-bold">{item.value || "-"}</p>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> Informasi Perbankan</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                    {[
                      { label: "Nama Bank", value: viewingActor.bankName },
                      { label: "Nomor Rekening", value: viewingActor.bankNumber },
                      { label: "Nama Pemilik Rekening", value: viewingActor.bankOwner }
                    ].map((item, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                        <p className="text-xs font-black text-primary">{item.value || "BELUM TERISI"}</p>
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

                {viewingActor.googleDriveLink && (
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Folder className="w-4 h-4" /> Berkas Tambahan (Google Drive)</div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-blue-800 uppercase">Folder Google Drive Pelaku Usaha</p>
                        <p className="text-[10px] font-medium text-blue-600 mt-1">Berisi foto, video, dokumen usulan, atau file lainnya</p>
                      </div>
                      <a href={viewingActor.googleDriveLink} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold px-4 py-2.5 rounded-lg text-xs shadow flex items-center justify-center min-w-[140px]">
                        Buka Folder Drive
                      </a>
                    </div>
                  </section>
                )}

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> Audit Sistem</div>
                  <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase">Status</p>
                      <p className="text-primary">{(viewingActor.status || "").replace('_', ' ').toUpperCase()}</p>
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

      {/* ─── SINGLE ROOT LEVEL CHOICE MODAL ────────────────────────────── */}
      <Dialog open={!!choiceActor} onOpenChange={(open) => { if (!open) { setChoiceActor(null); setSelectedChoice(null); setCancelReason(""); } }}>
        <DialogContent className="max-w-md">
          {choiceActor && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-primary uppercase flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" /> Tindakan Survey Dinas
                </DialogTitle>
                <DialogDescription>
                  Pilih tindakan untuk <span className="font-bold text-slate-800">{choiceActor.fullName}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                {/* Choice Buttons */}
                {!selectedChoice && (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedChoice('survey')}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 hover:border-emerald-500 hover:bg-emerald-100 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <ClipboardCheck className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="font-black text-emerald-700 text-sm uppercase tracking-wide">Di Survey</p>
                        <p className="text-[10px] text-emerald-600 mt-0.5">Lanjut isi form survey</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedChoice('cancel')}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-red-200 bg-red-50 hover:border-red-500 hover:bg-red-100 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <AlertTriangle className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="font-black text-red-700 text-sm uppercase tracking-wide">Cancel</p>
                        <p className="text-[10px] text-red-600 mt-0.5">Tolak &amp; isi alasan</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* Cancel reason form */}
                {selectedChoice === 'cancel' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <p className="text-xs font-semibold text-red-700">Data akan dipindahkan ke menu Ditolak beserta alasan cancel.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">Alasan Cancel Survey</Label>
                      <Textarea
                        placeholder="Tulis alasan cancel di sini..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={4}
                        className="resize-none border-red-200 focus-visible:ring-red-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedChoice(null)} className="flex-1">
                        Kembali
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSubmitCancel}
                        disabled={!cancelReason.trim() || isSubmittingCancel}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                      >
                        {isSubmittingCancel ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Submit Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Di Survey confirm */}
                {selectedChoice === 'survey' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <ClipboardCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-700">Anda akan membuka form survey untuk <strong>{choiceActor?.fullName}</strong></p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedChoice(null)} className="flex-1">
                        Kembali
                      </Button>
                      <Button type="button" onClick={handleProceedToSurvey} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                        <ClipboardCheck className="w-4 h-4 mr-2" /> Buka Form Survey
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {!selectedChoice && (
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => { setChoiceActor(null); setSelectedChoice(null); }} className="w-full">
                    Tutup
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── SINGLE ROOT LEVEL SURVEY FORM MODAL ───────────────────────── */}
      <Dialog open={!!verifyingActor} onOpenChange={(open) => !open && setVerifyingActor(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh]">
          {verifyingActor && (
            <form onSubmit={handleVerifyDinas}>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-emerald-600 uppercase">Survey Dinas</DialogTitle>
                <DialogDescription>Lengkapi form survey di bawah ini untuk <strong>{verifyingActor.fullName}</strong>. Progress harus mencapai 100% untuk menyimpan.</DialogDescription>
              </DialogHeader>
            
              <div className="sticky top-0 bg-white z-10 py-4 border-b border-slate-100 shadow-sm px-1 mb-4">
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span className="text-slate-600 uppercase">Progress Pengisian</span>
                  <span className={surveyProgress >= 100 ? 'text-emerald-600' : 'text-amber-600'}>{surveyProgress}%</span>
                </div>
                <Progress value={surveyProgress} className="h-2" />
              </div>

              <div className="py-2 space-y-6 max-h-[70vh] overflow-y-auto px-1">
                {/* Kolom Tanggal Survey / Berita Acara */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 items-center">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs uppercase tracking-wide">
                      <Calendar className="w-4 h-4 text-emerald-600" /> Tanggal Pelaksanaan Survey
                    </Label>
                    <Input
                      type="date"
                      value={surveyData.tanggalSurvey || ''}
                      onChange={e => setSurveyData(prev => ({...prev, tanggalSurvey: e.target.value}))}
                      className="bg-white border-emerald-200 focus-visible:ring-emerald-500 font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Format pada Berita Acara:</span>
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-100 text-xs text-emerald-950 font-medium">
                      Pada hari ini <span className="font-bold text-emerald-700 underline">{formatTanggalIndonesia(surveyData.tanggalSurvey).hari}</span>, tanggal <span className="font-bold text-emerald-700">{formatTanggalIndonesia(surveyData.tanggalSurvey).tanggal} {formatTanggalIndonesia(surveyData.tanggalSurvey).bulan} {formatTanggalIndonesia(surveyData.tanggalSurvey).tahun}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Usaha</Label>
                    <Input value={surveyData.namaUsaha || ''} onChange={e => setSurveyData(prev => ({...prev, namaUsaha: e.target.value}))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Pemilik Usaha</Label>
                    <Input value={surveyData.namaPemilik || ''} onChange={e => setSurveyData(prev => ({...prev, namaPemilik: e.target.value}))} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jenis Kelamin</Label>
                    <Select value={surveyData.jenisKelamin} onValueChange={v => setSurveyData(prev => ({...prev, jenisKelamin: v}))} required>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Laki-Laki">Laki-Laki</SelectItem>
                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={surveyData.status || ''} onValueChange={v => setSurveyData(prev => ({...prev, status: v}))} required>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lajang">Lajang</SelectItem>
                        <SelectItem value="Menikah">Menikah</SelectItem>
                        <SelectItem value="Janda">Janda</SelectItem>
                        <SelectItem value="Duda">Duda</SelectItem>
                        <SelectItem value="Kepala Keluarga">Kepala Keluarga</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Alamat Rumah</Label>
                  <Textarea value={surveyData.alamatRumah || ''} onChange={e => setSurveyData(prev => ({...prev, alamatRumah: e.target.value}))} required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>No HP Pemilik Usaha</Label>
                    <Input value={surveyData.noHp || ''} onChange={e => setSurveyData(prev => ({...prev, noHp: e.target.value}))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                    <Input type="email" value={surveyData.email || ''} onChange={e => setSurveyData(prev => ({...prev, email: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Sosial Media</Label>
                    <Input placeholder="@username" value={surveyData.sosmed || ''} onChange={e => setSurveyData(prev => ({...prev, sosmed: e.target.value}))} required />
                  </div>
                </div>

                <div className="p-4 border rounded-xl bg-slate-50 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Apakah Saudara Masuk Dalam DTKS?</Label>
                    <RadioGroup value={surveyData.dtks?.masuk ? 'YA' : 'TIDAK'} onValueChange={v => setSurveyData(prev => ({...prev, dtks: { masuk: v === 'YA' }}))} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="YA" id="dtks-ya" /><Label htmlFor="dtks-ya">YA</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="TIDAK" id="dtks-tidak" /><Label htmlFor="dtks-tidak">TIDAK</Label></div>
                    </RadioGroup>
                  </div>
                  {surveyData.dtks?.masuk && (
                    <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                      <Label>Pilih Jenis DTKS</Label>
                      <Select value={surveyData.dtks.jenis || ''} onValueChange={v => setSurveyData(prev => ({...prev, dtks: { ...prev.dtks, masuk: true, jenis: v }}))} required>
                        <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PKH">PKH</SelectItem>
                          <SelectItem value="BPNT">BPNT</SelectItem>
                          <SelectItem value="KIP">KIP</SelectItem>
                          <SelectItem value="LANSIA">LANSIA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bidang Usaha</Label>
                    <Input value={surveyData.bidangUsaha || ''} onChange={e => setSurveyData(prev => ({...prev, bidangUsaha: e.target.value}))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Tahun Berdiri</Label>
                    <Input type="number" placeholder="2020" value={surveyData.tahunBerdiri || ''} onChange={e => setSurveyData(prev => ({...prev, tahunBerdiri: e.target.value}))} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Peralatan Yang Digunakan</Label>
                  <Textarea value={surveyData.peralatan || ''} onChange={e => setSurveyData(prev => ({...prev, peralatan: e.target.value}))} required />
                </div>

                <div className="space-y-3">
                  <Label>Izin Yang Dimiliki (Bisa pilih lebih dari satu)</Label>
                  <div className="flex flex-wrap gap-4">
                    {['NIB', 'HALAL', 'PIRT', 'Lainnya'].map(izinOption => (
                      <div key={izinOption} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`izin-${izinOption}`} 
                          checked={surveyData.izin?.includes(izinOption) || false}
                          onCheckedChange={(checked) => {
                            setSurveyData(prev => {
                              const current = prev.izin || [];
                              return {
                                ...prev,
                                izin: checked ? [...current, izinOption] : current.filter(i => i !== izinOption)
                              }
                            })
                          }}
                        />
                        <Label htmlFor={`izin-${izinOption}`}>{izinOption}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modal Usaha</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">Rp</span>
                      <Input className="pl-9 font-mono" value={surveyData.modalUsaha || ''} onChange={e => setSurveyData(prev => ({...prev, modalUsaha: formatRupiah(e.target.value)}))} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Omset</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">Rp</span>
                      <Input className="pl-9 font-mono" value={surveyData.omset || ''} onChange={e => setSurveyData(prev => ({...prev, omset: formatRupiah(e.target.value)}))} required />
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-xl bg-slate-50 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Apakah Pernah Menerima Dana Hibah?</Label>
                    <RadioGroup value={surveyData.hibah?.pernah ? 'YA' : 'TIDAK'} onValueChange={v => setSurveyData(prev => ({...prev, hibah: { pernah: v === 'YA' }}))} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="YA" id="hibah-ya" /><Label htmlFor="hibah-ya">YA</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="TIDAK" id="hibah-tidak" /><Label htmlFor="hibah-tidak">TIDAK</Label></div>
                    </RadioGroup>
                  </div>
                  {surveyData.hibah?.pernah && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                      <div className="space-y-2">
                        <Label>Dari Mana</Label>
                        <Input value={surveyData.hibah.dariMana || ''} onChange={e => setSurveyData(prev => ({...prev, hibah: { ...prev.hibah, pernah: true, dariMana: e.target.value }}))} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Tahun</Label>
                        <Input type="number" value={surveyData.hibah.tahun || ''} onChange={e => setSurveyData(prev => ({...prev, hibah: { ...prev.hibah, pernah: true, tahun: e.target.value }}))} required />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Rencana Penggunaan Dana Hibah</Label>
                  <Textarea value={surveyData.rencanaPenggunaan || ''} onChange={e => setSurveyData(prev => ({...prev, rencanaPenggunaan: e.target.value}))} required />
                </div>
                
                <div className="space-y-2">
                  <Label>Hasil Survey</Label>
                  <Textarea value={surveyData.hasilSurvey || ''} onChange={e => setSurveyData(prev => ({...prev, hasilSurvey: e.target.value}))} required />
                </div>
                
                <div className="space-y-3 p-4 border rounded-xl bg-slate-50">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold flex items-center gap-2"><Camera className="w-4 h-4 text-indigo-600" /> Foto Proses Survey</Label>
                    {photoPreview && (
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => { setPhotoPreview(null); setSurveyData(prev => ({ ...prev, fotoSurveyUrl: undefined })); }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Foto
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {photoPreview ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden border bg-black/5 shadow-inner">
                        <img src={photoPreview} alt="Preview Foto Survey" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-muted-foreground bg-white">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
                          <Camera className="w-6 h-6 text-indigo-500" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">Ambil Foto atau Upload Dokumen Survey</p>
                        <p className="text-xs text-slate-400 mt-0.5">Bisa ambil langsung dari kamera atau pilih file dari galeri ponsel</p>
                      </div>
                    )}

                    {/* Pilihan Upload: Kamera & Galeri */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* 1. Ambil dari Kamera Ponsel */}
                      <Input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                        id="photo-camera-upload" 
                      />
                      <Label htmlFor="photo-camera-upload" className="w-full cursor-pointer m-0">
                        <div className="flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.99] transition-all py-2.5 px-3 rounded-lg font-semibold text-xs sm:text-sm shadow-sm border border-indigo-700 text-center">
                          <Camera className="w-4 h-4 shrink-0" /> Ambil dari Kamera
                        </div>
                      </Label>

                      {/* 2. Upload dari Galeri Ponsel */}
                      <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                        id="photo-gallery-upload" 
                      />
                      <Label htmlFor="photo-gallery-upload" className="w-full cursor-pointer m-0">
                        <div className="flex items-center justify-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 active:scale-[0.99] transition-all py-2.5 px-3 rounded-lg font-semibold text-xs sm:text-sm border border-indigo-300 shadow-sm text-center">
                          <ImageIcon className="w-4 h-4 shrink-0 text-indigo-600" /> Upload dari Galeri
                        </div>
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="text-sm font-semibold flex items-center gap-2 text-primary">
                    <MapPin className="w-4 h-4" /> Validasi Titik Lokasi (Wajib)
                  </div>
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
                      <p className="text-xs font-medium text-slate-500 mb-4 text-center">Data titik lokasi wajib diambil untuk proses verifikasi dinas. Tidak dapat dibypass.</p>
                      <Button type="button" onClick={fetchLocation} disabled={isFetchingLocation} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                        {isFetchingLocation ? (
                          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sedang Mengambil...</>
                        ) : "Ambil Lokasi Sekarang"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="pt-4 border-t mt-2 flex flex-row justify-between items-center w-full">
                <div className="flex-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleSimpanDraft} 
                    disabled={isSubmittingDraft || isSubmittingVerify} 
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold shadow-sm"
                  >
                    {isSubmittingDraft ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isSubmittingDraft ? "Menyimpan Draft..." : "Simpan Draft"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" disabled={isSubmittingDraft || isSubmittingVerify} onClick={() => setVerifyingActor(null)}>Batal</Button>
                  {surveyProgress >= 100 && location ? (
                    <Button type="submit" disabled={isSubmittingDraft || isSubmittingVerify} className="min-w-[150px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                      {isSubmittingVerify ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
                      {isSubmittingVerify ? "Menyimpan..." : "Simpan Verifikasi"}
                    </Button>
                  ) : (
                    <Button type="button" disabled className="min-w-[150px] opacity-50 bg-slate-200 text-slate-500">
                      Isi Form 100%
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── RESET SURVEY CONFIRM DIALOG ─────────────────────────────── */}
      <Dialog open={!!resetSurveyActor} onOpenChange={(open) => !open && setResetSurveyActor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600 font-black uppercase">
              <RotateCcw className="w-5 h-5" /> Reset Data Survey
            </DialogTitle>
            <DialogDescription className="sr-only">Konfirmasi reset data survey</DialogDescription>
          </DialogHeader>
          {resetSurveyActor && (
            <div className="space-y-4 py-2">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1">
                <p className="text-xs text-orange-600 font-semibold uppercase">Pelaku Usaha:</p>
                <p className="text-base font-black text-orange-900 uppercase">{resetSurveyActor.fullName}</p>
                <p className="text-xs text-orange-500">NIK: {resetSurveyActor.nik}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-700">Data yang akan dihapus:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-500 pl-2">
                  <li>Semua isian form survey (kembali ke 0%)</li>
                  <li>Foto survey yang sudah diupload</li>
                  <li>Data titik lokasi GPS</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setResetSurveyActor(null)} disabled={isResettingSurvey}>
              Batal
            </Button>
            <Button
              onClick={handleResetSurveyData}
              disabled={isResettingSurvey}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold min-w-[150px]"
            >
              {isResettingSurvey ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Ya, Reset Survey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CETAK BERITA ACARA MODAL WITH DATE OPTION ─────────────────── */}
      <Dialog open={!!printModalActor} onOpenChange={(open) => !open && setPrintModalActor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700 font-black uppercase">
              <FileDown className="w-5 h-5" /> Cetak Berita Acara Survey
            </DialogTitle>
            <DialogDescription>
              Pilih atau sesuaikan tanggal pelaksanaan survey untuk dokumen Berita Acara PDF.
            </DialogDescription>
          </DialogHeader>

          {printModalActor && (
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
                  <button
                    type="button"
                    onClick={() => {
                      setShowPejabatModal(true);
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" /> Edit Pejabat
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded-lg border border-indigo-100/80 space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">1. Verifikator</p>
                    <p className="font-bold text-indigo-950 truncate">{pejabatForm.verifikatorNama || "(Belum diisi)"}</p>
                    <p className="text-[9px] text-slate-500 truncate">{pejabatForm.verifikatorJabatan || (pejabatForm.verifikatorNipppk ? `NIP: ${pejabatForm.verifikatorNipppk}` : "-")}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100/80 space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">2. Petugas Survey</p>
                    <p className="font-bold text-indigo-950 truncate">{pejabatForm.petugasNama || printModalActor.petugasSurvey || "(Belum diisi)"}</p>
                    <p className="text-[9px] text-slate-500 truncate">{pejabatForm.petugasJabatan || (pejabatForm.petugasNipppk ? `NIP: ${pejabatForm.petugasNipppk}` : "-")}</p>
                  </div>
                </div>
                {(!pejabatForm.verifikatorNama || !pejabatForm.petugasNama) && (
                  <p className="text-[10px] text-amber-700 font-semibold bg-amber-50 p-1.5 rounded border border-amber-200">
                    ⚠️ Data pejabat belum lengkap. Klik "Edit Pejabat" di atas untuk melengkapi.
                  </p>
                )}
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
          )}

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
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold min-w-[150px] shadow-sm"
            >
              {generatingPdfId === printModalActor?.id ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyiapkan PDF...</>
              ) : (
                <><FileDown className="w-4 h-4 mr-2" /> Unduh Dokumen (PDF)</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── PEJABAT MODAL (First Login / Edit) ──────────────────────── */}
      <Dialog open={showPejabatModal} onOpenChange={(open) => {
        // Only allow close if data already exists (not first-time mandatory fill)
        if (!open && (userProfile as any)?.pejabatData?.verifikator?.nama) setShowPejabatModal(false)
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase text-indigo-700 flex items-center gap-2">
              <Edit className="w-5 h-5" /> Data Pejabat Berita Acara
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Isi data pejabat yang akan ditampilkan pada dokumen Berita Acara Survey. Data hanya diisi sekali dan dapat diedit kapan saja.
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
                {([
                  { label: 'Nama', key: 'verifikatorNama', placeholder: 'Nama lengkap verifikator' },
                  { label: 'NIPPPK', key: 'verifikatorNipppk', placeholder: 'Nomor NIPPPK' },
                  { label: 'Pangkat / Gol. Ruang', key: 'verifikatorPangkat', placeholder: 'Contoh: Penata, III/c' },
                  { label: 'Jabatan', key: 'verifikatorJabatan', placeholder: 'Jabatan verifikator' },
                ] as {label: string; key: keyof typeof pejabatForm; placeholder: string}[]).map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{field.label} <span className="text-red-500">*</span></label>
                    <input
                      value={pejabatForm[field.key]}
                      onChange={e => setPejabatForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    />
                  </div>
                ))}
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
                {([
                  { label: 'Nama', key: 'petugasNama', placeholder: 'Nama lengkap petugas survey' },
                  { label: 'NIPPPK', key: 'petugasNipppk', placeholder: 'Nomor NIPPPK' },
                  { label: 'Pangkat / Gol. Ruang', key: 'petugasPangkat', placeholder: 'Contoh: Pengatur, II/c' },
                  { label: 'Jabatan', key: 'petugasJabatan', placeholder: 'Jabatan petugas survey' },
                ] as {label: string; key: keyof typeof pejabatForm; placeholder: string}[]).map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{field.label} <span className="text-red-500">*</span></label>
                    <input
                      value={pejabatForm[field.key]}
                      onChange={e => setPejabatForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
            <p className="text-xs text-slate-400 flex-1">Data ini hanya diisi sekali dan akan otomatis terisi pada setiap Berita Acara Survey Anda.</p>
            <div className="flex gap-2">
              {(userProfile as any)?.pejabatData?.verifikator?.nama && (
                <Button variant="ghost" onClick={() => setShowPejabatModal(false)} className="text-slate-500">
                  Batal
                </Button>
              )}
              <Button
                onClick={handleSavePejabat}
                disabled={isSavingPejabat}
                className="min-w-[140px] bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold"
              >
                {isSavingPejabat ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Simpan Data
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
