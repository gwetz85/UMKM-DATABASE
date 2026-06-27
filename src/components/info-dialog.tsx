"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Info, Mail, Phone, ShieldCheck, Zap, Database, Monitor, CreditCard, Send, SearchCheck } from "lucide-react"
import { useDatabase, useObject, useMemoFirebase } from "@/firebase"
import { ref } from "firebase/database"

interface InfoDialogProps {
  children: React.ReactNode
}

export function InfoDialog({ children }: InfoDialogProps) {
  const database = useDatabase()
  const configRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'settings/system_config')
  }, [database])
  const { data: config } = useObject(configRef)

  const currentVersion = config?.version || "Versi 8.1"

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-none bg-gradient-to-br from-white to-gray-50 p-0 overflow-hidden shadow-2xl rounded-3xl">
        <div className="bg-primary p-5 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-white/20 p-2.5 sm:p-3 rounded-2xl backdrop-blur-md">
              <Info className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
                Informasi Aplikasi
              </DialogTitle>
              <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] px-0.5">{currentVersion}</p>
            </div>
          </div>
        </div>
        
        <div className="p-5 sm:p-8 space-y-4 sm:space-y-6 max-h-[65vh] sm:max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            <div className="text-gray-700 leading-relaxed font-bold text-sm uppercase tracking-tight">
              {config?.welcomeText ? (
                <div dangerouslySetInnerHTML={{ __html: config.welcomeText.replace(/\n/g, '<br/>') }} />
              ) : (
                <>Selamat datang di Aplikasi **SIMPU**</>
              )}
              <span className="text-[10px] text-muted-foreground font-black tracking-widest block mt-1">
                - {config?.subText || "SISTEM INFORMASI MANAJEMEN PELAKU USAHA"} -
              </span>
              <span className="text-primary mt-1 block">{currentVersion}</span>
            </div>
            <div className="bg-blue-50 border-l-4 border-primary p-3 sm:p-4 rounded-r-xl">
              <p className="text-xs sm:text-sm text-blue-900 leading-relaxed italic">
                "Aplikasi ini dikembangkan dan dibuat secara Mandiri dan Independent oleh Tim Admin yang bekerja. Hak Cipta Sepenuhnya dimiliki oleh AGUS SURIYADI sebagai Pembuat dan Pengembang Aplikasi"
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Zap className="w-4 h-4" /> Pembaruan Aplikasi
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {(config?.appUpdates || [
                "Penambahan Fitur Pesan",
                "Penambahan Event Card",
                "Penambahan Music Backsound",
                "Penambahan Fitur Bot Telegram",
                "Penambahan Fitur Cek Data Kolektif",
                "Penambahan Menu Verifikasi Dinas",
                "Penambahan Halaman Bank",
                "Penambahan Database 4.045 data",
                "Perbaikan di beberapa fitur tampilan",
                "Penambahan & perbaikan file system"
              ]).map((text: string, i: number) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-gray-100/50 hover:bg-gray-100 transition-colors group">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary group-hover:scale-110 transition-transform shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Kontak & Saran
            </h3>
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm space-y-3 sm:space-y-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase mb-1">Pengembang</span>
                <span className="text-lg font-black text-primary">AGUS SURIYADI</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Email</span>
                  </div>
                  <p className="text-[13px] font-bold text-gray-700 break-all underline decoration-primary/30">agussuriyadipunya@gmail.com</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Whatsapp</span>
                  </div>
                  <p className="text-[13px] font-bold text-gray-700">0817319885</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 sm:p-6 flex justify-center border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
            &copy; {new Date().getFullYear()} SIMPU - All Rights Reserved
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
