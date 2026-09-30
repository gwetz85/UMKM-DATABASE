"use client"

import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ShieldCheck, 
  QrCode, 
  Key, 
  Copy, 
  Check, 
  Download, 
  AlertTriangle, 
  Loader2, 
  Lock, 
  Smartphone,
  CheckCircle2,
  RefreshCw
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  generateTotpSecret, 
  getOtpAuthUrl, 
  getQrCodeImageUrl, 
  verifyTotpToken, 
  generateBackupCodes 
} from "@/lib/totp"
import { ref, update } from "firebase/database"

interface TwoFactorSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userKey: string
  userName: string
  database: any
  onSuccess: () => void
}

export function TwoFactorSetupDialog({
  open,
  onOpenChange,
  userKey,
  userName,
  database,
  onSuccess
}: TwoFactorSetupDialogProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [secret, setSecret] = useState<string>("")
  const [verificationCode, setVerificationCode] = useState<string>("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verifying, setVerifying] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [copiedKey, setCopiedKey] = useState<boolean>(false)
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false)
  const [qrLoaded, setQrLoaded] = useState<boolean>(false)

  // Generate new secret and backup codes on modal open
  useEffect(() => {
    if (open) {
      const newSecret = generateTotpSecret(20)
      const newBackupCodes = generateBackupCodes(6)
      setSecret(newSecret)
      setBackupCodes(newBackupCodes)
      setStep(1)
      setVerificationCode("")
      setCopiedKey(false)
      setCopiedCodes(false)
      setQrLoaded(false)
    }
  }, [open])

  const otpAuthUrl = secret ? getOtpAuthUrl(secret, userName || userKey, "SIMPU UMKM") : ""
  const qrImageUrl = otpAuthUrl ? getQrCodeImageUrl(otpAuthUrl, 240) : ""

  const handleCopyKey = () => {
    if (!secret) return
    navigator.clipboard.writeText(secret)
    setCopiedKey(true)
    toast({ title: "Tersalin", description: "Kunci rahasia telah disalin ke clipboard." })
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const handleCopyBackupCodes = () => {
    if (!backupCodes.length) return
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
    if (!backupCodes.length) return
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

  const handleVerifyStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Kode Tidak Lengkap",
        description: "Masukkan 6 digit angka dari aplikasi Authenticator."
      })
      return
    }

    setVerifying(true)
    try {
      const isValid = await verifyTotpToken(verificationCode, secret, 1)
      if (isValid) {
        toast({
          title: "Verifikasi Berhasil",
          description: "Kode valid! Silakan simpan kode cadangan Anda di langkah berikutnya."
        })
        setStep(2)
      } else {
        toast({
          variant: "destructive",
          title: "Kode Tidak Valid",
          description: "Kode salah atau kedaluwarsa. Pastikan jam pada perangkat Anda disetel otomatis dan coba lagi."
        })
      }
    } catch (err: any) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Kesalahan",
        description: err.message || "Gagal memverifikasi kode."
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleFinalizeEnable = async () => {
    if (!database || !userKey || !secret) return
    setSaving(true)

    try {
      const userRef = ref(database, `system_users/${userKey}`)
      await update(userRef, {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
        twoFactorMethod: "totp",
        twoFactorEnabledAt: new Date().toISOString()
      })

      toast({
        title: "2FA Berhasil Diaktifkan!",
        description: "Akun Anda kini terlindungi dengan verifikasi dua langkah Google Authenticator."
      })
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error("Gagal mengaktifkan 2FA:", err)
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan saat menyimpan pengaturan 2FA ke database."
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase text-slate-800">
                Aktivasi 2FA (Google Authenticator)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                {step === 1 ? "Langkah 1 dari 2: Pindai QR Code & Verifikasi" : "Langkah 2 dari 2: Simpan Kode Cadangan"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={handleVerifyStep1} className="space-y-6 pt-2">
            {/* Step 1 instructions */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed font-medium">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Buka aplikasi <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, atau aplikasi TOTP lainnya di ponsel Anda.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed font-medium">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Pindai QR Code di bawah ini, atau masukkan kunci rahasia secara manual jika kamera tidak dapat memindai.
                </span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="relative w-56 h-56 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border">
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="QR Code 2FA"
                    className="w-full h-full object-contain p-2"
                    onLoad={() => setQrLoaded(true)}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" /> Menyiapkan QR Code...
                  </div>
                )}
              </div>

              {/* Secret Key manual */}
              <div className="w-full pt-1">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">Kunci Rahasia Manual</Label>
                <div className="mt-1 flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                  <Key className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-xs font-bold text-slate-800 tracking-wider truncate flex-1">
                    {secret}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyKey}
                    className="h-7 px-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg gap-1"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey ? "Disalin" : "Salin"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Verification code input */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed font-medium">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <Label htmlFor="verificationCode" className="font-bold text-slate-800 text-xs pt-0.5">
                  Masukkan 6 Digit Kode Verifikasi dari Aplikasi:
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-12 text-center text-2xl font-mono font-black tracking-[0.3em] rounded-xl border-slate-300 focus-visible:ring-primary"
                  autoFocus
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 italic text-center">
                Kode berganti setiap 30 detik pada aplikasi Authenticator Anda.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="font-bold rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={verifying || verificationCode.length !== 6}
                className="font-bold rounded-xl bg-primary hover:bg-primary/90 text-white min-w-[140px]"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memeriksa...
                  </>
                ) : (
                  <>
                    Verifikasi Kode <Check className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Step 2: Backup Codes */}
            <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-amber-900 tracking-wide">
                  PENTING: Simpan Kode Cadangan
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  Jika Anda kehilangan ponsel atau aplikasi Authenticator terhapus, Anda dapat menggunakan kode-kode berikut untuk login. Setiap kode hanya berlaku <strong>1 kali pakai</strong>.
                </p>
              </div>
            </div>

            {/* Backup codes grid */}
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl shadow-inner space-y-3">
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 text-center">
                Daftar Kode Cadangan (6 Kode)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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

            {/* Action buttons to copy / download */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyBackupCodes}
                className="flex-1 font-bold rounded-xl gap-2 border-slate-300"
              >
                {copiedCodes ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedCodes ? "Kode Disalin" : "Salin Semua Kode"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadBackupCodes}
                className="flex-1 font-bold rounded-xl gap-2 border-slate-300"
              >
                <Download className="w-4 h-4" /> Unduh Kode (.txt)
              </Button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200/80 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Setelah menekan tombol di bawah, 2FA akan langsung aktif pada akun Anda.
              </span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                className="font-bold rounded-xl text-slate-600"
                disabled={saving}
              >
                Kembali
              </Button>
              <Button
                type="button"
                onClick={handleFinalizeEnable}
                disabled={saving}
                className="font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengaktifkan...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-1.5" /> Selesai & Aktifkan 2FA
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
