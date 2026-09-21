"use client"

import React, { useEffect, useState } from "react"
import { useUser, useDatabase, useMemoFirebase, useList } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  User, 
  Phone, 
  CreditCard, 
  MapPin, 
  ShieldCheck, 
  Loader2, 
  Info, 
  Shield, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Ban, 
  AlertTriangle, 
  ChevronRight 
} from "lucide-react"


export function ProfileStatusDialog() {
  const { user, isUserLoading, userProfile: profile, isProfileLoading } = useUser()
  const database = useDatabase()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'profile' | 'info'>('profile')

  useEffect(() => {
    // Show dialog once per session after login and profile is loaded
    const sessionShown = sessionStorage.getItem('welcome_dialog_shown')
    if (user && profile && !sessionShown && !isUserLoading && !isProfileLoading) {
      setIsOpen(true)
      sessionStorage.setItem('welcome_dialog_shown', 'true')
    }
  }, [user, profile, isUserLoading, isProfileLoading])

  if (!user || !profile) return null

  const isProfileComplete = profile.fullName && profile.phoneNumber && profile.nik && profile.address

  const handleNextStep = () => {
    if (isProfileComplete) {
      setStep('info')
    } else {
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) setTimeout(() => setStep('profile'), 300) // Reset after animation
    }}>
      <DialogContent className={`${step === 'info' ? 'sm:max-w-2xl' : 'sm:max-w-md'} border-none shadow-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 dark:border dark:border-slate-800 dark:text-slate-100 overflow-hidden transition-all duration-300 p-0`}>
        {step === 'profile' ? (
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <DialogTitle className="text-center text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Selamat Datang Kembali!
              </DialogTitle>
              <DialogDescription className="text-center font-medium text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                Berikut adalah ringkasan profil Anda di sistem SIMPU.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <div className="glass-panel p-4 rounded-2xl border border-slate-100 dark:border-slate-800 dark:bg-slate-800/60 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Nama Lengkap</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{profile.fullName || "-"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
                    <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Nomor Ponsel</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{profile.phoneNumber || "-"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
                    <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">NIK (Nomor Induk Kependudukan)</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{profile.nik || "-"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg">
                    <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Alamat Lengkap</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 leading-snug">{profile.address || "-"}</span>
                  </div>
                </div>
              </div>

              {!isProfileComplete && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 p-3 rounded-xl flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 leading-relaxed">
                    Profil Anda belum lengkap. Mohon lengkapi data diri Anda untuk memudahkan verifikasi dan koordinasi.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              {!isProfileComplete ? (
                <Button asChild className="w-full font-bold shadow-lg shadow-primary/20">
                  <Link href="/profile" onClick={() => setIsOpen(false)}>Lengkapi Profil Sekarang</Link>
                </Button>
              ) : (
                <Button onClick={handleNextStep} className="w-full font-bold group">
                  Sudah Sesuai 
                  <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
            </DialogFooter>
          </div>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto custom-scrollbar p-4 sm:p-6">
            <DialogHeader className="mb-6">
              <div className="mx-auto w-12 h-12 bg-indigo-100 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center mb-3 rotate-3">
                <Info className="w-6 h-6 text-indigo-600 dark:text-indigo-400 -rotate-3" />
              </div>
              <DialogTitle className="text-center text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Informasi Penting Aplikasi
              </DialogTitle>
              <DialogDescription className="text-center font-medium text-slate-500 dark:text-slate-400">
                Pahami ketentuan dan fungsi otomatis dalam sistem ini.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pb-4">
              {/* Tentang Aplikasi */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 rounded-md">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">Tentang Aplikasi</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    "Pendataan pelaku usaha calon penerima bantuan UMKM Yayasan",
                    "Dibuat dan dikembangkan untuk digunakan di lingkungan sendiri",
                    "Terintegrasi penuh dengan database online real-time",
                    "Pembuatan dan pengembangan dikerjakan secara Mandiri"
                  ].map((text, i) => (
                    <div key={i} className="flex gap-2 items-start p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Rules */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-950/50 rounded-md">
                    <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">Aturan Main (Rules)</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { text: "Aplikasi bersifat semi otomatis, hampir semua aturan telah di-set secara Mandiri", icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },
                    { text: "Pengawasan sepenuhnya berada di pihak pengembang / admin aplikasi", icon: <Shield className="w-3.5 h-3.5 text-amber-500" /> },
                    { text: "Hasil pengecekkan data berdasarkan data Pelaku Usaha 2024 & 2025 (2,965 data)", icon: <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-center p-3 rounded-xl bg-amber-50/30 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/40">
                      <div className="bg-white dark:bg-slate-800 p-1 rounded-md shadow-sm">{item.icon}</div>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{item.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Fungsi Otomatis */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-md">
                    <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">Fungsi Otomatisasi</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Dashboard Analytics
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-3.5">Menampilkan real-time data pelaku usaha: gender, kuota, penyebaran kelurahan, dan jenis usaha.</p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Verifikasi Semi-Otomatis (SLA):
                    </p>
                    <div className="grid grid-cols-1 gap-2 ml-3.5">
                      {[
                        { label: "Data Lengkap & Ada di Sheet 2024", value: "Auto Verif 5 Menit", icon: <Clock className="w-3 h-3" /> },
                        { label: "Data Lengkap & Ada di Sheet 2023", value: "Auto Verif 5 Menit", icon: <Clock className="w-3 h-3" /> },
                        { label: "Data Lengkap & Ada di Sheet 2025", value: "Hold → Manual Review", icon: <AlertTriangle className="w-3 h-3" /> },
                        { label: "Tidak ada di Sheet Manapun", value: "Auto Verif (45 Detik)", icon: <Clock className="w-3 h-3" /> },
                        { label: "Ada di Sheet Blacklist", value: "Auto Cancel (30 Detik)", icon: <Ban className="w-3 h-3" /> }
                      ].map((s, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] bg-white/50 dark:bg-slate-800/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">{s.label}</span>
                          <span className="flex items-center gap-1 font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">
                            {s.icon} {s.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Blacklist Otomatis (Menu LPJ)
                        </p>
                        <p className="text-[10px] text-purple-600 dark:text-purple-300 ml-3.5 leading-relaxed">
                          Data ditahan 14 hari. Jika nominal LPJ tidak diinput setelah masa tenggang habis, sistem akan melakukan blacklist otomatis.
                        </p>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                        <Ban className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <DialogFooter className="mt-4">
              <Button onClick={() => setIsOpen(false)} className="w-full font-black uppercase tracking-widest bg-slate-900 hover:bg-black dark:bg-primary dark:hover:bg-primary/90 text-white shadow-xl py-6">
                Mulai Gunakan Aplikasi
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
