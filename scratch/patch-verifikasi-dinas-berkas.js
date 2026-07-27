const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/verifikasi-dinas-berkas/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// First, add showChecklist state
content = content.replace(
  'const [checks, setChecks] = useState({ ktp: false, kk: false, nib: false, foto: false })',
  'const [checks, setChecks] = useState({ ktp: false, kk: false, nib: false, foto: false })\n  const [showChecklist, setShowChecklist] = useState(false)'
);

// Then, replace the entire flex gap-2 block for dialogs
const startTag = '<div className="flex gap-2">';
const endTagStr = '                          </div>\n                        </div>\n                      </div>\n                    </CardContent>';

const startIndex = content.indexOf(startTag, content.indexOf('return ('));
if (startIndex === -1) {
    console.error("Could not find start tag");
    process.exit(1);
}

const endSearchIndex = content.indexOf(endTagStr, startIndex);
if (endSearchIndex === -1) {
    console.error("Could not find end tag");
    process.exit(1);
}

const beforeBlock = content.substring(0, startIndex);
const afterBlock = content.substring(endSearchIndex);

const newBlock = `<div className="flex gap-2 w-full">
                            {(isAdmin || isDinas || isPetugas) && (
                              <Dialog open={!!verifyingActor && verifyingActor.id === actor.id} onOpenChange={(open) => {
                                if (!open) {
                                  setVerifyingActor(null);
                                  setShowChecklist(false);
                                  setChecks({ ktp: false, kk: false, nib: false, foto: false });
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" onClick={() => { setVerifyingActor(actor); setShowChecklist(false); }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all duration-300">
                                    <ClipboardCheck className="w-4 h-4 mr-2" /> Verifikasi
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                                  {verifyingActor && !showChecklist && (
                                    <>
                                      <DialogHeader>
                                        <DialogTitle className="text-2xl font-black text-primary uppercase flex items-center gap-2">
                                          <FileText className="w-6 h-6" /> Detail Data & Hasil Survey
                                        </DialogTitle>
                                        <DialogDescription className="sr-only">Detail Pelaku Usaha</DialogDescription>
                                      </DialogHeader>
                                      
                                      <div className="grid gap-6 py-4">
                                        <section className="space-y-4">
                                          <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><User className="w-4 h-4" /> Informasi Pribadi</div>
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
                                            {(() => {
                                              const parsed = parsePobDob(verifyingActor.pobDob || "")
                                              return [
                                                { label: "Nama Lengkap", value: verifyingActor.fullName },
                                                { label: "NIK", value: verifyingActor.nik },
                                                { label: "Nomor KK", value: verifyingActor.noKK },
                                                { label: "Jenis Kelamin", value: verifyingActor.gender },
                                                { label: "Tempat Lahir", value: verifyingActor.pob || parsed.pob || "-" },
                                                { label: "Tanggal Lahir", value: verifyingActor.dob || parsed.dob || "-" },
                                                { label: "Nomor HP", value: verifyingActor.phone }
                                              ]
                                            })().map((item, i) => (
                                              <div key={i} className="space-y-1">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
                                                <p className="text-xs font-bold">{item.value || "-"}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </section>

                                        <section className="space-y-4">
                                          <div className="flex items-center gap-2 text-emerald-600 font-black text-sm uppercase border-b pb-1"><ClipboardCheck className="w-4 h-4" /> Data Hasil Survey Dinas</div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                            {[
                                              { label: "Nama Usaha", value: verifyingActor.surveyData?.namaUsaha },
                                              { label: "Nama Pemilik", value: verifyingActor.surveyData?.namaPemilik },
                                              { label: "Jenis Kelamin", value: verifyingActor.surveyData?.jenisKelamin },
                                              { label: "Status", value: verifyingActor.surveyData?.status },
                                              { label: "Alamat Rumah", value: verifyingActor.surveyData?.alamatRumah },
                                              { label: "No HP", value: verifyingActor.surveyData?.noHp },
                                              { label: "Email", value: verifyingActor.surveyData?.email },
                                              { label: "Sosial Media", value: verifyingActor.surveyData?.sosmed },
                                              { label: "DTKS", value: verifyingActor.surveyData?.dtks?.masuk ? \`Ya (\${verifyingActor.surveyData.dtks.jenis})\` : 'Tidak' },
                                              { label: "Bidang Usaha", value: verifyingActor.surveyData?.bidangUsaha },
                                              { label: "Peralatan", value: verifyingActor.surveyData?.peralatan },
                                              { label: "Tahun Berdiri", value: verifyingActor.surveyData?.tahunBerdiri },
                                              { label: "Izin", value: verifyingActor.surveyData?.izin?.join(', ') },
                                              { label: "Modal Usaha", value: verifyingActor.surveyData?.modalUsaha },
                                              { label: "Omset", value: verifyingActor.surveyData?.omset },
                                              { label: "Pernah Terima Hibah?", value: verifyingActor.surveyData?.hibah?.pernah ? \`Ya (Dari: \${verifyingActor.surveyData.hibah.dariMana}, Tahun: \${verifyingActor.surveyData.hibah.tahun})\` : 'Tidak' },
                                              { label: "Rencana Penggunaan", value: verifyingActor.surveyData?.rencanaPenggunaan },
                                              { label: "Hasil Survey", value: verifyingActor.surveyData?.hasilSurvey }
                                            ].map((item, i) => (
                                              <div key={i} className="space-y-1">
                                                <p className="text-[10px] font-bold text-emerald-700/80 uppercase">{item.label}</p>
                                                <p className="text-xs font-bold text-slate-800">{item.value || "-"}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </section>

                                        <section className="space-y-4">
                                          <div className="flex items-center gap-2 text-primary font-black text-sm uppercase border-b pb-1"><MapPin className="w-4 h-4" /> Titik Lokasi & Foto Survey</div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2">
                                              <p className="text-[10px] font-bold text-slate-500 uppercase">Titik Lokasi Survey Dinas</p>
                                              {verifyingActor.verificationLocationDinas ? (
                                                <>
                                                  <p className="text-xs font-mono font-semibold">{verifyingActor.verificationLocationDinas.lat}, {verifyingActor.verificationLocationDinas.lon}</p>
                                                  <a href={\`https://www.google.com/maps?q=\${verifyingActor.verificationLocationDinas.lat},\${verifyingActor.verificationLocationDinas.lon}\`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline inline-block mt-1">Buka di Google Maps</a>
                                                </>
                                              ) : (
                                                <p className="text-xs font-medium text-slate-500">Belum ada titik lokasi yang direkam.</p>
                                              )}
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2 items-center justify-center">
                                              <p className="text-[10px] font-bold text-slate-500 uppercase self-start">Foto Survey Dinas</p>
                                              {verifyingActor.surveyData?.fotoSurveyUrl ? (
                                                <img src={verifyingActor.surveyData.fotoSurveyUrl} alt="Foto Survey" className="max-h-[200px] object-contain rounded-lg border border-slate-200" />
                                              ) : (
                                                <p className="text-xs font-medium text-slate-500">Tidak ada foto.</p>
                                              )}
                                            </div>
                                          </div>
                                        </section>
                                      </div>
                                      
                                      <DialogFooter className="border-t pt-4">
                                        <Button type="button" variant="ghost" onClick={() => setVerifyingActor(null)}>Tutup</Button>
                                        <Button type="button" onClick={() => setShowChecklist(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                          Verifikasi Data <ClipboardCheck className="w-4 h-4 ml-2" />
                                        </Button>
                                      </DialogFooter>
                                    </>
                                  )}

                                  {verifyingActor && showChecklist && (
                                    <div className="flex flex-col gap-4">
                                      <DialogHeader>
                                        <DialogTitle className="text-xl font-black text-emerald-600 uppercase">Cek Kelengkapan Berkas</DialogTitle>
                                        <DialogDescription>Pastikan 4 berkas utama ini telah sesuai dan lengkap sebelum menyatakan Lolos.</DialogDescription>
                                      </DialogHeader>
                                      <div className="py-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                                            <Checkbox id="ktp" checked={checks.ktp} onCheckedChange={(c) => setChecks(prev => ({...prev, ktp: !!c}))} />
                                            <label htmlFor="ktp" className="text-sm font-semibold cursor-pointer select-none">KTP</label>
                                          </div>
                                          <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                                            <Checkbox id="kk" checked={checks.kk} onCheckedChange={(c) => setChecks(prev => ({...prev, kk: !!c}))} />
                                            <label htmlFor="kk" className="text-sm font-semibold cursor-pointer select-none">KK</label>
                                          </div>
                                          <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                                            <Checkbox id="nib" checked={checks.nib} onCheckedChange={(c) => setChecks(prev => ({...prev, nib: !!c}))} />
                                            <label htmlFor="nib" className="text-sm font-semibold cursor-pointer select-none">NIB</label>
                                          </div>
                                          <div className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                                            <Checkbox id="foto" checked={checks.foto} onCheckedChange={(c) => setChecks(prev => ({...prev, foto: !!c}))} />
                                            <label htmlFor="foto" className="text-sm font-semibold cursor-pointer select-none">Fhoto Pelaku Usaha</label>
                                          </div>
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button type="button" variant="ghost" onClick={() => setShowChecklist(false)}>Kembali</Button>
                                        {checks.ktp && checks.kk && checks.nib && checks.foto ? (
                                          <Button 
                                            type="button" 
                                            onClick={handleVerifyBerkas}
                                            disabled={isSubmitting} 
                                            className="min-w-[150px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                          >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} BERHASIL DIVERIFIKASI
                                          </Button>
                                        ) : (
                                          <Button type="button" disabled className="min-w-[150px] bg-slate-200 text-slate-500 font-bold">
                                            Ceklist 4 Berkas
                                          </Button>
                                        )}
                                      </DialogFooter>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                            )}
`;

fs.writeFileSync(filePath, beforeBlock + newBlock + afterBlock);
console.log("File patched successfully!");
