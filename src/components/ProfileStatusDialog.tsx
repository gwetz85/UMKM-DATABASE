"use client"

import React, { useEffect, useState } from "react"
import { useUser, useDatabase, useMemoFirebase, useList } from "@/firebase"
import { ref, query, equalTo, limitToFirst } from "firebase/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { User, Phone, CreditCard, MapPin, ShieldCheck, Loader2 } from "lucide-react"
import Link from "next/link"

export function ProfileStatusDialog() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const [isOpen, setIsOpen] = useState(false)

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])

  const { data: allUsersForProfile, isLoading: isProfileLoading } = useList(userProfileRef)
  const profile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-none shadow-2xl bg-gradient-to-br from-white to-slate-50">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl font-black text-slate-800 uppercase tracking-tight">
            Selamat Datang Kembali!
          </DialogTitle>
          <DialogDescription className="text-center font-medium text-slate-500">
            Berikut adalah ringkasan profil Anda di sistem SIMPU.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nama Lengkap</span>
                <span className="font-bold text-slate-700">{profile.fullName || "-"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nomor Ponsel</span>
                <span className="font-bold text-slate-700">{profile.phoneNumber || "-"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <CreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">NIK (Nomor Induk Kependudukan)</span>
                <span className="font-bold text-slate-700">{profile.nik || "-"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <MapPin className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alamat Lengkap</span>
                <span className="font-bold text-slate-700 leading-snug">{profile.address || "-"}</span>
              </div>
            </div>
          </div>

          {!isProfileComplete && (
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">
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
            <Button onClick={() => setIsOpen(false)} className="w-full font-bold">
              Sudah Sesuai
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
