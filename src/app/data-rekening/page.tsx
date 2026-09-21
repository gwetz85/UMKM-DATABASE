"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject, deleteDocumentNonBlocking } from "@/firebase"
import { ref, query, equalTo, orderByChild } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { 
  Printer, 
  Edit3, 
  Loader2, 
  Save, 
  RotateCcw, 
  User, 
  CreditCard, 
  History, 
  Building2, 
  MapPin, 
  BadgeCheck, 
  FileText, 
  Search, 
  Trash2, 
  Folder, 
  FileSpreadsheet, 
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Store,
  Copy,
  Check,
  ExternalLink,
  Landmark,
  ShieldCheck,
  Phone
} from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { cn, extractDobFromNik, parsePobDob, calculateAge } from "@/lib/utils"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { normalizeCoordinator } from "@/lib/coordinator-utils"
import ExcelJS from "exceljs"

const BANK_LIST = [
  "BCA", "BNI", "BRI", "BRK", "MANDIRI", "BSI", "BTN", "OCBC", "PANIN", "MUAMALAT", "MAYBANK", "BUKOPIN", "DANAMON", "PERMATA"
]

function normalizeBankName(bankName?: string): string {
  if (!bankName || !bankName.trim()) return "LAINNYA"
  const upper = bankName.trim().toUpperCase()
  if (upper.includes("RIAU KEPRI") || upper.includes("BRK")) return "BRK"
  if (upper.includes("SYARIAH INDONESIA") || upper.includes("BSI")) return "BSI"
  if (upper.includes("RAKYAT INDONESIA") || upper.includes("BRI")) return "BRI"
  if (upper.includes("NEGARA INDONESIA") || upper.includes("BNI")) return "BNI"
  if (upper.includes("CENTRAL ASIA") || upper.includes("BCA")) return "BCA"
  if (upper.includes("TABUNGAN NEGARA") || upper.includes("BTN")) return "BTN"
  const matched = BANK_LIST.find(b => upper.includes(b))
  return matched || upper
}

interface BankTheme {
  code: string;
  badge: string;
  border: string;
  hoverBorder: string;
  bgGlow: string;
  textNum: string;
  btn: string;
  topStripe: string;
  filterActive: string;
  filterHover: string;
  percentageBadge: string;
}

function getBankTheme(rawBankName?: string): BankTheme {
  const norm = normalizeBankName(rawBankName)
  switch (norm) {
    case "BRI":
      return {
        code: "BRI",
        badge: "bg-blue-600 text-white font-black",
        border: "border-blue-300 dark:border-blue-800",
        hoverBorder: "hover:border-blue-500 dark:hover:border-blue-400",
        bgGlow: "bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-blue-700 dark:text-blue-300",
        btn: "bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20",
        topStripe: "bg-blue-600",
        filterActive: "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/25",
        filterHover: "hover:border-blue-400 hover:bg-blue-50/40",
        percentageBadge: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200",
      }
    case "BNI":
      return {
        code: "BNI",
        badge: "bg-orange-600 text-white font-black",
        border: "border-orange-300 dark:border-orange-800",
        hoverBorder: "hover:border-orange-500 dark:hover:border-orange-400",
        bgGlow: "bg-gradient-to-b from-orange-50/40 via-white to-white dark:from-orange-950/20 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-orange-700 dark:text-orange-300",
        btn: "bg-orange-600 hover:bg-orange-700 text-white shadow-xs shadow-orange-500/20",
        topStripe: "bg-orange-600",
        filterActive: "bg-orange-600 text-white border-orange-600 shadow-sm ring-2 ring-orange-500/25",
        filterHover: "hover:border-orange-400 hover:bg-orange-50/40",
        percentageBadge: "bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-200",
      }
    case "BCA":
      return {
        code: "BCA",
        badge: "bg-indigo-600 text-white font-black",
        border: "border-indigo-300 dark:border-indigo-800",
        hoverBorder: "hover:border-indigo-500 dark:hover:border-indigo-400",
        bgGlow: "bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-indigo-700 dark:text-indigo-300",
        btn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-500/20",
        topStripe: "bg-indigo-600",
        filterActive: "bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/25",
        filterHover: "hover:border-indigo-400 hover:bg-indigo-50/40",
        percentageBadge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200",
      }
    case "BRK":
      return {
        code: "BRK",
        badge: "bg-rose-600 text-white font-black",
        border: "border-rose-300 dark:border-rose-800",
        hoverBorder: "hover:border-rose-500 dark:hover:border-rose-400",
        bgGlow: "bg-gradient-to-b from-rose-50/40 via-white to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-rose-700 dark:text-rose-300",
        btn: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs shadow-rose-500/20",
        topStripe: "bg-rose-600",
        filterActive: "bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/25",
        filterHover: "hover:border-rose-400 hover:bg-rose-50/40",
        percentageBadge: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200",
      }
    case "MANDIRI":
      return {
        code: "MANDIRI",
        badge: "bg-blue-900 text-amber-300 font-black",
        border: "border-blue-400 dark:border-blue-800",
        hoverBorder: "hover:border-blue-700 dark:hover:border-blue-400",
        bgGlow: "bg-gradient-to-b from-blue-900/[0.05] via-white to-white dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-blue-950 dark:text-blue-200",
        btn: "bg-blue-900 hover:bg-blue-950 text-amber-300 font-black shadow-xs shadow-blue-900/20",
        topStripe: "bg-blue-900",
        filterActive: "bg-blue-900 text-amber-300 border-blue-900 shadow-sm ring-2 ring-blue-700/25",
        filterHover: "hover:border-blue-600 hover:bg-blue-50/40",
        percentageBadge: "bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-200",
      }
    case "BSI":
      return {
        code: "BSI",
        badge: "bg-teal-600 text-white font-black",
        border: "border-teal-300 dark:border-teal-800",
        hoverBorder: "hover:border-teal-500 dark:hover:border-teal-400",
        bgGlow: "bg-gradient-to-b from-teal-50/40 via-white to-white dark:from-teal-950/20 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-teal-700 dark:text-teal-300",
        btn: "bg-teal-600 hover:bg-teal-700 text-white shadow-xs shadow-teal-500/20",
        topStripe: "bg-teal-600",
        filterActive: "bg-teal-600 text-white border-teal-600 shadow-sm ring-2 ring-teal-500/25",
        filterHover: "hover:border-teal-400 hover:bg-teal-50/40",
        percentageBadge: "bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-200",
      }
    case "BTN":
      return {
        code: "BTN",
        badge: "bg-cyan-700 text-white font-black",
        border: "border-cyan-300 dark:border-cyan-800",
        hoverBorder: "hover:border-cyan-500 dark:hover:border-cyan-400",
        bgGlow: "bg-gradient-to-b from-cyan-50/40 via-white to-white dark:from-cyan-950/20 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-cyan-800 dark:text-cyan-300",
        btn: "bg-cyan-700 hover:bg-cyan-800 text-white shadow-xs shadow-cyan-500/20",
        topStripe: "bg-cyan-700",
        filterActive: "bg-cyan-700 text-white border-cyan-700 shadow-sm ring-2 ring-cyan-500/25",
        filterHover: "hover:border-cyan-400 hover:bg-cyan-50/40",
        percentageBadge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-200",
      }
    case "BUKOPIN":
      return {
        code: "BUKOPIN",
        badge: "bg-amber-500 text-slate-950 font-black",
        border: "border-amber-300 dark:border-amber-800",
        hoverBorder: "hover:border-amber-500 dark:hover:border-amber-400",
        bgGlow: "bg-gradient-to-b from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-amber-800 dark:text-amber-300",
        btn: "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-xs shadow-amber-500/20",
        topStripe: "bg-amber-500",
        filterActive: "bg-amber-500 text-slate-950 border-amber-500 shadow-sm ring-2 ring-amber-400/25",
        filterHover: "hover:border-amber-400 hover:bg-amber-50/40",
        percentageBadge: "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200",
      }
    case "MUAMALAT":
      return {
        code: "MUAMALAT",
        badge: "bg-purple-700 text-white font-black",
        border: "border-purple-300 dark:border-purple-800",
        hoverBorder: "hover:border-purple-500 dark:hover:border-purple-400",
        bgGlow: "bg-gradient-to-b from-purple-50/40 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-purple-800 dark:text-purple-300",
        btn: "bg-purple-700 hover:bg-purple-800 text-white shadow-xs shadow-purple-500/20",
        topStripe: "bg-purple-700",
        filterActive: "bg-purple-700 text-white border-purple-700 shadow-sm ring-2 ring-purple-500/25",
        filterHover: "hover:border-purple-400 hover:bg-purple-50/40",
        percentageBadge: "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-200",
      }
    case "PANIN":
      return {
        code: "PANIN",
        badge: "bg-red-600 text-white font-black",
        border: "border-red-300 dark:border-red-800",
        hoverBorder: "hover:border-red-500 dark:hover:border-red-400",
        bgGlow: "bg-gradient-to-b from-red-50/40 via-white to-white dark:from-red-950/20 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-red-700 dark:text-red-300",
        btn: "bg-red-600 hover:bg-red-700 text-white shadow-xs shadow-red-500/20",
        topStripe: "bg-red-600",
        filterActive: "bg-red-600 text-white border-red-600 shadow-sm ring-2 ring-red-500/25",
        filterHover: "hover:border-red-400 hover:bg-red-50/40",
        percentageBadge: "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-200",
      }
    case "DANAMON":
      return {
        code: "DANAMON",
        badge: "bg-orange-700 text-white font-black",
        border: "border-orange-400 dark:border-orange-800",
        hoverBorder: "hover:border-orange-600 dark:hover:border-orange-400",
        bgGlow: "bg-gradient-to-b from-orange-50/40 via-white to-white dark:from-orange-950/20 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-orange-800 dark:text-orange-300",
        btn: "bg-orange-700 hover:bg-orange-800 text-white shadow-xs shadow-orange-700/20",
        topStripe: "bg-orange-700",
        filterActive: "bg-orange-700 text-white border-orange-700 shadow-sm ring-2 ring-orange-600/25",
        filterHover: "hover:border-orange-400 hover:bg-orange-50/40",
        percentageBadge: "bg-orange-100 text-orange-900 dark:bg-orange-950/80 dark:text-orange-200",
      }
    default:
      return {
        code: norm || "BANK",
        badge: "bg-emerald-600 text-white font-black",
        border: "border-emerald-300 dark:border-emerald-800",
        hoverBorder: "hover:border-emerald-500 dark:hover:border-emerald-400",
        bgGlow: "bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-950",
        textNum: "text-emerald-700 dark:text-emerald-300",
        btn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-500/20",
        topStripe: "bg-emerald-600",
        filterActive: "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/25",
        filterHover: "hover:border-emerald-400 hover:bg-emerald-50/40",
        percentageBadge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200",
      }
  }
}

