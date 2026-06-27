"use client"

import React, { useState } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { Loader2, Database, ArrowRight, CheckCircle2, ShieldAlert, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function MigrationPage() {
  const { firebaseApp, database } = useFirebase();
  const { user } = useUser();
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);

  const startMigration = () => {
    if (!firebaseApp || !database) return;
    setShowMigrateDialog(true);
  };

  const confirmStartMigration = async () => {
    if (!firebaseApp || !database) return;

    setIsMigrating(true);
    setStatus('running');
    setProgress(['Mempersiapkan koneksi lintas-database...']);
    
    try {
      // 1. Initialize old Firestore
      const firestore = getFirestore(firebaseApp);
      
      const log = (msg: string) => setProgress(prev => [...prev, msg]);

      // 2. Helper function to migrate a collection
      const migrateCollection = async (collectionName: string) => {
        log(`Membaca koleksi Firestore: ${collectionName}...`);
        const snapshot = await getDocs(collection(firestore, collectionName));
        
        let count = 0;
        const updates: Promise<void>[] = [];
        
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          const docId = docSnap.id;
          
          // Write to Realtime Database
          const dbRef = ref(database, `${collectionName}/${docId}`);
          updates.push(set(dbRef, docData));
          count++;
        });

        await Promise.all(updates);
        log(`✅ Berhasil memindahkan ${count} data dari ${collectionName}`);
      };

      // 3. Run Migrations
      await migrateCollection('system_users');
      await migrateCollection('roles_admin');
      await migrateCollection('businessActors');
      await migrateCollection('master_data');
      
      log('Semua proses migrasi SELESAI!');
      setStatus('success');
    } catch (error: any) {
      console.error(error);
      setProgress(prev => [...prev, `❌ ERROR: ${error.message}`]);
      setStatus('error');
    } finally {
      setIsMigrating(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <ShieldAlert size={64} className="text-destructive animate-pulse mb-4" />
        <h2 className="text-2xl font-black">Akses Ditolak</h2>
        <p className="text-muted-foreground">Silakan login sebagai Super Admin.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pt-10 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-primary flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" /> 
          Pusat Migrasi Data Database
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">Alat eksklusif untuk menyedot semua data lama di Firestore ke Realtime Database baru.</p>
      </div>

      <Card className="glass hover:shadow-xl transition-all border-orange-200 bg-orange-50/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            Firestore <ArrowRight className="text-slate-400" /> Realtime Database
          </CardTitle>
          <CardDescription>Pemindahan ini mencakup Akun User, Role (Kewenangan Admin), Data UMKM, dan Master Data Bank.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm mb-6">
            <h3 className="font-bold text-slate-800 mb-3">Live Log Proses:</h3>
            <div className="bg-slate-900 rounded-xl p-4 min-h-[150px] max-h-[300px] overflow-y-auto font-mono text-sm shadow-inner">
              {progress.length === 0 && (
                <span className="text-slate-500 italic">Menunggu perintah eksekusi...</span>
              )}
              {progress.map((msg, i) => (
                <div key={i} className={`mb-1 ${msg.includes('✅') ? 'text-emerald-400 font-bold' : msg.includes('❌') ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                  &gt; {msg}
                </div>
              ))}
              {isMigrating && (
                <div className="text-blue-400 animate-pulse mt-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end relative">
            {status === 'success' ? (
              <div className="bg-emerald-100 text-emerald-700 font-bold px-6 py-3 rounded-xl flex items-center gap-2 animate-in fade-in zoom-in">
                <CheckCircle2 className="w-5 h-5" /> Migrasi Selesai & Sukses!
              </div>
            ) : (
              <button
                onClick={startMigration}
                disabled={isMigrating}
                className={`bg-orange-600 hover:bg-orange-700 text-white font-black px-8 py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 ${isMigrating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isMigrating ? (
                  <>Menyedot Data <Loader2 className="w-5 h-5 animate-spin" /></>
                ) : (
                  <>MULAI MIGRASI OTOMATIS SEKARANG</>
                )}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showMigrateDialog}
        onOpenChange={setShowMigrateDialog}
        icon={<AlertCircle className="w-6 h-6" />}
        title="Konfirmasi Migrasi Data"
        description="Yakin ingin memulai penyedotan data dari database lama (Firestore) ke baru (RTDB)? Operasi ini mungkin menimpa data yang ada di RTDB Anda saat ini."
        confirmText="Ya, Mulai Migrasi"
        confirmIcon={<AlertCircle className="w-4 h-4" />}
        variant="destructive"
        onConfirm={confirmStartMigration}
        isLoading={isMigrating}
      />
    </div>
  );
}
