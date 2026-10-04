'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, Database, Mail, MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';

interface SystemInfoWidgetProps {
  systemConfig?: any;
  profile?: any;
  user?: any;
  className?: string;
}

export function SystemInfoWidget({ systemConfig, profile, user, className }: SystemInfoWidgetProps) {
  const appName = systemConfig?.appName || 'SIMPU';
  const version = systemConfig?.version || '9.8 PRO';
  const userName = profile?.fullName || user?.email?.split('@')[0] || 'User';
  const roleName = profile?.role ? profile.role.toUpperCase() : 'STAFF';
  const totalPembanding = systemConfig?.totalPembanding || '0 Data';
  const adminEmail = systemConfig?.adminEmail || 'simputeam@gmail.com';
  const rawWa = systemConfig?.adminWhatsapp || '62817319885';
  const waUrl = rawWa.startsWith('http') 
    ? rawWa 
    : `https://wa.me/${rawWa.replace(/\D/g, '')}`;

  return (
    <div
      className={cn(
        "w-72 bg-white/75 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-white/70 dark:border-white/10 shadow-[0_8px_30px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-primary/40 group",
        className
      )}
    >
      {/* Top Banner / System Branding */}
      <div className="p-3 pb-2.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white/60 dark:from-slate-800/80 dark:via-slate-800/40 dark:to-slate-900/60 border-b border-white/70 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 ring-2 ring-white/80 dark:ring-slate-800 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                  {appName}
                </span>
                <span className="text-[9px] font-black tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/60 px-1.5 py-0.5 rounded-full shadow-xs">
                  {version}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[8.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                  Sistem Aktif
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 text-[9px] font-black">
            <CheckCircle2 className="w-3 h-3" />
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* Info Rows */}
      <div className="p-3 space-y-2.5 bg-white/40 dark:bg-slate-900/40">
        {/* User Card */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/70 dark:border-white/10 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6.5 h-6.5 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[8.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block leading-none">
                Pengguna
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white truncate block uppercase leading-tight mt-0.5" title={userName}>
                {userName}
              </span>
            </div>
          </div>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-100 uppercase tracking-wider shrink-0 border border-slate-300/60 dark:border-slate-600">
            {roleName}
          </span>
        </div>

        {/* Data Pembanding Metric */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-blue-50/50 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100/80 dark:border-indigo-900/40 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[8.5px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block leading-none">
                Data Pembanding
              </span>
              <span className="text-[12px] font-black text-indigo-950 dark:text-indigo-100 uppercase tracking-tight block leading-tight mt-0.5">
                {totalPembanding}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-12 bg-indigo-200/60 dark:bg-indigo-900/60 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full w-3/4"></div>
          </div>
        </div>
      </div>

      {/* Support & Admin Contact Quick Bar */}
      <div className="p-2.5 px-3 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md border-t border-white/70 dark:border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <a
            href={`mailto:${adminEmail}`}
            className="flex items-center gap-1.5 text-[9.5px] font-bold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors truncate group/mail"
            title={`Hubungi Admin: ${adminEmail}`}
          >
            <div className="w-5.5 h-5.5 rounded-lg bg-white dark:bg-slate-700 shadow-xs border border-slate-200/80 dark:border-slate-600 flex items-center justify-center group-hover/mail:text-primary group-hover/mail:border-primary/40 transition-colors shrink-0">
              <Mail className="w-3 h-3" />
            </div>
            <span className="truncate max-w-[130px] font-semibold">{adminEmail}</span>
          </a>
        </div>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-[9.5px] uppercase tracking-wider shadow-sm shadow-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/30 active:scale-95 transition-all shrink-0"
          title="Chat WhatsApp Admin"
        >
          <MessageSquare className="w-3 h-3" />
          <span>WA</span>
        </a>
      </div>
    </div>
  );
}
