'use client';

import React, { useEffect } from 'react';
import { useDatabase, useObject, useMemoFirebase } from '@/firebase';
import { ref } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

export default function MaintenancePage() {
  const database = useDatabase();
  const router = useRouter();
  const auth = useAuth();

  const maintenanceRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/maintenance');
  }, [database]);

  const { data: maintenanceData, isLoading } = useObject(maintenanceRef);

  useEffect(() => {
    // If maintenance is turned off while the user is on this page, redirect them back to dashboard
    if (maintenanceData && typeof maintenanceData === 'object') {
      if (maintenanceData.enabled === false) {
        router.replace('/');
      }
    }
  }, [maintenanceData, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const message = maintenanceData?.message || 'Sistem sedang dalam masa perbaikan (Maintenance). Silakan coba beberapa saat lagi.';

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden text-center p-8 space-y-6">
        <div className="mx-auto w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Under Maintenance
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed font-medium">
          {message}
        </p>
        
        <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="w-full rounded-xl h-12"
          >
            Muat Ulang Halaman
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full rounded-xl h-12 text-slate-500 hover:text-slate-900"
          >
            Keluar Akun
          </Button>
        </div>
      </div>
    </div>
  );
}
