'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDatabase, useObject, useMemoFirebase, useUser, useList } from '@/firebase';
import { ref, set } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Save, Bold, Italic, Type, Underline, AlignLeft, AlignCenter, AlignRight, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export default function SettingsMaintenance() {
  const database = useDatabase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const isLoadedRef = useRef(false);

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

  useEffect(() => {
    if (currentData && !isLoadedRef.current) {
      setEnabled(currentData.enabled || false);
      const msg = currentData.message || 'Sistem sedang dalam masa perbaikan (Maintenance). Silakan coba beberapa saat lagi.';
      setMessage(msg);
      if (editorRef.current) {
        editorRef.current.innerHTML = msg;
      }
      isLoadedRef.current = true;
    } else if (currentData === null && !isLoadedRef.current) {
      const defaultMsg = 'Sistem sedang dalam masa perbaikan (Maintenance). Silakan coba beberapa saat lagi.';
      setMessage(defaultMsg);
      if (editorRef.current) {
        editorRef.current.innerHTML = defaultMsg;
      }
      isLoadedRef.current = true;
    }
  }, [currentData]);

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

  const handleSave = async () => {
    const currentMessage = editorRef.current?.innerHTML || message;
    const textOnly = editorRef.current?.textContent || '';

    if (enabled && !textOnly.trim()) {
      toast({ variant: 'destructive', title: 'Kesalahan', description: 'Pesan maintenance tidak boleh kosong.' });
      return;
    }

    setIsSaving(true);
    try {
      await set(ref(database!, 'settings/maintenance'), {
        enabled,
        message: currentMessage,
        updatedAt: Date.now(),
        updatedBy: user?.uid
      });
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
            </div>
            <Switch 
              checked={enabled} 
              onCheckedChange={setEnabled} 
              className={enabled ? "bg-red-500" : ""}
            />
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
                  ref={editorRef}
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
                      borderRadius: '18px',
                      padding: '24px',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                    }}
                    dangerouslySetInnerHTML={{ __html: message }}
                  />
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
