"use client"

import { useState, useMemo } from "react"
import { useUser, useDatabase, useMemoFirebase, useList } from "@/firebase"
import { ref } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Printer, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { BusinessActor } from "../lib/types"
import { generateLPJReceipt } from "@/lib/pdf-generator"
import { useToast } from "@/hooks/use-toast"

export default function LPJReceiptPage() {
  const { user } = useUser()
  const database = useDatabase()
  const { toast } = useToast()
  
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")

  const actorsRef = useMemoFirebase(() => database ? ref(database, 'businessActors') : null, [database])
  const { data: allActors, isLoading } = useList<BusinessActor>(actorsRef)

  const coordinators = useMemo(() => {
    if (!allActors) return []
    const names = new Set<string>()
    allActors.forEach(a => {
      if (a.coordinator) names.add(a.coordinator.toUpperCase().trim())
    })
    return Array.from(names).sort()
  }, [allActors])

  const filteredActors = useMemo(() => {
    if (!allActors || !selectedCoordinator) return []
    return allActors
      .filter(a => a.coordinator?.toUpperCase().trim() === selectedCoordinator)
      .filter(a => (a.status === 'verified_actor' || a.status === 'bank_pending' || a.status === 'lpj_ready' || a.status === 'finished'))
      .filter(a => 
        (a.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.nik || "").includes(searchQuery) ||
        (a.registrationCode || "").includes(searchQuery)
      )
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [allActors, selectedCoordinator, searchQuery])

  const handlePrint = () => {
    if (filteredActors.length === 0) {
      toast({ variant: "destructive", title: "Gagal", description: "Tidak ada data untuk dicetak." })
      return
    }
    generateLPJReceipt(selectedCoordinator, filteredActors)
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">Tanda Terima LPJ</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">Generated tabel penyerahan LPJ per Koordinator.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-none shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase text-slate-700 flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" /> Filter Koordinator
            </CardTitle>
            <CardDescription>Pilih koordinator untuk menampilkan daftar pelaku usaha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilih Koordinator</label>
              <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator}>
                <SelectTrigger className="h-12 border-slate-200 rounded-xl focus:ring-primary/20">
                  <SelectValue placeholder="--- PILIH KOORDINATOR ---" />
                </SelectTrigger>
                <SelectContent>
                  {coordinators.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCoordinator && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cari di Daftar</label>
                <Input 
                  placeholder="Nama / NIK / Reg ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 border-slate-200 rounded-xl"
                />
              </div>
            )}

            <Button 
              disabled={!selectedCoordinator || filteredActors.length === 0}
              onClick={handlePrint}
              className="w-full h-12 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <Printer className="w-5 h-5 mr-2" /> Cetak Tanda Terima
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-black uppercase text-slate-700">Daftar Pelaku Usaha</CardTitle>
                <CardDescription>
                  {selectedCoordinator ? `Koordinator: ${selectedCoordinator}` : "Silakan pilih koordinator"}
                </CardDescription>
              </div>
              {selectedCoordinator && (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl font-black text-xl">
                  {filteredActors.length}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : !selectedCoordinator ? (
              <div className="p-20 text-center text-slate-400 font-medium">
                Pilih Koordinator untuk melihat data
              </div>
            ) : filteredActors.length === 0 ? (
              <div className="p-20 text-center text-slate-400 font-medium">
                Tidak ada data pelaku usaha yang ditemukan
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="w-12 text-center font-black text-slate-500 text-[10px] uppercase">No</TableHead>
                      <TableHead className="w-32 font-black text-slate-500 text-[10px] uppercase">Reg ID</TableHead>
                      <TableHead className="font-black text-slate-500 text-[10px] uppercase">Nama Lengkap</TableHead>
                      <TableHead className="w-40 font-black text-slate-500 text-[10px] uppercase">NIK</TableHead>
                      <TableHead className="font-black text-slate-500 text-[10px] uppercase text-center w-20">Ceklist</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActors.map((actor, idx) => (
                      <TableRow key={actor.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="text-center font-mono text-slate-400 text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-mono font-bold text-slate-700 text-xs">{actor.registrationCode || "-"}</TableCell>
                        <TableCell>
                          <div className="font-black text-slate-800 uppercase text-xs">{actor.fullName}</div>
                          <div className="text-[9px] text-muted-foreground uppercase">{actor.address?.substring(0, 40)}...</div>
                        </TableCell>
                        <TableCell className="font-mono text-slate-600 text-xs">{actor.nik}</TableCell>
                        <TableCell className="text-center">
                          <div className="w-6 h-6 border-2 border-slate-200 rounded-md mx-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
