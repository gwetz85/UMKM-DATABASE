"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Camera,
  RotateCw,
  Zap,
  ZapOff,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  Check,
  CreditCard,
  FileText,
  X,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { performKtpKkOcr, validate16DigitCode, OcrResult } from "@/lib/ktp-ocr"
import { useToast } from "@/hooks/use-toast"

interface KtpKkScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: "ktp" | "noKK"
  onScanComplete: (extractedNumber: string, mode: "ktp" | "noKK") => void
}

export function KtpKkScannerDialog({
  open,
  onOpenChange,
  initialMode = "ktp",
  onScanComplete,
}: KtpKkScannerDialogProps) {
  const { toast } = useToast()

  const [mode, setMode] = useState<"ktp" | "noKK">(initialMode)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Scanning states
  const [isProcessing, setIsProcessing] = useState(false)
  const [progressStatus, setProgressStatus] = useState("")
  const [progressPercent, setProgressPercent] = useState(0)

  // Result states
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [editableNumber, setEditableNumber] = useState("")

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Update mode when initialMode changes
  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setCapturedImage(null)
      setOcrResult(null)
      setEditableNumber("")
      setIsProcessing(false)
    }
  }, [open, initialMode])

  // Stop camera stream helper
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  // Initialize camera
  const startCamera = useCallback(async (deviceId?: string) => {
    setCameraError(null)
    stopStream()

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
        audio: false,
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(newStream)

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        videoRef.current.play().catch(() => {})
      }

      // Check capabilities for torch
      const videoTrack = newStream.getVideoTracks()[0]
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() || {}) as any
        setHasTorch(!!capabilities.torch)
      }

      // Enumerate devices if not already done
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const videoDevs = allDevices.filter((d) => d.kind === "videoinput")
        setDevices(videoDevs)
        if (!selectedDeviceId && videoDevs.length > 0) {
          setSelectedDeviceId(videoTrack?.getSettings()?.deviceId || videoDevs[0].deviceId)
        }
      } catch (e) {
        // Ignore enumerate error
      }
    } catch (err: any) {
      console.warn("Camera init error:", err)
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Izin akses kamera ditolak. Silakan izinkan kamera di browser atau gunakan opsi Unggah Foto.")
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("Kamera tidak ditemukan pada perangkat ini. Silakan gunakan opsi Unggah Foto.")
      } else {
        setCameraError("Tidak dapat mengaktifkan kamera. Silakan gunakan opsi Unggah Foto.")
      }
    }
  }, [stopStream, selectedDeviceId])

  // Lifecycle for opening/closing dialog
  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopStream()
      setCapturedImage(null)
      setOcrResult(null)
      setEditableNumber("")
      setIsProcessing(false)
    }
    return () => {
      stopStream()
    }
  }, [open, startCamera, stopStream])

  // Switch camera device
  const handleSwitchCamera = () => {
    if (devices.length <= 1) return
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId)
    const nextIndex = (currentIndex + 1) % devices.length
    const nextDevice = devices[nextIndex]
    setSelectedDeviceId(nextDevice.deviceId)
    startCamera(nextDevice.deviceId)
  }

  // Toggle torch / flash
  const handleToggleTorch = async () => {
    if (!stream || !hasTorch) return
    const track = stream.getVideoTracks()[0]
    if (track) {
      try {
        const nextState = !torchEnabled
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        })
        setTorchEnabled(nextState)
      } catch (err) {
        console.warn("Torch error:", err)
      }
    }
  }

  // Process image for OCR
  const processImageForOcr = async (canvas: HTMLCanvasElement) => {
    setIsProcessing(true)
    setProgressStatus("Menyiapkan OCR...")
    setProgressPercent(15)

    try {
      const result = await performKtpKkOcr(canvas, mode, (status, progress) => {
        setProgressStatus(status)
        setProgressPercent(progress)
      })

      setOcrResult(result)
      if (result.extractedNumber) {
        setEditableNumber(result.extractedNumber)
        toast({
          title: "Nomor Berhasil Terbaca!",
          description: `${mode === "ktp" ? "NIK" : "No. KK"}: ${result.extractedNumber} (${result.provinceName || "Terdeteksi"})`,
        })
      } else {
        toast({
          title: "Nomor Kurang Jelas",
          description: "Pastikan kartu berada tepat di dalam kotak panduan dan tidak buram.",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error("OCR Processing error:", err)
      toast({
        title: "Gagal Membaca Dokumen",
        description: "Terjadi kesalahan saat memproses OCR. Silakan coba kembali.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Capture photo from live camera
  const handleCapture = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
    setCapturedImage(dataUrl)

    // Stop camera while viewing result
    stopStream()

    // Run OCR
    processImageForOcr(canvas)
  }

  // Handle upload from file/gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setCapturedImage(dataUrl)
      stopStream()

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          processImageForOcr(canvas)
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null)
    setOcrResult(null)
    setEditableNumber("")
    setIsProcessing(false)
    startCamera(selectedDeviceId)
  }

  // Confirm and proceed with check
  const handleConfirmAndCheck = () => {
    const cleanNumber = editableNumber.replace(/\D/g, "")
    if (!cleanNumber) {
      toast({
        title: "Nomor Kosong",
        description: "Harap masukkan nomor NIK atau No. KK sebelum melakukan pengecekan.",
        variant: "destructive",
      })
      return
    }

    onScanComplete(cleanNumber, mode)
    onOpenChange(false)
  }

  const validation = validate16DigitCode(editableNumber, mode)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[96vw] max-h-[94vh] p-0 flex flex-col overflow-hidden rounded-2xl border bg-slate-950 text-white shadow-2xl">
        {/* Header Dialog */}
        <div className="px-4 py-3 md:px-6 md:py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30 shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Scan Dokumen Kependudukan</span>
                <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-[10px] uppercase font-bold px-2 py-0.5">
                  OCR Akurat
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Pindai NIK KTP atau Nomor KK langsung menggunakan kamera perangkat
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Mode Selector Tab */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMode("ktp")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              mode === "ktp"
                ? "bg-teal-600 text-white shadow-md shadow-teal-900/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <CreditCard className="w-3.5 h-3.5" /> KTP (Cari NIK)
          </button>
          <button
            type="button"
            onClick={() => setMode("noKK")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              mode === "noKK"
                ? "bg-teal-600 text-white shadow-md shadow-teal-900/40"
                : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <FileText className="w-3.5 h-3.5" /> Kartu Keluarga (No. KK)
          </button>
        </div>

        {/* Body Viewport */}
        <div className="relative flex-1 flex flex-col items-center justify-center bg-black min-h-[300px] md:min-h-[380px] overflow-hidden">
          {capturedImage ? (
            /* Result Review State */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-3">
              <img
                src={capturedImage}
                alt="Captured document"
                className="max-h-[220px] md:max-h-[280px] w-auto object-contain rounded-xl border border-slate-800 shadow-lg"
              />

              {/* Progress Loading Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
                    <Sparkles className="w-4 h-4 text-teal-200 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-wider">{progressStatus}</p>
                    <p className="text-xs text-teal-400 font-mono mt-1">{progressPercent}%</p>
                  </div>
                  <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-500 h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : cameraError ? (
            /* Camera Error State */
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md">
              <div className="p-3.5 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">{cameraError}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Anda tetap dapat memindai dengan memilih foto KTP/KK dari galeri atau berkas perangkat.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl gap-2 shadow-lg"
              >
                <Upload className="w-4 h-4" /> Pilih Foto KTP/KK dari Galeri
              </Button>
            </div>
          ) : (
            /* Live Camera Viewfinder */
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* ID Card Target Frame Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                {/* Responsive ID Card Aspect Ratio Box (85.6mm x 54mm = ~1.586) */}
                <div
                  className={cn(
                    "relative w-full max-w-[320px] sm:max-w-[420px] rounded-2xl border-2 transition-all duration-300",
                    mode === "ktp" ? "aspect-[1.58/1]" : "aspect-[1.4/1] max-w-[340px] sm:max-w-[440px]",
                    "border-teal-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                  )}
                >
                  {/* Corner Accents */}
                  <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />

                  {/* Scanning Animation Line */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse shadow-[0_0_8px_#2dd4bf]" />

                  {/* Target NIK / KK area guide */}
                  <div className="absolute top-4 left-4 right-4 bg-teal-950/40 border border-teal-400/40 rounded-lg p-2 text-center backdrop-blur-[2px]">
                    <span className="text-[11px] font-black uppercase tracking-wider text-teal-300 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Area Nomor {mode === "ktp" ? "NIK KTP (16 Digit)" : "No. KK (16 Digit)"}
                    </span>
                  </div>

                  {/* Hint at bottom of box */}
                  <div className="absolute bottom-2 inset-x-2 text-center">
                    <span className="text-[10px] font-medium text-slate-300 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      Posisikan dokumen sejajar dan terang
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Camera Controls Top Right */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl border border-white/10 backdrop-blur-sm transition-colors"
                    title={torchEnabled ? "Matikan Flash" : "Nyalakan Flash"}
                  >
                    {torchEnabled ? <Zap className="w-4 h-4 text-amber-400" /> : <ZapOff className="w-4 h-4 text-slate-300" />}
                  </button>
                )}
                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl border border-white/10 backdrop-blur-sm transition-colors"
                    title="Beralih Kamera"
                  >
                    <RotateCw className="w-4 h-4 text-slate-200" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: Result Confirmation or Capture Trigger */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0 space-y-3">
          {capturedImage ? (
            /* Result Input & Confirmation Card */
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Hasil Ekstraksi Nomor {mode === "ktp" ? "NIK" : "KK"}:</span>
                  </Label>
                  {validation.isValid ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-bold uppercase gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 16 Digit Valid
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] font-bold uppercase gap-1">
                      <AlertTriangle className="w-3 h-3" /> Periksa Kembali
                    </Badge>
                  )}
                </div>

                <div className="relative">
                  <Input
                    type="text"
                    maxLength={16}
                    value={editableNumber}
                    onChange={(e) => setEditableNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder={`Masukkan atau sesuaikan 16 digit ${mode === "ktp" ? "NIK" : "No KK"}`}
                    className="font-mono text-base md:text-lg font-black tracking-widest text-teal-300 bg-slate-950 border-slate-700 h-11 px-3 focus:border-teal-500"
                  />
                </div>

                {/* Province or Details Tag */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>
                    {validation.provinceName ? (
                      <span className="text-teal-400 font-semibold">Provinsi: {validation.provinceName}</span>
                    ) : (
                      "Pastikan 16 digit terisi lengkap"
                    )}
                  </span>
                  {ocrResult?.detectedName && (
                    <span className="text-slate-300 font-bold uppercase truncate max-w-[200px]" title={ocrResult.detectedName}>
                      Nama: {ocrResult.detectedName}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRetake}
                  disabled={isProcessing}
                  className="rounded-xl border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white font-bold text-xs gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Foto Ulang
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmAndCheck}
                  disabled={isProcessing || !editableNumber}
                  className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs gap-1.5 shadow-lg shadow-teal-950"
                >
                  <Search className="w-3.5 h-3.5" /> Gunakan & Cek Database
                </Button>
              </div>
            </div>
          ) : (
            /* Camera Action Bar */
            <div className="flex items-center justify-between gap-3">
              {/* Upload file button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-bold gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Unggah Galeri
              </Button>

              {/* Big Capture Trigger */}
              <Button
                type="button"
                onClick={handleCapture}
                disabled={!!cameraError}
                className="flex-1 max-w-[240px] rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs md:text-sm h-10 gap-2 shadow-lg shadow-teal-900/50 transition-all hover:scale-[1.02]"
              >
                <Camera className="w-4 h-4" /> Ambil Foto & Pindai
              </Button>

              {/* Close Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Batal
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
