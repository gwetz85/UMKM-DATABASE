"use client"

import { useState, useEffect, useMemo } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, deleteDocumentNonBlocking, useObject, updateDocumentNonBlocking } from "@/firebase"
import { ref, push, set, query, update, orderByChild, equalTo, get } from "firebase/database"
import { logActivity, getDeviceType } from "@/lib/logger"
import { addTunasBangsaHeader } from "@/lib/pdf-header"
import { cn } from "@/lib/utils"
import { normalizeCoordinator } from "@/lib/coordinator-utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ShieldAlert, Loader2, BarChart3, UserPlus, Edit, Trash2, FileDown, RefreshCw, MessageCircle } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ConfirmDialog } from "@/components/confirm-dialog"

export default function KuotaKorlapDewanAktifPage() {
  const [mounted, setMounted] = useState(false)
  const { user, userProfile } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingData, setEditingData] = useState<any>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePending, setDeletePending] = useState<{ id: string; name: string } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])

  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)
  
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin' || userProfile?.role === 'superadmin'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'koordinator_kuotas')
  }, [database])

  const { data: kuotaData, isLoading } = useList(memoQuery)

  // Use pre-calculated system_stats for coordinator usage (ultra-fast, 1KB)
  const statsRef = useMemoFirebase(() => database ? ref(database, 'system_stats') : null, [database])
  const { data: systemStats } = useObject(statsRef)

  const combinedKuotaData = useMemo(() => {
    if (!kuotaData) return []
    
    const achievedMap = systemStats?.coordinator || {}
    const rekeningMap = systemStats?.coordinatorRekening || {}

    return kuotaData.filter(Boolean).map((item: any) => {
      const quota = item.quota || 0
      const rawName = item.name ? String(item.name).trim() : ''
      const nameUpper = rawName.toUpperCase()
      const nameNormalized = normalizeCoordinator(rawName).toUpperCase().trim()

      const achieved = (achievedMap[nameNormalized] !== undefined) ? achievedMap[nameNormalized] : (achievedMap[nameUpper] || 0)
      const rekeningInput = (rekeningMap[nameNormalized] !== undefined) ? rekeningMap[nameNormalized] : (rekeningMap[nameUpper] || 0)
      const remaining = quota - achieved
      return {
        ...item,
        quota,
        achieved,
        rekeningInput,
        remaining
      }
    }).sort((a: any, b: any) => {
      const nameA = (a.name || "").toLowerCase()
      const nameB = (b.name || "").toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }, [kuotaData, systemStats])

  const handleAddData = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!database) return

    const formData = new FormData(e.currentTarget)
    const rawName = formData.get("name") as string
    const name = (rawName || "").trim().toUpperCase()
    const quotaStr = formData.get("quota") as string
    const phone = formData.get("phone") as string
    const quota = parseInt(quotaStr, 10)

    if (!name || isNaN(quota)) return

    const newDataRef = push(ref(database, 'koordinator_kuotas'))
    set(newDataRef, {
      name,
      quota,
      phone: phone || '',
      addedAt: new Date().toISOString()
    }).then(() => {
      logActivity({
        query: `TAMBAH KUOTA KORLAP: ${name} (${quota})`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'KUOTA KOORDINATOR',
        userId: user?.email || user?.uid || 'Admin'
      })
      
      toast({ 
        title: "Kuota Ditambahkan", 
        description: `Data untuk ${name} berhasil disimpan.` 
      })
      setIsDialogOpen(false)
    }).catch((error) => {
      console.error("Firebase Error (Add):", error)
      toast({
        variant: "destructive",
        title: "Gagal Menambah Data",
        description: error.message || "Terjadi kesalahan sistem."
      })
    })
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingData || !database || isUpdating) return

    const formData = new FormData(e.currentTarget)
    const rawName = formData.get("name") as string
    const name = (rawName || "").trim().toUpperCase()
    const quotaStr = formData.get("quota") as string
    const phone = (formData.get("phone") as string || "").trim()
    const quota = parseInt(quotaStr, 10)

    if (!name || isNaN(quota)) {
      toast({
        variant: "destructive",
        title: "Data Tidak Lengkap",
        description: "Nama koordinator dan kuota wajib diisi."
      })
      return
    }

    setIsUpdating(true)
    try {
      const oldName = (editingData.name || "").trim().toUpperCase()
      const nameChanged = name !== oldName

      // 1. Update entry in koordinator_kuotas
      const dataRef = ref(database, `koordinator_kuotas/${editingData.id}`)
      await set(dataRef, {
        name,
        quota,
        phone,
        addedAt: editingData.addedAt || new Date().toISOString()
      })

      let updatedCount = 0

      // 2. Cascade rename to businessActors if name was changed
      if (nameChanged && oldName) {
        const { get, query, orderByChild, equalTo, update } = await import("firebase/database")
        const updates: Record<string, any> = {}

        const q = query(
          ref(database, 'businessActors'),
          orderByChild('coordinator'),
          equalTo(oldName)
        )
        const snap = await get(q)
        if (snap.exists()) {
          snap.forEach((child) => {
            updates[`businessActors/${child.key}/coordinator`] = name
          })
        }

        const rawOld = (editingData.name || "").trim()
        if (rawOld && rawOld !== oldName) {
          const q2 = query(
            ref(database, 'businessActors'),
            orderByChild('coordinator'),
            equalTo(rawOld)
          )
          const snap2 = await get(q2)
          if (snap2.exists()) {
            snap2.forEach((child) => {
              updates[`businessActors/${child.key}/coordinator`] = name
            })
          }
        }

        if (Object.keys(updates).length > 0) {
          await update(ref(database), updates)
          updatedCount = Object.keys(updates).length
        }

        // Recalculate system_stats so coordinator counts update immediately
        const { recalculateAndSaveSystemStats } = await import("@/lib/stats-service")
        await recalculateAndSaveSystemStats(database)
      }

      logActivity({
        query: nameChanged
          ? `UBAH NAMA KORLAP: "${oldName}" → "${name}" (${updatedCount} data diperbarui)`
          : `UPDATE KUOTA KORLAP: ${name} (${quota})`,
        results: "Berhasil",
        device: getDeviceType(navigator.userAgent),
        source: 'Web',
        method: 'KUOTA KOORDINATOR',
        userId: user?.email || user?.uid || 'Admin'
      })

      toast({
        title: "Berhasil Diperbarui",
        description: nameChanged && updatedCount > 0
          ? `Nama koordinator diubah ke "${name}". ${updatedCount} data pelaku usaha ikut diperbarui.`
          : `Target kuota untuk ${name} berhasil disimpan.`
      })

      setEditingData(null)
    } catch (error: any) {
      console.error("Firebase Error (Update):", error)
      toast({
        variant: "destructive",
        title: "Gagal Update Data",
        description: error.message || "Terjadi kesalahan sistem."
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = (id: string, name: string) => {
    if (!database) return
    setDeletePending({ id, name })
    setShowDeleteDialog(true)
  }

  const confirmDelete = () => {
    if (!database || !deletePending) return
    deleteDocumentNonBlocking(ref(database, `koordinator_kuotas/${deletePending.id}`))
    
    logActivity({
      query: `HAPUS KUOTA KORLAP: ${deletePending.name}`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'KUOTA KOORDINATOR',
      userId: user?.email || user?.uid || 'Admin'
    })
    
    toast({ title: "Berhasil Dihapus", description: "Data telah dihapus dari sistem." })
    setDeletePending(null)
  }

  const handleSync = async () => {
    if (!database || isSyncing) return
    setIsSyncing(true)
    try {
      const { recalculateAndSaveSystemStats } = await import("@/lib/stats-service")
      await recalculateAndSaveSystemStats(database)
      toast({
        title: "Sinkronisasi Berhasil",
        description: "Data kuota dan rekening input per koordinator telah berhasil disinkronkan."
      })
    } catch (err: any) {
      console.error("Gagal sinkronisasi:", err)
      toast({
        variant: "destructive",
        title: "Gagal Sinkronisasi",
        description: err?.message || "Terjadi kesalahan saat menyinkronkan data."
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleExportPDF = () => {
    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(({ default: autoTable }) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()

        // Header Tunas Bangsa
        addTunasBangsaHeader(doc)
        
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(0)
        doc.text('DATA KUOTA USULAN', pageWidth - 14, 17, { align: 'right' })
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 14, 21, { align: 'right' })
        doc.setTextColor(0)

        const tableBody = combinedKuotaData.map((item: any, index: number) => [
          index + 1,
          item.name || '-',
          item.quota,
          item.achieved,
          item.rekeningInput,
          item.remaining,
          item.quota > 0 ? `${((item.achieved / item.quota) * 100).toFixed(1)}%` : '0%'
        ])

        // Footer row
        const totalRemaining = totalQuota - totalAchieved
        const totalPct = totalQuota > 0 ? `${((totalAchieved / totalQuota) * 100).toFixed(1)}%` : '0%'
        tableBody.push(['', 'TOTAL', totalQuota, totalAchieved, totalRekeningInput, totalRemaining, totalPct] as any)

        // A4 portrait usable width: 210 - 14 (left) - 14 (right) = 182mm
        // Fixed cols: No=10, Kuota=18, Tercapai=18, Rekening=20, Sisa=18, %=18 → 102mm
        // Name col = 182 - 102 = 80mm
        const margin = 14
        const usableWidth = pageWidth - margin * 2
        const fixedWidth = 10 + 18 + 18 + 20 + 18 + 18
        const nameWidth = usableWidth - fixedWidth

        autoTable(doc, {
          startY: 30,
          margin: { left: margin, right: margin },
          tableWidth: usableWidth,
          head: [['No', 'Nama Koordinator', 'Kuota', 'Tercapai', 'Rek. Input', 'Sisa', '% Tercapai']],
          body: tableBody,
          styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.5, halign: 'center' },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { halign: 'left', cellWidth: nameWidth },
            2: { cellWidth: 18 },
            3: { cellWidth: 18 },
            4: { cellWidth: 20 },
            5: { cellWidth: 18 },
            6: { cellWidth: 18 },
          },
          didParseCell: (data: any) => {
            // Style the last (total) row
            if (data.row.index === tableBody.length - 1) {
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fillColor = [241, 245, 249]
            }
          },
          didDrawCell: (data: any) => {
            // Color remaining cell: red if <= 0
            if (data.column.index === 5 && data.section === 'body' && data.row.index < combinedKuotaData.length) {
              const item = combinedKuotaData[data.row.index]
              if (item.remaining <= 0) {
                data.cell.styles.textColor = [220, 38, 38]
              }
            }
          }
        })

        doc.save(`Kuota_Koordinator_${new Date().toISOString().slice(0, 10)}.pdf`)
        
        logActivity({
          query: `CETAK PDF: Kuota Korlap`,
          results: "Berhasil",
          device: getDeviceType(navigator.userAgent),
          source: 'Web',
          method: 'KUOTA KOORDINATOR',
          userId: user?.email || user?.uid || 'Admin'
        })
      })
    })
  }

  const totalQuota = useMemo(() => {
    return combinedKuotaData.reduce((acc: number, curr: any) => acc + curr.quota, 0)
  }, [combinedKuotaData])

  const totalAchieved = useMemo(() => {
    return combinedKuotaData.reduce((acc: number, curr: any) => acc + curr.achieved, 0)
  }, [combinedKuotaData])

  const totalRekeningInput = useMemo(() => {
    return combinedKuotaData.reduce((acc: number, curr: any) => acc + curr.rekeningInput, 0)
  }, [combinedKuotaData])

  if (!mounted) return null

  if (isAdminLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground">Anda tidak memiliki izin Administrator untuk mengakses menu ini.</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
          <div>
            <h1 className="text-3xl font-bold text-primary font-headline flex items-center gap-3">
              <BarChart3 className="w-8 h-8" />
              Kuota USULAN
            </h1>
            <p className="text-muted-foreground font-medium">Pengelolaan target data pencapaian masing-masing usulan.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
            className="font-bold border-blue-200 text-blue-600 hover:bg-blue-50 shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? "Menyinkronkan..." : "Sinkronkan Data"}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            className="font-bold border-red-200 text-red-600 hover:bg-red-50 shadow-sm"
          >
            <FileDown className="w-4 h-4 mr-2" /> Ekspor PDF
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 shadow-lg font-bold">
                <UserPlus className="w-4 h-4 mr-2" /> Tambah Kuota Baru
              </Button>
            </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddData}>
              <DialogHeader>
                <DialogTitle className="text-primary font-black uppercase">Tambah Data Kuota</DialogTitle>
                <CardDescription>Masukkan nama koordinator dan jumlah target kuotanya.</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="font-bold">Nama Koordinator</Label>
                  <Input name="name" placeholder="Nama Lengkap Koordinator" required />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Nomor Ponsel</Label>
                  <Input name="phone" type="tel" placeholder="08xxxxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Jumlah Kuota</Label>
                  <Input name="quota" type="number" min="0" placeholder="100" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full font-bold">Simpan Data</Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900 rounded-3xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {combinedKuotaData.map((item: any, index: number) => (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase leading-tight">
                            {item.name}
                          </h4>
                          {item.phone && (
                            <div className="pt-0.5">
                              <a
                                href={(() => {
                                  let clean = String(item.phone).replace(/\D/g, "");
                                  if (clean.startsWith("0")) clean = "62" + clean.slice(1);
                                  else if (!clean.startsWith("62")) clean = "62" + clean;
                                  return `https://wa.me/${clean}`;
                                })()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] hover:underline"
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20" />
                                <span>{item.phone}</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingData(item)}
                          className="h-8 px-2.5 text-[10px] font-bold border-primary/20 hover:bg-primary/5 text-primary rounded-xl gap-1"
                        >
                          <Edit className="w-3 h-3" /> EDIT
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                          onClick={() => handleDelete(item.id, item.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Kuota</span>
                        <span className="font-black text-base text-slate-800 dark:text-slate-100">
                          {item.quota}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Tercapai</span>
                        <span className="font-black text-base text-slate-800 dark:text-slate-100">
                          {item.achieved}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Rekening</span>
                        <span className="font-black text-base text-slate-800 dark:text-slate-100">
                          {item.rekeningInput}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Sisa</span>
                        <span className="font-black text-base text-slate-800 dark:text-slate-100">
                          {item.remaining}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {combinedKuotaData.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground italic font-medium">
                    Belum ada data target kuota yang didaftarkan.
                  </div>
                )}

                {/* Mobile Total Summary */}
                {combinedKuotaData.length > 0 && (
                  <div className="p-4 bg-primary/5 border-t border-primary/10 space-y-2">
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block">
                      Total Keseluruhan Kuota
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Kuota</span>
                        <span className="font-black text-slate-800 dark:text-slate-100 text-base">{totalQuota}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Tercapai</span>
                        <span className="font-black text-slate-800 dark:text-slate-100 text-base">{totalAchieved}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Rekening</span>
                        <span className="font-black text-slate-800 dark:text-slate-100 text-base">{totalRekeningInput}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Sisa</span>
                        <span className="font-black text-slate-800 dark:text-slate-100 text-base">
                          {totalQuota - totalAchieved}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold uppercase text-[10px] w-[50px] text-center">No</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]">USULAN</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]">No. HP</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] text-center">Kuota USULAN</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] text-center">Tercapai</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] text-center">Rekening Input</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] text-center">Sisa</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combinedKuotaData.map((item: any, index: number) => (
                      <TableRow key={item.id} className="hover:bg-muted/10">
                        <TableCell className="font-bold text-slate-700 text-center">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          {item.name}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-600 text-xs">
                          {item.phone ? (
                            <a
                              href={(() => {
                                let clean = String(item.phone).replace(/\D/g, "");
                                if (clean.startsWith("0")) clean = "62" + clean.slice(1);
                                else if (!clean.startsWith("62")) clean = "62" + clean;
                                return `https://wa.me/${clean}`;
                              })()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800 transition-all active:scale-95"
                              title="Klik untuk membuka WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20" />
                              <span>{item.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </TableCell>
                         <TableCell className="text-center font-black text-lg text-slate-800 dark:text-slate-100">
                           {item.quota}
                         </TableCell>
                         <TableCell className="text-center font-black text-lg text-slate-800 dark:text-slate-100">
                           {item.achieved}
                         </TableCell>
                         <TableCell className="text-center font-black text-lg text-slate-800 dark:text-slate-100">
                           {item.rekeningInput}
                         </TableCell>
                         <TableCell className="text-center font-black text-lg text-slate-800 dark:text-slate-100">
                           {item.remaining}
                         </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingData(item)} className="h-8 text-[10px] font-bold border-primary/20 hover:bg-primary/5 text-primary">
                              <Edit className="w-3 h-3 mr-1" /> EDIT
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(item.id, item.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {combinedKuotaData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic font-medium">
                          Belum ada data target kuota yang didaftarkan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                      <TableCell colSpan={3} className="font-black text-slate-800 uppercase text-right text-xs pr-6">
                        Total Keseluruhan Kuota Data
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-900 dark:text-white text-xl">
                        {totalQuota}
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-900 dark:text-white text-xl">
                        {totalAchieved}
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-900 dark:text-white text-xl">
                        {totalRekeningInput}
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-900 dark:text-white text-xl">
                        {totalQuota - totalAchieved}
                        <span className="text-xs font-semibold text-slate-500 ml-1.5">
                          ({(totalQuota > 0 ? ((totalQuota - totalAchieved) / totalQuota) * 100 : 0).toFixed(1)}%)
                        </span>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shared Edit Dialog */}
      <Dialog open={!!editingData} onOpenChange={(open) => { if (!open && !isUpdating) setEditingData(null) }}>
        <DialogContent>
          {editingData && (
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle className="text-primary font-black uppercase">Edit Data Kuota</DialogTitle>
                <CardDescription>Ubah target kuota untuk {editingData.name}.</CardDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Nama Koordinator</Label>
                    <Input name="name" defaultValue={editingData.name} key={`name-${editingData.id}`} required disabled={isUpdating} />
                    <p className="text-[11px] text-muted-foreground">
                      Jika nama diubah, seluruh data pelaku usaha terkait akan otomatis diperbarui.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Nomor Ponsel</Label>
                    <Input name="phone" type="tel" defaultValue={editingData.phone || ''} key={`phone-${editingData.id}`} placeholder="08xxxxxxxxxx" disabled={isUpdating} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Jumlah Kuota</Label>
                    <Input name="quota" type="number" min="0" defaultValue={editingData.quota} key={`quota-${editingData.id}`} required disabled={isUpdating} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full font-bold" disabled={isUpdating}>
                  {isUpdating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan Perubahan...</>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        icon={<Trash2 className="w-6 h-6" />}
        title="Hapus Koordinator"
        description={`Hapus koordinator ${deletePending?.name ?? ""}?`}
        confirmText="Ya, Lanjutkan"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}