'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  User, 
  PlusCircle, 
  ClipboardCheck, 
  MessageSquare, 
  Database,
  LogIn,
  Menu
} from 'lucide-react';
import { useUser } from '@/firebase';
import { useNavigation } from '@/hooks/use-navigation';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { isPetugas, isDinas, isVerifikatorDinas, isAdmin, isStaff } = useNavigation();

  // Do not show on login, fullscreen layar informasi, or survey portal
  if (pathname === '/login' || pathname?.startsWith('/layar-informasi')) {
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
        icon: PlusCircle,
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
      <nav className="md:hidden fixed bottom-2 left-3 right-3 z-50 bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/70 dark:border-white/10 rounded-3xl px-3 py-2 shadow-[0_8px_32px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {publicItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95',
                  item.highlight
                    ? 'text-primary font-black'
                    : item.active
                    ? 'text-primary font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-bold'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-2xl transition-all',
                    item.highlight
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 -mt-3.5 ring-4 ring-white/80 dark:ring-slate-900'
                      : item.active
                      ? 'bg-primary/15 text-primary'
                      : ''
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // Logged-in user nav items
  let centerAction = {
    label: 'Data UMKM',
    href: '/actor-data',
    icon: Database,
  };

  if (isPetugas) {
    centerAction = {
      label: 'Survey',
      href: '/portal-survey',
      icon: ClipboardCheck,
    };
  } else if (isDinas) {
    centerAction = {
      label: 'Survey',
      href: '/verifikasi-dinas',
      icon: ClipboardCheck,
    };
  } else if (isVerifikatorDinas) {
    centerAction = {
      label: 'Verif',
      href: '/verifikasi-dinas-berkas',
      icon: ClipboardCheck,
    };
  } else if (isAdmin || isStaff) {
    centerAction = {
      label: 'Input',
      href: '/input',
      icon: PlusCircle,
    };
  }

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
      label: centerAction.label,
      href: centerAction.href,
      icon: centerAction.icon,
      active: pathname === centerAction.href,
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
    <nav className="md:hidden fixed bottom-2 left-3 right-3 z-50 bg-white/80 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/70 dark:border-white/10 rounded-3xl px-2.5 py-1.5 shadow-[0_8px_32px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] print:hidden">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <div
                className={cn(
                  'p-2 rounded-2xl transition-all',
                  item.highlight
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 -mt-3.5 ring-4 ring-white/80 dark:ring-slate-900'
                    : item.active
                    ? 'bg-primary/15 text-primary'
                    : ''
                )}
              >
                <Icon className={cn('w-5 h-5', item.highlight && 'w-5.5 h-5.5')} />
              </div>
              <span
                className={cn(
                  'text-[9.5px] font-black uppercase tracking-wider mt-0.5 truncate max-w-[62px]',
                  item.active ? 'text-primary' : 'text-slate-600 dark:text-slate-400'
                )}
              >
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
                className={cn(
                  'flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 min-w-[56px] active:scale-95 outline-none',
                  item.active
                    ? 'text-primary font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-bold'
                )}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 min-w-[56px] active:scale-95',
                item.active
                  ? 'text-primary font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-bold'
              )}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
