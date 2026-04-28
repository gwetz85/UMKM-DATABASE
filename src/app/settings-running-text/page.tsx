'use client';

import React, { useState, useEffect } from 'react';
import { useDatabase, useObject, useMemoFirebase, useUser, useList } from '@/firebase';
import { ref, set } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Type, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsRunningText() {
  const database = useDatabase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [newText, setNewText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Periksa Role Admin
  const usersRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'system_users');
  }, [database]);
  const { data: allUsers, isLoading: usersLoading } = useList(usersRef);
  const myProfile = allUsers?.find((u: any) => u.uid === user?.uid);

  const textRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/running_text');
  }, [database]);

  const { data: currentData, isLoading: dataLoading } = useObject(textRef);

  useEffect(() => {
    if (currentData) {
      setNewText(typeof currentData === 'string' ? currentData : (currentData.text || ''));
    }
  }, [currentData]);

  if (usersLoading || dataLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (myProfile?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Akses Ditolak</h1>
        <p className="text-muted-foreground">Hanya Administrator yang dapat mengakses halaman ini.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Kembali ke Dashboard</Button>
      </div>
    );
  }

  const handleSave = async () => {
    if (!newText.trim()) {
      toast({ variant: 'destructive', title: 'Kesalahan', description: 'Teks tidak boleh kosong' });
      return;
    }

    setIsSaving(true);
    try {
      await set(ref(database!, 'settings/running_text'), {
        text: newText,
        updatedAt: Date.now(),
        updatedBy: user?.uid
      });
      toast({ title: 'Berhasil', description: 'Teks berjalan telah diperbarui' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultText = "SELAMAT DATANG DI APLIKASI SISTEM INFORMASI MANAJEMEN PELAKU USAHA TAHUN 2026 , APLIKASI INI BISA DI GUNAKAN UNTUK MELAKUKAN CEK DATA DAN PENGINPUTAN DATA PELAKU USAHA . SYSTEM KAMI AKAN MENDETEKSI SEMUA PERIHAL YANG DIKERJAKAN ATAU DIAKSES DI APLIKASI . PENGECEKKAN BISA DI LAKUKAN MELALUI BERBAGAI MACAM FITUR / JALUR PENGECEKKAN";
    setNewText(defaultText);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-primary text-white p-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Type className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight">Pengaturan Teks Berjalan</CardTitle>
              <CardDescription className="text-white/70 font-medium">Ubah informasi yang muncul pada bar bagian bawah aplikasi.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Konten Teks</label>
            <Textarea 
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Masukkan teks di sini..."
              className="min-h-[150px] rounded-2xl border-slate-100 bg-slate-50/50 focus:ring-primary focus:border-primary text-sm font-semibold p-4 leading-relaxed"
            />
          </div>

          <div className="bg-blue-50 border-l-4 border-primary p-4 rounded-r-xl">
            <p className="text-[11px] text-blue-900 font-bold leading-relaxed uppercase italic">
              * Teks ini akan otomatis muncul di bagian paling bawah layar untuk seluruh pengguna secara real-time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
              Simpan Perubahan
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-slate-400 border-slate-100 hover:bg-slate-50"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset Default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
