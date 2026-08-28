import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Layar Informasi & Monitoring Realtime | SIMPU',
  description: 'Pusat Informasi & Tampilan Layar Monitoring Statistik Data Pelaku Usaha UMKM secara Realtime.',
}

export default function LayarInformasiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
