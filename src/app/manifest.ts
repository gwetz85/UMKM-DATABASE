import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SIMPU - Sistem Informasi Manajemen Pelaku Usaha',
    short_name: 'SIMPU',
    description: 'Pendataan dan verifikasi pelaku usaha UMKM yang modern dan efisien.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/logo.png',
        sizes: 'any',
        type: 'image/png',
      }
    ],
  };
}
