"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Info, Mail, Phone, ShieldCheck, Zap, Database, Monitor } from "lucide-react"

interface InfoDialogProps {
  children: React.ReactNode
}

export function InfoDialog({ children }: InfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-none bg-gradient-to-br from-white to-gray-50 p-0 overflow-hidden shadow-2xl rounded-3xl">
        <div className="bg-primary p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Info className="w-8 h-8 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-white mb-1">
                Informasi Aplikasi
              </DialogTitle>
              <p className="text-white/70 text-sm font-medium uppercase tracking-widest px-0.5">SIMPU Versi 5.6</p>
            </div>
          </div>
        </div>
        
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-3">
            <p className="text-gray-700 leading-relaxed font-medium">
              Selamat datang di Aplikasi **SIMPU** (Sistem Informasi Manajemen Pelaku Usaha) versi **5.6**.
            </p>
            <div className="bg-blue-50 border-l-4 border-primary p-4 rounded-r-xl">
              <p className="text-sm text-blue-900 leading-relaxed italic">
                "Aplikasi ini dikembangkan dan dibuat secara Mandiri dan Independent oleh Tim Admin yang bekerja. Hak Cipta Sepenuhnya dimiliki oleh Pencipta aplikasi."
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Zap className="w-4 h-4" /> Pembaruan Aplikasi
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                { icon: Monitor, text: "Penambahan Fitur Chat" },
                { icon: Database, text: "Penambahan Database 2.965 data" },
                { icon: ShieldCheck, text: "Perbaikan di beberapa fitur tampilan" },
                { icon: Zap, text: "Penambahan & perbaikan file system" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-100/50 hover:bg-gray-100 transition-colors group">
                  <item.icon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Kontak & Saran
            </h3>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
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

        <div className="bg-gray-50 p-6 flex justify-center border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
            &copy; {new Date().getFullYear()} SIMPU - All Rights Reserved
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
