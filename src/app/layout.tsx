import type {Metadata} from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import {FirebaseClientProvider} from '@/firebase';
import {ClientLayout} from '@/components/client-layout';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SIMPU - Sistem Informasi Manajemen Pelaku Usaha',
  description: 'Pendataan dan verifikasi pelaku usaha UMKM yang modern dan efisien.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={poppins.className}>
      <body className="font-body antialiased bg-transparent">
        <FirebaseClientProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}

