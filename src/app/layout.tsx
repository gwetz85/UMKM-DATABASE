import type {Metadata} from 'next';
import './globals.css';
import {SidebarProvider, SidebarTrigger} from '@/components/ui/sidebar';
import {AppSidebar} from '@/components/app-sidebar';
import {Toaster} from '@/components/ui/toaster';
import {FirebaseClientProvider} from '@/firebase';
import {Building2} from 'lucide-react';

export const metadata: Metadata = {
  title: 'UMKM Database - Sistem Manajemen Terpadu',
  description: 'Pendataan dan verifikasi pelaku usaha UMKM yang modern dan efisien.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background">
        <FirebaseClientProvider>
          <SidebarProvider>
            <div className="flex flex-col min-h-screen w-full overflow-hidden">
              {/* Mobile Header */}
              <header className="flex md:hidden items-center justify-between px-4 h-14 bg-sidebar text-white shrink-0 z-30 shadow-md print:hidden">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="text-white hover:bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-xs font-black tracking-tight leading-none">UMKM DATABASE</span>
                    <span className="text-[8px] font-bold text-accent tracking-widest uppercase">Versi 3.1</span>
                  </div>
                </div>
                <div className="bg-accent/20 p-1.5 rounded-lg">
                  <Building2 className="w-4 h-4 text-accent" />
                </div>
              </header>

              <div className="flex flex-1 w-full overflow-hidden">
                <div className="print:hidden">
                  <AppSidebar />
                </div>
                <main className="flex-1 overflow-auto bg-background print:bg-white">
                  {/* Desktop Sidebar Trigger */}
                  <div className="hidden md:flex p-4 items-center print:hidden">
                    <SidebarTrigger className="text-primary hover:bg-primary/10" />
                  </div>
                  <div className="w-full">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
