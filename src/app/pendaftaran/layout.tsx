import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pendaftaran Pelaku Usaha UMKM 2026 | SIMPU',
  description: 'Formulir online pendaftaran dan pengajuan bantuan pelaku usaha UMKM Kota Tanjungpinang Tahun 2026 secara mandiri dan transparan.',
  keywords: ['pendaftaran umkm', 'form umkm', 'tunas bangsa', 'simpu', 'dinas koperasi dan ukm tanjungpinang', 'bantuan umkm 2026']
};

export default function PendaftaranLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
