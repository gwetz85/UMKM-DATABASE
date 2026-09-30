"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  ShieldAlert, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  Loader2 
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateBackupCodes } from "@/lib/totp"
import { ref, update } from "firebase/database"

interface TwoFactorBackupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userKey: string
  userName: string
  database: any
  backupCodes: string[]
  onCodesUpdated: (newCodes: string[]) => void
}

export function TwoFactorBackupDialog({
  open,
  onOpenChange,
  userKey,
  userName,
  database,
  backupCodes,
  onCodesUpdated
}: TwoFactorBackupDialogProps) {
  const { toast } = useToast()
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false)
  const [regenerating, setRegenerating] = useState<boolean>(false)

  const handleCopyBackupCodes = () => {
    if (!backupCodes || backupCodes.length === 0) return
    const text = `KODE CADANGAN 2FA SIMPU (${userName || userKey})\n` +
      `Disimpan pada: ${new Date().toLocaleString('id-ID')}\n\n` +
      backupCodes.map((code, idx) => `${idx + 1}. ${code}`).join('\n') +
      `\n\n*Setiap kode hanya dapat digunakan sekali saat login.*`
    navigator.clipboard.writeText(text)
    setCopiedCodes(true)
    toast({ title: "Kode Cadangan Tersalin", description: "Seluruh kode cadangan telah disalin ke clipboard." })
    setTimeout(() => setCopiedCodes(false), 2000)
  }

  const handleDownloadBackupCodes = () => {
    if (!backupCodes || backupCodes.length === 0) return
    const text = `KODE CADANGAN 2FA - SIMPU UMKM\n` +
      `Pengguna: ${userName || userKey}\n` +
      `Tanggal: ${new Date().toLocaleString('id-ID')}\n` +
      `----------------------------------------\n` +
      backupCodes.map((code, idx) => `[${idx + 1}] ${code}`).join('\n') +
      `\n----------------------------------------\n` +
      `CATATAN PENTING:\n` +
      `- Simpan file ini di tempat yang aman.\n` +
      `- Kode ini digunakan jika Anda kehilangan akses ke aplikasi Google Authenticator.\n` +
      `- Setiap kode hanya berlaku untuk SATU KALI login.\n`
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `SIMPU-Backup-Codes-${userName || userKey}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast({ title: "File Terunduh", description: "Kode cadangan berhasil diunduh sebagai file teks." })
  }

  const handleRegenerateCodes = async () => {
    if (!database || !userKey) return
    const confirmRegen = window.confirm("Apakah Anda yakin ingin membuat kode cadangan baru? Kode cadangan lama akan hangus dan tidak dapat digunakan lagi.")
    if (!confirmRegen) return

    setRegenerating(true)
    try {
      const newCodes = generateBackupCodes(6)
      const userRef = ref(database, `system_users/${userKey}`)
      await update(userRef, {
        twoFactorBackupCodes: newCodes
      })
      onCodesUpdated(newCodes)
      toast({
        title: "Kode Cadangan Diperbarui",
        description: "6 kode cadangan baru berhasil dibuat. Harap simpan kembali kode ini."
      })
    } catch (err: any) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui",
        description: "Terjadi kesalahan saat memperbarui kode cadangan."
      })
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 sm:p-8">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase text-slate-800">
                Kode Cadangan 2FA
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Gunakan kode ini jika Anda tidak dapat mengakses Google Authenticator.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {backupCodes && backupCodes.length > 0 ? (
            <>
              <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl shadow-inner space-y-3">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  <span>Tersedia: {backupCodes.length} Kode</span>
                  <span className="text-emerald-400">1x Pakai / Kode</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {backupCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-center font-mono font-bold text-xs tracking-wider text-emerald-400 shadow-sm"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyBackupCodes}
                  className="flex-1 font-bold rounded-xl gap-2 border-slate-300"
                >
                  {copiedCodes ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedCodes ? "Tersalin" : "Salin Kode"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadBackupCodes}
                  className="flex-1 font-bold rounded-xl gap-2 border-slate-300"
                >
                  <Download className="w-4 h-4" /> Unduh (.txt)
                </Button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
              <p className="text-xs text-amber-800 font-bold">
                Semua kode cadangan telah terpakai atau belum dibuat.
              </p>
              <p className="text-[11px] text-amber-700">
                Silakan buat kode cadangan baru di bawah ini agar Anda tetap memiliki akses darurat.
              </p>
            </div>
          )}

          <div className="pt-2 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRegenerateCodes}
              disabled={regenerating}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 gap-1.5"
            >
              {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Buat Ulang Kode Baru
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="font-bold rounded-xl w-full sm:w-auto"
            >
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
