"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ExternalLink, Globe, Loader2 } from "lucide-react"
import { useState } from "react"

export default function OSSPage() {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header Area */}
      <div className="p-4 md:p-6 bg-white border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline flex items-center gap-2">
              <Globe className="w-8 h-8" /> Pembuatan NIB (OSS)
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground font-medium">
            Integrasi Layanan Perizinan Berusaha Terintegrasi Secara Elektronik (OSS)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => window.open("https://oss.go.id/id", "_blank")}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/5 font-bold"
          >
            <ExternalLink className="w-4 h-4 mr-2" /> Buka di Tab Baru
          </Button>
        </div>
      </div>

      {/* Content Area - Iframe */}
      <div className="flex-1 relative overflow-hidden bg-slate-100">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="font-bold text-slate-600 animate-pulse uppercase tracking-widest text-sm">Sedang Memuat Layanan OSS...</p>
            <p className="text-xs text-muted-foreground mt-2 italic">Pastikan koneksi internet Anda stabil</p>
          </div>
        )}
        
        {/* 
          Note: If oss.go.id has X-Frame-Options set to DENY or SAMEORIGIN, 
          this iframe will not load. In that case, the user should use the "Buka di Tab Baru" button.
        */}
        <iframe 
          src="https://oss.go.id/id" 
          className="w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
          title="Layanan OSS RI"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />
      </div>
      
      {/* Warning Footer if it doesn't load */}
      <div className="p-2 bg-amber-50 border-t border-amber-100 flex items-center justify-center gap-2 shrink-0">
        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-tighter">
          Jika halaman tidak muncul atau tertutup, silakan klik tombol "Buka di Tab Baru" di kanan atas.
        </p>
      </div>
    </div>
  )
}
