"use client"

import { useState } from "react"
import { useDatabase, useUser, useMemoFirebase, useObject } from "@/firebase"
import { ref, get, set } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, RefreshCcw, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function AdminSyncPage() {
  const { user } = useUser()
  const database = useDatabase()
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [log, setLog] = useState<string[]>([])
  const [results, setResults] = useState<any>(null)

  // Admin Check
  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole } = useObject(adminRef)
  
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  const addLog = (msg: string) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])

  const handleSync = async () => {
    if (!database || !isAdmin) return
    
    setStatus("loading")
    setLog([])
    addLog("Memulai sinkronisasi...")

    try {
      const actorsRef = ref(database, 'businessActors')
      addLog("Mengambil data dari 'businessActors'...")
      const snapshot = await get(actorsRef)
      
      if (!snapshot.exists()) {
        addLog("Data pelaku usaha kosong.")
        setStatus("success")
        return
      }

      const stats = {
        totalActors: 0,
        gender: { 'Laki-laki': 0, 'Perempuan': 0, unknown: 0 },
        status: { pending: 0, verified: 0, rejected: 0, finish: 0 },
        detailedStatus: { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 },
        kelurahan: {} as Record<string, number>,
        coordinator: {} as Record<string, number>,
        lastUpdated: new Date().toISOString()
      }

      let count = 0
      let fixCount = 0
      const updates: Record<string, any> = {}

      snapshot.forEach((child) => {
        const actor = child.val()
        stats.totalActors++
        
        // Status counts
        const s = actor.status || 'pending'
        const isCancelDinas = (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(actor.alasanCancelDinas)
        const isRejected = s === 'rejected' || isCancelDinas
        const isVerified = ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish'].includes(s) && !isCancelDinas

        if (isVerified) {
          stats.status.verified++

          if (s === 'lpj_pending') stats.detailedStatus.survey++
          if (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Lolos' && !actor.berkasDinasVerified) stats.detailedStatus.verifikasi++
          if (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Lolos' && actor.berkasDinasVerified) {
            stats.detailedStatus.hasilVerifikasi = (stats.detailedStatus.hasilVerifikasi || 0) + 1
          }
          if (s === 'bank_pending') stats.detailedStatus.verifikasi++
          if (s === 'finish' && actor.readyForLPJ && !actor.lpjNominal) stats.detailedStatus.lpj++
          if (s === 'finish' && (!actor.readyForLPJ || actor.lpjNominal)) stats.detailedStatus.selesai++
          
          if (actor.coordinator) {
            const coord = actor.coordinator.toUpperCase().trim()
            stats.coordinator[coord] = (stats.coordinator[coord] || 0) + 1
            
            if (actor.coordinator !== coord) {
              updates[`${child.key}/coordinator`] = coord
              fixCount++
            }
          }

          if (actor.kelurahan) {
            const k = actor.kelurahan.toUpperCase().trim()
            stats.kelurahan[k] = (stats.kelurahan[k] || 0) + 1
          }
        } else if (isRejected) {
          stats.status.rejected++
        } else {
          stats.status.pending++
        }

        // Gender counts
        const gender = actor.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki'
        stats.gender[gender]++
        
        count++
      })

      addLog(`Berhasil memproses ${count} data.`)
      setResults(stats)

      if (fixCount > 0) {
        addLog(`Memperbaiki format nama koordinator pada ${fixCount} data...`)
        const { update } = await import("firebase/database")
        await update(actorsRef, updates)
      }

      addLog("Memperbarui node 'system_stats'...")
      await set(ref(database, 'system_stats'), stats)
      
      addLog("Sinkronisasi SELESAI.")
      setStatus("success")
    } catch (err) {
      console.error(err)
      addLog(`ERROR: ${String(err)}`)
      setStatus("error")
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold">Akses Dibatasi</h1>
        <p>Hanya Administrator yang dapat melakukan sinkronisasi data.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-primary" />
        <h1 className="text-3xl font-black text-primary uppercase flex items-center gap-3">
          <RefreshCcw className={status === "loading" ? "animate-spin" : ""} /> SINKRONISASI DATA PUSAT
        </h1>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-primary text-white p-6">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> Tool Pemulihan Statistik
          </CardTitle>
          <p className="text-primary-foreground/80 text-sm font-medium">
            Gunakan tool ini jika angka pada Dashboard atau kuota Koordinator tidak sesuai dengan jumlah data yang sebenarnya.
          </p>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={handleSync} 
              disabled={status === "loading"}
              className="bg-primary hover:bg-primary/90 h-16 px-10 text-lg font-black rounded-2xl shadow-lg shadow-primary/20"
            >
              {status === "loading" ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <RefreshCcw className="w-6 h-6 mr-3" />}
              MULAI SINKRONISASI DATA
            </Button>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 font-mono text-xs text-emerald-400 min-h-[200px] overflow-y-auto space-y-1 shadow-inner">
            {log.length === 0 && <div className="text-slate-500 italic">Siap untuk melakukan sinkronisasi...</div>}
            {log.map((line, i) => <div key={i}>{line}</div>)}
            {status === "success" && (
               <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                 <p className="text-emerald-500 font-black uppercase mb-2">HASIL AKHIR:</p>
                 <pre className="text-[10px] text-emerald-300">
                   {JSON.stringify(results, null, 2)}
                 </pre>
               </div>
            )}
          </div>

          {status === "success" && (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex items-center gap-4 animate-in fade-in zoom-in duration-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <div>
                <h3 className="font-black text-emerald-900 uppercase">BERHASIL DISINKRONKAN!</h3>
                <p className="text-emerald-700 text-sm font-medium">Angka pada Dashboard dan kuota Koordinator sekarang sudah akurat sesuai database.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
