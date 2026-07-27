const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/verifikasi-dinas/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add new imports
const importReplacements = `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import { SurveyDinasData } from "../lib/types"`;

content = content.replace(/import { Select[^\n]+/, importReplacements);
content = content.replace(/import { Textarea[^\n]+\n/, '');

// Add lucide icons
content = content.replace(/AlertTriangle\n\} from "lucide-react"/, `AlertTriangle,
  Camera,
  Upload
} from "lucide-react"`);

// Add states
const stateAddition = `
  const [surveyData, setSurveyData] = useState<Partial<SurveyDinasData>>({})
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  
  // Format rupiah
  const formatRupiah = (value: string) => {
    const numberString = value.replace(/[^,\\d]/g, '').toString();
    const split = numberString.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\\d{3}/gi);
    if (ribuan) {
      const separator = sisa ? '.' : '';
      rupiah += separator + ribuan.join('.');
    }
    return split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
  };

  // Calculate progress
  const calculateProgress = () => {
    let requiredFields = 16;
    let filled = 0;
    if (surveyData.namaUsaha) filled++;
    if (surveyData.namaPemilik) filled++;
    if (surveyData.jenisKelamin) filled++;
    if (surveyData.status) filled++;
    if (surveyData.alamatRumah) filled++;
    if (surveyData.noHp) filled++;
    if (surveyData.email) filled++;
    if (surveyData.sosmed) filled++;
    if (surveyData.dtks?.masuk !== undefined) {
      filled++;
      if (surveyData.dtks.masuk) {
        requiredFields++;
        if (surveyData.dtks.jenis) filled++;
      }
    }
    if (surveyData.bidangUsaha) filled++;
    if (surveyData.peralatan) filled++;
    if (surveyData.tahunBerdiri) filled++;
    if (surveyData.izin && surveyData.izin.length > 0) filled++;
    if (surveyData.modalUsaha) filled++;
    if (surveyData.omset) filled++;
    if (surveyData.hibah?.pernah !== undefined) {
      filled++;
      if (surveyData.hibah.pernah) {
        requiredFields += 2;
        if (surveyData.hibah.dariMana) filled++;
        if (surveyData.hibah.tahun) filled++;
      }
    }
    if (surveyData.rencanaPenggunaan) filled++;
    if (surveyData.hasilSurvey) filled++;
    
    // Photo and location
    requiredFields += 2;
    if (surveyData.fotoSurveyUrl) filled++;
    if (location) filled++;
    
    return Math.round((filled / requiredFields) * 100);
  };

  const surveyProgress = calculateProgress();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setPhotoPreview(base64String)
        setSurveyData(prev => ({ ...prev, fotoSurveyUrl: base64String }))
      }
      reader.readAsDataURL(file)
    }
  }

  const openSurveyDialog = (actor: BusinessActor) => {
    setVerifyingActor(actor);
    setLocation(null);
    setPhotoPreview(actor.surveyData?.fotoSurveyUrl || null);
    
    // Auto fill data
    setSurveyData(actor.surveyData || {
      namaUsaha: actor.businessName || '',
      namaPemilik: actor.fullName || '',
      jenisKelamin: actor.gender || '',
      alamatRumah: actor.address || '',
      noHp: actor.phone || '',
      bidangUsaha: actor.businessCategory || '',
      dtks: { masuk: false },
      hibah: { pernah: false },
      izin: []
    });
  };
`;

content = content.replace(/const \[isDeletingAll, setIsDeletingAll\] = useState\(false\)/, `const [isDeletingAll, setIsDeletingAll] = useState(false)\n${stateAddition}`);


// Replace handleVerifyDinas function
const handleVerifyRegex = /const handleVerifyDinas = \(e: React\.FormEvent<HTMLFormElement>\) => \{[\s\S]*?setIsSubmitting\(false\)\n  \}/;

const newHandleVerify = `const handleVerifyDinas = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!verifyingActor || !database || (!isAdmin && !isDinas && !isPetugas)) return
    if (surveyProgress < 100) {
      toast({ variant: "destructive", title: "Data Belum Lengkap", description: "Progress harus 100% untuk menyimpan verifikasi." })
      return;
    }
    if (!location) {
      toast({ variant: "destructive", title: "Lokasi belum diambil", description: "Harap ambil lokasi sebelum menyimpan keputusan verifikasi." })
      return;
    }

    setIsSubmitting(true)

    const actorRef = ref(database, \`businessActors/\${verifyingActor.id}\`)
    updateDocumentNonBlocking(actorRef, {
      status: 'verified_dinas',
      hasilVerifikasiDinas: 'Lolos',
      surveyData: surveyData,
      surveyProgress: surveyProgress,
      verificationLocationDinas: { lat: location.lat, lon: location.lon }
    })

    // Update global stats
    import("@/lib/stats-service").then(({ updateStatsOnStatusChange }) => {
      updateStatsOnStatusChange(database, verifyingActor.status || 'lpj_pending', 'verified_dinas', verifyingActor).catch(e => console.error(e));
    });

    logActivity({
      query: \`SURVEY DINAS: \${verifyingActor.fullName} - LOLOS\`,
      results: "Berhasil",
      device: getDeviceType(navigator.userAgent),
      source: 'Web',
      method: 'SURVEY DINAS',
      userId: user?.email || user?.uid || 'Admin'
    })

    toast({ title: "Survey Berhasil Disimpan", description: \`Data pelaku usaha telah di-update.\` })
    setVerifyingActor(null)
    setIsSubmitting(false)
  }`;

content = content.replace(handleVerifyRegex, newHandleVerify);

// Card logic - add progress bar
const cardRenderRegex = /<h3 className="font-black text-slate-800 uppercase text-sm truncate" title=\{actor\.fullName\}>\s*\{actor\.fullName\}\s*<\/h3>\s*<p className="text-\[10px\] font-mono text-slate-500 mt-0\.5 tracking-tighter">\s*NIK: \{actor\.nik\}\s*<\/p>/;

const newCardRender = `<h3 className="font-black text-slate-800 uppercase text-sm truncate" title={actor.fullName}>
                                {actor.fullName}
                              </h3>
                              <p className="text-[10px] font-mono text-slate-500 mt-0.5 tracking-tighter">
                                NIK: {actor.nik}
                              </p>
                              {actor.surveyProgress !== undefined && (
                                <div className="mt-2 space-y-1 pr-4">
                                  <div className="flex justify-between text-[9px] font-bold">
                                    <span className="text-slate-500">Progress Survey</span>
                                    <span className={actor.surveyProgress === 100 ? 'text-emerald-600' : 'text-amber-600'}>{actor.surveyProgress}%</span>
                                  </div>
                                  <Progress value={actor.surveyProgress} className="h-1.5" />
                                </div>
                              )}`;
                              
content = content.replace(cardRenderRegex, newCardRender);

// Dialog form replacement
const dialogTriggerRegex = /onClick=\{\(\) => \{ setVerifyingActor\(actor\); setLocation\(null\); \}\}/;
content = content.replace(dialogTriggerRegex, `onClick={() => openSurveyDialog(actor)}`);

const dialogFormRegex = /<form onSubmit=\{handleVerifyDinas\}>[\s\S]*?<\/form>/;

const newDialogForm = `<form onSubmit={handleVerifyDinas}>
                                    <DialogHeader>
                                      <DialogTitle className="text-xl font-black text-emerald-600 uppercase">Survey Dinas</DialogTitle>
                                      <DialogDescription>Lengkapi form survey di bawah ini. Progress harus mencapai 100% untuk menyimpan.</DialogDescription>
                                    </DialogHeader>
                                    
                                    <div className="sticky top-0 bg-white z-10 py-4 border-b border-slate-100 shadow-sm px-1 mb-4">
                                      <div className="flex justify-between text-sm font-bold mb-2">
                                        <span className="text-slate-600 uppercase">Progress Pengisian</span>
                                        <span className={surveyProgress === 100 ? 'text-emerald-600' : 'text-amber-600'}>{surveyProgress}%</span>
                                      </div>
                                      <Progress value={surveyProgress} className="h-2" />
                                    </div>

                                    <div className="py-2 space-y-6 max-h-[60vh] overflow-y-auto px-1">
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Nama Usaha</Label>
                                          <Input value={surveyData.namaUsaha || ''} onChange={e => setSurveyData(prev => ({...prev, namaUsaha: e.target.value}))} required />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Nama Pemilik Usaha</Label>
                                          <Input value={surveyData.namaPemilik || ''} onChange={e => setSurveyData(prev => ({...prev, namaPemilik: e.target.value}))} required />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Jenis Kelamin</Label>
                                          <Select value={surveyData.jenisKelamin} onValueChange={v => setSurveyData(prev => ({...prev, jenisKelamin: v}))} required>
                                            <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Laki-Laki">Laki-Laki</SelectItem>
                                              <SelectItem value="Perempuan">Perempuan</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Status</Label>
                                          <Select value={surveyData.status || ''} onValueChange={v => setSurveyData(prev => ({...prev, status: v}))} required>
                                            <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Lajang">Lajang</SelectItem>
                                              <SelectItem value="Menikah">Menikah</SelectItem>
                                              <SelectItem value="Janda">Janda</SelectItem>
                                              <SelectItem value="Duda">Duda</SelectItem>
                                              <SelectItem value="Kepala Keluarga">Kepala Keluarga</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <Label>Alamat Rumah</Label>
                                        <Textarea value={surveyData.alamatRumah || ''} onChange={e => setSurveyData(prev => ({...prev, alamatRumah: e.target.value}))} required />
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                          <Label>No HP Pemilik Usaha</Label>
                                          <Input value={surveyData.noHp || ''} onChange={e => setSurveyData(prev => ({...prev, noHp: e.target.value}))} required />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Email</Label>
                                          <Input type="email" value={surveyData.email || ''} onChange={e => setSurveyData(prev => ({...prev, email: e.target.value}))} required />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Account Sosial Media</Label>
                                          <Input placeholder="@username" value={surveyData.sosmed || ''} onChange={e => setSurveyData(prev => ({...prev, sosmed: e.target.value}))} required />
                                        </div>
                                      </div>

                                      <div className="p-4 border rounded-xl bg-slate-50 space-y-4">
                                        <div className="space-y-2">
                                          <Label className="text-sm font-bold">Apakah Saudara Masuk Dalam DTKS?</Label>
                                          <RadioGroup value={surveyData.dtks?.masuk ? 'YA' : 'TIDAK'} onValueChange={v => setSurveyData(prev => ({...prev, dtks: { masuk: v === 'YA' }}))} className="flex gap-4">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="YA" id="dtks-ya" /><Label htmlFor="dtks-ya">YA</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="TIDAK" id="dtks-tidak" /><Label htmlFor="dtks-tidak">TIDAK</Label></div>
                                          </RadioGroup>
                                        </div>
                                        {surveyData.dtks?.masuk && (
                                          <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                                            <Label>Pilih Jenis DTKS</Label>
                                            <Select value={surveyData.dtks.jenis || ''} onValueChange={v => setSurveyData(prev => ({...prev, dtks: { ...prev.dtks, masuk: true, jenis: v }}))} required>
                                              <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="PKH">PKH</SelectItem>
                                                <SelectItem value="BPNT">BPNT</SelectItem>
                                                <SelectItem value="KIP">KIP</SelectItem>
                                                <SelectItem value="LANSIA">LANSIA</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Bidang Usaha</Label>
                                          <Input value={surveyData.bidangUsaha || ''} onChange={e => setSurveyData(prev => ({...prev, bidangUsaha: e.target.value}))} required />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Tahun Berdiri</Label>
                                          <Input type="number" placeholder="2020" value={surveyData.tahunBerdiri || ''} onChange={e => setSurveyData(prev => ({...prev, tahunBerdiri: e.target.value}))} required />
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <Label>Peralatan Yang Digunakan</Label>
                                        <Textarea value={surveyData.peralatan || ''} onChange={e => setSurveyData(prev => ({...prev, peralatan: e.target.value}))} required />
                                      </div>

                                      <div className="space-y-3">
                                        <Label>Izin Yang Dimiliki (Bisa pilih lebih dari satu)</Label>
                                        <div className="flex flex-wrap gap-4">
                                          {['NIB', 'HALAL', 'PIRT', 'Lainnya'].map(izinOption => (
                                            <div key={izinOption} className="flex items-center space-x-2">
                                              <Checkbox 
                                                id={\`izin-\${izinOption}\`} 
                                                checked={surveyData.izin?.includes(izinOption) || false}
                                                onCheckedChange={(checked) => {
                                                  setSurveyData(prev => {
                                                    const current = prev.izin || [];
                                                    return {
                                                      ...prev,
                                                      izin: checked ? [...current, izinOption] : current.filter(i => i !== izinOption)
                                                    }
                                                  })
                                                }}
                                              />
                                              <Label htmlFor={\`izin-\${izinOption}\`}>{izinOption}</Label>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Modal Usaha</Label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">Rp</span>
                                            <Input className="pl-9 font-mono" value={surveyData.modalUsaha || ''} onChange={e => setSurveyData(prev => ({...prev, modalUsaha: formatRupiah(e.target.value)}))} required />
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Omset</Label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">Rp</span>
                                            <Input className="pl-9 font-mono" value={surveyData.omset || ''} onChange={e => setSurveyData(prev => ({...prev, omset: formatRupiah(e.target.value)}))} required />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="p-4 border rounded-xl bg-slate-50 space-y-4">
                                        <div className="space-y-2">
                                          <Label className="text-sm font-bold">Apakah Pernah Menerima Dana Hibah?</Label>
                                          <RadioGroup value={surveyData.hibah?.pernah ? 'YA' : 'TIDAK'} onValueChange={v => setSurveyData(prev => ({...prev, hibah: { pernah: v === 'YA' }}))} className="flex gap-4">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="YA" id="hibah-ya" /><Label htmlFor="hibah-ya">YA</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="TIDAK" id="hibah-tidak" /><Label htmlFor="hibah-tidak">TIDAK</Label></div>
                                          </RadioGroup>
                                        </div>
                                        {surveyData.hibah?.pernah && (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                                            <div className="space-y-2">
                                              <Label>Dari Mana</Label>
                                              <Input value={surveyData.hibah.dariMana || ''} onChange={e => setSurveyData(prev => ({...prev, hibah: { ...prev.hibah, pernah: true, dariMana: e.target.value }}))} required />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Tahun</Label>
                                              <Input type="number" value={surveyData.hibah.tahun || ''} onChange={e => setSurveyData(prev => ({...prev, hibah: { ...prev.hibah, pernah: true, tahun: e.target.value }}))} required />
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="space-y-2">
                                        <Label>Rencana Penggunaan Dana Hibah</Label>
                                        <Textarea value={surveyData.rencanaPenggunaan || ''} onChange={e => setSurveyData(prev => ({...prev, rencanaPenggunaan: e.target.value}))} required />
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label>Hasil Survey</Label>
                                        <Textarea value={surveyData.hasilSurvey || ''} onChange={e => setSurveyData(prev => ({...prev, hasilSurvey: e.target.value}))} required />
                                      </div>
                                      
                                      <div className="space-y-3 p-4 border rounded-xl bg-slate-50">
                                        <Label className="font-bold flex items-center gap-2"><Camera className="w-4 h-4" /> Fhoto Proses Survey</Label>
                                        <div className="flex flex-col gap-4">
                                          {photoPreview ? (
                                            <div className="relative aspect-video rounded-xl overflow-hidden border">
                                              <img src={photoPreview} alt="Preview Foto Survey" className="w-full h-full object-cover" />
                                              <Button type="button" size="sm" variant="destructive" className="absolute top-2 right-2 rounded-full" onClick={() => { setPhotoPreview(null); setSurveyData(prev => ({ ...prev, fotoSurveyUrl: undefined })); }}>Ganti</Button>
                                            </div>
                                          ) : (
                                            <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground bg-white">
                                              <Camera className="w-8 h-8 mb-2 opacity-50" />
                                              <p className="text-sm font-medium">Ambil Gambar atau Upload File</p>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2">
                                            <Input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
                                            <Label htmlFor="photo-upload" className="w-full">
                                              <div className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer py-2 px-4 rounded-lg font-bold border border-indigo-200">
                                                <Upload className="w-4 h-4" /> Pilih / Ambil Foto
                                              </div>
                                            </Label>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-3 pt-4 border-t">
                                        <div className="text-sm font-semibold flex items-center gap-2 text-primary">
                                          <MapPin className="w-4 h-4" /> Validasi Titik Lokasi (Wajib)
                                        </div>
                                        {location ? (
                                           <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                                             <div className="flex items-center gap-3">
                                               <div className="bg-emerald-100 p-2 rounded-lg">
                                                 <Check className="w-5 h-5 text-emerald-600" />
                                               </div>
                                               <div className="space-y-1">
                                                 <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Lokasi Tersimpan</p>
                                                 <p className="text-[10px] text-emerald-600 font-mono bg-emerald-100/50 px-2 py-0.5 rounded w-fit">
                                                   Lat: {location.lat.toFixed(6)}, Lon: {location.lon.toFixed(6)}
                                                 </p>
                                               </div>
                                             </div>
                                             <Button type="button" variant="outline" size="sm" onClick={fetchLocation} disabled={isFetchingLocation} className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                                               {isFetchingLocation ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Ubah Titik
                                             </Button>
                                           </div>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                                            <MapPin className="w-8 h-8 text-slate-400 mb-2" />
                                            <p className="text-xs font-medium text-slate-500 mb-4 text-center">Data titik lokasi wajib diambil untuk proses verifikasi dinas. Tidak dapat dibypass.</p>
                                            <Button type="button" onClick={fetchLocation} disabled={isFetchingLocation} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                                              {isFetchingLocation ? (
                                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sedang Mengambil...</>
                                              ) : "Ambil Lokasi Sekarang"}
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <DialogFooter className="pt-4 border-t mt-2">
                                      <Button type="button" variant="ghost" onClick={() => setVerifyingActor(null)}>Batal</Button>
                                      {surveyProgress === 100 && location ? (
                                        <Button type="submit" disabled={isSubmitting} className="min-w-[150px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardCheck className="w-4 h-4 mr-2" />} Simpan Verifikasi
                                        </Button>
                                      ) : (
                                        <Button type="button" disabled className="min-w-[150px] opacity-50 bg-slate-200 text-slate-500">
                                          Isi Form 100%
                                        </Button>
                                      )}
                                    </DialogFooter>
                                  </form>`;

content = content.replace(dialogFormRegex, newDialogForm);

fs.writeFileSync(filePath, content);
console.log('Done replacing');
