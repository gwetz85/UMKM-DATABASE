"use client"

import React, { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, Upload, Loader2, CheckCircle2, XCircle, RefreshCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface KKOcrScannerProps {
  onScanSuccess: (noKK: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KKOcrScanner({ onScanSuccess, open, onOpenChange }: KKOcrScannerProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCapture = () => {
    fileInputRef.current?.click()
  }

  const resetScanner = () => {
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const processOcr = async () => {
    if (!previewUrl) return

    setLoading(true)
    try {
      const response = await fetch("/api/ocr/kk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: previewUrl }),
      })

      const data = await response.json()

      if (response.ok && data.noKK) {
        toast({
          title: "SCAN BERHASIL",
          description: `Nomor KK ${data.noKK} berhasil dibaca.`,
          className: "bg-emerald-50 border-emerald-200 text-emerald-900",
        })
        onScanSuccess(data.noKK)
        onOpenChange(false)
        resetScanner()
      } else {
        throw new Error(data.error || "Gagal membaca Nomor KK")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "SCAN GAGAL",
        description: error.message || "Pastikan foto KK jelas dan tidak buram.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!loading) {
        onOpenChange(val)
        if (!val) resetScanner()
      }
    }}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
            <Camera className="w-6 h-6" /> Scan Kartu Keluarga
          </DialogTitle>
          <DialogDescription className="font-bold text-slate-500">
            Ambil foto bagian Nomor KK dengan jelas untuk pembacaan otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex flex-col items-center justify-center min-h-[300px] bg-slate-50/50">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          {!previewUrl ? (
            <button
              onClick={handleCapture}
              className="group flex flex-col items-center justify-center gap-4 w-full aspect-square max-w-[280px] border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-white hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
            >
              <div className="p-5 bg-slate-100 rounded-full group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
                <Camera className="w-10 h-10 text-slate-400 group-hover:text-primary" />
              </div>
              <span className="font-black text-slate-400 group-hover:text-primary uppercase tracking-wider text-sm">
                Ketuk Untuk Foto KK
              </span>
            </button>
          ) : (
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border-4 border-white bg-black flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Preview"
                className={cn("w-full h-full object-contain", loading && "opacity-50 grayscale")}
              />
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                  <Loader2 className="w-12 h-12 text-white animate-spin mb-2" />
                  <span className="text-white font-black uppercase tracking-widest text-xs animate-pulse">
                    Menganalisis Gambar...
                  </span>
                </div>
              )}
              {!loading && (
                <button
                  onClick={resetScanner}
                  className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-colors"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-white flex flex-col sm:flex-row gap-3">
          {!previewUrl ? (
            <Button
              variant="outline"
              className="w-full font-bold h-12 border-slate-200 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Batalkan
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1 font-bold h-12 border-slate-200 rounded-xl"
                onClick={resetScanner}
                disabled={loading}
              >
                Foto Ulang
              </Button>
              <Button
                className="flex-[2] font-black h-12 rounded-xl bg-primary shadow-lg shadow-primary/20"
                onClick={processOcr}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                PROSES DATA
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
