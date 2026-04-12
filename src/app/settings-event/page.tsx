"use client"

import { useState, useEffect } from "react"
import { useDatabase, useUser, useObject, useMemoFirebase } from "@/firebase"
import { ref, update } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Save, Loader2, Info, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function EventSettingsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [loading, setLoading] = useState(false)
  
  // States for event info
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [isEnabled, setIsEnabled] = useState(true)

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])

  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  const eventSettingsRef = database ? ref(database, 'settings/event_info') : null
  const { data: eventInfo, isLoading: isEventLoading } = useObject(eventSettingsRef)

  useEffect(() => {
    if (eventInfo) {
      setDescription(eventInfo.description || "")
      setDate(eventInfo.date || "")
      setIsEnabled(eventInfo.enabled ?? true)
    }
  }, [eventInfo])

  const handleSave = async () => {
    if (!database) return
    
    setLoading(true)
    try {
      await update(ref(database, 'settings/event_info'), {
        description,
        date,
        enabled: isEnabled,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || user?.uid
      })
      
      toast({ 
        title: "Event Diperbarui", 
        description: "Informasi event mendatang telah berhasil disimpan." 
      })
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Gagal Menyimpan", 
        description: "Terjadi kesalahan saat menyimpan pengaturan event." 
      })
    } finally {
      setLoading(false)
    }
  }

  if (isAdminLoading || isEventLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>
            Halaman ini hanya dapat diakses oleh Administrator.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in-up duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-primary font-headline uppercase tracking-tight text-stroke-thin">Pengaturan Event</h1>
        <p className="text-muted-foreground font-medium">Kelola informasi event mendatang yang akan tampil di seluruh aplikasi.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Detail Event Mendatang
            </CardTitle>
            <CardDescription>Informasi ini akan muncul di banner tengah header aplikasi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="description" className="font-bold text-xs uppercase tracking-widest text-primary">Keterangan Event</Label>
                <Textarea 
                  id="description"
                  placeholder="Contoh: Gebyar UMKM 2026 - Pendaftaran Booth Terakhir!"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date" className="font-bold text-xs uppercase tracking-widest text-primary">Tanggal & Waktu Event</Label>
                <Input 
                  id="date"
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
                <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                  <Info className="w-3 h-3" /> Countdown akan otomatis aktif berdasarkan waktu yang Anda tentukan.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="w-full md:w-auto font-bold px-8 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  SIMPAN PERUBAHAN
                </Button>
                
                <Button 
                   variant="outline"
                   onClick={() => setIsEnabled(!isEnabled)}
                   className={isEnabled ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50" : "border-rose-500 text-rose-600 hover:bg-rose-50"}
                >
                  {isEnabled ? "Statut: Aktif" : "Status: Nonaktif"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-bold uppercase tracking-wider text-xs">Preview Banner</AlertTitle>
          <AlertDescription className="pt-4 flex flex-col items-center gap-4">
               <div className="w-full max-w-lg p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-white dark:border-slate-800 shadow-sm flex flex-col items-center gap-2">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{description || "CONTOH KETERANGAN EVENT"}</span>
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-primary">12</span>
                          <span className="text-[7px] font-bold text-slate-400 uppercase">Hari</span>
                      </div>
                      <span className="text-primary opacity-30 font-black">:</span>
                      <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-primary">05</span>
                          <span className="text-[7px] font-bold text-slate-400 uppercase">Jam</span>
                      </div>
                  </div>
               </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
