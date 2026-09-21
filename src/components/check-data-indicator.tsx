"use client"

import { useState } from "react"
import { useUser, useDatabase, useMemoFirebase, useObject } from "@/firebase"
import { ref } from "firebase/database"
import { 
  ShieldAlert, 
  Eye, 
  User, 
  Database, 
  MapPin, 
  Store, 
  Banknote, 
  FileCheck, 
  Calendar, 
  Users, 
  AlertTriangle,
  Copy,
  Check,
  Layers,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { BusinessActor } from "@/app/lib/types"
import { formatCurrency } from "@/lib/utils"

interface CheckDataIndicatorProps {
  actor: BusinessActor;
  data2023?: any[] | null | undefined;
  data2024?: any[] | null | undefined;
  data2025?: any[] | null | undefined;
  dataBlacklist?: any[] | null | undefined;
  showText?: boolean;
}

export function CheckDataIndicator({ 
  actor, 
  data2023, 
  data2024, 
  data2025, 
  dataBlacklist, 
  showText = true 
}: CheckDataIndicatorProps) {
  const { user } = useUser()
  const database = useDatabase()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])

  const { data: adminRole } = useObject(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  if (!isAdmin) return null

  const checkMatches = (data: any[] | null | undefined, label: string) => 
    (data || []).filter((m: any) => (m.noKK && m.noKK === actor.noKK) || (m.nik && m.nik === actor.nik))
      .map(m => ({ ...m, source: label }));

  const matches2023 = checkMatches(data2023, 'Sheet 2 (2023 - 1m)');
  const matches2024 = checkMatches(data2024, 'Sheet 1 (2024 - 3m)');
  const matches2025 = checkMatches(data2025, 'Sheet 3 (2025 - HOLD)');
  const matchesBlacklist = checkMatches(dataBlacklist, 'Sheet 4 (Blacklist - REJECT)');

  const combinedMatches = [...matchesBlacklist, ...matches2025, ...matches2023, ...matches2024]
  const hasBlacklistMatch = matchesBlacklist.length > 0
  const hasMatch = combinedMatches.length > 0

  if (!hasMatch) return null

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  // Trigger button styling
  const triggerClasses = hasBlacklistMatch
    ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
    : matches2025.length > 0
    ? "bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
    : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"

  const getSourceBadgeConfig = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('blacklist') || s.includes('reject')) {
      return {
        badge: "bg-rose-500/10 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
        pill: "bg-rose-600 text-white",
        icon: AlertTriangle,
        label: source
      };
    }
    if (s.includes('2025') || s.includes('hold')) {
      return {
        badge: "bg-sky-500/10 text-sky-700 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
        pill: "bg-sky-600 text-white",
        icon: Database,
        label: source
      };
    }
    if (s.includes('2024') || s.includes('3m')) {
      return {
        badge: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
        pill: "bg-emerald-600 text-white",
        icon: Layers,
        label: source
      };
    }
    return {
      badge: "bg-amber-500/10 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      pill: "bg-amber-500 text-white",
      icon: Database,
      label: source
    };
  }

  return (
    <>
      {/* Modern Trigger Pill */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsDialogOpen(true)
        }}
        className={`mt-1 inline-flex items-center gap-1.5 ${triggerClasses} border px-2.5 py-1 rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all group cursor-pointer`}
        title="Klik untuk melihat detail perbandingan data master"
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hasBlacklistMatch ? 'bg-rose-400' : 'bg-amber-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${hasBlacklistMatch ? 'bg-rose-600' : 'bg-amber-500'}`}></span>
        </span>
        
        {hasBlacklistMatch ? (
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
        ) : (
          <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        )}

        {showText && (
          <span className="text-[11px] font-bold tracking-tight">
            {hasBlacklistMatch ? "Blacklist Match" : "Data Master"} ({combinedMatches.length})
          </span>
        )}
        
        <Eye className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5" />
      </button>

      {/* Modern Dialog Content */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 shadow-2xl">
          
          {/* Header */}
          <div className={`p-5 pb-4 border-b ${
            hasBlacklistMatch 
              ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/40" 
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
          }`}>
            <DialogHeader className="space-y-1.5 text-left">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  hasBlacklistMatch 
                    ? "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300" 
                    : "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300"
                }`}>
                  {hasBlacklistMatch ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <Layers className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    {hasBlacklistMatch ? "PERINGATAN: DATA BLACKLIST DITEMUKAN" : "Data Master Pengecekan"}
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      hasBlacklistMatch 
                        ? "bg-rose-600 text-white" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    }`}>
                      {combinedMatches.length} Riwayat
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Sistem mendeteksi NIK/KK ini memiliki catatan pada basis data pembanding sebelumnya.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Body: Scrollable list of matches */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[calc(90vh-145px)]">
            {combinedMatches.map((data: any, idx: number) => {
              const cfg = getSourceBadgeConfig(data.source);
              const SourceIcon = cfg.icon;
              const isBlacklist = data.source.toLowerCase().includes('blacklist');

              return (
                <div 
                  key={idx} 
                  className={`rounded-xl border bg-white dark:bg-slate-900 shadow-xs hover:shadow-sm transition-all overflow-hidden ${
                    isBlacklist 
                      ? "border-rose-200 dark:border-rose-900/50" 
                      : "border-slate-200/90 dark:border-slate-800"
                  }`}
                >
                  {/* Card Header Strip */}
                  <div className={`px-4 py-2.5 flex items-center justify-between border-b ${
                    isBlacklist 
                      ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/40" 
                      : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold shadow-xs ${cfg.pill}`}>
                        <SourceIcon className="w-3 h-3" />
                        {data.source}
                      </span>
                    </div>

                    {data.nomor && (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>ID Program:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          #{data.nomor}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body Content */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Primary Identity & Business Row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                      {/* Left: Nama Lengkap & ID Chips (Col 7) */}
                      <div className="md:col-span-7 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs shrink-0 ${
                            isBlacklist ? "bg-gradient-to-br from-rose-600 to-red-700" : "bg-gradient-to-br from-slate-800 to-slate-950 dark:from-slate-700 dark:to-slate-900"
                          }`}>
                            {data.nama ? data.nama.split(" ").filter(Boolean).slice(0, 2).map((n: string) => n[0]).join("").toUpperCase() : "U"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Nama Penerima (Data Pembanding)
                            </span>
                            <h4 className={`text-base sm:text-lg font-black uppercase tracking-tight leading-snug truncate ${
                              isBlacklist ? "text-rose-700 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"
                            }`} title={data.nama || "-"}>
                              {data.nama || "-"}
                            </h4>
                          </div>
                        </div>
                        
                        {/* KK & NIK Chips */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {data.nik && (
                            <span 
                              onClick={(e) => handleCopy(data.nik, `nik-${idx}`, e)}
                              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 px-2.5 py-1 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 transition-all shadow-2xs group"
                              title="Klik untuk menyalin NIK"
                            >
                              <span className="text-[9px] font-sans font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider">NIK</span>
                              <span>{data.nik}</span>
                              {copiedKey === `nik-${idx}` ? (
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                              )}
                            </span>
                          )}

                          {data.noKK && (
                            <span 
                              onClick={(e) => handleCopy(data.noKK, `kk-${idx}`, e)}
                              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 px-2.5 py-1 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 transition-all shadow-2xs group"
                              title="Klik untuk menyalin No. KK"
                            >
                              <span className="text-[9px] font-sans font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">KK</span>
                              <span>{data.noKK}</span>
                              {copiedKey === `kk-${idx}` ? (
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Sektor Usaha (Col 5) */}
                      <div className="md:col-span-5 flex flex-col justify-center">
                        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-amber-50/30 via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-3 space-y-1 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-amber-500" />
                            Sektor Usaha Terdaftar
                          </span>
                          <p className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 line-clamp-2">
                            {data.usaha || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Address Strip */}
                    <div className="flex items-start gap-3 bg-slate-50/90 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Lokasi & Wilayah Bantuan
                        </span>
                        <p className="text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-slate-200 tracking-tight">
                          {data.alamat || "Alamat tidak dicatat"}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                            Kel. <span className="uppercase font-extrabold text-slate-800 dark:text-slate-100">{data.kelurahan || "-"}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                            Kec. <span className="uppercase font-extrabold text-slate-800 dark:text-slate-100">{data.kecamatan || "-"}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stat / Program Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
                      {/* Nominal */}
                      <div className="p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          <Banknote className="w-3.5 h-3.5" />
                          Nominal
                        </div>
                        <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
                          {formatCurrency(data.nominal)}
                        </div>
                      </div>

                      {/* Tahun */}
                      <div className="p-3 rounded-xl bg-blue-500/5 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                          <Calendar className="w-3.5 h-3.5" />
                          Tahun
                        </div>
                        <div className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                          {(() => {
                            const raw = String(data.tahunPengajuan || "-");
                            return raw.replace(/^tahun\s*/i, "");
                          })()}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="p-3 rounded-xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/50 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                          <Layers className="w-3.5 h-3.5" />
                          Status
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black uppercase ${
                            isBlacklist 
                              ? "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300" 
                              : "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300"
                          }`}>
                            {data.status || "-"}
                          </span>
                        </div>
                      </div>

                      {/* Koordinator */}
                      <div className="p-3 rounded-xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/50 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                          <Users className="w-3.5 h-3.5" />
                          Koordinator
                        </div>
                        <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 truncate" title={data.coordinator || "-"}>
                          {data.coordinator || "-"}
                        </div>
                      </div>
                    </div>

                    {/* LPJ Status Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 dark:border-amber-900/50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0">
                          <FileCheck className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                          Status Laporan Pertanggungjawaban (LPJ):
                        </span>
                      </div>
                      <div>
                        {(() => {
                          const lpj = String(data.statusLpj || "-").toUpperCase();
                          const isWarning = lpj.includes("TIDAK DITEMUKAN") || lpj.includes("BELUM") || lpj === "-";
                          return (
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-black uppercase shadow-2xs ${
                              isWarning
                                ? "bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800"
                                : "bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800"
                            }`}>
                              {data.statusLpj || "-"}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer with clean Close Button */}
          <DialogFooter className="p-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex sm:justify-end">
            <Button 
              variant="outline"
              className="w-full sm:w-auto h-9 px-5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5" 
              onClick={() => setIsDialogOpen(false)}
            >
              <X className="w-3.5 h-3.5" />
              Tutup Dialog Pengecekan
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </>
  )
}

