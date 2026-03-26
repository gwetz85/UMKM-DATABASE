"use client"

import { useState, useMemo } from "react"
import { useMemoFirebase, useList, useUser, useDatabase } from "@/firebase"
import { ref } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Loader2, Search, CreditCard, Building2, User, MapPin, ChevronRight } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { cn } from "@/lib/utils"

const BANK_LIST = [
  "BCA", "BNI", "BRI", "BRK", "MANDIRI", "PANIN", "OCBC", "DANAMON", "BUKOPIN", "BTN"
]

export default function RekeningBankPage() {
  const { user, isUserLoading } = useUser()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")

  const memoQuery = useMemoFirebase(() => {
    if (!database || !user) return null
    return ref(database, 'businessActors')
  }, [database, user])

  const { data: allData, isLoading } = useList<BusinessActor>(memoQuery)

  const filteredAndGroupedData = useMemo(() => {
    if (!allData) return {}

    // Filter actors who are verified (lpj_pending or finish)
    const verifiedActors = allData.filter(a => 
      (a.status === 'lpj_pending' || a.status === 'finish') &&
      (
        a.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.bankNumber?.includes(searchQuery) ||
        a.businessName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )

    // Grouping by Bank Name
    const groups: Record<string, BusinessActor[]> = {}
    
    // Initialize groups from BANK_LIST to ensure they appear even if empty (or we can skip empty ones)
    // The user said "Menu ini menampilkan Nama Bank dan List Nama", so I'll show only those with data or all from list?
    // I'll show all from the list that have at least one actor.
    
    verifiedActors.forEach(actor => {
      const bank = actor.bankName?.toUpperCase().trim() || "LAINNYA"
      // Find matching bank from our official list
      const officialBank = BANK_LIST.find(b => bank.includes(b)) || "LAINNYA"
      
      if (!groups[officialBank]) {
        groups[officialBank] = []
      }
      groups[officialBank].push(actor)
    })

    return groups
  }, [allData, searchQuery])

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div className="space-y-1 relative">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline text-gradient uppercase drop-shadow-sm flex items-center gap-3">
            <CreditCard className="w-8 h-8 md:w-12 md:h-12 text-primary" /> Rekening Bank
          </h1>
          <p className="text-xs md:text-sm text-slate-600 font-semibold">
            Daftar rekening pelaku usaha yang telah terverifikasi, dikelompokkan per Bank.
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Cari Nama / Rekening..." 
            className="pl-10 h-11 bg-white/50 backdrop-blur-sm border-primary/20 focus-visible:ring-primary rounded-xl shadow-inner font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-bold animate-pulse uppercase tracking-widest text-xs">Memuat Data Rekening...</p>
          </div>
        ) : Object.keys(filteredAndGroupedData).length > 0 ? (
          BANK_LIST.concat(["LAINNYA"]).map(bankName => {
            const actors = filteredAndGroupedData[bankName]
            if (!actors || actors.length === 0) return null

            return (
              <div key={bankName} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 px-2">
                  <div className="bg-primary text-white p-2 rounded-xl shadow-lg shadow-primary/20">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{bankName}</h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{actors.length} Pelaku Usaha</p>
                  </div>
                </div>

                <Card className="glass border-none shadow-xl overflow-hidden rounded-3xl">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-b-slate-100">
                          <TableHead className="w-[200px] font-black uppercase text-[10px] tracking-widest py-4 pl-6">Nomor Rekening</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Nama Pelaku Usaha</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Alamat Lengkap</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {actors.map((actor) => (
                          <TableRow key={actor.id} className="group hover:bg-primary/5 transition-colors border-b-slate-50">
                            <TableCell className="font-mono text-base font-black text-primary py-4 pl-6">
                              {actor.bankNumber || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-800 uppercase text-sm leading-tight flex items-center gap-2">
                                  {actor.fullName}
                                  {actor.status === 'finish' && (
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="Selesai" />
                                  )}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{actor.businessName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <div className="flex items-start gap-2 py-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                                <span className="text-xs font-semibold text-slate-600 leading-relaxed line-clamp-2">
                                  {actor.address}, {actor.kelurahan}, {actor.kecamatan}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )
          })
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-4 glass rounded-3xl border-dashed border-2 border-slate-200">
            <div className="bg-slate-100 p-6 rounded-full">
              <CreditCard className="w-12 h-12 text-slate-300" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-xl text-slate-800 uppercase">Tidak Ada Data</h3>
              <p className="text-sm text-muted-foreground font-medium">Belum ada data rekening yang terverifikasi untuk ditampilkan.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
