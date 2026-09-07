'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDatabase, useObject, useMemoFirebase, useUser, useList } from '@/firebase';
import { ref, set } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Save, Bold, Italic, Type, Underline, AlignLeft, AlignCenter, AlignRight, Eye, Image as ImageIcon, Upload, Trash2, Link as LinkIcon, Sparkles, X, Check, Timer, Clock, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Helper kompresi gambar agar cepat disimpan dan dimuat
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal membaca gambar'));
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
  });
};

// Helper konversi Date ke format datetime-local input (YYYY-MM-DDTHH:mm)
const toDatetimeLocal = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function SettingsMaintenance() {
  const database = useDatabase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estimasi waktu selesai (countdown)
  const [estimatedEndTime, setEstimatedEndTime] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<{enabled: boolean, updatedAt?: number} | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const initDoneRef = useRef(false);

  // Helper preset cepat durasi
  const applyQuickPreset = (minutesToAdd: number) => {
    const target = new Date(Date.now() + minutesToAdd * 60 * 1000);
    setEstimatedEndTime(toDatetimeLocal(target));
  };

  // Cek Role Admin
  const usersRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'system_users');
  }, [database]);
  const { data: allUsers, isLoading: usersLoading } = useList(usersRef);
  const myProfile = allUsers?.find((u: any) => u.uid === user?.uid);
  const isAdmin = myProfile?.role === 'admin' || (user?.email?.toLowerCase() === 'agus@umkm.id');

  const maintenanceRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/maintenance');
  }, [database]);

  const { data: currentData, isLoading: dataLoading } = useObject(maintenanceRef);

  const defaultMsg = 'Sistem sedang dalam masa perbaikan (Maintenance). Silakan coba beberapa saat lagi.';

  // Load data from Firebase whenever it arrives/changes
  useEffect(() => {
    if (dataLoading) return;
    if (initDoneRef.current) return; // Only auto-populate on first load

    if (currentData) {
      setEnabled(currentData.enabled ?? false);
      setLastSaved({ enabled: currentData.enabled ?? false, updatedAt: currentData.updatedAt });
      const msg = currentData.message || defaultMsg;
      setMessage(msg);
      setImageUrl(currentData.imageUrl || currentData.image || '');

      if (currentData.estimatedEndTime) {
        try {
          const d = new Date(currentData.estimatedEndTime);
          if (!isNaN(d.getTime())) {
            setEstimatedEndTime(toDatetimeLocal(d));
          } else {
            setEstimatedEndTime('');
          }
        } catch {
          setEstimatedEndTime('');
        }
      } else {
        setEstimatedEndTime('');
      }

      if (editorRef.current) {
        editorRef.current.innerHTML = msg;
      }
    } else {
      setEnabled(false);
      setMessage(defaultMsg);
      setImageUrl('');
      setEstimatedEndTime('');
      if (editorRef.current) {
        editorRef.current.innerHTML = defaultMsg;
      }
    }
    initDoneRef.current = true;
  }, [currentData, dataLoading]);

  // Handle toggling "enabled" to set default message if message is empty
  useEffect(() => {
    if (!initDoneRef.current) return;
    if (enabled && (!message || message.trim() === '')) {
      setMessage(defaultMsg);
      if (editorRef.current) editorRef.current.innerHTML = defaultMsg;
    }
  }, [enabled]);

  // Callback ref to ensure innerHTML is set as soon as editor DOM element mounts
  const setEditorRef = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (node && message) {
      if (!node.innerHTML || node.innerHTML === '<br>' || node.innerHTML === '') {
        node.innerHTML = message;
      }
    }
  }, [message]);

  // Sync editor innerHTML when message or preview state changes
  useEffect(() => {
    if (!showPreview && editorRef.current && message) {
      if (!editorRef.current.innerHTML || editorRef.current.innerHTML === '<br>' || editorRef.current.innerHTML === '') {
        editorRef.current.innerHTML = message;
      }
    }
  }, [showPreview, message]);

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      setMessage(editorRef.current.innerHTML);
    }
  }, []);

  const execCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value || '');
    handleEditorInput();
  };

  if (usersLoading || dataLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Akses Ditolak</h1>
        <p className="text-muted-foreground">Hanya Administrator yang dapat mengakses halaman ini.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Dashboard</Button>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Format Tidak Didukung', description: 'Harap pilih file gambar (JPG, PNG, WebP).' });
      return;
    }

    setIsCompressing(true);
    try {
      const base64 = await compressImage(file);
      setImageUrl(base64);
      toast({ title: 'Gambar Terpilih', description: 'Gambar berhasil dimuat. Klik Simpan Pengaturan untuk menerapkan.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal Memproses Gambar', description: err.message || 'Terjadi kesalahan saat memproses gambar.' });
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    const currentMessage = editorRef.current?.innerHTML || message;
    const textOnly = editorRef.current?.textContent || '';

    if (enabled && !textOnly.trim()) {
      toast({ variant: 'destructive', title: 'Kesalahan', description: 'Pesan maintenance tidak boleh kosong.' });
      return;
    }

    setIsSaving(true);
    try {
      const updatedAt = Date.now();
      await set(ref(database!, 'settings/maintenance'), {
        enabled,
        message: currentMessage,
        imageUrl: imageUrl.trim() || null,
        estimatedEndTime: estimatedEndTime ? new Date(estimatedEndTime).toISOString() : null,
        updatedAt,
        updatedBy: user?.uid
      });
      setLastSaved({ enabled, updatedAt });
      toast({ title: 'Berhasil', description: 'Pengaturan Maintenance telah diperbarui.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-red-500 text-white p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <ShieldAlert className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight">Pengaturan Maintenance</CardTitle>
              <CardDescription className="text-white/70 font-medium">Aktifkan mode maintenance untuk memblokir akses ke aplikasi sementara waktu.</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 space-y-8">
          <div className="flex items-center justify-between p-6 border rounded-2xl bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold">Status Maintenance</h3>
              <p className="text-sm text-muted-foreground">Jika diaktifkan, semua pengguna kecuali Admin akan dialihkan ke halaman peringatan.</p>
              {/* Status tersimpan terakhir */}
              {lastSaved !== null && (
                <div className={cn(
                  "mt-2 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full",
                  lastSaved.enabled
                    ? "bg-red-100 text-red-700 border border-red-200"
                    : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                )}>
                  <span className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    lastSaved.enabled ? "bg-red-500" : "bg-emerald-500"
                  )} />
                  {lastSaved.enabled ? "Maintenance AKTIF" : "Layanan AKTIF (Normal)"}
                  {lastSaved.updatedAt && (
                    <span className="opacity-60 font-normal ml-1">
                      · Disimpan {new Date(lastSaved.updatedAt).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
              )}
            </div>
            <Switch 
              checked={enabled} 
              onCheckedChange={setEnabled} 
              className={enabled ? "bg-red-500" : ""}
            />
          </div>

          {/* Section: Gambar / Poster Maintenance */}
          <div className="p-6 border rounded-2xl bg-slate-50/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-red-500" />
                  Gambar / Poster Tampilan
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tambahkan gambar, banner, atau poster menarik agar halaman maintenance tampil lebih profesional.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="rounded-xl gap-2 font-bold text-slate-700 bg-white shadow-sm hover:bg-slate-50"
                >
                  {isCompressing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                  ) : (
                    <Upload className="w-4 h-4 text-red-500" />
                  )}
                  Unggah Gambar
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="rounded-xl gap-2 font-bold text-slate-700 bg-white shadow-sm hover:bg-slate-50"
                >
                  <LinkIcon className="w-4 h-4 text-blue-500" />
                  Link URL
                </Button>

                {imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImageUrl('');
                      setUrlInput('');
                    }}
                    className="rounded-xl gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </Button>
                )}
              </div>
            </div>

            {/* Input URL jika mode link aktif */}
            {showUrlInput && (
              <div className="flex gap-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <Input
                  type="url"
                  placeholder="https://contoh.com/gambar-maintenance.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="h-10 text-sm bg-white rounded-xl"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (urlInput.trim()) {
                      setImageUrl(urlInput.trim());
                      setShowUrlInput(false);
                      toast({ title: 'Link Gambar Disetel', description: 'Klik Simpan Pengaturan untuk menerapkan.' });
                    }
                  }}
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shrink-0"
                >
                  Terapkan
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUrlInput(false)}
                  className="rounded-xl shrink-0"
                >
                  Batal
                </Button>
              </div>
            )}

            {/* Kotak Preview / Tampilan Gambar */}
            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 shadow-inner group max-h-72 flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="Preview Maintenance"
                  className="w-full max-h-72 object-cover object-center rounded-xl"
                />
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Gambar Terpasang
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-red-400/70 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white hover:bg-red-50/20 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-100/70 text-red-500 mx-auto flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform shadow-sm">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">Klik di sini untuk mengunggah gambar / poster</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mendukung format JPG, PNG, WebP (otomatis dioptimalkan)</p>
              </div>
            )}
          </div>

          {/* Section: Estimasi Waktu Selesai (Countdown Timer) */}
          <div className="p-6 border rounded-2xl bg-slate-50/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Timer className="w-5 h-5 text-red-500" />
                  Estimasi Waktu Selesai (Countdown Timer)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tentukan target waktu selesai maintenance. Timer hitung mundur otomatis muncul di bawah gambar di layar maintenance.
                </p>
              </div>

              {estimatedEndTime && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEstimatedEndTime('')}
                  className="rounded-xl gap-1 text-slate-500 hover:text-red-600 hover:bg-red-50 font-bold self-start sm:self-auto"
                >
                  <X className="w-4 h-4" />
                  Hapus Timer
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Target Tanggal & Jam Selesai
                </label>
                <Input
                  type="datetime-local"
                  value={estimatedEndTime}
                  onChange={(e) => setEstimatedEndTime(e.target.value)}
                  className="h-11 text-sm bg-white rounded-xl font-medium"
                />
                {estimatedEndTime ? (
                  <p className="text-xs text-blue-600 font-semibold mt-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Target: {new Date(estimatedEndTime).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    *Kosongkan jika tidak ingin menyertakan timer hitung mundur.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Preset Cepat Durasi
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickPreset(30)}
                    className="rounded-lg text-xs font-bold bg-white hover:bg-red-50 hover:text-red-600 border-slate-200"
                  >
                    +30 Menit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickPreset(60)}
                    className="rounded-lg text-xs font-bold bg-white hover:bg-red-50 hover:text-red-600 border-slate-200"
                  >
                    +1 Jam
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickPreset(120)}
                    className="rounded-lg text-xs font-bold bg-white hover:bg-red-50 hover:text-red-600 border-slate-200"
                  >
                    +2 Jam
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickPreset(240)}
                    className="rounded-lg text-xs font-bold bg-white hover:bg-red-50 hover:text-red-600 border-slate-200"
                  >
                    +4 Jam
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickPreset(1440)}
                    className="rounded-lg text-xs font-bold bg-white hover:bg-red-50 hover:text-red-600 border-slate-200"
                  >
                    +1 Hari
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Pesan Peringatan</h3>
                <p className="text-sm text-muted-foreground">Tuliskan pesan dengan format teks. Gunakan toolbar untuk menebalkan atau memiringkan huruf.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="rounded-xl gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Editor' : 'Preview'}
              </Button>
            </div>
            
            {!showPreview ? (
              <div className="border rounded-2xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-red-500/50 transition-all">
                {/* Toolbar */}
                <div className="flex items-center gap-1 px-3 py-2 bg-slate-100 border-b flex-wrap">
                  <button
                    type="button"
                    onClick={() => execCommand('bold')}
                    className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-slate-900"
                    title="Tebal (Bold)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execCommand('italic')}
                    className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-slate-900"
                    title="Miring (Italic)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execCommand('underline')}
                    className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-slate-900"
                    title="Garis Bawah (Underline)"
                  >
                    <Underline className="w-4 h-4" />
                  </button>

                  <div className="w-px h-6 bg-slate-300 mx-1" />

                  <button
                    type="button"
                    onClick={() => execCommand('justifyLeft')}
                    className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-slate-900"
                    title="Rata Kiri"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execCommand('justifyCenter')}
                    className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-slate-900"
                    title="Rata Tengah"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execCommand('justifyRight')}
                    className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 hover:text-slate-900"
                    title="Rata Kanan"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>

                  <div className="w-px h-6 bg-slate-300 mx-1" />

                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        execCommand('fontSize', e.target.value);
                      }
                    }}
                    defaultValue=""
                    className="px-2 py-1.5 rounded-lg bg-white border text-sm text-slate-600 hover:border-slate-400 transition-all cursor-pointer"
                    title="Ukuran Font"
                  >
                    <option value="" disabled>Ukuran</option>
                    <option value="1">Sangat Kecil</option>
                    <option value="2">Kecil</option>
                    <option value="3">Normal</option>
                    <option value="4">Sedang</option>
                    <option value="5">Besar</option>
                    <option value="6">Sangat Besar</option>
                    <option value="7">Judul</option>
                  </select>
                </div>

                {/* Editor Area */}
                <div
                  ref={setEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  className="min-h-[180px] p-4 text-base outline-none bg-white"
                  style={{ lineHeight: 1.75 }}
                />
              </div>
            ) : (
              /* Preview Mode */
              <div className="border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-3 py-2 bg-slate-100 border-b">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preview Tampilan</span>
                </div>
                <div 
                  className="min-h-[180px] p-6 bg-white"
                  style={{ lineHeight: 1.75, color: '#cbd5e1' }}
                >
                  <div 
                    style={{
                      background: 'rgba(30, 41, 59, 0.95)',
                      borderRadius: '20px',
                      padding: '24px',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                    }}
                  >
                    {imageUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                        <img 
                          src={imageUrl} 
                          alt="Banner Maintenance" 
                          className="w-full max-h-60 object-cover object-center"
                        />
                      </div>
                    )}
                    {estimatedEndTime && (
                      <div className="mb-4 p-4 rounded-2xl bg-slate-900/80 border border-blue-500/30 text-center shadow-inner">
                        <div className="flex items-center justify-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">
                          <Timer className="w-3.5 h-3.5" />
                          <span>Preview Countdown Hitung Mundur</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
                          {['Hari', 'Jam', 'Menit', 'Detik'].map((unit) => (
                            <div key={unit} className="bg-slate-800/90 border border-slate-700/50 rounded-xl p-2 text-center">
                              <div className="font-mono text-base font-black text-white">00</div>
                              <div className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">{unit}</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-2">
                          Target: {new Date(estimatedEndTime).toLocaleString('id-ID')}
                        </div>
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: message }} />
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              Seleksi teks lalu klik tombol <strong>B</strong> untuk tebal, <em>I</em> untuk miring, atau <u>U</u> untuk garis bawah.
            </p>
          </div>
        </CardContent>

        <CardFooter className="p-8 bg-slate-50 border-t flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            size="lg"
            className="rounded-xl px-8 bg-red-600 hover:bg-red-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Simpan Pengaturan
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
