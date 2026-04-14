"use client"

import { useState } from "react"
import { useMemoFirebase, useList, useUser, useDatabase, updateDocumentNonBlocking, useObject } from "@/firebase"
import { ref } from "firebase/database"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { BusinessActor } from "../lib/types"
import { useToast } from "@/hooks/use-toast"
import { CheckDataIndicator } from "@/components/check-data-indicator"
import { useTranslation } from "@/lib/i18n"

export default function VerifikasiDinasPage() {
  const { t } = useTranslation()
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingActor, setViewingActor] = useState<BusinessActor | null>(null)
  const [verifyingActor, setVerifyingActor] = useState<BusinessActor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
  const isDinas = userProfile?.role === 'dinas'

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

  const actors = allActorsRaw?.filter(a => a.status === 'lpj_pending')

  const filteredActors = actors?.filter(actor =>
    actor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    actor.nik.includes(searchQuery) ||
    actor.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleVerifyDinas = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!verifyingActor || !database || (!isAdmin && !isDinas)) return

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const hasilVerifikasi = formData.get("hasilVerifikasi") as string
    const keterangan = formData.get("keterangan") as string

    const actorRef = ref(database, `businessActors/${verifyingActor.id}`)
    updateDocumentNonBlocking(actorRef, {
      status: 'verified_dinas',
      hasilVerifikasiDinas: hasilVerifikasi,
      keteranganDinas: keterangan || "Tanpa keterangan tambahan"
    })

    toast({ title: t('berhasil_difinalisasi'), description: t('data_finalisasi_desc', { result: hasilVerifikasi }) })
    setVerifyingActor(null)
    setIsSubmitting(false)
  }

  if (!isAdmin && !isDinas && !isAdminLoading) return <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center"><ShieldAlert className="w-16 h-16 text-destructive" /><h1 className="text-2xl font-bold">{t('access_denied')}</h1></div>

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in-up duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-primary font-headline">{t('verifikasi_validasi_dinas')}</h1>
            {filteredActors && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20 shadow-sm flex items-center gap-2">
                <span>{t('total_data')}:</span>
                <span className="bg-primary text-white px-2 py-0.5 rounded-full">{filteredActors.length}</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{t('verifikasi_dinas_desc')}</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder={t('search_placeholder_dinas')}
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
                  <TableHead className="font-bold">{t('nama_lengkap')}</TableHead>
                  <TableHead className="font-bold">{t('nik')}</TableHead>
                  <TableHead className="font-bold">{t('kategori')}</TableHead>
                  <TableHead className="font-bold">{t('usaha')}</TableHead>
                  <TableHead className="text-right font-bold">{t('aksi')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActors?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">{t('no_data_dinas')}</TableCell>
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
                      <TableCell>
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider">
                          {actor.businessCategory}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">{actor.businessName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                          
                          {/* Viewer Dialog */}
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
                                      <FileText className="w-6 h-6" /> {t('detail_pelaku_usaha')}
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">{t('detail_pelaku_usaha')}</DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-6 py-4">
                                    <section className="space-y-4">
                                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> {t('informasi_pribadi')}</div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                        {[
                                          { label: t('nama_lengkap'), value: viewingActor.fullName },
                                          { label: t('nik'), value: viewingActor.nik },
                                          { label: t('family_card_number'), value: viewingActor.noKK },
                                          { label: t('gender'), value: viewingActor.gender },
                                          { label: t('place_date_of_birth'), value: viewingActor.pobDob },
                                          { label: t('phone_number'), value: viewingActor.phone }
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
                                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> {t('alamat_domisili')}</div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                        {[
                                          { label: t('district'), value: viewingActor.kecamatan },
                                          { label: t('subdistrict'), value: viewingActor.kelurahan },
                                          { label: t('rt_rw'), value: viewingActor.rtRw },
                                          { label: t('address'), value: viewingActor.address, fullWidth: true }
                                        ].map((item, i) => (
                                          <div key={i} className={item.fullWidth ? "md:col-span-3 space-y-1" : "space-y-1"}>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                            <p className="text-xs font-bold">{item.value || "-"}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </section>
  
                                    <section className="space-y-4">
                                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><Building2 className="w-4 h-4" /> {t('informasi_usaha')}</div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
                                        {[
                                          { label: t('usaha'), value: viewingActor.businessName },
                                          { label: t('business_category'), value: viewingActor.businessCategory },
                                          { label: t('business_location'), value: viewingActor.businessLocation },
                                          { label: t('korlap_dewan'), value: viewingActor.coordinator }
                                        ].map((item, i) => (
                                          <div key={i} className="space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                            <p className="text-xs font-bold">{item.value || "-"}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </section>
  
                                    <section className="space-y-4">
                                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><CreditCard className="w-4 h-4" /> {t('informasi_perbankan')}</div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                        {[
                                          { label: t('bank_name_label'), value: viewingActor.bankName },
                                          { label: t('bank_account_number'), value: viewingActor.bankNumber },
                                          { label: t('bank_owner_label'), value: viewingActor.bankOwner }
                                        ].map((item, i) => (
                                          <div key={i} className="space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                            <p className="text-xs font-black text-primary">{item.value || "BELUM TERISI"}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </section>

                                    <section className="space-y-4">
                                      <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><History className="w-4 h-4" /> {t('audit_sistem')}</div>
                                      <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-bold grid grid-cols-1 md:grid-cols-3 gap-4 border">
                                        <div className="space-y-1">
                                          <p className="text-muted-foreground uppercase">{t('status')}</p>
                                          <p className="text-primary">{viewingActor.status.toUpperCase()}</p>
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-muted-foreground uppercase">{t('input_by')}</p>
                                          <p>{viewingActor.createdBy || "System"}</p>
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-muted-foreground uppercase">{t('input_time')}</p>
                                          <p>{viewingActor.createdAt ? new Date(viewingActor.createdAt).toLocaleString('id-ID') : "-"}</p>
                                        </div>
                                      </div>
                                    </section>
                                  </div>
                                </>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          {/* Verifikasi Dinas Dialog */}
                          {(isAdmin || isDinas) && (
                            <Dialog open={!!verifyingActor && verifyingActor.id === actor.id} onOpenChange={(open) => !open && setVerifyingActor(null)}>
                              <DialogTrigger asChild>
                                <Button size="icon" variant="outline" onClick={() => setVerifyingActor(actor)} className="h-8 w-8 border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg shadow-sm" title="Verifikasi Dinas">
                                  <ClipboardCheck className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <form onSubmit={handleVerifyDinas}>
                                  <DialogHeader>
                                    <DialogTitle className="text-xl font-black text-emerald-600 uppercase">{t('verifikasi_validasi_dinas')}</DialogTitle>
                                    <DialogDescription>{t('verifikasi_dinas_desc')}</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-6 space-y-4">
                                    <div className="space-y-2">
                                      <div className="text-sm font-semibold">{t('hasil_verifikasi')}</div>
                                      <Select name="hasilVerifikasi" required>
                                        <SelectTrigger>
                                          <SelectValue placeholder={t('select_verification_placeholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Lolos">{t('lolos_validasi')}</SelectItem>
                                          <SelectItem value="Tidak Lolos">{t('tidak_lolos_validasi')}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-sm font-semibold">{t('keterangan_alasan')}</div>
                                      <Textarea 
                                        name="keterangan" 
                                        placeholder={t('reason_placeholder')} 
                                        className="min-h-[100px]" 
                                        required 
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => setVerifyingActor(null)}>{t('cancel')}</Button>
                                    <Button type="submit" disabled={isSubmitting} className="min-w-[150px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardCheck className="w-4 h-4 mr-2" />} {t('simpan_keputusan')}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}

                        </div>
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
