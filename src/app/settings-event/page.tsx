"use client"

import { useState, useEffect } from "react"
import { useDatabase, useUser, useObject, useMemoFirebase } from "@/firebase"
import { ref, update } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Save, Loader2, Info, AlertTriangle, Plus, Trash2, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface EventItem {
  id: string
  description: string
  startDate: string
  endDate: string
  enabled: boolean
}

export default function EventSettingsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [loading, setLoading] = useState(false)
  
  const [events, setEvents] = useState<EventItem[]>([])

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
      if (eventInfo.events && Array.isArray(eventInfo.events)) {
        setEvents(eventInfo.events)
      } else if (eventInfo.description || eventInfo.date || eventInfo.startDate) {
        // Porting data lama
        setEvents([{
          id: "legacy_event",
          description: eventInfo.description || "",
          startDate: eventInfo.startDate || eventInfo.date || "",
          endDate: eventInfo.endDate || "",
          enabled: eventInfo.enabled ?? true
        }])
      } else {
        setEvents([])
      }
    }
  }, [eventInfo])

  const handleSave = async () => {
    if (!database) return
    
    setLoading(true)
    try {
      await update(ref(database, 'settings/event_info'), {
        events: events,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || user?.uid
      })
      
      toast({ 
        title: "Daftar Event Diperbarui", 
        description: "Antrean event mendatang telah berhasil disimpan." 
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

  const addEvent = () => {
    setEvents([...events, {
      id: Date.now().toString(),
      description: "",
      startDate: "",
      endDate: "",
      enabled: true
    }])
  }

  const removeEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id))
  }

  const updateEvent = (id: string, field: keyof EventItem, value: any) => {
    setEvents(events.map(e => e.id === id ? { ...e, [field]: value } : e))
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
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in-up duration-700 pb-24">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <h1 className="text-3xl md:text-4xl font-black text-primary font-headline uppercase tracking-tight text-stroke-thin">Antrean Event</h1>
        </div>
        <p className="text-muted-foreground font-medium text-sm md:text-base">Kelola jadwal event yang akan datang. Sistem otomatis menampilkan event terdekat secara berurutan.</p>
      </div>

      <div className="flex justify-between items-center bg-primary/5 p-4 rounded-2xl border border-primary/10">
         <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary opacity-60" />
            <div>
               <h3 className="font-bold text-primary uppercase text-sm">Prinsip Kerja Otomatis</h3>
               <p className="text-xs text-slate-500 font-medium">Event yang waktu END-nya telah lewat akan otomatis di-*skip* masuk ke event aktif berikutnya.</p>
            </div>
         </div>
         <Button onClick={addEvent} className="font-bold shadow-md hover:scale-105 transition-transform" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Tambah Event Baru
         </Button>
      </div>

      <div className="grid gap-6">
        {events.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
             <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
             <h3 className="text-slate-500 font-bold">Belum ada jadwal event.</h3>
             <p className="text-slate-400 text-sm mt-1 mb-4">Tambahkan event khusus untuk memulai hitung mundur.</p>
             <Button onClick={addEvent} variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5">
                <Plus className="w-4 h-4 mr-2" /> Mulai Buat Event
             </Button>
          </div>
        ) : (
          events.map((event, index) => (
            <Card key={event.id} className={`border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden transition-all ${!event.enabled ? 'opacity-50 grayscale bg-slate-50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-900/50 backdrop-blur-xl'}`}>
              {!event.enabled && (
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-300" />
              )}
              {event.enabled && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-500 to-amber-500" />
              )}
              
              <CardHeader className="pb-4 pt-6">
                <div className="flex justify-between items-start">
                   <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                         <Calendar className={`w-5 h-5 ${event.enabled ? 'text-primary' : 'text-slate-400'}`} /> 
                         Jadwal Event #{index + 1}
                      </CardTitle>
                      <CardDescription>Atur informasi khusus untuk jadwal ini.</CardDescription>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => removeEvent(event.id)} className="text-rose-500 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="w-5 h-5" />
                   </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase tracking-widest text-primary">Keterangan / Judul Event</Label>
                    <Textarea 
                      placeholder="Contoh: Gebyar UMKM 2026 - Pendaftaran Booth Terakhir!"
                      value={event.description}
                      onChange={(e) => updateEvent(event.id, 'description', e.target.value)}
                      className="min-h-[80px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-primary">Waktu Dimulai Event</Label>
                      <Input 
                        type="datetime-local"
                        value={event.startDate}
                        onChange={(e) => updateEvent(event.id, 'startDate', e.target.value)}
                        className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-sm"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-primary">Waktu Berakhir (Countdown Stop)</Label>
                      <Input 
                        type="datetime-local"
                        value={event.endDate}
                        onChange={(e) => updateEvent(event.id, 'endDate', e.target.value)}
                        className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button 
                       variant="outline"
                       onClick={() => updateEvent(event.id, 'enabled', !event.enabled)}
                       className={`w-full font-bold ${event.enabled ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50" : "border-rose-500 text-rose-600 hover:bg-rose-50"}`}
                    >
                      {event.enabled ? "✅ Event Sedang Aktif" : "❌ Event Dinonaktifkan"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

      </div>

      {/* Save Button Floating */}
      {events.length > 0 && (
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-12">
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="h-14 font-black px-12 rounded-full shadow-[0_10px_40px_-10px_rgba(37,99,235,0.5)] transition-all hover:scale-105 active:scale-95 bg-primary text-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3" />}
              SIMPAN SEMUA ANTREAN
            </Button>
         </div>
      )}
    </div>
  )
}