export default function DataRekeningPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <DataRekeningContent />
    </Suspense>
  )
}

function DataRekeningContent() {
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const filterCoordinatorParam = searchParams.get("coordinator")
  const filterBankParam = searchParams.get("bank")

  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBank, setSelectedBank] = useState<string>(filterBankParam || "")
  const [category, setCategory] = useState<string>("")
  const [filterCoordinator, setFilterCoordinator] = useState<string>(filterCoordinatorParam || "")
  const [pageLimit, setPageLimit] = useState(60)
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const [revertPending, setRevertPending] = useState<{ actorId: string; fullName: string } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePending, setDeletePending] = useState<{ actorId: string; fullName: string } | null>(null)
  const [editNik, setEditNik] = useState("")
  const [editPob, setEditPob] = useState("")
  const [editDob, setEditDob] = useState("")
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
    const t = setTimeout(() => setSearchQuery(searchInput), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPageLimit(60)
  }, [searchQuery, selectedBank, category, filterCoordinator])

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
  }, [viewingActor])

  // ── Firebase Roles ────────────────────────────────────────────────────────
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === "agus@umkm.id") || userProfile?.role === "admin"
  const isKoordinator = userProfile?.role === "koordinator"

  // Ambil data yang memiliki status finish (atau yang sudah terinput rekeningnya)
  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return query(ref(database, "businessActors"), orderByChild("status"), equalTo("finish"))
  }, [database])

  const kuotaRef = useMemoFirebase(() => database ? ref(database, "koordinator_kuotas") : null, [database])
  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  const { data: kuotaData } = useList<any>(kuotaRef)

  // Filter khusus: semua data yang memiliki rekening bank terinput (yang sekarang datanya berada di menu Selesai)
  const actors = useMemo(() => {
    if (!allActorsRaw) return undefined

    return allActorsRaw
      .filter(a => {
        // Harus memiliki nomor rekening yang telah terinput
        const hasBank = !!(a.bankNumber && a.bankNumber.trim() !== "")
        if (!hasBank) return false

        const matchesSearch =
          a.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.nik?.includes(searchQuery) ||
          a.bankNumber?.includes(searchQuery) ||
          a.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.coordinator?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesCategory = !category || a.businessCategory === category

        const matchesBank =
          !selectedBank ||
          normalizeBankName(a.bankName) === selectedBank.toUpperCase() ||
          (a.bankName && a.bankName.toUpperCase().includes(selectedBank.toUpperCase()))

        if (isKoordinator) {
          if (!a.coordinator || !userProfile?.fullName) return false
          return matchesSearch && matchesCategory && matchesBank && a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase()
        }

        if (filterCoordinator) {
          return matchesSearch && matchesCategory && matchesBank && a.coordinator === filterCoordinator
        }

        return matchesSearch && matchesCategory && matchesBank
      })
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [allActorsRaw, searchQuery, category, selectedBank, filterCoordinator, isKoordinator, userProfile])

  // List koordinator untuk dropdown filter
  const coordinatorList = useMemo(() => {
    if (!allActorsRaw) return []
    const set = new Set<string>()
    allActorsRaw.forEach(a => {
      if (a.coordinator && a.bankNumber) set.add(a.coordinator)
    })
    return Array.from(set).sort()
  }, [allActorsRaw])

  // Hitung ringkasan statistik
  const statsSummary = useMemo(() => {
    if (!allActorsRaw) return { total: 0, lpjSelesai: 0, lpjProses: 0, belumLpj: 0 }
    const withBank = allActorsRaw.filter(a => {
      const hasBank = !!(a.bankNumber && a.bankNumber.trim() !== "")
      if (!hasBank) return false
      if (isKoordinator) {
        if (!a.coordinator || !userProfile?.fullName) return false
        return a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase()
      }
      if (filterCoordinator) {
        return a.coordinator === filterCoordinator
      }
      return true
    })
    const lpjSelesai = withBank.filter(a => !!a.lpjNominal && Number(a.lpjNominal) > 0).length
    const lpjProses = withBank.filter(a => a.readyForLPJ && (!a.lpjNominal || Number(a.lpjNominal) <= 0)).length
    const belumLpj = withBank.filter(a => !a.readyForLPJ && (!a.lpjNominal || Number(a.lpjNominal) <= 0)).length

    return {
      total: withBank.length,
      lpjSelesai,
      lpjProses,
      belumLpj
    }
  }, [allActorsRaw, isKoordinator, userProfile, filterCoordinator])

  // Hitung total rekening per bank (hanya menampilkan bank yang sudah ada datanya)
  const bankStats = useMemo(() => {
    if (!allActorsRaw) return []
    const withBank = allActorsRaw.filter(a => {
      const hasBank = !!(a.bankNumber && a.bankNumber.trim() !== "")
      if (!hasBank) return false
      if (isKoordinator) {
        if (!a.coordinator || !userProfile?.fullName) return false
        return a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase()
      }
      if (filterCoordinator) {
        return a.coordinator === filterCoordinator
      }
      return true
    })

    const counts: Record<string, number> = {}
    withBank.forEach(a => {
      const bName = normalizeBankName(a.bankName)
      counts[bName] = (counts[bName] || 0) + 1
    })

    return Object.entries(counts)
      .map(([bank, count]) => ({ bank, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count || a.bank.localeCompare(b.bank))
  }, [allActorsRaw, isKoordinator, userProfile, filterCoordinator])

  // ── Print Formulir ────────────────────────────────────────────────────────
  const handlePrintActor = (actor: BusinessActor) => {
    const a = actor as any
    const sd = a.surveyData || {}
    const parsed = parsePobDob(actor.pobDob || "")
    const dob = actor.dob || parsed.dob || "-"
    const pob = actor.pob || parsed.pob || "-"
    const regCode = actor.registrationCode || "-"

    const row = (label: string, value: string | undefined) =>
      `<tr><td class="lbl">${label}</td><td class="sep">:</td><td class="val">${value || "-"}</td></tr>`

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Data Rekening Pelaku Usaha - ${actor.fullName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Arial',sans-serif;font-size:11px;color:#222;background:white;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:15mm;}
  .kop{display:flex;align-items:center;justify-content:center;gap:20px;padding-bottom:10px;}
  .kop-logo img{width:80px;height:auto;object-fit:contain;}
  .kop-center{text-align:center;padding-top:4px;}
  .kop-center .org{font-size:16px;font-weight:bold;color:#059669;text-transform:uppercase;letter-spacing:0.5px;}
  .kop-center .sub{font-size:10px;font-weight:bold;color:#555;text-transform:uppercase;margin-top:4px;}
  .kop-line{height:2px;background:#059669;margin-top:2px;margin-bottom:20px;}
  .judul-row{text-align:center;margin-bottom:20px;}
  .judul-text{font-size:16px;font-weight:bold;text-transform:uppercase;color:#059669;letter-spacing:0.5px;}
  .judul-underline{width:90px;height:4px;background:#10b981;margin:6px auto 0 auto;}
  .section{margin-bottom:12px;page-break-inside:avoid;}
  .sec-hdr{background:#ECFDF5;color:#059669;font-weight:bold;font-size:11px;padding:6px 12px;text-transform:uppercase;}
  .sec-body{padding:0;}
  table{width:100%;border-collapse:collapse;}
  td.lbl{width:30%;font-weight:bold;font-size:11px;padding:7px 12px;color:#222;}
  td.sep{width:10px;padding:7px 2px;color:#555;}
  td.val{font-size:11px;padding:7px 12px;color:#555;text-transform:uppercase;}
  tr{border-bottom:1px solid #F0F0F0;page-break-inside:avoid;}
  tr:last-child{border-bottom:none;}
  .footer{margin-top:15px;border-top:1px solid #F0F0F0;padding-top:10px;text-align:center;font-size:9px;color:#888;}
  @media print{
    @page{size:A4;margin:15mm;}
    .page{width:100%;min-height:auto;margin:0;padding:0;}
    .sec-hdr{background:#ECFDF5 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  }
</style>
</head>
<body>
<div class="page">
<div class="kop">
  <div class="kop-logo"><img src="${window.location.origin}/logo-tunas-bangsa.png" alt="Logo"/></div>
  <div class="kop-center">
    <div class="org">Tunas Bangsa Kepulauan Riau</div>
    <div class="sub">Data Rekening Bank Penerima Bantuan UMKM</div>
  </div>
</div>
<div class="kop-line"></div>
<div class="judul-row">
  <div class="judul-text">Lembar Konfirmasi Rekening Bank</div>
  <div class="judul-underline"></div>
</div>

<div class="section">
  <div class="sec-hdr">I. DATA REKENING BANK</div>
  <div class="sec-body"><table>
    ${row("Nama Bank", actor.bankName)}
    ${row("Nomor Rekening", actor.bankNumber)}
    ${row("Nama Pemilik Rekening", actor.bankOwner)}
    ${row("Status LPJ", actor.lpjNominal ? `Sudah LPJ (Rp ${Number(actor.lpjNominal).toLocaleString("id-ID")})` : (actor.readyForLPJ ? "Dalam Proses LPJ" : "Tercatat"))}
  </table></div>
</div>

<div class="section">
  <div class="sec-hdr">II. DATA PRIBADI PELAKU USAHA</div>
  <div class="sec-body"><table>
    ${row("Nomor Registrasi", regCode)}
    ${row("Nama Lengkap", actor.fullName)}
    ${row("NIK", actor.nik)}
    ${row("Nomor Kartu Keluarga", actor.noKK)}
    ${row("Jenis Kelamin", actor.gender)}
    ${row("Nomor HP / WhatsApp", actor.phone)}
    ${row("Kecamatan / Kelurahan", (actor.kecamatan && actor.kelurahan) ? actor.kecamatan + " / " + actor.kelurahan : (actor.kecamatan || actor.kelurahan || "-"))}
    ${row("Alamat Domisili", actor.address)}
  </table></div>
</div>

<div class="section">
  <div class="sec-hdr">III. INFORMASI USAHA &amp; PENGUSUL</div>
  <div class="sec-body"><table>
    ${row("Nama Usaha", actor.businessName)}
    ${row("Kategori Usaha", actor.businessCategory)}
    ${row("Alamat Lokasi Usaha", actor.businessLocation)}
    ${row("Pengusul / Koordinator", actor.coordinator)}
  </table></div>
</div>

<div class="footer">
  Sistem Informasi SIMPU &bull; Dicetak: ${new Date().toLocaleString("id-ID")} &bull; Bank: ${actor.bankName || "-"} &bull; Rek: ${actor.bankNumber || "-"}
</div>
</div>
</body>
</html>`

    let iframe = document.getElementById("__print_iframe_rekening__") as HTMLIFrameElement | null
    if (!iframe) {
      iframe = document.createElement("iframe")
      iframe.id = "__print_iframe_rekening__"
      iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;"
      document.body.appendChild(iframe)
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) return

    iframeDoc.open()
    iframeDoc.write(htmlContent)
    iframeDoc.close()

    setTimeout(() => {
      iframe!.contentWindow?.focus()
      iframe!.contentWindow?.print()
    }, 500)
  }

  // ── Excel Export ──────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      if (!actors || actors.length === 0) {
        toast({ variant: "destructive", title: "Data Kosong", description: "Tidak ada data rekening untuk di-export." })
        return
      }

      toast({ title: "⏳ Memproses Excel", description: "Sedang menyusun file Excel Data Rekening..." })

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Data Rekening Bank")

      const headers = [
        { header: "NO", key: "no", width: 6 },
        { header: "NAMA BANK", key: "bankName", width: 16 },
        { header: "NOMOR REKENING", key: "bankNumber", width: 22 },
        { header: "PEMILIK REKENING", key: "bankOwner", width: 25 },
        { header: "NAMA PELAKU USAHA", key: "fullName", width: 25 },
        { header: "NIK", key: "nik", width: 20 },
        { header: "NOMOR KK", key: "noKK", width: 20 },
        { header: "NO HP / WA", key: "phone", width: 16 },
        { header: "NAMA USAHA", key: "businessName", width: 25 },
        { header: "KATEGORI USAHA", key: "businessCategory", width: 18 },
        { header: "LOKASI USAHA", key: "businessLocation", width: 30 },
        { header: "PENGUSUL / KOORDINATOR", key: "coordinator", width: 25 },
        { header: "KECAMATAN", key: "kecamatan", width: 18 },
        { header: "KELURAHAN", key: "kelurahan", width: 18 },
        { header: "RT / RW", key: "rtRw", width: 10 },
        { header: "STATUS LPJ", key: "statusLpj", width: 20 },
        { header: "NOMINAL LPJ", key: "lpjNominal", width: 18 },
      ]

      worksheet.columns = headers

      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } }
      headerRow.height = 25
      headerRow.alignment = { vertical: "middle", horizontal: "center" }

      actors.forEach((actor, index) => {
        let statusLpj = "Belum Kirim ke LPJ"
        if (actor.lpjNominal && Number(actor.lpjNominal) > 0) {
          statusLpj = "Selesai LPJ"
        } else if (actor.readyForLPJ) {
          statusLpj = "Menunggu LPJ"
        }

        worksheet.addRow({
          no: index + 1,
          bankName: actor.bankName || "-",
          bankNumber: actor.bankNumber || "-",
          bankOwner: actor.bankOwner || "-",
          fullName: actor.fullName || "-",
          nik: actor.nik || "-",
          noKK: actor.noKK || "-",
          phone: actor.phone || "-",
          businessName: actor.businessName || "-",
          businessCategory: actor.businessCategory || "-",
          businessLocation: actor.businessLocation || "-",
          coordinator: actor.coordinator || "-",
          kecamatan: actor.kecamatan || "-",
          kelurahan: actor.kelurahan || "-",
          rtRw: actor.rtRw || "-",
          statusLpj,
          lpjNominal: actor.lpjNominal || 0,
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const nowStr = new Date().toISOString().split("T")[0]
      a.href = url
      a.download = `Data_Rekening_Bank_${nowStr}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      toast({ title: "✅ Export Berhasil", description: `${actors.length} data rekening berhasil di-export ke Excel.` })
    } catch (error: any) {
      console.error("Export Excel Exception:", error)
      toast({ variant: "destructive", title: "Gagal Export", description: error?.message || "Terjadi kesalahan saat membuat file Excel." })
    }
  }

  // ── Edit Data Rekening & Pribadi ──────────────────────────────────────────
  const handleSaveFullEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAdmin || !database || !viewingActor) return
    const formData = new FormData(e.currentTarget)
    const lpjVal = formData.get("lpjNominal") as string
    const lpjNum = lpjVal ? parseInt(lpjVal) : viewingActor.lpjNominal || 0

    const updates: Partial<BusinessActor> = {
      fullName: formData.get("fullName") as string,
      nik: editNik,
      noKK: formData.get("noKK") as string,
      gender: formData.get("gender") as "Laki-laki" | "Perempuan",
      pobDob: `${editPob}, ${editDob}`,
      pob: editPob,
      dob: editDob,
      phone: formData.get("phone") as string,
      kecamatan: formData.get("kecamatan") as string,
      kelurahan: formData.get("kelurahan") as string,
      rtRw: formData.get("rtRw") as string,
      address: formData.get("address") as string,
      businessName: formData.get("businessName") as string,
      businessCategory: formData.get("businessCategory") as "Kuliner" | "Bukan Kuliner",
      businessLocation: formData.get("businessLocation") as string,
      coordinator: normalizeCoordinator(formData.get("coordinator") as string).toUpperCase().trim(),
      bankName: formData.get("bankName") as string,
      bankNumber: formData.get("bankNumber") as string,
      bankOwner: formData.get("bankOwner") as string,
      lpjNominal: lpjNum,
    }

    updateDocumentNonBlocking(ref(database, `businessActors/${viewingActor.id}`), updates)

    import("@/lib/stats-service").then(({ updateStatsOnEdit }) => {
      updateStatsOnEdit(database, viewingActor, { ...viewingActor, ...updates }).catch(e => console.error(e))
    })

    toast({ title: "Tersimpan", description: "Data rekening pelaku usaha berhasil diperbarui." })
    setIsEditMode(false)
    setViewingActor({ ...viewingActor, ...updates } as BusinessActor)
  }

  // ── Revert ────────────────────────────────────────────────────────────────
  const handleRevert = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setRevertPending({ actorId, fullName })
    setShowRevertDialog(true)
  }

  const executeRevert = () => {
    if (!revertPending || !database) return
    const { actorId, fullName } = revertPending
    const actorObj = allActorsRaw?.find(a => a.id === actorId)

    const hasDinasData = actorObj?.surveyData || actorObj?.pejabatData || (actorObj as any)?.verifikatorDinas
    const newStatus = hasDinasData ? "verified_dinas" : "pending"

    const updates: any = {
      status: newStatus,
      bankName: null,
      bankNumber: null,
      bankOwner: null,
      readyForLPJ: false,
      lpjNominal: null,
    }

    if (hasDinasData) {
      updates.berkasDinasVerified = false
      updates.berkasDinasVerifiedAt = null
      updates.berkasDinasVerifiedBy = null
      updates.hasilVerifikasiDinas = "Lolos"
      updates.dikembalikanKeVerifikatorAt = new Date().toISOString()
      updates.dikembalikanKeVerifikatorBy = userProfile?.fullName || user?.email || user?.uid || "Administrator"
    }

    updateDocumentNonBlocking(ref(database, `businessActors/${actorId}`), updates)
    if (actorObj) {
      import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
        const updatedActor = { ...actorObj, ...updates }
        updateStatsOnStatusChange(database, actorObj, updatedActor, updatedActor).catch(e => console.error(e))
      })
    }
    toast({
      title: "Berhasil Dikembalikan",
      description: hasDinasData
        ? `Data ${fullName} berhasil dikembalikan ke antrean Verifikator Dinas.`
        : `Data ${fullName} dikembalikan ke antrean Pending.`
    })
    setViewingActor(null)
    setShowRevertDialog(false)
    setRevertPending(null)
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (actorId: string, fullName: string) => {
    if (!isAdmin || !database) return
    setDeletePending({ actorId, fullName })
    setShowDeleteDialog(true)
  }

  const executeDelete = () => {
    if (!deletePending || !database) return
    const { actorId, fullName } = deletePending
    const actorObj = allActorsRaw?.find(a => a.id === actorId)
    deleteDocumentNonBlocking(ref(database, `businessActors/${actorId}`))
    if (actorObj) {
      import("@/lib/stats-service").then(({ updateStatsOnDelete }) => {
        updateStatsOnDelete(database, actorObj).catch(e => console.error(e))
      })
    }
    toast({ title: "Data Dihapus", description: `Data ${fullName} telah dihapus dari sistem.` })
    setViewingActor(null)
    setShowDeleteDialog(false)
    setDeletePending(null)
  }

  return (
    <div className="p-0 space-y-4 pb-20">
      {/* Top Header & Search / Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-emerald-700 hover:bg-emerald-50 transition-colors" />
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
                <h1 className="font-black text-xl md:text-2xl uppercase text-emerald-700 font-headline">Data Rekening</h1>
                <Badge className="bg-emerald-600 text-white font-black text-xs">{actors?.length ?? 0}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Basis data rekening pelaku usaha perbankan lolos verifikasi.</p>
            </div>
          </div>

          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              className="border-emerald-500 text-emerald-700 font-bold hover:bg-emerald-50 text-xs w-full sm:w-auto h-9 shadow-sm shrink-0"
              disabled={!actors || actors.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Export Excel
            </Button>
          )}
        </div>

        {/* Search & Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama / NIK / no rek…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-9 h-10 text-xs sm:text-sm bg-white border-slate-200"
            />
          </div>

          <select
            value={selectedBank}
            onChange={e => setSelectedBank(e.target.value)}
            className="h-10 text-xs sm:text-sm px-3 rounded-md border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value="">Semua Bank</option>
            {bankStats.map(({ bank, count }) => (
              <option key={bank} value={bank}>{bank} ({count})</option>
            ))}
          </select>

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="h-10 text-xs sm:text-sm px-3 rounded-md border border-slate-200 bg-white text-slate-700"
          >
            <option value="">Semua Kategori</option>
            <option value="Kuliner">Kuliner</option>
            <option value="Bukan Kuliner">Bukan Kuliner</option>
          </select>

          {!isKoordinator && coordinatorList.length > 0 && (
            <select
              value={filterCoordinator}
              onChange={e => setFilterCoordinator(e.target.value)}
              className="h-10 text-xs sm:text-sm px-3 rounded-md border border-slate-200 bg-white text-slate-700 truncate"
            >
              <option value="">Semua Koordinator</option>
              {coordinatorList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
          <p className="text-[10px] sm:text-xs font-black uppercase text-emerald-700 tracking-wider">Total Rekening</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-900 mt-1">{statsSummary.total}</p>
        </div>
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
          <p className="text-[10px] sm:text-xs font-black uppercase text-blue-700 tracking-wider">Selesai LPJ</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-blue-900 mt-1">{statsSummary.lpjSelesai}</p>
        </div>
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
          <p className="text-[10px] sm:text-xs font-black uppercase text-amber-700 tracking-wider">Menunggu LPJ</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-amber-900 mt-1">{statsSummary.lpjProses}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
          <p className="text-[10px] sm:text-xs font-black uppercase text-slate-700 tracking-wider">Belum LPJ</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mt-1">{statsSummary.belumLpj}</p>
        </div>
      </div>

      {/* Rincian Total Rekening Per Bank */}
      {bankStats.length > 0 && (
        <div className="space-y-2">
          {/* Mobile: Horizontal scrollable bank filter chips */}
          <div className="md:hidden space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Pilih Bank ({bankStats.length})
              </span>
              {selectedBank && (
                <button
                  type="button"
                  onClick={() => setSelectedBank("")}
                  className="text-[11px] text-emerald-700 font-bold hover:underline"
                >
                  Reset Filter
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedBank("")}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 transition-all flex items-center gap-1.5",
                  !selectedBank
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                <span>Semua</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-black", !selectedBank ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600")}>
                  {statsSummary.total}
                </span>
              </button>
              {bankStats.map(({ bank, count }) => {
                const isSelected = selectedBank.toUpperCase() === bank.toUpperCase()
                const theme = getBankTheme(bank)

                return (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(isSelected ? "" : bank)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                      isSelected
                        ? theme.filterActive
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <span>{bank}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-black", isSelected ? "bg-black/25 text-white" : theme.percentageBadge)}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Desktop: Grid bank cards */}
          <div className="hidden md:block bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Data Rekening Per Bank
                </span>
                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  {bankStats.length} Bank Terdata
                </span>
                {selectedBank && (
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                    Filter: Bank {selectedBank}
                  </span>
                )}
              </div>
              {selectedBank && (
                <button
                  type="button"
                  onClick={() => setSelectedBank("")}
                  className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
                >
                  Reset Filter (Tampilkan Semua Bank)
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
              {bankStats.map(({ bank, count }) => {
                const isSelected = selectedBank.toUpperCase() === bank.toUpperCase()
                const percentage = statsSummary.total > 0 ? Math.round((count / statsSummary.total) * 100) : 0
                const theme = getBankTheme(bank)

                return (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(isSelected ? "" : bank)}
                    title={`Klik untuk filter Bank ${bank}`}
                    className={cn(
                      "relative overflow-hidden p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5",
                      isSelected
                        ? theme.filterActive
                        : cn("bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200", theme.filterHover)
                    )}
                  >
                    {/* Top colored accent line */}
                    <div className={cn("absolute top-0 left-0 right-0 h-1", isSelected ? "bg-white/40" : theme.topStripe)} />

                    <div className="flex items-center justify-between gap-1 w-full pt-1">
                      <span className={cn(
                        "text-xs font-black uppercase tracking-tight truncate",
                        isSelected ? "text-white" : "text-slate-800 dark:text-slate-100"
                      )}>
                        {bank}
                      </span>
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-2xs",
                        isSelected
                          ? "bg-black/25 text-white"
                          : theme.percentageBadge
                      )}>
                        {percentage}%
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline justify-between w-full">
                      <span className={cn(
                        "text-xl sm:text-2xl font-black leading-none tracking-tight",
                        isSelected ? "text-white" : "text-slate-900 dark:text-white"
                      )}>
                        {count.toLocaleString("id-ID")}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase",
                        isSelected ? "text-white/80" : "text-slate-400 dark:text-slate-500"
                      )}>
                        Rekening
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pelaku Usaha Rekening List */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Cards (1 card per item, clean, readable, matching actor-data) */}
            <div className="md:hidden flex flex-col gap-3">
              {actors?.slice(0, pageLimit).map((actor, idx) => {
                const hasLpj = !!actor.lpjNominal && Number(actor.lpjNominal) > 0
                const isLpjWaiting = actor.readyForLPJ && !hasLpj
                const theme = getBankTheme(actor.bankName)

                return (
                  <Card
                    key={actor.id}
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-all border-2 rounded-2xl overflow-hidden active:scale-[0.99] bg-white dark:bg-slate-900 shadow-xs",
                      theme.border,
                      theme.bgGlow
                    )}
                    onClick={() => setViewingActor(actor)}
                  >
                    {/* Top colored accent indicator bar */}
                    <div className={cn("h-1.5 w-full shrink-0", theme.topStripe)} />

                    <CardContent className="p-4 space-y-2.5">
                      {/* Top row: #index, Bank Name, Status Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            #{idx + 1}
                          </span>
                          <span className={cn("text-xs font-black px-2.5 py-0.5 rounded-lg uppercase tracking-tight shadow-2xs", theme.badge)}>
                            {actor.bankName || "BANK"}
                          </span>
                        </div>
                        {hasLpj ? (
                          <span className="text-[9px] font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 uppercase">
                            SELESAI LPJ
                          </span>
                        ) : isLpjWaiting ? (
                          <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 uppercase">
                            PROSES LPJ
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase">
                            TERCATAT
                          </span>
                        )}
                      </div>

                      {/* Main Account Info */}
                      <div className="pb-2.5 border-b border-slate-200 dark:border-slate-800 space-y-0.5">
                        <div className={cn("font-mono font-black text-xl tracking-wider select-all", theme.textNum)}>
                          {actor.bankNumber || "-"}
                        </div>
                        <div className="text-xs font-bold uppercase text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{actor.bankOwner || actor.fullName}</span>
                        </div>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Pelaku Usaha</div>
                          <div className="text-slate-800 dark:text-slate-200 font-bold truncate">{actor.fullName}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">NIK</div>
                          <div className="font-mono text-slate-700 dark:text-slate-300 font-medium truncate">{actor.nik || "-"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Usaha</div>
                          <div className="text-slate-700 dark:text-slate-300 font-medium truncate">{actor.businessName || "-"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Koordinator</div>
                          <div className="text-slate-700 dark:text-slate-300 font-medium truncate">{normalizeCoordinator(actor.coordinator) || "-"}</div>
                        </div>
                      </div>

                      {/* Detail Button */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          className={cn(
                            "w-full font-bold text-xs rounded-xl h-8.5 shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                            theme.btn
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            setViewingActor(actor)
                          }}
                        >
                          <CreditCard className="w-3.5 h-3.5 shrink-0" />
                          <span>DETAIL REKENING</span>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Desktop Cards Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5">
              {actors?.slice(0, pageLimit).map(actor => {
                const hasLpj = !!actor.lpjNominal && Number(actor.lpjNominal) > 0
                const isLpjWaiting = actor.readyForLPJ && !hasLpj
                const theme = getBankTheme(actor.bankName)

                return (
                  <Card
                    key={actor.id}
                    className={cn(
                      "cursor-pointer hover:shadow-lg transition-all duration-200 group border-2 rounded-2xl overflow-hidden flex flex-col justify-between hover:-translate-y-1 bg-white dark:bg-slate-900 shadow-xs",
                      theme.border,
                      theme.hoverBorder,
                      theme.bgGlow
                    )}
                    onClick={() => setViewingActor(actor)}
                  >
                    {/* Top colored accent indicator bar */}
                    <div className={cn("h-1.5 w-full shrink-0", theme.topStripe)} />

                    <CardContent className="p-3.5 flex flex-col gap-2.5 flex-1 justify-between">
                      <div className="space-y-2.5">
                        {/* Header: Bank Badge & Status */}
                        <div className="flex items-center justify-between gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider shadow-2xs",
                            theme.badge
                          )}>
                            {actor.bankName || "BANK"}
                          </span>
                          {hasLpj ? (
                            <span className="text-[8px] font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-1.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 uppercase tracking-tighter">
                              SELESAI LPJ
                            </span>
                          ) : isLpjWaiting ? (
                            <span className="text-[8px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 uppercase tracking-tighter">
                              PROSES LPJ
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                              TERCATAT
                            </span>
                          )}
                        </div>

                        {/* Owner Name & Account Number */}
                        <div className="space-y-0.5 pt-0.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                          <h4 
                            className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug tracking-tight group-hover:text-primary transition-colors" 
                            title={actor.bankOwner || actor.fullName}
                          >
                            {actor.bankOwner || actor.fullName}
                          </h4>
                          <div className={cn("font-mono font-black text-sm tracking-wider select-all", theme.textNum)}>
                            {actor.bankNumber || "-"}
                          </div>
                        </div>

                        {/* Details Box */}
                        <div className="space-y-1 text-[10px] py-0.5">
                          <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 truncate" title={actor.businessName}>
                            <Store className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate uppercase">{actor.businessName || "-"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 truncate" title={actor.fullName}>
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate uppercase">{actor.fullName}</span>
                          </div>
                          <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate">
                            NIK: {actor.nik || "-"}
                          </div>
                        </div>
                      </div>

                      {/* Detail Button with Bank Color */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 mt-auto">
                        <button 
                          type="button"
                          className={cn(
                            "w-full rounded-xl py-1.5 px-3 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs group-hover:shadow-md cursor-pointer",
                            theme.btn
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            setViewingActor(actor)
                          }}
                        >
                          <CreditCard className="w-3 h-3 shrink-0" />
                          <span>DETAIL REKENING</span>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {(!actors || actors.length === 0) && (
              <div className="py-20 text-center text-muted-foreground grid place-items-center">
                <CreditCard className="w-12 h-12 mb-4 opacity-20" />
                <p>Tidak ada data rekening yang ditemukan.</p>
              </div>
            )}

            {actors && actors.length > pageLimit && (
              <div className="p-4 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setPageLimit(prev => prev + 60)} 
                  className="font-bold border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                >
                  Tampilkan Lebih Banyak Data (+60)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!viewingActor} onOpenChange={(open) => {
        if (!open) { setViewingActor(null); setIsEditMode(false) }
      }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-2 rounded-2xl shadow-2xl bg-white dark:bg-slate-950">
          {viewingActor && (() => {
            const theme = getBankTheme(viewingActor.bankName)
            const hasLpj = !!viewingActor.lpjNominal && Number(viewingActor.lpjNominal) > 0
            const isLpjWaiting = viewingActor.readyForLPJ && !hasLpj
            const isOwnerMatch = !!(viewingActor.bankOwner && viewingActor.fullName && 
              viewingActor.bankOwner.trim().toLowerCase() === viewingActor.fullName.trim().toLowerCase())
            const dob = viewingActor.dob || parsePobDob(viewingActor.pobDob).dob || extractDobFromNik(viewingActor.nik || "")
            const age = calculateAge(dob)
            const pob = viewingActor.pob || parsePobDob(viewingActor.pobDob).pob

            return (
              <div className="flex flex-col relative">
                {/* Top Bank Theme Stripe */}
                <div className={cn("h-2.5 w-full shrink-0 rounded-t-2xl", theme.topStripe)} />

                <div className="p-5 sm:p-7 space-y-6">
                  {/* Modal Header */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 pr-10">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-2xs", theme.badge)}>
                          <Landmark className="w-3.5 h-3.5" />
                          {viewingActor.bankName || "BANK"}
                        </span>
                        {hasLpj ? (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] gap-1 px-2.5 py-0.5">
                            <CheckCircle2 className="w-3 h-3" /> LPJ Selesai
                          </Badge>
                        ) : isLpjWaiting ? (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] gap-1 px-2.5 py-0.5">
                            <Clock className="w-3 h-3" /> Antrean LPJ
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-slate-300 font-bold text-[11px]">
                            Tercatat
                          </Badge>
                        )}
                        {viewingActor.status && (
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 capitalize px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-850">
                            Status: {viewingActor.status.replace("_", " ")}
                          </span>
                        )}
                      </div>
                      <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {isEditMode ? "Edit Data Rekening & Pelaku Usaha" : "Detail Data Rekening"}
                      </DialogTitle>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {isEditMode ? "Perbarui informasi perbankan atau data profil penerima bantuan" : "Informasi lengkap perbankan, data pribadi, alamat, dan profil usaha pelaku"}
                      </p>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {!isEditMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintActor(viewingActor)}
                          className="border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-bold shadow-2xs h-9 cursor-pointer"
                        >
                          <Printer className="w-4 h-4 mr-1.5" /> Cetak Lembar
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant={isEditMode ? "outline" : "default"}
                          size="sm"
                          onClick={() => setIsEditMode(!isEditMode)}
                          className={cn(
                            "font-bold shadow-2xs h-9 cursor-pointer",
                            isEditMode
                              ? "border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          )}
                        >
                          {isEditMode ? (
                            "Batal Edit"
                          ) : (
                            <>
                              <Edit3 className="w-4 h-4 mr-1.5" /> Edit Data
                            </>
                          )}
                        </Button>
                      )}
                      {isAdmin && !isEditMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevert(viewingActor.id, viewingActor.fullName)}
                          className="border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 font-bold h-9 px-2.5 cursor-pointer"
                          title="Kembalikan ke antrean awal"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline text-xs">Kembalikan</span>
                        </Button>
                      )}
                      {isAdmin && !isEditMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(viewingActor.id, viewingActor.fullName)}
                          className="border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 font-bold h-9 px-2.5 cursor-pointer"
                          title="Hapus Data Rekening"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline text-xs">Hapus</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditMode ? (
                    <form onSubmit={handleSaveFullEdit} className="space-y-6">
                      {/* Form: Data Perbankan */}
                      <section className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
                          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-2xs", theme.topStripe)}>
                            <CreditCard className="w-3.5 h-3.5" />
                          </div>
                          <span>Data Perbankan (Edit)</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase text-slate-500">Nama Bank</Label>
                            <Input name="bankName" defaultValue={viewingActor.bankName} required className="font-bold uppercase" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase text-slate-500">Nomor Rekening</Label>
                            <Input name="bankNumber" defaultValue={viewingActor.bankNumber} required className="font-mono font-black text-lg h-10 tracking-wider" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase text-slate-500">Pemilik Rekening</Label>
                            <Input name="bankOwner" defaultValue={viewingActor.bankOwner} required className="uppercase font-bold" />
                          </div>
                          <div className="space-y-1.5 md:col-span-3 pt-1">
                            <Label className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">Nominal LPJ Terlaporkan (Rp)</Label>
                            <Input name="lpjNominal" type="number" defaultValue={viewingActor.lpjNominal || 0} className="font-mono font-bold" />
                          </div>
                        </div>
                      </section>

                      {/* Form: Informasi Pribadi */}
                      <section className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span>Informasi Pribadi (Edit)</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase text-slate-500">Nama Lengkap</Label>
                            <Input name="fullName" defaultValue={viewingActor.fullName} required className="font-bold" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase text-slate-500">NIK</Label>
                            <Input 
                              name="nik" 
                              value={editNik} 
                              required 
                              className="font-mono font-bold"
                              onChange={(e) => {
                                const clean = e.target.value.replace(/[^0-9]/g, "")
                                setEditNik(clean)
                                if (clean.length >= 12) {
                                  const ex = extractDobFromNik(clean)
                                  if (ex) setEditDob(ex)
                                } else setEditDob("")
                              }} 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase text-slate-500">Nomor KK</Label>
                            <Input name="noKK" defaultValue={viewingActor.noKK} className="font-mono font-bold" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase text-slate-500">Jenis Kelamin</Label>
                            <select name="gender" defaultValue={viewingActor.gender || "Laki-laki"} className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs font-medium">
                              <option value="Laki-laki">Laki-Laki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase text-slate-500">Tempat Lahir</Label>
                            <Input name="pob" value={editPob} onChange={e => setEditPob(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase text-slate-500">Tanggal Lahir</Label>
                            <Input name="dob" value={editDob} readOnly className="bg-muted font-bold font-mono" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase text-slate-500">Nomor HP / WA</Label>
                            <Input name="phone" defaultValue={viewingActor.phone} />
                          </div>
                        </div>
                      </section>

                      {/* Form: Alamat & Domisili */}
                      <section className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <span>Alamat &amp; Domisili (Edit)</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5"><Label className="text-xs font-black uppercase text-slate-500">Kecamatan</Label><Input name="kecamatan" defaultValue={viewingActor.kecamatan} /></div>
                          <div className="space-y-1.5"><Label className="text-xs font-black uppercase text-slate-500">Kelurahan</Label><Input name="kelurahan" defaultValue={viewingActor.kelurahan} /></div>
                          <div className="space-y-1.5"><Label className="text-xs font-black uppercase text-slate-500">RT/RW</Label><Input name="rtRw" defaultValue={viewingActor.rtRw} /></div>
                          <div className="space-y-1.5 md:col-span-3"><Label className="text-xs font-black uppercase text-slate-500">Alamat Lengkap</Label><Input name="address" defaultValue={viewingActor.address} /></div>
                        </div>
                      </section>

                      {/* Form: Informasi Usaha */}
                      <section className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <span>Informasi Usaha (Edit)</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5"><Label className="text-xs font-black uppercase text-slate-500">Nama Usaha</Label><Input name="businessName" defaultValue={viewingActor.businessName} required className="font-bold" /></div>
                          <div className="space-y-1.5"><Label className="text-xs font-black uppercase text-slate-500">Kategori</Label><Input name="businessCategory" defaultValue={viewingActor.businessCategory} /></div>
                          <div className="space-y-1.5"><Label className="text-xs font-black uppercase text-slate-500">Lokasi Usaha</Label><Input name="businessLocation" defaultValue={viewingActor.businessLocation} /></div>
                          <div className="space-y-1.5"><Label className="text-xs font-black uppercase text-slate-500">Koordinator</Label><Input name="coordinator" defaultValue={viewingActor.coordinator} /></div>
                        </div>
                      </section>

                      {/* Sticky Action Footer */}
                      <div className="sticky bottom-0 bg-white dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 shadow-lg rounded-b-2xl z-10">
                        <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} className="font-bold cursor-pointer">Batal</Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      {/* SEKSI 1: DATA PERBANKAN & STATUS REKENING (HERO BANK THEME) */}
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-2xs", theme.topStripe)}>
                            <CreditCard className="w-3.5 h-3.5" />
                          </div>
                          <span>Data Perbankan &amp; Status Rekening</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                          {/* Nama Bank Card */}
                          <div className={cn(
                            "relative overflow-hidden border-2 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[120px] transition-all",
                            theme.border,
                            theme.bgGlow
                          )}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn("w-7 h-7 rounded-xl text-white flex items-center justify-center shadow-xs", theme.topStripe)}>
                                <Landmark className="w-4 h-4" />
                              </div>
                              <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider leading-none">
                                Nama Bank Penyalur
                              </p>
                            </div>
                            <div className="mt-auto pt-2 space-y-1">
                              <div>
                                <span className={cn(
                                  "inline-flex items-center px-3.5 py-1.5 rounded-xl text-base sm:text-lg font-black uppercase tracking-wider shadow-sm border",
                                  theme.badge
                                )} title={viewingActor.bankName}>
                                  {viewingActor.bankName || "BELUM TERISI"}
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                                Bank Rekening Resmi
                              </p>
                            </div>
                          </div>

                          {/* Nomor Rekening Card */}
                          <div className={cn(
                            "relative overflow-hidden border-2 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[120px] transition-all",
                            theme.border,
                            theme.bgGlow
                          )}>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-7 h-7 rounded-xl text-white flex items-center justify-center shadow-xs", theme.topStripe)}>
                                  <CreditCard className="w-4 h-4" />
                                </div>
                                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider leading-none">
                                  Nomor Rekening
                                </p>
                              </div>
                              {viewingActor.bankNumber && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(viewingActor.bankNumber || "", "Nomor Rekening")}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                  title="Salin Nomor Rekening"
                                >
                                  {copiedKey === "Nomor Rekening" ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-700 dark:text-emerald-300">Tersalin!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Salin</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="mt-auto pt-2 space-y-0.5">
                              <p className={cn("text-xl sm:text-2xl font-black font-mono tracking-[0.08em] select-all leading-tight break-all", theme.textNum)}>
                                {viewingActor.bankNumber || "BELUM TERISI"}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                                Rekening Penerima Bantuan
                              </p>
                            </div>
                          </div>

                          {/* Pemilik Rekening Card */}
                          <div className={cn(
                            "relative overflow-hidden border-2 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[120px] transition-all",
                            theme.border,
                            theme.bgGlow
                          )}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn("w-7 h-7 rounded-xl text-white flex items-center justify-center shadow-xs", theme.topStripe)}>
                                <User className="w-4 h-4" />
                              </div>
                              <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider leading-none">
                                Pemilik Rekening
                              </p>
                            </div>
                            <div className="mt-auto pt-2 space-y-1">
                              <p className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight leading-snug break-words">
                                {viewingActor.bankOwner || "BELUM TERISI"}
                              </p>
                              <div>
                                {isOwnerMatch ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-300/80 dark:border-emerald-800">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    Sesuai Data Pelaku
                                  </span>
                                ) : viewingActor.bankOwner ? (
                                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                                    Atas Nama Rekening
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* LPJ & Nominal Status Banner */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                          <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status Alur LPJ</p>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                {hasLpj
                                  ? "Sudah Menyelesaikan Laporan LPJ" 
                                  : (viewingActor.readyForLPJ ? "Sedang Dalam Antrean Penyusunan LPJ" : "Belum Diteruskan ke Tahap LPJ")}
                              </p>
                            </div>
                            <Badge className={cn(
                              "font-black text-xs px-3 py-1 shrink-0 rounded-xl shadow-2xs",
                              hasLpj ? "bg-blue-600 hover:bg-blue-700 text-white" : (viewingActor.readyForLPJ ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-slate-400 text-white")
                            )}>
                              {hasLpj ? "SELESAI" : (viewingActor.readyForLPJ ? "MENUNGGU" : "HOLD")}
                            </Badge>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nominal LPJ Terinput</p>
                              <p className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                                Rp {Number(viewingActor.lpjNominal || 0).toLocaleString("id-ID")}
                              </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center shrink-0">
                              {hasLpj ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Clock className="w-5 h-5 text-amber-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* SEKSI 2: INFORMASI PRIBADI PELAKU USAHA */}
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span>Informasi Pribadi Pelaku Usaha</span>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-slate-900/70 rounded-2xl p-4 sm:p-5 border-2 border-slate-200 dark:border-slate-800 space-y-4">
                          {/* Profile Header Row with Avatar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                                {(viewingActor.fullName || "P").substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                  {viewingActor.fullName}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  {viewingActor.gender && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                      {String(viewingActor.gender).toUpperCase().startsWith("L") ? "Laki-laki" : "Perempuan"}
                                    </span>
                                  )}
                                  {age && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                                      {age} Tahun
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* WhatsApp Quick Link */}
                            {viewingActor.phone && (
                              <a
                                href={`https://wa.me/${String(viewingActor.phone).replace(/\D/g, "").replace(/^0/, "62")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all w-fit cursor-pointer"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Hubungi WA ({viewingActor.phone})</span>
                              </a>
                            )}
                          </div>

                          {/* Detail Data Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1">
                            {/* NIK with Copy */}
                            <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Nomor Induk Kependudukan (NIK)</span>
                                {viewingActor.nik && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(viewingActor.nik || "", "NIK")}
                                    className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5 cursor-pointer"
                                    title="Salin NIK"
                                  >
                                    {copiedKey === "NIK" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                              <p className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200 tracking-wider">
                                {viewingActor.nik || "-"}
                              </p>
                            </div>

                            {/* No KK with Copy */}
                            <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Nomor Kartu Keluarga (KK)</span>
                                {viewingActor.noKK && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(viewingActor.noKK || "", "Nomor KK")}
                                    className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5 cursor-pointer"
                                    title="Salin Nomor KK"
                                  >
                                    {copiedKey === "Nomor KK" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                              <p className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200 tracking-wider">
                                {viewingActor.noKK || "-"}
                              </p>
                            </div>

                            {/* Tempat & Tanggal Lahir */}
                            <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Tempat, Tanggal Lahir</span>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                {pob || dob ? `${pob || "-"}, ${dob || "-"}` : "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* SEKSI 3: ALAMAT & DOMISILI */}
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <span>Alamat &amp; Domisili</span>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-slate-900/70 rounded-2xl p-4 sm:p-5 border-2 border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                              <span className="text-slate-400 text-[10px] uppercase font-semibold">Kec:</span> {viewingActor.kecamatan || "-"}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                              <span className="text-slate-400 text-[10px] uppercase font-semibold">Kel:</span> {viewingActor.kelurahan || "-"}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                              <span className="text-slate-400 text-[10px] uppercase font-semibold">RT/RW:</span> {viewingActor.rtRw || "-"}
                            </span>
                          </div>

                          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1">Alamat Lengkap</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                              {viewingActor.address || "Alamat lengkap belum terisi"}
                            </p>
                          </div>
                        </div>
                      </section>

                      {/* SEKSI 4: INFORMASI USAHA & PENGUSUL */}
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <span>Informasi Usaha &amp; Pengusul</span>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-slate-900/70 rounded-2xl p-4 sm:p-5 border-2 border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Nama Usaha</p>
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{viewingActor.businessName || "-"}</p>
                          </div>

                          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Kategori Usaha</p>
                            <div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {viewingActor.businessCategory || "-"}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Lokasi Usaha</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{viewingActor.businessLocation || "-"}</p>
                          </div>

                          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Pengusul / Koordinator</p>
                            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase">{normalizeCoordinator(viewingActor.coordinator) || "-"}</p>
                          </div>

                          <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 sm:col-span-2 lg:col-span-2">
                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Petugas Survey</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{viewingActor.petugasSurvey || "-"}</p>
                          </div>
                        </div>
                      </section>

                      {/* SEKSI 5: INFORMASI PENDAFTARAN & SISTEM */}
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          <div className="w-6 h-6 rounded-lg bg-slate-600 text-white flex items-center justify-center shadow-2xs">
                            <History className="w-3.5 h-3.5" />
                          </div>
                          <span>Informasi Pendaftaran &amp; Sistem</span>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-slate-900/70 rounded-2xl p-4 border-2 border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Status Terakhir</p>
                            <p className="font-bold capitalize text-emerald-700 dark:text-emerald-400">{viewingActor.status?.replace("_", " ") || "-"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Petugas Input</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{viewingActor.createdBy || "System"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Waktu Pendaftaran</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{viewingActor.createdAt ? new Date(viewingActor.createdAt).toLocaleString("id-ID") : "-"}</p>
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
        onOpenChange={(open) => { setShowRevertDialog(open); if (!open) setRevertPending(null) }}
        icon={<RotateCcw className="w-6 h-6" />}
        title="Kembalikan ke antrean awal?"
        description={`Kembalikan ${revertPending?.fullName || ""} ke antrean awal?`}
        confirmText="Ya, Kembalikan"
        confirmIcon={<RotateCcw className="w-4 h-4" />}
        variant="default"
        onConfirm={executeRevert}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setDeletePending(null) }}
        icon={<Trash2 className="w-6 h-6" />}
        title="Hapus Permanen?"
        description={`HAPUS PERMANEN data ${deletePending?.fullName || ""}? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        variant="destructive"
        onConfirm={executeDelete}
      />
    </div>
  )
}
