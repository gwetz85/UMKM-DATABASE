"use client"

import React, { useRef, useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RotateCcw, Check, PenTool, AlertCircle } from "lucide-react"

interface SignaturePadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (signatureBase64: string) => void
  signerName?: string
  title?: string
}

export function SignaturePadDialog({
  open,
  onOpenChange,
  onSave,
  signerName,
  title = "Tanda Tangan Pelaku Usaha"
}: SignaturePadDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Initialize and resize canvas with retina resolution
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.strokeStyle = "#0f172a" // Slate-900 for clean dark ink
      ctx.lineWidth = 3
    }

    setHasDrawn(false)
    setErrorMsg(null)
  }, [])

  useEffect(() => {
    if (open) {
      // Small timeout to allow dialog DOM layout to settle before measuring dimensions
      const timer = setTimeout(() => {
        initCanvas()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open, initCanvas])

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.setPointerCapture(e.pointerId)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasDrawn(true)
    setErrorMsg(null)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        // Ignored
      }
    }
    setIsDrawing(false)
  }

  const handleClear = () => {
    initCanvas()
  }

  // Trim transparent pixels and return base64
  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) {
      setErrorMsg("Harap bubuhkan tanda tangan terlebih dahulu.")
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const rawW = canvas.width
    const rawH = canvas.height

    const imgData = ctx.getImageData(0, 0, rawW, rawH)
    const data = imgData.data

    let minX = rawW, minY = rawH, maxX = 0, maxY = 0
    let hasPixel = false

    // Scan for non-transparent pixels
    for (let y = 0; y < rawH; y++) {
      for (let x = 0; x < rawW; x++) {
        const alpha = data[(y * rawW + x) * 4 + 3]
        if (alpha > 10) { // Found inked pixel
          hasPixel = true
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    if (!hasPixel) {
      setErrorMsg("Tanda tangan kosong. Silakan gambar tanda tangan.")
      return
    }

    // Add small padding around signature
    const padding = Math.round(15 * dpr)
    minX = Math.max(0, minX - padding)
    minY = Math.max(0, minY - padding)
    maxX = Math.min(rawW, maxX + padding)
    maxY = Math.min(rawH, maxY + padding)

    const cropW = maxX - minX
    const cropH = maxY - minY

    // Crop to temporary canvas
    const cropCanvas = document.createElement("canvas")
    cropCanvas.width = cropW
    cropCanvas.height = cropH
    const cropCtx = cropCanvas.getContext("2d")

    if (cropCtx) {
      cropCtx.drawImage(
        canvas,
        minX,
        minY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH
      )
      const croppedBase64 = cropCanvas.toDataURL("image/png")
      onSave(croppedBase64)
      onOpenChange(false)
    } else {
      // Fallback
      onSave(canvas.toDataURL("image/png"))
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-slate-900 uppercase">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Gunakan jari (layar sentuh) atau stylus/mouse untuk membubuhkan tanda tangan.
              </DialogDescription>
            </div>
          </div>
          {signerName && (
            <div className="mt-2 text-xs bg-slate-100 px-3 py-1.5 rounded-lg font-semibold text-slate-700 flex items-center justify-between">
              <span>Nama Penandatangan:</span>
              <span className="font-bold text-indigo-900 uppercase">{signerName}</span>
            </div>
          )}
        </DialogHeader>

        {/* Canvas Pad Container */}
        <div className="my-2 space-y-2">
          <div
            ref={containerRef}
            className="w-full h-56 sm:h-64 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-slate-50/50 rounded-2xl relative overflow-hidden select-none cursor-crosshair transition-colors"
            style={{ touchAction: "none" }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="absolute inset-0 w-full h-full"
            />

            {/* Dotted Guideline */}
            <div className="absolute bottom-10 left-8 right-8 pointer-events-none flex flex-col items-center">
              <div className="w-full border-b-2 border-dashed border-slate-300" />
              <span className="text-[10px] uppercase font-semibold text-slate-400 mt-1 tracking-wider">
                Tanda Tangan di Atas Garis Ini
              </span>
            </div>

            {/* Hint if empty */}
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-slate-400 space-y-1">
                  <PenTool className="w-7 h-7 mx-auto opacity-30 text-indigo-600" />
                  <p className="text-xs font-medium">Sentuh atau goreskan tanda tangan di sini</p>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={!hasDrawn}
            className="text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 h-9"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Bersihkan Pad
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 flex-1 sm:flex-initial"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 flex-1 sm:flex-initial shadow-sm"
            >
              <Check className="w-4 h-4 mr-1.5" /> Simpan Tanda Tangan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
