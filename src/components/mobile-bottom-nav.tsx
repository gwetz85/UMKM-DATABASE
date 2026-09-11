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
  LogIn
} from 'lucide-react';
import { useUser } from '@/firebase';
import { useNavigation } from '@/hooks/use-navigation';
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-4 py-2 shadow-lg pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {publicItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200',
                  item.highlight
                    ? 'text-primary font-bold'
                    : item.active
                    ? 'text-primary font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                )}
              >
                <div
                  className={cn(
                    'p-1.5 rounded-xl transition-all',
                    item.highlight
                      ? 'bg-primary text-white shadow-md shadow-primary/30 -mt-3'
                      : item.active
                      ? 'bg-primary/10 text-primary'
                      : ''
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
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
      label: 'Menu',
      href: '/',
      icon: Home,
      active: pathname === '/',
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
      label: 'Profil',
      href: '/profile',
      icon: User,
      active: pathname === '/profile',
      highlight: false,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 shadow-lg pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] print:hidden">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 min-w-[56px]',
                item.active
                  ? 'text-primary font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-all',
                  item.highlight
                    ? 'bg-primary text-white shadow-md shadow-primary/30 -mt-3.5 ring-4 ring-white dark:ring-slate-900'
                    : item.active
                    ? 'bg-primary/10 text-primary'
                    : ''
                )}
              >
                <Icon className={cn('w-5 h-5', item.highlight && 'w-6 h-6')} />
              </div>
              <span
                className={cn(
                  'text-[9px] tracking-tight mt-0.5 truncate max-w-[62px]',
                  item.active && 'text-primary font-bold'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
