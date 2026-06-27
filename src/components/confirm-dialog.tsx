"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  icon?: React.ReactNode
  title: string
  description?: string
  cancelText?: string
  confirmText?: string
  confirmIcon?: React.ReactNode
  variant?: "default" | "destructive"
  onConfirm: () => void
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  icon,
  title,
  description,
  cancelText = "Batal",
  confirmText = "Ya, Lanjutkan",
  confirmIcon,
  variant = "default",
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] border border-slate-200 shadow-2xl p-0 overflow-hidden rounded-3xl bg-white">
        <div className="flex flex-col items-center pt-8 sm:pt-10 pb-4 sm:pb-6 px-5 sm:px-8">
          {/* Icon Circle */}
          {icon && (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-slate-300 flex items-center justify-center mb-4 sm:mb-6">
              {icon}
            </div>
          )}

          {/* Title */}
          <h2 className="text-lg sm:text-xl font-black text-slate-800 text-center mb-1.5 sm:mb-2">
            {title}
          </h2>

          {/* Description */}
          {description && (
            <p className="text-xs sm:text-sm text-slate-400 text-center leading-relaxed max-w-[280px]">
              {description}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="px-5 sm:px-8 pb-6 sm:pb-8 flex items-center justify-center gap-3">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all font-bold text-xs sm:text-sm active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
            }}
            disabled={isLoading}
            className={cn(
              "flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all font-bold text-xs sm:text-sm active:scale-95 disabled:opacity-50",
              variant === "destructive"
                ? "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200"
                : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              confirmIcon
            )}
            {confirmText}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
