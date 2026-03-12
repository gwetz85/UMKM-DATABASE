import type {Metadata} from 'next';
import './globals.css';
import {SidebarProvider} from '@/components/ui/sidebar';
import {AppSidebar} from '@/components/app-sidebar';
import {Toaster} from '@/components/ui/toaster';
import {FirebaseClientProvider} from '@/firebase';
import {FooterTicker} from '@/components/footer-ticker';

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
              <div className="flex flex-1 w-full overflow-hidden">
                <AppSidebar />
                <main className="flex-1 overflow-auto bg-background pb-12">
                  {children}
                </main>
              </div>
              <FooterTicker />
            </div>
          </SidebarProvider>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}