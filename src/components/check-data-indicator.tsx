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
                  <div className="p-4 space-y-3.5">
                    {/* Primary Identity & Business Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      {/* Left: Nama Lengkap */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          Nama Penerima (Data Pembanding)
                        </span>
                        <p className={`text-sm font-extrabold uppercase tracking-tight ${
                          isBlacklist ? "text-rose-700 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"
                        }`}>
                          {data.nama || "-"}
                        </p>
                        
                        {/* KK & NIK Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {data.nik && (
                            <span 
                              onClick={(e) => handleCopy(data.nik, `nik-${idx}`, e)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 px-2 py-0.5 rounded cursor-pointer border border-slate-200 dark:border-slate-700/80 transition-colors"
                              title="Salin NIK"
                            >
                              <span className="text-[9px] font-sans font-bold text-slate-400 uppercase">NIK</span>
                              {data.nik}
                              {copiedKey === `nik-${idx}` ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              )}
                            </span>
                          )}

                          {data.noKK && (
                            <span 
                              onClick={(e) => handleCopy(data.noKK, `kk-${idx}`, e)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 px-2 py-0.5 rounded cursor-pointer border border-slate-200 dark:border-slate-700/80 transition-colors"
                              title="Salin No. KK"
                            >
                              <span className="text-[9px] font-sans font-bold text-slate-400 uppercase">KK</span>
                              {data.noKK}
                              {copiedKey === `kk-${idx}` ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Sektor Usaha */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Store className="w-3 h-3 text-slate-400" />
                          Sektor Usaha
                        </span>
                        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 w-full">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                            {data.usaha || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Address Strip */}
                    <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                          {data.alamat || "Alamat tidak dicatat"}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          Kelurahan: <span className="font-semibold text-slate-700 dark:text-slate-300">{data.kelurahan || "-"}</span>
                          <span className="mx-1.5 opacity-40">•</span>
                          Kecamatan: <span className="font-semibold text-slate-700 dark:text-slate-300">{data.kecamatan || "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stat / Program Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                      {/* Nominal */}
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <Banknote className="w-3 h-3 text-emerald-500" />
                          Nominal
                        </div>
                        <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(data.nominal)}
                        </div>
                      </div>

                      {/* Tahun */}
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          Tahun
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {data.tahunPengajuan || "-"}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <Layers className="w-3 h-3 text-slate-400" />
                          Status
                        </div>
                        <div className={`text-xs font-bold ${
                          isBlacklist ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                        }`}>
                          {data.status || "-"}
                        </div>
                      </div>

                      {/* Koordinator */}
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <Users className="w-3 h-3 text-purple-500" />
                          Koordinator
                        </div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={data.coordinator || "-"}>
                          {data.coordinator || "-"}
                        </div>
                      </div>
                    </div>

                    {/* LPJ Status Banner */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-300/60 dark:border-amber-900/50">
                      <div className="flex items-center gap-2 text-xs">
                        <FileCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                          Status LPJ:
                        </span>
                      </div>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        {data.statusLpj || "-"}
                      </span>
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

