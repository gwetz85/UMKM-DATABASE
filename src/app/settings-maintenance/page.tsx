'use client';

import React, { useState, useEffect } from 'react';
import { useDatabase, useObject, useMemoFirebase, useUser, useList } from '@/firebase';
import { ref, set } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';

export default function SettingsMaintenance() {
  const database = useDatabase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    if (currentData) {
      setEnabled(currentData.enabled || false);
      setMessage(currentData.message || 'Sistem sedang dalam masa perbaikan (Maintenance). Silakan coba beberapa saat lagi.');
    } else if (currentData === null) {
      setMessage('Sistem sedang dalam masa perbaikan (Maintenance). Silakan coba beberapa saat lagi.');
    }
  }, [currentData]);

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
    if (enabled && !message.trim()) {
      toast({ variant: 'destructive', title: 'Kesalahan', description: 'Pesan maintenance tidak boleh kosong.' });
      return;
    }

    setIsSaving(true);
    try {
      await set(ref(database!, 'settings/maintenance'), {
        enabled,
        message,
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
            <h3 className="text-lg font-bold">Pesan Peringatan (Opsional)</h3>
            <p className="text-sm text-muted-foreground">Tuliskan pesan yang akan dibaca oleh user saat mereka mengunjungi aplikasi.</p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contoh: Kami sedang melakukan perbaikan server..."
              className="min-h-[150px] p-4 text-base rounded-2xl resize-none shadow-sm focus-visible:ring-red-500"
            />
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
