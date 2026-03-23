"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

export function AboutDialog({ className, variant = "outline" }: { className?: string, variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm" className={cn("font-bold shadow-sm transition-all hover:scale-105 active:scale-95", className)}>
          <Info className="w-4 h-4 mr-2" /> About
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-primary tracking-tight">TENTANG APLIKASI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm leading-relaxed text-foreground font-medium">
            Selamat datang di Aplikasi SIMPU (Sistem Informasi Manajemen Pelaku Usaha) versi 5.0. 
          </p>
          <div className="space-y-2 bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Pembaruan Aplikasi :</p>
            <ul className="text-xs font-bold text-slate-600 space-y-1 ml-1">
              <li className="flex items-center gap-2">&bull; Penambahan Database 2.985 data</li>
              <li className="flex items-center gap-2">&bull; Perbaikkan di beberapa fitur tampilan</li>
              <li className="flex items-center gap-2">&bull; Penambahan dan perbaikkan di beberapa file system di aplikasi</li>
            </ul>
          </div>
          <div className="bg-muted/50 p-4 rounded-2xl border border-primary/10 space-y-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Kontak & Saran:</p>
            <div className="space-y-1">
              <div className="flex flex-col mb-2">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Email:</span>
                <span className="text-sm font-black text-primary truncate">agussuriyadipunya@gmail.com</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Whatsapp:</span>
                <span className="text-sm font-black text-primary">0817319885</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
           <p className="text-[10px] text-muted-foreground italic w-full text-center">Terima kasih atas kontribusi Anda.</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
