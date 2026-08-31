"use client"

import { useState, useMemo, Suspense } from "react"
import { useUser, useDatabase, useMemoFirebase, useList } from "@/firebase"
import { ref, query, orderByChild, equalTo } from "firebase/database"
import { generateSuratPernyataan } from "@/lib/pdf-generator"
import { BusinessActor } from "../lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { logActivity, getDeviceType } from "@/lib/logger"
import {
  Loader2,
  Search,
  FileText,
  Printer,
  User,
  CreditCard,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function CetakBerkasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      }
    >
      <CetakBerkasContent />
    </Suspense>
  )
}

function CetakBerkasContent() {
  const { user, userProfile } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [isPrintingAll, setIsPrintingAll] = useState(false)

  // Ambil data pelaku usaha dengan status finish
  const memoQuery = useMemoFirebase(() => {
    if (!database || !user) return null
    return query(ref(database, "businessActors"), orderByChild("status"), equalTo("finish"))
  }, [database, user])

  const { data: allData, isLoading } = useList<BusinessActor>(memoQuery)

  // Filter: status finish + bankNumber terisi + cocok dengan pencarian
  const filteredActors = useMemo(() => {
    if (!allData) return []
    return allData
      .filter((a) => a.bankNumber && a.bankNumber.trim() !== "")
      .filter((a) => {
        const q = searchQuery.toLowerCase()
        return (
          !q ||
          (a.fullName || "").toLowerCase().includes(q) ||
          (a.nik || "").includes(q) ||
          (a.bankNumber || "").includes(q) ||
          (a.coordinator || "").toLowerCase().includes(q) ||
          (a.businessName || "").toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [allData, searchQuery])

  const handlePrintSingle = (actor: BusinessActor) => {
    try {
      setPrintingId(actor.id)
      generateSuratPernyataan(actor)
      logActivity({
        query: `CETAK SURAT PERNYATAAN: ${actor.fullName} (${actor.nik})`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: "Web",
        method: "CETAK BERKAS PENCAIRAN",
        userId: user?.email || user?.uid || "Admin",
      })
      toast({
        title: "Berhasil Dicetak",
        description: `Surat Pernyataan untuk ${actor.fullName} sedang diunduh.`,
      })
    } catch (err) {
      console.error("Print error:", err)
      toast({
        variant: "destructive",
        title: "Gagal Mencetak",
        description: "Terjadi kesalahan saat membuat PDF.",
      })
    } finally {
      setTimeout(() => setPrintingId(null), 1500)
    }
  }

  const handlePrintAll = () => {
    if (filteredActors.length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Data", description: "Tidak ada data untuk dicetak." })
      return
    }
    try {
      setIsPrintingAll(true)
      filteredActors.forEach((actor, idx) => {
        setTimeout(() => {
          generateSuratPernyataan(actor)
          if (idx === filteredActors.length - 1) {
            setIsPrintingAll(false)
            toast({
              title: "Selesai",
              description: `${filteredActors.length} Surat Pernyataan berhasil dicetak.`,
            })
            logActivity({
              query: `CETAK SEMUA SURAT PERNYATAAN (${filteredActors.length} data)`,
              results: "Berhasil",
              device: getDeviceType(navigator.userAgent),
              source: "Web",
              method: "CETAK BERKAS PENCAIRAN",
              userId: user?.email || user?.uid || "Admin",
            })
          }
        }, idx * 600)
      })
    } catch (err) {
      console.error("Print all error:", err)
      setIsPrintingAll(false)
      toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan." })
    }
  }

  if (!user) return null

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-2xl md:text-4xl font-black tracking-tight font-headline text-gradient uppercase drop-shadow-sm flex items-center gap-3">
              <FileText className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              Cetak Berkas Pencairan
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-semibold ml-10">
            Cetak Surat Pernyataan untuk pelaku usaha yang telah selesai dan memiliki rekening bank.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input
              placeholder="Cari nama, NIK, rekening..."
              className="pl-9 h-10 bg-white/60 backdrop-blur-sm border-primary/20 focus-visible:ring-primary rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Cetak Semua */}
          <Button
            onClick={handlePrintAll}
            disabled={isPrintingAll || filteredActors.length === 0}
            className="h-10 px-5 font-bold rounded-xl shadow-lg shadow-primary/20 whitespace-nowrap gap-2"
          >
            {isPrintingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            CETAK SEMUA ({filteredActors.length})
          </Button>
        </div>
      </div>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Selesai",
            value: allData?.filter((a) => a.status === "finish").length ?? 0,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Ada Rekening",
            value: allData?.filter((a) => a.status === "finish" && a.bankNumber).length ?? 0,
            icon: CreditCard,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Belum Ada Rekening",
            value: allData?.filter((a) => a.status === "finish" && !a.bankNumber).length ?? 0,
            icon: AlertCircle,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Ditampilkan",
            value: filteredActors.length,
            icon: FileText,
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
        ].map((stat) => (
          <Card key={stat.label} className="glass border-none shadow-lg rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── TABEL ───────────────────────────────────────────────────────────── */}
      <Card className="glass border-none shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-black uppercase text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Daftar Pelaku Usaha
              </CardTitle>
              <CardDescription className="text-[10px] font-semibold uppercase tracking-widest mt-0.5">
                Status: SELESAI · Rekening: LENGKAP
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="font-bold animate-pulse uppercase tracking-widest text-xs">Memuat Data...</p>
            </div>
          ) : filteredActors.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-slate-100 p-6 rounded-full">
                <FileText className="w-10 h-10 text-slate-300" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-lg text-slate-700 uppercase">Tidak Ada Data</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Tidak ditemukan data yang cocok dengan pencarian."
                    : "Belum ada pelaku usaha dengan status selesai dan rekening lengkap."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-transparent border-b border-slate-100">
                    <TableHead className="w-12 text-center font-black text-[10px] uppercase tracking-widest py-3 pl-6">No</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">Nama Lengkap</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">NIK</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">Jenis Usaha</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">
                      <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Rekening</span>
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Kelurahan</span>
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Telepon</span>
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest py-3 pr-6 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActors.map((actor, index) => (
                    <TableRow
                      key={actor.id}
                      className="group hover:bg-primary/5 transition-colors border-b border-slate-50"
                    >
                      <TableCell className="text-center py-3 pl-6 text-xs font-bold text-slate-400">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="font-bold text-slate-800 uppercase text-sm leading-tight">
                          {actor.fullName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium">
                          {actor.coordinator || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 font-mono text-xs text-slate-600 font-bold">
                        {actor.nik || "-"}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-black uppercase",
                            actor.businessCategory === "Kuliner"
                              ? "border-orange-200 text-orange-600 bg-orange-50"
                              : "border-blue-200 text-blue-600 bg-blue-50"
                          )}
                        >
                          {actor.businessName || actor.businessCategory || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="font-mono font-bold text-primary text-sm">
                          {actor.bankNumber}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">
                          {actor.bankName || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-slate-600 uppercase font-medium">
                        {actor.kelurahan || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-slate-600 font-mono">
                        {actor.phone || "-"}
                      </TableCell>
                      <TableCell className="py-3 pr-6 text-center">
                        <Button
                          size="sm"
                          onClick={() => handlePrintSingle(actor)}
                          disabled={printingId === actor.id}
                          className="h-8 px-3 text-[10px] font-black uppercase rounded-lg gap-1.5 shadow-sm shadow-primary/20"
                        >
                          {printingId === actor.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Printer className="w-3 h-3" />
                          )}
                          CETAK
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
