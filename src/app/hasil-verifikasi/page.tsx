"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/i18n"
import { useMemoFirebase, useList, useUser, useDatabase, useObject } from "@/firebase"
import { ref } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldAlert, Loader2, Eye, Search, User, FileText, Building2, MapPin, History, BadgeCheck, XSquare, CreditCard, ChevronRight } from "lucide-react"
import { BusinessActor } from "../lib/types"
import { updateDocumentNonBlocking } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckDataIndicator } from "@/components/check-data-indicator"

const BANK_LIST = [
  "BCA", "BNI", "BRI", "BRK", "MANDIRI", "PANIN", "OCBC", "DANAMON", "BUKOPIN", "BTN"
]

export default function HasilVerifikasiPage() {
  const { t } = useTranslation()
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [inputtingBankActor, setInputtingBankActor] = useState<BusinessActor | null>(null)
  const [isSubmittingBank, setIsSubmittingBank] = useState(false)

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])
  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, 'system_users')
  }, [user, database])
  const { data: allUsersForProfile } = useList(userProfileRef)
  const userProfile = allUsersForProfile?.find((u: any) => u.uid === user?.uid)

  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id') || userProfile?.role === 'admin'
  const isPetugas = userProfile?.role === 'petugas'
  const isKoordinator = userProfile?.role?.toLowerCase() === 'koordinator'

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'businessActors')
  }, [database])

  const { data: allActorsRaw, isLoading } = useList<BusinessActor>(memoQuery)
  
  const masterDataRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'master_data')
  }, [database])
  const { data: allMasterDataRaw } = useList<any>(masterDataRef)

  const blacklistDataRef = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'blacklist_data')
  }, [database])
  const { data: allBlacklistDataRaw } = useList<any>(blacklistDataRef)

  const actors = allActorsRaw ? allActorsRaw.filter(a => {
    if (a.status !== 'verified_dinas') return false;
    if (isKoordinator) {
      if (!a.coordinator || !userProfile?.fullName) return false;
      return a.coordinator.toLowerCase() === userProfile.fullName.toLowerCase();
    }
    return true;
  }) : []

  const filteredActors = actors?.filter(actor =>
    actor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    actor.nik.includes(searchQuery) ||
    actor.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleInputBank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!inputtingBankActor || !database) return

    setIsSubmittingBank(true)
    const actorRef = ref(database, `businessActors/${inputtingBankActor.id}`)
    updateDocumentNonBlocking(actorRef, {
      status: 'finish',
      readyForLPJ: false
    })

    toast({ title: t('data_finalized'), description: t('data_moved_to_bank') })
    setInputtingBankActor(null)
    setIsSubmittingBank(false)
  }

  if (!isAdmin && !isPetugas && !isKoordinator && !isAdminLoading) return <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center"><ShieldAlert className="w-16 h-16 text-destructive" /><h1 className="text-2xl font-bold">{t('access_denied')}</h1></div>

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-primary font-headline">{t('verification_results')}</h1>
            {filteredActors && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 shadow-sm flex items-center gap-2">
                <span>{t('total_verified_data')}:</span>
                <span className="bg-primary text-white px-2 py-0.5 rounded-full">{filteredActors.length}</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{t('verification_results_desc')}</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Cari Nama, NIK, atau Usaha..."
            className="flex h-11 w-full rounded-md border border-primary/20 bg-card px-3 py-2 pl-9 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="border border-slate-200/60 shadow-md overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl">
        <CardContent className="p-0">
          {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold">{t('full_name')}</TableHead>
                  <TableHead className="font-bold">NIK</TableHead>
                  <TableHead className="font-bold">{t('business_label')}</TableHead>
                  <TableHead className="font-bold">{t('verification_results')}</TableHead>
                  <TableHead className="text-right font-bold">{t('action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActors?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">{t('no_data_found')}</TableCell>
                  </TableRow>
                ) : (
                  filteredActors?.map((actor) => (
                    <TableRow key={actor.id} className="hover:bg-primary/5 transition-colors border-b border-slate-100">
                      <TableCell className="font-bold text-slate-800">{actor.fullName}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {actor.nik}
                        <div className="print:hidden">
                          <CheckDataIndicator actor={actor} allMasterData={allMasterDataRaw} allBlacklistData={allBlacklistDataRaw} />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">{actor.businessName}</TableCell>
                      <TableCell>
                        {actor.hasilVerifikasiDinas === 'Lolos' ? (
                          <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase w-fit tracking-wider">
                            <BadgeCheck className="w-3 h-3" /> {t('valid_verified')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase w-fit tracking-wider">
                            <XSquare className="w-3 h-3" /> {t('not_valid')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={!!viewingActor && viewingActor.id === actor.id} onOpenChange={(open) => !open && setViewingActor(null)}>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => setViewingActor(actor)} className="h-8 w-8 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg shadow-sm" title="Lihat Detail">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            {viewingActor && (
                              <>
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                                    <FileText className="w-6 h-6" /> {t('detail_results_title')}
                                  </DialogTitle>
                                  <DialogDescription className="sr-only">{t('detail_results_desc')}</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-6 py-4">
                                  
                                  {/* Hasil Card */}
                                  <section>
                                    <Card className={viewingActor.hasilVerifikasiDinas === 'Lolos' ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}>
                                      <CardContent className="p-4">
                                        <h3 className={`font-black text-sm uppercase mb-2 ${viewingActor.hasilVerifikasiDinas === 'Lolos' ? 'text-emerald-700' : 'text-red-700'}`}>
                                          {t('dept_decision')}: {viewingActor.hasilVerifikasiDinas === 'Lolos' ? t('passed') : t('failed')}
                                        </h3>
                                        <div className="space-y-1 mt-3">
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('description_label')}</p>
                                          <p className="text-sm font-medium">{viewingActor.keteranganDinas || t('no_description')}</p>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                      {[
                                        { label: "Nama Lengkap", value: viewingActor.fullName },
                                        { label: "NIK", value: viewingActor.nik },
                                        { label: "Nomor KK", value: viewingActor.noKK },
                                        { label: "Jenis Kelamin", value: viewingActor.gender },
                                        { label: "Tempat/Tgl Lahir", value: viewingActor.pobDob },
                                        { label: "Nomor HP", value: viewingActor.phone }
                                      ].map((item, i) => (
                                        <div key={i} className="space-y-1">
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                          <p className="text-xs font-bold">{item.value || "-"}</p>
                                        </div>
                                      ))}
                                      <div className="md:col-span-3 pt-2 border-t">
                                        <CheckDataIndicator actor={viewingActor} allMasterData={allMasterDataRaw} allBlacklistData={allBlacklistDataRaw} />
                                      </div>
                                    </div>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Alamat & Domisili</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                      {[
                                        { label: "Kecamatan", value: viewingActor.kecamatan },
                                        { label: "Kelurahan", value: viewingActor.kelurahan },
                                        { label: "RT/RW", value: viewingActor.rtRw },
                                        { label: "Alamat Lengkap", value: viewingActor.address, fullWidth: true }
                                      ].map((item, i) => (
                                        <div key={i} className={item.fullWidth ? "md:col-span-3 space-y-1" : "space-y-1"}>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                          <p className="text-xs font-bold">{item.value || "-"}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> Informasi Usaha</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
                                      {[
                                        { label: "Usaha", value: viewingActor.businessName },
                                        { label: "Kategori Usaha", value: viewingActor.businessCategory },
                                        { label: "Lokasi Usaha", value: viewingActor.businessLocation },
                                        { label: "KORLAP / DEWAN AKTIF", value: viewingActor.coordinator }
                                      ].map((item, i) => (
                                        <div key={i} className="space-y-1">
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                          <p className="text-xs font-bold">{item.value || "-"}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </section>

                                  <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> {t('audit_system')}</div>
                                    <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground uppercase">{t('status_label')}</p>
                                        <p className="text-primary">{viewingActor.status.toUpperCase()}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground uppercase">{t('input_officer')}</p>
                                        <p>{viewingActor.createdBy || "System"}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-muted-foreground uppercase">{t('reg_time')}</p>
                                        <p>{viewingActor.createdAt ? new Date(viewingActor.createdAt).toLocaleString('id-ID') : "-"}</p>
                                      </div>
                                    </div>
                                  </section>
                                </div>
                              </>
                            )}
                          </DialogContent>
                        </Dialog>

                        {/* Input Bank Action */}
                        <Dialog open={!!inputtingBankActor && inputtingBankActor.id === actor.id} onOpenChange={(open) => !open && setInputtingBankActor(null)}>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="outline" onClick={() => setInputtingBankActor(actor)} className="h-8 w-8 ml-1.5 border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg shadow-sm" title="Lanjut Input Rekening">
                              <ChevronRight className="w-5 h-5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <form onSubmit={handleInputBank}>
                              <DialogHeader>
                                <DialogTitle className="text-xl font-black text-purple-600 uppercase flex items-center gap-2">
                                  <CreditCard className="w-5 h-5" /> {t('confirm_distribution')}
                                </DialogTitle>
                                <DialogDescription>{t('confirm_distribution_desc')}</DialogDescription>
                              </DialogHeader>
                              <div className="py-6 space-y-4">
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-3">
                                  <div className="flex justify-between items-center border-b border-purple-200 pb-2">
                                    <span className="text-[10px] font-bold text-purple-400 uppercase">Nama Bank</span>
                                    <span className="text-sm font-black text-purple-700">{actor.bankName || "-"}</span>
                                  </div>
                                  <div className="flex justify-between items-center border-b border-purple-200 pb-2">
                                    <span className="text-[10px] font-bold text-purple-400 uppercase">Nomor Rekening</span>
                                    <span className="text-sm font-black text-purple-700 font-mono tracking-wider">{actor.bankNumber || "-"}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-purple-400 uppercase">Nama Pemilik</span>
                                    <span className="text-sm font-black text-purple-700 uppercase">{actor.bankOwner || "-"}</span>
                                  </div>
                                </div>
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-700 font-bold leading-relaxed">
                                  {t('confirm_distribution_warning')}
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setInputtingBankActor(null)}>{t('cancel')}</Button>
                                <Button type="submit" disabled={isSubmittingBank} className="min-w-[150px] bg-purple-600 hover:bg-purple-700 text-white font-bold">
                                  {isSubmittingBank ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : t('confirm_finish')}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
