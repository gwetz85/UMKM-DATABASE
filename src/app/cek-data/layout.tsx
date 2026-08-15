import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cek Data & Validasi Pelaku Usaha UMKM | SIMPU',
  description: 'Layanan publik pengecekan status verifikasi dan data pelaku usaha UMKM secara transparan berdasarkan NIK, Nomor KK, Nama Lengkap, dan Nomor Ponsel.',
  keywords: ['cek data umkm', 'validasi umkm', 'simpu', 'dinas koperasi dan ukm', 'verifikasi data pelaku usaha']
}

export default function CekDataLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
