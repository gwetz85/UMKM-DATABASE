import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { logActivity, getDeviceType } from '@/lib/logger';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureAuth();

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const type = (searchParams.get('type') || 'nik').trim();

    if (!query) {
      return NextResponse.json({ success: true, count: 0, results: [] });
    }

    // Fetch all 5 database nodes in parallel
    const [actorsSnap, m25Snap, m24Snap, m23Snap, blSnap] = await Promise.all([
      get(ref(database, 'businessActors')).catch(() => null),
      get(ref(database, 'master_data_2025')).catch(() => null),
      get(ref(database, 'master_data_2024')).catch(() => null),
      get(ref(database, 'master_data_2023')).catch(() => null),
      get(ref(database, 'blacklist_data')).catch(() => null),
    ]);

    const normalizePhone = (p: any) => String(p || '').replace(/[^0-9]/g, '');

    const combined: any[] = [];

    // 1. Business Actors (Sistem SIMPU)
    if (actorsSnap && actorsSnap.exists()) {
      const val = actorsSnap.val();
      Object.keys(val).forEach((k) => {
        const m = val[k];
        combined.push({
          ...m,
          _id: k,
          _source: 'DATA PELAKU USAHA (SIMPU)',
          _sourceType: 'actors',
          _displayName: m.fullName || m.nama || '-',
          _displayNik: m.nik || '-',
          _displayKk: m.noKK || m.kk || '-',
          _displayPhone: m.phone || m.noHp || m.telepon || '-',
          _displayBusiness: m.businessName || m.usaha || '-',
          _displayStatus: m.status || 'pending',
          _displayNominal: m.lpjNominal || m.nominal || 0,
          _displayAddress: m.address || m.alamat || '-',
          _displayKelurahan: m.kelurahan || '-',
          _displayKecamatan: m.kecamatan || '-',
          _displayYear: m.createdAt ? new Date(m.createdAt).getFullYear().toString() : '2026',
        });
      });
    }

    // 2. Master Data 2025
    if (m25Snap && m25Snap.exists()) {
      const val = m25Snap.val();
      const list = Array.isArray(val) ? val : Object.values(val);
      list.filter(Boolean).forEach((m: any, idx) => {
        combined.push({
          ...m,
          _id: m.id || m.nik || `m25_${idx}`,
          _source: 'SHEET 2025',
          _sourceType: 'master_2025',
          _displayName: m.nama || m.fullName || '-',
          _displayNik: m.nik || '-',
          _displayKk: m.noKK || m.kk || '-',
          _displayPhone: m.phone || m.noHp || m.telepon || '-',
          _displayBusiness: m.usaha || m.businessName || '-',
          _displayStatus: m.status || 'Terdaftar',
          _displayNominal: m.nominal || m.lpjNominal || 0,
          _displayAddress: m.alamat || m.address || '-',
          _displayKelurahan: m.kelurahan || '-',
          _displayKecamatan: m.kecamatan || '-',
          _displayYear: m.tahunPengajuan || '2025',
        });
      });
    }

    // 3. Master Data 2024
    if (m24Snap && m24Snap.exists()) {
      const val = m24Snap.val();
      const list = Array.isArray(val) ? val : Object.values(val);
      list.filter(Boolean).forEach((m: any, idx) => {
        combined.push({
          ...m,
          _id: m.id || m.nik || `m24_${idx}`,
          _source: 'SHEET 2024',
          _sourceType: 'master_2024',
          _displayName: m.nama || m.fullName || '-',
          _displayNik: m.nik || '-',
          _displayKk: m.noKK || m.kk || '-',
          _displayPhone: m.phone || m.noHp || m.telepon || '-',
          _displayBusiness: m.usaha || m.businessName || '-',
          _displayStatus: m.status || 'Terdaftar',
          _displayNominal: m.nominal || m.lpjNominal || 0,
          _displayAddress: m.alamat || m.address || '-',
          _displayKelurahan: m.kelurahan || '-',
          _displayKecamatan: m.kecamatan || '-',
          _displayYear: m.tahunPengajuan || '2024',
        });
      });
    }

    // 4. Master Data 2023
    if (m23Snap && m23Snap.exists()) {
      const val = m23Snap.val();
      const list = Array.isArray(val) ? val : Object.values(val);
      list.filter(Boolean).forEach((m: any, idx) => {
        combined.push({
          ...m,
          _id: m.id || m.nik || `m23_${idx}`,
          _source: 'SHEET 2023',
          _sourceType: 'master_2023',
          _displayName: m.nama || m.fullName || '-',
          _displayNik: m.nik || '-',
          _displayKk: m.noKK || m.kk || '-',
          _displayPhone: m.phone || m.noHp || m.telepon || '-',
          _displayBusiness: m.usaha || m.businessName || '-',
          _displayStatus: m.status || 'Terdaftar',
          _displayNominal: m.nominal || m.lpjNominal || 0,
          _displayAddress: m.alamat || m.address || '-',
          _displayKelurahan: m.kelurahan || '-',
          _displayKecamatan: m.kecamatan || '-',
          _displayYear: m.tahunPengajuan || '2023',
        });
      });
    }

    // 5. Blacklist Data
    if (blSnap && blSnap.exists()) {
      const val = blSnap.val();
      const list = Array.isArray(val) ? val : Object.values(val);
      list.filter(Boolean).forEach((m: any, idx) => {
        combined.push({
          ...m,
          _id: m.id || m.nik || `bl_${idx}`,
          _source: 'DATA BLACKLIST / DITOLAK',
          _sourceType: 'blacklist',
          _displayName: m.nama || m.fullName || '-',
          _displayNik: m.nik || '-',
          _displayKk: m.noKK || m.kk || '-',
          _displayPhone: m.phone || m.noHp || m.telepon || '-',
          _displayBusiness: m.usaha || m.businessName || '-',
          _displayStatus: 'BLACKLIST / DITOLAK',
          _displayNominal: m.nominal || m.lpjNominal || 0,
          _displayAddress: m.alamat || m.address || '-',
          _displayKelurahan: m.kelurahan || '-',
          _displayKecamatan: m.kecamatan || '-',
          _displayYear: m.tahunPengajuan || '-',
        });
      });
    }

    const queryLower = query.toLowerCase();
    const queryDigits = query.replace(/[^0-9]/g, '');

    const filtered = combined.filter((item) => {
      if (type === 'nama') {
        const name = String(item._displayName || '').toLowerCase();
        return name.includes(queryLower);
      }

      if (type === 'nik') {
        const nikDigits = String(item._displayNik || '').replace(/[^0-9]/g, '');
        if (!nikDigits) return false;
        return nikDigits === queryDigits || (queryDigits.length >= 6 && nikDigits.includes(queryDigits));
      }

      if (type === 'noKK') {
        const kkDigits = String(item._displayKk || '').replace(/[^0-9]/g, '');
        if (!kkDigits) return false;
        return kkDigits === queryDigits || (queryDigits.length >= 6 && kkDigits.includes(queryDigits));
      }

      if (type === 'phone') {
        const phoneDigits = normalizePhone(item._displayPhone);
        if (!phoneDigits) return false;
        const qTrim = queryDigits.startsWith('62')
          ? queryDigits.slice(2)
          : queryDigits.startsWith('0')
          ? queryDigits.slice(1)
          : queryDigits;
        return phoneDigits.includes(qTrim) || (qTrim.length >= 5 && queryDigits.includes(phoneDigits.slice(-5)));
      }

      return false;
    });

    return NextResponse.json({
      success: true,
      count: filtered.length,
      results: filtered,
    });
  } catch (error: any) {
    console.error('Error in /api/cek-data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
