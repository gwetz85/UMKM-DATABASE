import type {Metadata, Viewport} from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import {FirebaseClientProvider} from '@/firebase';
import {ClientLayout} from '@/components/client-layout';
import {PwaRegister} from '@/components/pwa-register';
import {ThemeProvider} from '@/components/theme-provider';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0b5a48',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'SIMPU - Sistem Informasi Manajemen Pelaku Usaha',
  description: 'Pendataan dan verifikasi pelaku usaha UMKM yang modern, responsif, dan efisien.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SIMPU',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${plusJakartaSans.className}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-primary">
        <FirebaseClientProvider>
          <ThemeProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
            <Toaster />
            <PwaRegister />
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
