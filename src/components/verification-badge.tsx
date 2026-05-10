"use client"

import { useState } from "react"
import { MapPin, Image as ImageIcon, FileCheck, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export function VerificationBadge({ actor }: { actor: any }) {
  const [isImageOpen, setIsImageOpen] = useState(false)

  const loc = actor.verificationLocation || actor.verificationLocationDinas;
  const hasLocation = !!loc;
  const hasImage = !!actor.verificationBypass?.fileBase64;
  const isBypassed = !!actor.verificationBypass?.isBypassed;
  
  if (!hasLocation && !hasImage && !isBypassed) return null;

  return (
    <>
      <div className="flex gap-1 mt-1 flex-wrap print:hidden">
        {hasLocation && (
          <a 
            href={`https://www.google.com/maps?q=${loc.lat},${loc.lon}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded shadow-sm border border-blue-100 uppercase hover:bg-blue-100 transition-colors" 
            title="Lihat Titik Lokasi di Peta"
          >
            <MapPin className="w-3 h-3" /> Lokasi <ExternalLink className="w-2 h-2 ml-0.5 opacity-60" />
          </a>
        )}
        {hasImage && (
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsImageOpen(true)
            }}
            className="flex items-center gap-1 text-[9px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded shadow-sm border border-amber-100 uppercase hover:bg-amber-100 transition-colors cursor-pointer" 
            title="Klik untuk Lihat Bukti Gambar"
          >
            <ImageIcon className="w-3 h-3" /> Gambar
          </button>
        )}
        {!hasImage && isBypassed && (
          <span className="flex items-center gap-1 text-[9px] font-bold bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded shadow-sm border border-slate-200 uppercase" title="Terverifikasi Bypass Manual">
            <FileCheck className="w-3 h-3" /> Bypass
          </span>
        )}
      </div>

      {hasImage && (
        <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
          <DialogContent className="max-w-4xl border-none shadow-2xl p-0 overflow-hidden bg-black/95 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <DialogHeader className="p-4 absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent z-10">
              <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                Bukti Lampiran Verifikasi
              </DialogTitle>
              <DialogDescription className="text-slate-300 font-medium">
                Alasan Bypass: {actor.verificationBypass?.reason || "Tanpa alasan khusus"}
              </DialogDescription>
            </DialogHeader>
            <div className="relative w-full h-[85vh] flex items-center justify-center p-4 mt-12 pb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={actor.verificationBypass.fileBase64} 
                alt="Bukti Verifikasi" 
                className="max-w-full max-h-full object-contain rounded-md"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
