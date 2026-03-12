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
            Selamat datang di Aplikasi UMKM Database versi 3.1. Aplikasi ini dikembangkan dan dirancang untuk mempermudah dalam pengecekkan dan penginputan data. Aplikasi ini masih perlu pengembangan kedepannya, kritik dan saran sangat diperlukan.
          </p>
          <div className="bg-muted/50 p-4 rounded-2xl border border-primary/10 space-y-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Kontak & Saran:</p>
            <div className="space-y-1">
              <p className="text-sm font-bold flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-primary">agussuriyadipunya@gmail.com</span>
              </p>
              <p className="text-sm font-bold flex justify-between">
                <span className="text-muted-foreground">Whatsapp:</span>
                <span className="text-primary">0817319885</span>
              </p>
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
