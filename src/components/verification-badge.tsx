import { MapPin, Image as ImageIcon, FileCheck } from "lucide-react"

export function VerificationBadge({ actor }: { actor: any }) {
  const hasLocation = !!actor.verificationLocation || !!actor.verificationLocationDinas;
  const hasImage = !!actor.verificationBypass?.fileBase64;
  const isBypassed = !!actor.verificationBypass?.isBypassed;
  
  if (!hasLocation && !hasImage && !isBypassed) return null;

  return (
    <div className="flex gap-1 mt-1 flex-wrap print:hidden">
      {hasLocation && (
        <span className="flex items-center gap-1 text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded shadow-sm border border-blue-100 uppercase" title="Terverifikasi dengan Titik Lokasi">
          <MapPin className="w-3 h-3" /> Lokasi
        </span>
      )}
      {hasImage && (
        <span className="flex items-center gap-1 text-[9px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded shadow-sm border border-amber-100 uppercase" title="Terverifikasi dengan Upload Gambar">
          <ImageIcon className="w-3 h-3" /> Gambar
        </span>
      )}
      {!hasImage && isBypassed && (
        <span className="flex items-center gap-1 text-[9px] font-bold bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded shadow-sm border border-slate-200 uppercase" title="Terverifikasi Bypass Manual">
          <FileCheck className="w-3 h-3" /> Bypass
        </span>
      )}
    </div>
  )
}
