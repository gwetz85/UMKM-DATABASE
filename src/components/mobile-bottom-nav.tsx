'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Plus, 
  MessageSquare, 
  Menu,
  LogIn
} from 'lucide-react';
import { useUser } from '@/firebase';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { toggleSidebar, openMobile } = useSidebar();

  // Do not show on login, fullscreen layar informasi, or survey portal
  if (
    pathname === '/login' || 
    pathname?.startsWith('/layar-informasi') ||
    pathname === '/cek-daftar-hadir' ||
    pathname?.startsWith('/cek-daftar-hadir') ||
    pathname === '/daftar-hadir/cek' ||
    pathname?.startsWith('/daftar-hadir/cek')
  ) {
    return null;
  }

  // Public Nav Items (when user is not logged in)
  if (!user) {
    const publicItems = [
      {
        label: 'Cek Data',
        href: '/cek-data',
        icon: Search,
        active: pathname === '/cek-data' || pathname?.startsWith('/cek-data'),
        highlight: false,
      },
      {
        label: 'Daftar',
        href: '/daftar',
        icon: Plus,
        active: pathname === '/daftar' || pathname?.startsWith('/pendaftaran'),
        highlight: true,
      },
      {
        label: 'Login',
        href: '/login',
        icon: LogIn,
        active: pathname === '/login',
        highlight: false,
      },
    ];

    return (
      <nav 
        aria-label="Navigasi Bawah Publik"
        className="md:hidden fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-20px)] max-w-md bg-white/95 dark:bg-[#12211d]/95 backdrop-blur-xl border border-slate-200/90 dark:border-[#22382f] rounded-[24px] px-3 py-2 shadow-lg dark:shadow-2xl"
        style={{ bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="grid grid-cols-3 items-center">
          {publicItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center min-h-[44px] py-1 px-2 rounded-2xl transition-all duration-150 active:scale-95 select-none',
                  item.active ? 'text-[#0b5a48] dark:text-[#2fbf94] font-bold' : 'text-slate-600 dark:text-slate-400 font-semibold'
                )}
              >
                {item.highlight ? (
                  <div className="w-12 h-12 -mt-6 rounded-full bg-[#0b5a48] dark:bg-[#2fbf94] text-white dark:text-[#06231b] flex items-center justify-center shadow-lg border-4 border-slate-100 dark:border-[#0a1412] active:scale-95 transition-transform">
                    <Icon className="w-6 h-6 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className={cn(
                    'w-10 h-7 rounded-xl flex items-center justify-center transition-colors',
                    item.active ? 'bg-[#e2f1ea] dark:bg-[#17352c] text-[#0b5a48] dark:text-[#2fbf94]' : ''
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                )}
                <span className="text-[11px] font-bold mt-0.5 leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // 5 Logged-in items: Dashboard, Cek Data, Input (+ di tengah), Pesan, Menu
  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: Home,
      active: pathname === '/' || pathname === '/dashboard',
      highlight: false,
    },
    {
      label: 'Cek Data',
      href: '/check-data',
      icon: Search,
      active: pathname === '/check-data' || pathname === '/cek-data',
      highlight: false,
    },
    {
      label: 'Input',
      href: '/input',
      icon: Plus,
      active: pathname === '/input',
      highlight: true,
    },
    {
      label: 'Pesan',
      href: '/messages',
      icon: MessageSquare,
      active: pathname === '/messages',
      highlight: false,
    },
    {
      label: 'Menu',
      href: '#',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        toggleSidebar();
      },
      icon: Menu,
      active: openMobile,
      highlight: false,
    },
  ];

  return (
    <nav 
      aria-label="Navigasi Bawah SIMPU"
      className="md:hidden fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-16px)] max-w-[500px] bg-white/95 dark:bg-[#12211d]/95 backdrop-blur-xl border border-slate-200/90 dark:border-[#22382f] rounded-[24px] px-1 py-1.5 shadow-[0_12px_36px_-10px_rgba(11,90,72,0.25)] dark:shadow-[0_12px_36px_-10px_rgba(0,0,0,0.7)] print:hidden"
      style={{ bottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid grid-cols-5 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCurrentActive = item.active;

          const innerContent = (
            <>
              {item.highlight ? (
                <div 
                  className="w-12 h-12 -mt-5 rounded-full bg-[#0b5a48] dark:bg-[#2fbf94] text-white dark:text-[#06231b] flex items-center justify-center shadow-lg border-4 border-slate-100 dark:border-[#0a1412] active:scale-90 transition-transform"
                  aria-hidden="true"
                >
                  <Plus className="w-6 h-6 stroke-[2.8]" />
                </div>
              ) : (
                <div 
                  className={cn(
                    'w-10 h-7 rounded-xl flex items-center justify-center transition-colors',
                    isCurrentActive ? 'bg-[#e2f1ea] dark:bg-[#17352c] text-[#0b5a48] dark:text-[#2fbf94]' : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
              )}
              <span className={cn(
                'text-[10.5px] font-bold mt-0.5 leading-tight whitespace-nowrap',
                isCurrentActive ? 'text-[#0b5a48] dark:text-[#2fbf94] font-black' : 'text-slate-600 dark:text-slate-400'
              )}>
                {item.label}
              </span>
            </>
          );

          if ((item as any).onClick) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={(item as any).onClick}
                aria-label={item.label}
                className={cn(
                  'flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 outline-none select-none cursor-pointer',
                  isCurrentActive ? 'text-[#0b5a48] dark:text-[#2fbf94]' : 'text-slate-600 dark:text-slate-400'
                )}
              >
                {innerContent}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              className={cn(
                'flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-2xl transition-all duration-150 active:scale-95 select-none',
                isCurrentActive ? 'text-[#0b5a48] dark:text-[#2fbf94]' : 'text-slate-600 dark:text-slate-400'
              )}
            >
              {innerContent}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
