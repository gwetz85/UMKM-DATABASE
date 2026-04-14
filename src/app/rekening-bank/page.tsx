"use client"

import { useState, useMemo } from "react"
import { useTranslation } from "@/lib/i18n"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking } from "@/firebase"
import { ref } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Loader2, Search, CreditCard, Building2, User, MapPin, ChevronRight, Printer, Send, CheckCircle2 } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

const BANK_LIST = [
  "BCA", "BNI", "BRI", "BRK", "MANDIRI", "PANIN", "OCBC", "DANAMON", "BUKOPIN", "BTN"
]

export default function RekeningBankPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <RekeningBankContent />
    </Suspense>
  )
}

function RekeningBankContent() {
  const { t } = useTranslation()
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
  const [isForwarding, setIsForwarding] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const selectedBank = searchParams.get('bank')

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForProfile } = useList(userProfileRef)
  const userProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)
  const isKoordinator = userProfile?.role?.toLowerCase() === 'koordinator'

  const memoQuery = useMemoFirebase(() => {
    if (!database || !user) return null
    return ref(database, 'businessActors')
  }, [database, user])

  const { data: allData, isLoading } = useList<BusinessActor>(memoQuery)

  const filteredAndGroupedData = useMemo(() => {
    if (!allData) return {}

    // Filter actors who are verified (lpj_pending or finish)
    const verifiedActors = allData.filter(a => {
      const basicFilter = (a.status === 'finish') &&
        (
          a.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.bankNumber?.includes(searchQuery) ||
          a.businessName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      
      if (!basicFilter) return false;

      if (isKoordinator) {
        if (!a.coordinator || !userProfile?.fullName) return false;
        return a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase();
      }
      return true;
    })

    // Grouping by Bank Name
    const groups: Record<string, BusinessActor[]> = {}
    
    // Initialize groups from BANK_LIST to ensure they appear even if empty (or we can skip empty ones)
    // The user said "Menu ini menampilkan Nama Bank dan List Nama", so I'll show only those with data or all from list?
    // I'll show all from the list that have at least one actor.
    
    verifiedActors.forEach(actor => {
      const bank = actor.bankName?.toUpperCase().trim() || "LAINNYA"
      // Find matching bank from our official list
      const officialBank = BANK_LIST.find(b => bank.includes(b)) || "LAINNYA"
      
      // If a bank is selected in URL, only include that bank
      if (selectedBank && officialBank !== selectedBank.toUpperCase()) return

      if (!groups[officialBank]) {
        groups[officialBank] = []
      }
      groups[officialBank].push(actor)
    })

    return groups
  }, [allData, searchQuery, selectedBank])

  const handleForwardToLPJ = (bankName: string, actors: BusinessActor[]) => {
    if (!database) return
    
    // Only forward those who are not ready yet
    const targetActors = actors.filter(a => !a.readyForLPJ)
    if (targetActors.length === 0) {
      toast({ title: t('information'), description: t('all_data_forwarded_to_lpj') })
      return
    }

    if (confirm(t('confirm_forward_to_lpj', { count: targetActors.length, bank: bankName }))) {
      setIsForwarding(bankName)
      
      const now = new Date().toISOString()
      targetActors.forEach(actor => {
        const actorRef = ref(database, `businessActors/${actor.id}`)
        updateDocumentNonBlocking(actorRef, {
          readyForLPJ: true,
          lpjEntryDate: now,
          lpjNominal: null,
          lpjDoneAt: null
        })
      })

      toast({ title: t('successfully_forwarded'), description: t('data_sent_to_lpj_queue', { count: targetActors.length }) })
      setTimeout(() => setIsForwarding(null), 1000)
    }
  }

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
            <CreditCard className="w-8 h-8 md:w-12 md:h-12 text-primary" /> {selectedBank ? `${t('bank')} ${selectedBank}` : t('bank_accounts')}
          </h1>
          <p className="text-xs md:text-sm text-slate-600 font-semibold">
            {selectedBank ? t('bank_rekening_desc_selected', { bank: selectedBank }) : t('bank_rekening_desc')}
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input 
              placeholder="Cari..." 
              className="pl-9 h-10 bg-white/50 backdrop-blur-sm border-primary/20 focus-visible:ring-primary rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => window.print()}
            className="h-10 px-6 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Printer className="w-4 h-4" /> {t('print_data_btn')}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Print Only Header */}
        <div className="hidden print:block text-center space-y-1 mb-8">
          <h1 className="text-2xl font-black uppercase tracking-tight">{t('actor_data_title')}</h1>
          <h2 className="text-lg font-bold uppercase tracking-widest text-slate-800">
            {t('bank')} {selectedBank || t('all_banks')}
          </h2>
          <div className="w-full h-1 bg-black my-2" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t('printed_at')}: {new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-bold animate-pulse uppercase tracking-widest text-xs">{t('loading_bank_data')}</p>
          </div>
        ) : Object.keys(filteredAndGroupedData).length > 0 ? (
          BANK_LIST.concat(["LAINNYA"]).map(bankName => {
            const actors = filteredAndGroupedData[bankName]
            if (!actors || actors.length === 0) return null

            return (
              <div key={bankName} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 break-inside-avoid">
                <div className="flex items-center gap-3 px-2 print:px-0">
                  <div className="bg-primary text-white p-2 rounded-xl shadow-lg shadow-primary/20 print:hidden">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{bankName}</h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest print:hidden">{actors.length} {t('data_actor')}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={isForwarding === bankName || actors.every(a => a.readyForLPJ)}
                    onClick={() => handleForwardToLPJ(bankName, actors)}
                    className="h-8 rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-white font-bold text-[10px] px-3 gap-2 print:hidden"
                  >
                    {isForwarding === bankName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    {t('forward_to_lpj_btn')}
                  </Button>
                </div>

                <Card className="glass border-none shadow-xl overflow-hidden rounded-3xl print:shadow-none print:border-2 print:border-black print:rounded-none">
                  <CardContent className="p-0">
                    <Table className="print:border-collapse">
                      <TableHeader className="bg-slate-50/50 print:bg-slate-100">
                        <TableRow className="hover:bg-transparent border-b-slate-100 print:border-b-2 print:border-black">
                          <TableHead className="w-[50px] font-black uppercase text-[10px] tracking-widest py-4 pl-6 print:text-black print:border-r-2 print:border-black">NO</TableHead>
                          <TableHead className="w-[180px] font-black uppercase text-[10px] tracking-widest py-4 print:text-black print:border-r-2 print:border-black text-center">{t('bank_account_number')}</TableHead>
                          <TableHead className="w-[120px] font-black uppercase text-[10px] tracking-widest py-4 print:text-black print:border-r-2 print:border-black text-center">{t('bank_name_label')}</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest py-4 print:text-black print:border-r-2 print:border-black text-center">{t('full_name')}</TableHead>
                          <TableHead className="w-[150px] font-black uppercase text-[10px] tracking-widest py-4 pr-6 text-right print:text-black text-center">{t('nominal')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {actors.map((actor, index) => (
                          <TableRow key={actor.id} className="group hover:bg-primary/5 transition-colors border-b-slate-50 print:border-b-2 print:border-black">
                            <TableCell className="py-4 pl-6 font-bold text-xs print:text-black print:border-r-2 print:border-black text-center">
                              {index + 1}
                            </TableCell>
                            <TableCell className="font-mono text-base font-black text-primary py-4 print:text-black print:border-r-2 print:border-black text-center">
                              {actor.bankNumber || "-"}
                            </TableCell>
                            <TableCell className="font-bold text-xs uppercase text-slate-600 print:text-black print:border-r-2 print:border-black text-center">
                              {actor.bankName || bankName}
                            </TableCell>
                            <TableCell className="print:border-r-2 print:border-black pl-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-800 uppercase text-sm leading-tight print:text-black">
                                    {actor.fullName}
                                  </span>
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase print:hidden">{actor.businessName}</span>
                                </div>
                                {actor.readyForLPJ && (
                                  <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 border-emerald-200 gap-1 print:hidden">
                                     <CheckCircle2 className="w-2.5 h-2.5" /> LPJ READY
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6 font-mono font-black text-sm text-emerald-600 print:text-black text-center whitespace-nowrap">
                              Rp. 1.000.000
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
              <h3 className="font-black text-xl text-slate-800 uppercase">{t('no_data')}</h3>
              <p className="text-sm text-muted-foreground font-medium">{t('no_bank_data_desc')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
