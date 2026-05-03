"use client"

import React, { useState, useEffect } from "react"
import { useDatabase, useUser } from "@/firebase"
import { ref, get, set, remove, push } from "firebase/database"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Plus, Trash2, Calendar, Clock, ArrowLeft } from "lucide-react"

export default function OfficeHoursSettingsPage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [openHour, setOpenHour] = useState("08:00")
  const [closeHourWeekday, setCloseHourWeekday] = useState("16:00")
  const [closeHourWeekend, setCloseHourWeekend] = useState("14:00")
  
  const [holidays, setHolidays] = useState<{ id: string, date: string, name: string }[]>([])
  const [newHolidayDate, setNewHolidayDate] = useState("")
  const [newHolidayName, setNewHolidayName] = useState("")

  useEffect(() => {
    const fetchSettings = async () => {
      if (!database || !user) return

      try {
        const settingsRef = ref(database, 'settings/office_hours')
        const snapshot = await get(settingsRef)
        
        if (snapshot.exists()) {
          const data = snapshot.val()
          if (data.openHour) setOpenHour(data.openHour)
          if (data.closeHourWeekday) setCloseHourWeekday(data.closeHourWeekday)
          if (data.closeHourWeekend) setCloseHourWeekend(data.closeHourWeekend)
          
          if (data.holidays) {
            const hList = Object.keys(data.holidays).map(key => ({
              id: key,
              ...data.holidays[key]
            }))
            // Sort by date
            hList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            setHolidays(hList)
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error)
      } finally {
        setLoading(false)
      }
    }

    if (!isUserLoading) fetchSettings()
  }, [database, user, isUserLoading])

  const handleSaveHours = async () => {
    if (!database) return
    setSaving(true)
    try {
      const updates = {
        openHour,
        closeHourWeekday,
        closeHourWeekend
      }
      // Update specific fields without overwriting holidays
      await set(ref(database, 'settings/office_hours/openHour'), openHour)
      await set(ref(database, 'settings/office_hours/closeHourWeekday'), closeHourWeekday)
      await set(ref(database, 'settings/office_hours/closeHourWeekend'), closeHourWeekend)
      
      toast({
        title: "Berhasil Disimpan",
        description: "Jam operasional berhasil diperbarui.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan saat menyimpan pengaturan."
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayName || !database) return

    setSaving(true)
    try {
      const holidaysRef = ref(database, 'settings/office_hours/holidays')
      const newRef = push(holidaysRef)
      await set(newRef, {
        date: newHolidayDate,
        name: newHolidayName
      })
      
      setHolidays(prev => [...prev, { id: newRef.key as string, date: newHolidayDate, name: newHolidayName }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
      setNewHolidayDate("")
      setNewHolidayName("")
      
      toast({
        title: "Hari Libur Ditambahkan",
        description: "Hari libur nasional berhasil didaftarkan.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal Menambahkan",
        description: "Terjadi kesalahan saat menambahkan hari libur."
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHoliday = async (id: string) => {
    if (!database) return
    
    try {
      await remove(ref(database, `settings/office_hours/holidays/${id}`))
      setHolidays(prev => prev.filter(h => h.id !== id))
      
      toast({
        title: "Dihapus",
        description: "Hari libur telah dihapus.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal Menghapus",
        description: "Terjadi kesalahan sistem."
      })
    }
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Pengaturan Operasional</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Atur Jam Buka dan Hari Libur Kantor</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <CardHeader>
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-emerald-600" />
            </div>
            <CardTitle className="uppercase tracking-tight font-black">Jam Operasional</CardTitle>
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Pengaturan Waktu Buka dan Tutup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-600">Jam Buka (Semua Hari)</Label>
              <Input 
                type="time" 
                value={openHour}
                onChange={(e) => setOpenHour(e.target.value)}
                className="font-mono text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-600">Jam Tutup (Senin - Jumat)</Label>
              <Input 
                type="time" 
                value={closeHourWeekday}
                onChange={(e) => setCloseHourWeekday(e.target.value)}
                className="font-mono text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-600">Jam Tutup (Sabtu)</Label>
              <Input 
                type="time" 
                value={closeHourWeekend}
                onChange={(e) => setCloseHourWeekend(e.target.value)}
                className="font-mono text-lg"
              />
            </div>
            
            <Button 
              onClick={handleSaveHours} 
              disabled={saving}
              className="w-full rounded-2xl h-12 text-xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Simpan Jam</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-rose-400 to-rose-600" />
          <CardHeader>
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-rose-600" />
            </div>
            <CardTitle className="uppercase tracking-tight font-black">Hari Libur Nasional</CardTitle>
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Tanggal Kantor Tutup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-600">Tanggal Libur</Label>
                <Input 
                  type="date" 
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-600">Keterangan / Nama Libur</Label>
                <Input 
                  placeholder="Cth: Hari Kemerdekaan RI"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="bg-white"
                />
              </div>
              <Button 
                onClick={handleAddHoliday}
                disabled={saving || !newHolidayDate || !newHolidayName}
                className="w-full mt-2"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" /> Tambah Libur
              </Button>
            </div>

            <div className="space-y-3 mt-6">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-600">Daftar Libur Terdaftar</Label>
              {holidays.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm font-bold uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-2xl">
                  Belum ada libur
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {holidays.map((holiday) => (
                    <div key={holiday.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-rose-100 bg-white transition-colors group">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-800">{holiday.name}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {new Date(holiday.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
