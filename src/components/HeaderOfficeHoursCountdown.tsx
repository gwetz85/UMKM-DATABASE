"use client"

import React, { useState } from "react"
import { useOfficeStatus } from "@/hooks/useOfficeStatus"
import { Clock, DoorOpen, DoorClosed, Calendar, Info, Settings, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useUser } from "@/firebase"

export function HeaderOfficeHoursCountdown() {
  const status = useOfficeStatus()
  const [isOpenDialog, setIsOpenDialog] = useState(false)
  const router = useRouter()
  const { userProfile, user } = useUser()

  const isAdmin = userProfile?.role === "admin" || user?.email?.toLowerCase() === "agus@umkm.id"

  if (!status) return null

  const {
    isOpen,
    isHoliday,
    holidayName,
    statusTitle,
    subLabel,
    timeLeft,
    days,
    hours,
    minutes,
    seconds,
    openHourStr,
    closeWeekdayStr,
    closeWeekendStr
  } = status

  return (
    <>
      {/* ─── Main Header Pill ─── */}
      <button
        type="button"
        onClick={() => setIsOpenDialog(true)}
        title="Klik untuk melihat rincian jam operasional kantor"
        aria-label="Informasi Jam Kantor"
        className={`group relative flex items-center gap-2 sm:gap-2.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full border transition-all duration-300 shadow-xs hover:shadow-md active:scale-95 cursor-pointer select-none ${
          isOpen
            ? "bg-emerald-50/95 hover:bg-emerald-100/90 border-emerald-400 text-emerald-950 dark:bg-[#052114]/95 dark:hover:bg-[#08331f] dark:border-emerald-500/70 dark:text-emerald-100 dark:shadow-[0_0_14px_rgba(16,185,129,0.22)]"
            : isHoliday
            ? "bg-rose-50/95 hover:bg-rose-100/90 border-rose-400 text-rose-950 dark:bg-[#240810]/95 dark:hover:bg-[#360e19] dark:border-rose-500/70 dark:text-rose-100 dark:shadow-[0_0_14px_rgba(244,63,94,0.22)]"
            : "bg-amber-50/95 hover:bg-amber-100/90 border-amber-400 text-amber-950 dark:bg-[#241705]/95 dark:hover:bg-[#382307] dark:border-amber-500/70 dark:text-amber-100 dark:shadow-[0_0_14px_rgba(245,158,11,0.22)]"
        }`}
      >
        {/* Pulsing Status Dot */}
        <div className="relative flex items-center justify-center shrink-0">
          <span
            className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse ${
              isOpen
                ? "bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                : isHoliday
                ? "bg-rose-600 dark:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                : "bg-amber-600 dark:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
            }`}
          />
        </div>

        {/* Status Label (Desktop & Tablet) */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          {isOpen ? (
            <DoorOpen className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
          ) : (
            <DoorClosed
              className={`w-3.5 h-3.5 ${
                isHoliday
                  ? "text-rose-700 dark:text-rose-300"
                  : "text-amber-700 dark:text-amber-300"
              }`}
            />
          )}
          <span
            className={`text-[11px] font-black uppercase tracking-wider ${
              isOpen
                ? "text-emerald-900 dark:text-emerald-200"
                : isHoliday
                ? "text-rose-900 dark:text-rose-200"
                : "text-amber-900 dark:text-amber-200"
            }`}
          >
            {statusTitle}
          </span>
        </div>

        {/* Separator on desktop */}
        <span
          className={`hidden md:inline-block w-px h-3.5 ${
            isOpen
              ? "bg-emerald-300/80 dark:bg-emerald-700/60"
              : isHoliday
              ? "bg-rose-300/80 dark:bg-rose-700/60"
              : "bg-amber-300/80 dark:bg-amber-700/60"
          }`}
        />

        {/* Countdown Digital Timer */}
        <div className="flex items-center gap-1">
          <Clock
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${
              isOpen
                ? "text-emerald-700 dark:text-emerald-300"
                : isHoliday
                ? "text-rose-700 dark:text-rose-300"
                : "text-amber-700 dark:text-amber-300"
            }`}
          />
          <span
            className={`font-mono font-black text-xs sm:text-sm tracking-tight leading-none ${
              isOpen
                ? "text-emerald-950 dark:text-emerald-100"
                : isHoliday
                ? "text-rose-950 dark:text-rose-100"
                : "text-amber-950 dark:text-amber-100"
            }`}
          >
            {timeLeft}
          </span>
        </div>

        {/* Sub-label badge (e.g. Buka Pk 10:00 / Tutup Pk 15:00) */}
        <span
          className={`hidden lg:inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs ${
            isOpen
              ? "bg-emerald-200/90 text-emerald-950 border-emerald-300 dark:bg-emerald-900/80 dark:text-emerald-100 dark:border-emerald-700/80"
              : isHoliday
              ? "bg-rose-200/90 text-rose-950 border-rose-300 dark:bg-rose-900/80 dark:text-rose-100 dark:border-rose-700/80"
              : "bg-amber-200/90 text-amber-950 border-amber-300 dark:bg-amber-900/80 dark:text-amber-100 dark:border-amber-700/80"
          }`}
        >
          {subLabel}
        </span>
      </button>

      {/* ─── Detail Dialog Modal ─── */}
      <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`p-2 rounded-xl ${
                  isOpen
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : isHoliday
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {isOpen ? <DoorOpen className="w-5 h-5" /> : <DoorClosed className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black tracking-tight">
                  Status & Waktu Operasional Kantor
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Sistem Informasi Manajemen Pelaku Usaha (SIMPU)
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Large Countdown Cards */}
          <div className="space-y-4 py-2">
            <div
              className={`p-4 rounded-2xl border text-center ${
                isOpen
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                  : isHoliday
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
                  : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    isOpen ? "bg-emerald-500" : isHoliday ? "bg-rose-500" : "bg-amber-500"
                  }`}
                />
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {isOpen ? "Sisa Waktu Operasional Hari Ini" : "Hitung Mundur Buka Jam Kantor"}
                </span>
              </div>

              {/* Digital Segment Cards */}
              <div className="flex items-center justify-center gap-2">
                {days > 0 && (
                  <>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center font-mono font-black text-2xl text-slate-900 dark:text-white shadow-2xs">
                        {days}
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">
                        Hari
                      </span>
                    </div>
                    <span className="font-mono font-bold text-xl text-slate-400 mb-4">:</span>
                  </>
                )}

                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center font-mono font-black text-2xl text-slate-900 dark:text-white shadow-2xs">
                    {hours.toString().padStart(2, "0")}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">
                    Jam
                  </span>
                </div>

                <span className="font-mono font-bold text-xl text-slate-400 mb-4">:</span>

                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center font-mono font-black text-2xl text-slate-900 dark:text-white shadow-2xs">
                    {minutes.toString().padStart(2, "0")}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">
                    Menit
                  </span>
                </div>

                <span className="font-mono font-bold text-xl text-slate-400 mb-4">:</span>

                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center font-mono font-black text-2xl text-slate-900 dark:text-white shadow-2xs">
                    {seconds.toString().padStart(2, "0")}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">
                    Detik
                  </span>
                </div>
              </div>

              <p className="text-xs font-semibold mt-3 text-slate-700 dark:text-slate-300">
                {subLabel}
              </p>
            </div>

            {/* Holiday Notice if any */}
            {isHoliday && holidayName && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs flex items-center gap-2 text-rose-800 dark:text-rose-200">
                <Info className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  Hari ini libur: <strong>{holidayName}</strong>.
                </span>
              </div>
            )}

            {/* Jadwal Operasional List */}
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Jadwal Operasional Kantor SIMPU
              </p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="font-medium">Senin – Jumat (Hari Kerja)</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {openHourStr} – {closeWeekdayStr} WIB
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="font-medium">Sabtu (Akhir Pekan)</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {openHourStr} – {closeWeekendStr} WIB
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="font-medium">Minggu & Libur Nasional</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    Tutup / Libur
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                onClick={() => {
                  setIsOpenDialog(false)
                  router.push("/settings-office-hours")
                }}
              >
                <Settings className="w-3.5 h-3.5" />
                Atur Jam Kantor
              </Button>
            )}
            <Button
              size="sm"
              className="text-xs font-bold"
              onClick={() => setIsOpenDialog(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
