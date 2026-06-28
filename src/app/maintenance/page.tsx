'use client';

import React, { useEffect, useState } from 'react';
import { useDatabase, useObject, useMemoFirebase } from '@/firebase';
import { ref } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, LogOut, Wrench, Clock, ShieldAlert } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

export default function MaintenancePage() {
  const database = useDatabase();
  const router = useRouter();
  const auth = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  const maintenanceRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'settings/maintenance');
  }, [database]);

  const { data: maintenanceData, isLoading } = useObject(maintenanceRef);

  useEffect(() => {
    if (maintenanceData && typeof maintenanceData === 'object') {
      if (maintenanceData.enabled === false) {
        router.replace('/');
      }
    }
  }, [maintenanceData, router]);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
      </div>
    );
  }

  const message = maintenanceData?.message || 'Sistem sedang dalam masa perbaikan (Maintenance). Silakan coba beberapa saat lagi.';
  const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #0c4a6e 60%, #0f172a 100%)' }}>

      {/* Animated Background Orbs */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-120px', width: '400px', height: '400px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
        animation: 'pulse 4s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', left: '-100px', width: '350px', height: '350px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        animation: 'pulse 5s ease-in-out infinite 1s',
      }} />
      <div style={{
        position: 'absolute', top: '40%', left: '60%', width: '200px', height: '200px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)',
        animation: 'pulse 6s ease-in-out infinite 2s',
      }} />

      {/* Floating Grid Pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 max-w-lg w-full" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
        {/* Main Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(148, 163, 184, 0.12)',
          borderRadius: '28px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(59,130,246,0.08)',
        }}>
          {/* Top Accent Bar */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #3b82f6)',
            backgroundSize: '200% 100%',
            animation: 'gradientShift 3s ease infinite',
          }} />

          <div className="p-6 md:p-10">
            {/* Animated Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{
                position: 'relative',
                width: '80px', height: '80px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Rotating ring */}
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: '#3b82f6',
                  borderRightColor: '#8b5cf6',
                  animation: 'spin 3s linear infinite',
                }} />
                {/* Inner glow circle */}
                <div style={{
                  position: 'absolute', inset: '8px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))',
                  animation: 'pulse 2s ease-in-out infinite',
                }} />
                {/* Gear icon */}
                <Wrench style={{ width: '32px', height: '32px', color: '#60a5fa', animation: 'pulse 2s ease-in-out infinite' }} />
              </div>
            </div>

            {/* Title */}
            <h1 style={{
              textAlign: 'center',
              fontSize: '24px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #e2e8f0, #ffffff, #93c5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px',
            }}>
              Sedang Maintenance
            </h1>
            <p style={{
              textAlign: 'center',
              fontSize: '12px',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontWeight: 600,
              marginBottom: '20px',
            }}>
              Sistem dalam perbaikan
            </p>

            {/* Message Box */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(148, 163, 184, 0.08)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              maxHeight: '30vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <ShieldAlert style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Informasi
                </span>
              </div>
              <div style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#cbd5e1',
                margin: 0,
              }}
                dangerouslySetInnerHTML={{ __html: message }}
              />
            </div>

            {/* Live Status Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '100px', padding: '6px 12px',
              }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444',
                  boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#fca5a5' }}>Offline</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(148, 163, 184, 0.08)',
                border: '1px solid rgba(148, 163, 184, 0.12)',
                borderRadius: '100px', padding: '6px 12px',
              }}>
                <Clock style={{ width: '12px', height: '12px', color: '#94a3b8' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{formattedTime}</span>
              </div>
            </div>

            {/* Date */}
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#475569', marginBottom: '20px' }}>
              {formattedDate}
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  width: '100%', padding: '12px 20px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#ffffff',
                  border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.3)'; }}
              >
                <RefreshCw style={{ width: '16px', height: '16px' }} />
                Muat Ulang Halaman
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '12px 20px',
                  background: 'transparent',
                  color: '#64748b',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  borderRadius: '12px',
                  fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.08)'; e.currentTarget.style.color = '#94a3b8'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
              >
                <LogOut style={{ width: '16px', height: '16px' }} />
                Keluar Akun
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Credit */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#334155', marginTop: '24px', letterSpacing: '0.5px' }}>
          © 2026 SIMPU — Tim Software Taruna Bangsa
        </p>
      </div>

      {/* CSS Keyframes */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
