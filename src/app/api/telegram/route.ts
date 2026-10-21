import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, push, set } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { logActivity } from '@/lib/logger';
import { normalizeCoordinator } from '@/lib/coordinator-utils';
import { 
  isCancelDinas, 
  isVerifiedStatus, 
  recalculateAndSaveSystemStats, 
  updateStatsOnNewActor,
  SystemStats 
} from '@/lib/stats-service';
import { formatCurrency, resolveRtRw, resolveKelurahan, resolveKecamatan } from '@/lib/utils';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

// Helper function to resolve actor status cleanly & accurately matching SIMPU Web
function getStatusDetails(r: any) {
  const isCancel = isCancelDinas(r);
  if (isCancel) {
    return {
      emoji: "🚫",
      label: "CANCEL DINAS",
      detail: r.alasanCancelDinas ? `Tidak Lolos (${r.alasanCancelDinas})` : "Tidak Lolos Verifikasi Dinas",
      menu: "🚫 Cancel Dinas"
    };
  }

  const s = (r.status || 'pending').toLowerCase();
  if (s === 'rejected') {
    return {
      emoji: "❌",
      label: "DITOLAK ADMIN",
      detail: r.rejectionReason || "Ditolak saat Verifikasi Pendaftaran",
      menu: "❌ Ditolak / Cancell"
    };
  }
  if (s === 'pending') {
    return {
      emoji: "⏳",
      label: "PENDING",
      detail: "Menunggu Verifikasi Admin",
      menu: "📥 Verifikasi Admin"
    };
  }
  if (s === 'verified_actor' || s === 'lpj_pending') {
    return {
      emoji: "📋",
      label: "TAHAP 1: SURVEY LAPANGAN",
      detail: r.petugasSurvey ? `Petugas: ${r.petugasSurvey}` : "Menunggu Survey Petugas",
      menu: "📋 Portal Survey"
    };
  }
  if (s === 'verified_dinas') {
    if (r.berkasDinasVerified) {
      return {
        emoji: "🎉",
        label: "TAHAP 3: HASIL VERIFIKASI (LOLOS FINAL)",
        detail: "Berkas Dinas Lengkap & Terverifikasi",
        menu: "📑 Hasil Verifikasi"
      };
    }
    return {
      emoji: "🔍",
      label: "TAHAP 2: VERIFIKASI BERKAS DINAS",
      detail: "Survey Lolos, Menunggu Cek Berkas Fisik",
      menu: "📋 Verifikasi Dinas"
    };
  }
  if (s === 'bank_pending') {
    return {
      emoji: "🏦",
      label: "VERIFIKASI BANK",
      detail: r.bankNumber ? `Rek: ${r.bankName || ''} ${r.bankNumber}` : "Menunggu Penginputan Buku Tabungan",
      menu: "🏦 Data Rekening"
    };
  }
  if (s === 'finish') {
    if (r.readyForLPJ && !r.lpjNominal) {
      return {
        emoji: "📄",
        label: "MENUNGGU LPJ",
        detail: "Bantuan Telah Cair, Menunggu Dokumen LPJ",
        menu: "📄 LPJ"
      };
    }
    return {
      emoji: "🏁",
      label: "TAHAP 4: PROSES SELESAI (FINISH)",
      detail: "Seluruh Tahapan Berhasil Selesai",
      menu: "🏁 Selesai"
    };
  }
  if (s === 'dihapus_dinas') {
    return {
      emoji: "🗑️",
      label: "DIHAPUS DINAS",
      detail: "Data dihapus dari antrean dinas",
      menu: "📂 Arsip"
    };
  }
  return {
    emoji: "⚪",
    label: s.toUpperCase().replace(/_/g, ' '),
    detail: "-",
    menu: "📂 Menu Terkait"
  };
}

// Helper function to safely send message back to Telegram with chunking and Markdown error fallback
async function sendMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is not set!");
    return;
  }

  // Telegram limit is 4096 characters. Chunk around ~3800 chars safely.
  const MAX_LEN = 3800;
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_LEN) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\n\n', MAX_LEN);
    if (splitIdx === -1 || splitIdx < 1000) {
      splitIdx = remaining.lastIndexOf('\n', MAX_LEN);
    }
    if (splitIdx === -1 || splitIdx < 1000) {
      splitIdx = MAX_LEN;
    }
    chunks.push(remaining.substring(0, splitIdx));
    remaining = remaining.substring(splitIdx).trim();
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  for (const chunk of chunks) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        // Fallback without parse_mode if Markdown parsing failed (e.g. unescaped characters in names/addresses)
        const fallbackRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: chunk
          })
        });
        if (!fallbackRes.ok) {
          const errorData = await fallbackRes.json();
          console.error("Telegram API Error:", errorData);
        }
      }
    } catch (error) {
      console.error("Error sending message to Telegram:", error);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const body = await req.json();
    
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id;
      const text = body.message.text.trim();
      
      console.log(`Received message from ${chatId}: ${text}`);

      // Log Every Interaction
      await logActivity({
        query: `BOT MSG: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
        results: "Diproses",
        device: 'Bot',
        source: 'Telegram',
        method: 'INTERAKSI BOT',
        chatId: String(chatId)
      });

      if (text.startsWith('/start') || text.startsWith('/help')) {
        const reply = `Selamat datang di *Bot UMKM Database SIMPU* 🏬\n\n` +
                      `Bot ini terhubung langsung secara real-time dengan database aplikasi SIMPU.\n\n` +
                      `✅ *Menu Perintah:*\n` +
                      `📊 /stats - Ringkasan statistik resmi SIMPU\n` +
                      `📊 /kuota - Cek kuota koordinator (Sinkron Web)\n` +
                      `🔍 /search [kata] - Pencarian umum\n` +
                      `🆔 /code [nomor] - Cek Kode Registrasi\n` +
                      `📌 /nik [nomor] - Cari berdasar NIK\n` +
                      `👤 /nama [nama] - Cari berdasar Nama\n` +
                      `📍 /alamat [kata] - Cari berdasar Alamat\n` +
                      `📱 /hp [nomor] - Cari berdasar No. HP\n` +
                      `🏢 /koor [nama] - Cari berdasar Koordinator\n` +
                      `✅ /cekdata [kata] - Cek Nama, NIK, No. KK (Sheet 1-4 & Data 2026)\n` +
                      `📝 /inputdata - Form input pendaftaran baru\n` +
                      `ℹ️ /about - Informasi Aplikasi SIMPU`;
        await sendMessage(chatId, reply);
      } 
      else if (text.startsWith('/about')) {
        const configRef = ref(database, 'settings/system_config');
        const configSnap = await get(configRef);
        const config = configSnap.exists() ? configSnap.val() : {};
        
        const currentVersion = config.version || "Versi 8.1";
        const copyright = config.copyright || "AGUS SURIYADI";

        const reply = `🏛️ *INFORMASI APLIKASI*\n` +
                      `*${currentVersion.toUpperCase()}*\n\n` +
                      `Selamat datang di Aplikasi *SIMPU*\n` +
                      `_SISTEM INFORMASI MANAJEMEN PELAKU USAHA_\n\n` +
                      `"Aplikasi ini dikembangkan secara Mandiri dan Independent oleh Tim Admin yang bekerja. Hak Cipta Sepenuhnya dimiliki oleh *${copyright}* sebagai Pembuat dan Pengembang Aplikasi."\n\n` +
                      `🚀 *Fitur Integrasi Bot:*\n` +
                      `▫️ Sinkronisasi statistik real-time dengan web dashboard\n` +
                      `▫️ Pengecekan kuota koordinator otomatis\n` +
                      `▫️ Pencarian data pelaku usaha terintegrasi\n` +
                      `▫️ Pengecekan ganda NIK/KK terhadap SIMPU & Database Master\n\n` +
                      `✉️ *Kontak Pengembang:*\n` +
                      `👤 *${copyright}*\n` +
                      `📧 agussuriyadipunya@gmail.com\n` +
                      `📱 [0817319885](https://wa.me/62817319885)\n\n` +
                      `© ${new Date().getFullYear()} SIMPU - All Rights Reserved`;
        await sendMessage(chatId, reply);
      } 
      else if (text.startsWith('/stats')) {
        await sendMessage(chatId, "⏳ _Sedang mengambil data statistik resmi SIMPU..._");
        
        let statsSnap = await get(ref(database, 'system_stats'));
        let stats: SystemStats | null = statsSnap.exists() ? statsSnap.val() : null;

        if (!stats || !stats.totalActors) {
          stats = await recalculateAndSaveSystemStats(database);
        }

        if (stats) {
          const total = stats.totalActors || 0;
          const verified = stats.status?.verified || 0;
          const rejected = stats.status?.rejected || 0;
          const pending = stats.status?.pending || 0;

          const detailed = stats.detailedStatus || { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 };
          const verifiedGender = stats.verifiedGender || { 'Laki-laki': 0, 'Perempuan': 0 };

          const updatedDate = stats.lastUpdated 
            ? new Date(stats.lastUpdated).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'
            : '-';

          const reply = `📈 *STATISTIK RESMI SISTEM SIMPU*\n` +
                        `🕒 _Pembaruan: ${updatedDate}_\n\n` +
                        `📊 *Total Data Diproses:* *${total}*\n` +
                        `_(Total Terverifikasi + Cancell/Ditolak)_\n\n` +
                        `✅ *Terverifikasi:* *${verified}*\n` +
                        `❌ *Cancell / Ditolak:* *${rejected}*\n` +
                        `⏳ *Pending (Baru):* *${pending}*\n\n` +
                        `📋 *Rincian Tahapan Verifikasi:*\n` +
                        `▫️ Tahap 1 (Survey Lapangan): *${detailed.survey || 0}*\n` +
                        `▫️ Tahap 2 (Verifikasi Berkas): *${detailed.verifikasi || 0}*\n` +
                        `▫️ Tahap 3 (Hasil Verifikasi): *${detailed.hasilVerifikasi || 0}*\n` +
                        `▫️ Tahap 4 (Selesai / Finish): *${detailed.selesai || 0}*\n` +
                        `▫️ Menunggu LPJ: *${detailed.lpj || 0}*\n\n` +
                        `👥 *Gender Pelaku Terverifikasi:*\n` +
                        `▫️ Laki-laki: *${verifiedGender['Laki-laki'] || 0}*\n` +
                        `▫️ Perempuan: *${verifiedGender['Perempuan'] || 0}*\n\n` +
                        `_Data tersinkronisasi 100% dengan Dashboard Web SIMPU._`;

          await sendMessage(chatId, reply);

          await logActivity({
            query: 'Cek Statistik',
            results: `Total: ${total}`,
            device: 'Bot',
            source: 'Telegram',
            method: 'STATISTIK',
            chatId: String(chatId)
          });
        } else {
          await sendMessage(chatId, "⚠️ Gagal memuat statistik database.");
        }
      }
      else if (text.startsWith('/kuota')) {
        await sendMessage(chatId, `⏳ _Mengambil data kuota koordinator..._`);
        
        const [quotaSnap, statsSnap] = await Promise.all([
          get(ref(database, 'koordinator_kuotas')),
          get(ref(database, 'system_stats'))
        ]);

        let stats = statsSnap.exists() ? statsSnap.val() : null;
        if (!stats || !stats.coordinator) {
          stats = await recalculateAndSaveSystemStats(database);
        }

        const achievedMap: Record<string, number> = stats?.coordinator || {};
        const rekeningMap: Record<string, number> = stats?.coordinatorRekening || {};

        if (quotaSnap.exists()) {
          const quotaData = Object.values(quotaSnap.val()) as any[];
          
          const combined = quotaData.filter(Boolean).map((q: any) => {
            const rawName = q.name ? String(q.name).trim() : 'Unnamed';
            const nameUpper = rawName.toUpperCase();
            const nameNormalized = normalizeCoordinator(rawName).toUpperCase().trim();

            const limit = Number(q.quota ?? 0);
            const used = (achievedMap[nameNormalized] !== undefined) 
              ? achievedMap[nameNormalized] 
              : (achievedMap[nameUpper] || 0);
            const rek = (rekeningMap[nameNormalized] !== undefined)
              ? rekeningMap[nameNormalized]
              : (rekeningMap[nameUpper] || 0);
            const remaining = limit - used;

            return {
              name: rawName,
              limit,
              used,
              rek,
              remaining
            };
          }).sort((a, b) => a.name.localeCompare(b.name));

          const habis = combined.filter(c => c.remaining <= 0);
          const belumHabis = combined.filter(c => c.remaining > 0 && c.used > 0);
          const belumTerinput = combined.filter(c => c.remaining > 0 && c.used === 0);

          const now = new Date();
          const hari = now.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
          const tanggal = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
          const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).replace(/\./g, ':') + ' WIB';

          let reply = `📊 *PENGECEKKAN KUOTA KOORDINATOR*\n` +
                      `📅 ${hari}, ${tanggal} - ${jam}\n\n`;

          reply += `🔴 *Koordinator Yang Kuotanya Habis:*\n`;
          if (habis.length > 0) {
            habis.forEach((c) => {
              reply += `▫️ ${c.name} (${c.used} / ${c.limit})\n`;
            });
            const totalHabisQuota = habis.reduce((acc, c) => acc + c.limit, 0);
            reply += `*Total: ${habis.length} Koordinator (${totalHabisQuota} Kuota)*\n\n`;
          } else {
            reply += `_Tidak ada_\n\n`;
          }

          reply += `🟡 *Koordinator Kuota Belum Habis:*\n`;
          if (belumHabis.length > 0) {
            belumHabis.forEach((c) => {
              reply += `▫️ ${c.name} (Terpakai: ${c.used} / Kuota: ${c.limit} | Sisa: ${c.remaining})\n`;
            });
            const totalBelumHabisUsed = belumHabis.reduce((acc, c) => acc + c.used, 0);
            const totalBelumHabisQuota = belumHabis.reduce((acc, c) => acc + c.limit, 0);
            reply += `*Total: ${belumHabis.length} Koordinator (${totalBelumHabisUsed} / ${totalBelumHabisQuota} Kuota)*\n\n`;
          } else {
            reply += `_Tidak ada_\n\n`;
          }

          reply += `⚪ *Koordinator Belum Ada Input:*\n`;
          if (belumTerinput.length > 0) {
            belumTerinput.forEach((c) => {
              reply += `▫️ ${c.name} (Kuota: ${c.limit})\n`;
            });
            const totalBelumTerinputQuota = belumTerinput.reduce((acc, c) => acc + c.limit, 0);
            reply += `*Total: ${belumTerinput.length} Koordinator (${totalBelumTerinputQuota} Kuota)*\n\n`;
          } else {
            reply += `_Tidak ada_\n\n`;
          }

          const grandTotalQuota = combined.reduce((acc, c) => acc + c.limit, 0);
          const grandTotalUsed = combined.reduce((acc, c) => acc + c.used, 0);
          const grandTotalRemaining = grandTotalQuota - grandTotalUsed;

          reply += `📈 *TOTAL KESELURUHAN:*\n` +
                   `▫️ Total Kuota: *${grandTotalQuota}*\n` +
                   `▫️ Total Terpakai: *${grandTotalUsed}*\n` +
                   `▫️ Sisa Kuota: *${grandTotalRemaining}*\n\n` +
                   `_Sinkron 100% dengan menu Kuota Koordinator SIMPU._`;

          await sendMessage(chatId, reply);

          await logActivity({
            query: 'Cek Kuota Koordinator',
            results: `Berhasil Tampil (${grandTotalUsed}/${grandTotalQuota})`,
            device: 'Bot',
            source: 'Telegram',
            method: 'CEK KUOTA',
            chatId: String(chatId)
          });
        } else {
          await sendMessage(chatId, "⚠️ Tidak ada data kuota yang terdaftar.");
        }
      }
      else if (text.startsWith('/search') || text.startsWith('/nik') || text.startsWith('/nama') || text.startsWith('/alamat') || text.startsWith('/hp') || text.startsWith('/koor') || text.startsWith('/code')) {
        let keyword = '';
        let type = '';
        if (text.startsWith('/search')) { keyword = text.replace('/search', '').trim().toLowerCase(); type = 'search'; }
        else if (text.startsWith('/nik')) { keyword = text.replace('/nik', '').trim().toLowerCase(); type = 'nik'; }
        else if (text.startsWith('/nama')) { keyword = text.replace('/nama', '').trim().toLowerCase(); type = 'nama'; }
        else if (text.startsWith('/alamat')) { keyword = text.replace('/alamat', '').trim().toLowerCase(); type = 'alamat'; }
        else if (text.startsWith('/hp')) { keyword = text.replace('/hp', '').trim().toLowerCase(); type = 'hp'; }
        else if (text.startsWith('/koor')) { keyword = text.replace('/koor', '').trim().toLowerCase(); type = 'koor'; }
        else if (text.startsWith('/code')) { keyword = text.replace('/code', '').trim().toLowerCase(); type = 'code'; }

        if (!keyword) {
          let example = type === 'search' ? 'bengkel' : (type === 'nik' || type === 'hp') ? '08123' : type === 'alamat' ? 'pemuda' : 'agus';
          await sendMessage(chatId, `Ketikkan kata kunci di sebelah perintah. Contoh: \`/${type} ${example}\``);
          return NextResponse.json({ ok: true });
        }
        
        await sendMessage(chatId, `⏳ _Mencari data dengan kata kunci "${keyword}"..._`);
        
        const actorsRef = ref(database, 'businessActors');
        const snapshot = await get(actorsRef);
        
        if (snapshot.exists()) {
          const raw = snapshot.val();
          const cleanKw = keyword.replace(/[^0-9]/g, '');
          const normalizedTargetKoor = normalizeCoordinator(keyword).toLowerCase();

          const results: any[] = [];
          Object.keys(raw).forEach(key => {
            const a = raw[key];
            if (!a) return;

            const fullName = String(a.fullName || a.nama || a.name || '').trim();
            const nik = String(a.nik || '').trim();
            const noKK = String(a.noKK || a.kk || '').trim();
            const phone = String(a.phone || a.noHp || a.hp || a.wa || '').trim();
            const address = String(a.address || a.alamat || '').trim();
            const businessName = String(a.businessName || a.namaUsaha || a.usaha || '').trim();
            const rawKoor = String(a.coordinator || a.koordinator || '').trim();
            const coordNormalized = normalizeCoordinator(rawKoor);
            const regCode = String(a.registrationCode || key).trim();

            let matched = false;
            if (type === 'nik') {
              matched = cleanKw ? nik.replace(/[^0-9]/g, '').includes(cleanKw) : nik.toLowerCase().includes(keyword);
            } else if (type === 'nama') {
              matched = fullName.toLowerCase().includes(keyword);
            } else if (type === 'alamat') {
              matched = address.toLowerCase().includes(keyword);
            } else if (type === 'hp') {
              matched = cleanKw ? phone.replace(/[^0-9]/g, '').includes(cleanKw) : phone.toLowerCase().includes(keyword);
            } else if (type === 'koor') {
              matched = rawKoor.toLowerCase().includes(keyword) || 
                        coordNormalized.toLowerCase().includes(normalizedTargetKoor) ||
                        coordNormalized.toLowerCase().includes(keyword);
            } else if (type === 'code') {
              matched = regCode.toLowerCase() === keyword || regCode.toLowerCase().includes(keyword);
            } else {
              // General search
              matched = fullName.toLowerCase().includes(keyword) ||
                        (cleanKw && nik.replace(/[^0-9]/g, '').includes(cleanKw)) ||
                        (cleanKw && noKK.replace(/[^0-9]/g, '').includes(cleanKw)) ||
                        businessName.toLowerCase().includes(keyword) ||
                        address.toLowerCase().includes(keyword) ||
                        (cleanKw && phone.replace(/[^0-9]/g, '').includes(cleanKw)) ||
                        coordNormalized.toLowerCase().includes(normalizedTargetKoor) ||
                        regCode.toLowerCase().includes(keyword);
            }

            if (matched) {
              results.push({
                ...a,
                _id: key,
                _fullName: fullName,
                _nik: nik,
                _noKK: noKK,
                _phone: phone,
                _address: address,
                _businessName: businessName,
                _coordinator: coordNormalized,
                _registrationCode: regCode
              });
            }
          });
          
          // Load master data sheets for KK cross-reference
          const [m2023Snap, m2024Snap, m2025Snap] = await Promise.all([
            get(ref(database, 'master_data_2023')),
            get(ref(database, 'master_data_2024')),
            get(ref(database, 'master_data_2025'))
          ]);

          const masterSheets: { label: string; data: any[] }[] = [
            { label: '2023', data: m2023Snap.exists() ? Object.values(m2023Snap.val()) as any[] : [] },
            { label: '2024', data: m2024Snap.exists() ? Object.values(m2024Snap.val()) as any[] : [] },
            { label: '2025', data: m2025Snap.exists() ? Object.values(m2025Snap.val()) as any[] : [] },
          ];

          if (results.length > 0) {
            let reply = `🔍 *HASIL PENCARIAN [${type.toUpperCase()}]:*\n` +
                        `Ditemukan: *${results.length} data*\n\n`;

            const displayList = results.slice(0, 15);
            displayList.forEach((r, i) => {
              const statusInfo = getStatusDetails(r);

              reply += `${statusInfo.emoji} *${i+1}. ${r._businessName || "TANPA NAMA USAHA"}*\n`;
              reply += `■ Reg ID: \`${r._registrationCode || r._id}\`\n`;
              reply += `■ Nama: *${r._fullName || "-"}*\n`;
              reply += `■ NIK: \`${r._nik || "-"}\`\n`;
              reply += `■ KK: \`${r._noKK || "-"}\`\n`;
              reply += `■ HP: \`${r._phone || "-"}\`\n`;
              reply += `■ Usaha: ${r._businessName || "-"}\n`;
              reply += `■ Alamat: ${r._address || "-"}\n`;
              
              const rtRw = resolveRtRw(r);
              const kel = resolveKelurahan(r);
              const kec = resolveKecamatan(r, kel);
              reply += `■ RT/RW: ${rtRw !== '-' ? rtRw : (r.rtRw || "-")}\n`;
              reply += `■ Wilayah: Kel. ${kel !== '-' ? kel : (r.kelurahan || "-")}, Kec. ${kec !== '-' ? kec : (r.kecamatan || "-")}\n`;
              reply += `■ Koordinator: *${r._coordinator || "-"}*\n`;

              reply += `■ *Posisi Data:* *${statusInfo.label}*\n`;
              reply += `■ Status Detail: _${statusInfo.detail}_\n`;
              reply += `■ Menu di Web: *${statusInfo.menu}*\n`;

              const timestamp = r.createdAt ? new Date(r.createdAt).toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}) : "-";
              reply += `■ Waktu Daftar: ${timestamp}\n`;

              // Cross-reference KK
              const kkTarget = (r._noKK || "").trim();
              if (kkTarget) {
                const kkMatches: string[] = [];
                masterSheets.forEach(({ label, data }) => {
                  const found = data.filter(m =>
                    m && m.noKK && String(m.noKK).trim() === kkTarget
                  );
                  if (found.length > 0) {
                    found.forEach(m => {
                      kkMatches.push(
                        `   📅 *Sheet ${label}*: ${m.nama || m.fullName || "-"} | Nominal: ${formatCurrency(m.nominal)} | Status: ${m.status || "-"}`
                      );
                    });
                  }
                });
                if (kkMatches.length > 0) {
                  reply += `■ *Riwayat Bantuan KK Sebelumnya:*\n${kkMatches.join('\n')}\n`;
                } else {
                  reply += `■ *Riwayat Bantuan KK:* _Tidak ada di Sheet 2023/2024/2025_\n`;
                }
              }

              reply += `\n`;
            });

            if (results.length > 15) {
              reply += `_Menampilkan 15 dari ${results.length} hasil. Persempit kata kunci pencarian Anda jika perlu._`;
            }

            await sendMessage(chatId, reply);
            
            await logActivity({
              query: `CARI [${type.toUpperCase()}]: ${keyword}`,
              results: `Ditemukan ${results.length} data`,
              device: 'Bot',
              source: 'Telegram',
              method: 'CARI DATA',
              chatId: String(chatId)
            });
          } else {
            await sendMessage(chatId, `❌ *Tidak Ditemukan*\n\nTidak ditemukan data untuk pencarian: \`${keyword}\`.`);
            
            await logActivity({
              query: `CARI [${type.toUpperCase()}]: ${keyword}`,
              results: `Tidak ditemukan`,
              device: 'Bot',
              source: 'Telegram',
              method: 'CARI DATA',
              chatId: String(chatId)
            });
          }
        } else {
          await sendMessage(chatId, "Belum ada data pendaftar UMKM.");
        }
      } 
      else if (text.startsWith('/cekdata')) {
        const keyword = text.replace('/cekdata', '').trim();
        if (!keyword) {
          const helpReply = `📌 *PANDUAN PERINTAH /cekdata*\n\n` +
                            `Perintah ini mengecek data berdasarkan *Nama*, *NIK*, atau *Nomor KK* di seluruh database pembanding:\n` +
                            `1️⃣ Data Pelaku Usaha 2026 (SIMPU)\n` +
                            `2️⃣ Sheet 1 : Data Pembanding 2024\n` +
                            `3️⃣ Sheet 2 : Data Pembanding 2023\n` +
                            `4️⃣ Sheet 3 : Data Pembanding 2025\n` +
                            `5️⃣ Sheet 4 : Data Blacklist\n\n` +
                            `*Contoh Penggunaan:*\n` +
                            `▫️ Berdasarkan NIK: \`/cekdata 2171012304900001\`\n` +
                            `▫️ Berdasarkan No. KK: \`/cekdata 2171011205120002\`\n` +
                            `▫️ Berdasarkan Nama: \`/cekdata AGUS SURIYADI\``;
          await sendMessage(chatId, helpReply);
          return NextResponse.json({ ok: true });
        }
        await sendMessage(chatId, `⏳ _Mengecek "${keyword}" di Sheet Pembanding & Data SIMPU 2026..._`);
        
        try {
          const [actorsSnap, m2024Snap, m2023Snap, m2025Snap, blacklistSnap] = await Promise.all([
            get(ref(database, 'businessActors')),
            get(ref(database, 'master_data_2024')),
            get(ref(database, 'master_data_2023')),
            get(ref(database, 'master_data_2025')),
            get(ref(database, 'blacklist_data'))
          ]);
          
          const kwLower = keyword.toLowerCase();
          const cleanKw = keyword.replace(/[^0-9]/g, '');

          // Helper to check match for Nama, NIK, or Nomor KK
          const matchTarget = (itemNama?: string, itemNik?: string, itemKk?: string) => {
            const nama = String(itemNama || '').toLowerCase();
            const nik = String(itemNik || '').replace(/[^0-9]/g, '');
            const kk = String(itemKk || '').replace(/[^0-9]/g, '');

            const matchNama = kwLower.length >= 2 && nama.includes(kwLower);
            const matchNik = cleanKw.length >= 4 && (nik === cleanKw || nik.includes(cleanKw) || (cleanKw.length >= 10 && cleanKw.includes(nik)));
            const matchKk = cleanKw.length >= 4 && (kk === cleanKw || kk.includes(cleanKw) || (cleanKw.length >= 10 && cleanKw.includes(kk)));

            return matchNama || matchNik || matchKk;
          };

          // 1. Data Pelaku Usaha 2026 (SIMPU)
          const results2026: any[] = [];
          if (actorsSnap.exists()) {
            const raw = actorsSnap.val();
            Object.keys(raw).forEach(key => {
              const r = raw[key];
              if (!r) return;
              const nama = r.fullName || r.nama || r.name || '';
              const nik = r.nik || '';
              const kk = r.noKK || r.kk || '';
              if (matchTarget(nama, nik, kk)) {
                const statusInfo = getStatusDetails(r);
                results2026.push({
                  source: 'Data Pelaku Usaha 2026',
                  nama: nama || '-',
                  nik: nik || '-',
                  noKK: kk || '-',
                  usaha: r.businessName || r.namaUsaha || r.usaha || '-',
                  alamat: r.address || r.alamat || '-',
                  coordinator: normalizeCoordinator(r.coordinator || r.koordinator || '-'),
                  status: statusInfo.label,
                  detailStatus: statusInfo.detail,
                  menu: statusInfo.menu,
                  nominal: r.lpjNominal || r.nominal || 0,
                  isSimpu: true
                });
              }
            });
          }

          // Search in an array/object snapshot
          const extractFromSnap = (snap: any, sourceLabel: string, defaultNominal: number = 0) => {
            if (!snap || !snap.exists()) return [];
            const data = Object.values(snap.val()) as any[];
            const matches: any[] = [];
            data.forEach((r: any) => {
              if (!r) return;
              const nama = r.nama || r.fullName || r.name || '';
              const nik = r.nik || '';
              const kk = r.noKK || r.kk || '';
              if (matchTarget(nama, nik, kk)) {
                matches.push({
                  source: sourceLabel,
                  nama: nama || '-',
                  nik: nik || '-',
                  noKK: kk || '-',
                  usaha: r.usaha || r.businessName || r.namaUsaha || '-',
                  alamat: r.alamat || r.address || '-',
                  coordinator: normalizeCoordinator(r.coordinator || r.koordinator || '-'),
                  status: r.status || r.statusLpj || r.alasan || r.keterangan || '-',
                  nominal: r.nominal || defaultNominal,
                  tahun: r.tahunPengajuan || '',
                  lpj: r.statusLpj || '',
                  isBlacklist: sourceLabel.includes('Blacklist')
                });
              }
            });
            return matches;
          };

          // 2. Sheet 1 : Data Pembanding 2024
          const results2024 = extractFromSnap(m2024Snap, 'Sheet 1 : Data Pembanding 2024', 3000000);

          // 3. Sheet 2 : Data Pembanding 2023
          const results2023 = extractFromSnap(m2023Snap, 'Sheet 2 : Data Pembanding 2023', 1000000);

          // 4. Sheet 3 : Data Pembanding 2025
          const results2025 = extractFromSnap(m2025Snap, 'Sheet 3 : Data Pembanding 2025', 0);

          // 5. Sheet 4 : Data Blacklist
          const resultsBlacklist = extractFromSnap(blacklistSnap, 'Sheet 4 : Data Blacklist', 0);

          const totalFound = results2026.length + results2024.length + results2023.length + results2025.length + resultsBlacklist.length;

          if (totalFound > 0) {
            let reply = `🔍 *HASIL PENGECEKAN DATA GANDA*\n` +
                        `🎯 Kata Kunci: \`${keyword}\`\n\n` +
                        `📊 *REKAP DATA DITEMUKAN:* (*${totalFound} record*)\n` +
                        `▫️ Data Pelaku Usaha 2026: *${results2026.length} data*\n` +
                        `▫️ Sheet 1 : Data Pembanding 2024: *${results2024.length} data*\n` +
                        `▫️ Sheet 2 : Data Pembanding 2023: *${results2023.length} data*\n` +
                        `▫️ Sheet 3 : Data Pembanding 2025: *${results2025.length} data*\n` +
                        `▫️ Sheet 4 : Data Blacklist: *${resultsBlacklist.length} data*\n\n`;

            if (resultsBlacklist.length > 0) {
              reply += `🚨 *PERINGATAN:* Data ini terdaftar di *SHEET 4 : DATA BLACKLIST / DITOLAK*!\n\n`;
            } else if (results2024.length > 0 || results2023.length > 0) {
              reply += `⚠️ *CATATAN:* Data/KK ini pernah menerima bantuan di *Sheet 1 (2024)* atau *Sheet 2 (2023)*.\n\n`;
            }

            reply += `📋 *RINCIAN HASIL TEMUAN:*\n\n`;

            const allResults = [
              ...resultsBlacklist,
              ...results2026,
              ...results2024,
              ...results2023,
              ...results2025
            ];

            allResults.slice(0, 15).forEach((r, i) => {
              const icon = r.isBlacklist ? "🚫" : (r.isSimpu ? "🏬" : "📅");
              reply += `${icon} *${i + 1}. ${r.nama}*\n`;
              reply += `■ SUMBER: *${r.source}*\n`;
              reply += `■ NIK: \`${r.nik}\`\n`;
              reply += `■ Nomor KK: \`${r.noKK}\`\n`;
              reply += `■ Usaha: ${r.usaha}\n`;
              reply += `■ Koordinator: *${r.coordinator}*\n`;

              if (r.isSimpu) {
                reply += `■ Posisi Berkas: *${r.status}*\n`;
                reply += `■ Menu di Web: *${r.menu}*\n`;
              } else {
                reply += `■ Status: *${r.status}*\n`;
                if (r.lpj) reply += `■ Status LPJ: ${r.lpj}\n`;
                if (r.nominal) reply += `■ Nominal: ${formatCurrency(r.nominal)}\n`;
              }
              reply += `\n`;
            });

            if (totalFound > 15) {
              reply += `_Menampilkan 15 dari ${totalFound} record data yang ditemukan._`;
            }

            await sendMessage(chatId, reply);

            await logActivity({
              query: `CEKDATA: ${keyword}`,
              results: `Ditemukan ${totalFound} record (2026:${results2026.length}, S1:${results2024.length}, S2:${results2023.length}, S3:${results2025.length}, S4:${resultsBlacklist.length})`,
              device: 'Bot',
              source: 'Telegram',
              method: 'CEK DATA GANDA',
              chatId: String(chatId)
            });
          } else {
            const cleanReply = `✅ *DATA BERSIH / TIDAK DITEMUKAN*\n\n` +
                               `Kata kunci \`${keyword}\` tidak ditemukan dalam:\n` +
                               `▫️ Data Pelaku Usaha 2026\n` +
                               `▫️ Sheet 1 : Data Pembanding 2024\n` +
                               `▫️ Sheet 2 : Data Pembanding 2023\n` +
                               `▫️ Sheet 3 : Data Pembanding 2025\n` +
                               `▫️ Sheet 4 : Data Blacklist\n\n` +
                               `_Calon penerima/NIK/KK ini belum pernah terdata atau menerima bantuan pada database pembanding._`;
            await sendMessage(chatId, cleanReply);

            await logActivity({
              query: `CEKDATA: ${keyword}`,
              results: `Tidak ditemukan (Bersih)`,
              device: 'Bot',
              source: 'Telegram',
              method: 'CEK DATA GANDA',
              chatId: String(chatId)
            });
          }
        } catch (error) {
          console.error("Cek data query error:", error);
          await sendMessage(chatId, `❌ *Error:* Terjadi kesalahan koneksi database.`);
        }
      } 
      else if (text.startsWith('/inputdata')) {
        const reply = `📝 *FORM INPUT DATA BARU*\n\n` +
                      `Silakan *Salin (Copy)* template di bawah ini, isi data dengan lengkap, lalu kirim kembali ke bot:\n\n` +
                      `\`/simpandata\n` +
                      `Nama Lengkap: \n` +
                      `NIK: \n` +
                      `Nomor KK: \n` +
                      `Jenis Kelamin: \n` +
                      `TTL: \n` +
                      `Nomor HP: \n` +
                      `Alamat: \n` +
                      `RT/RW: \n` +
                      `Kelurahan: \n` +
                      `Kecamatan: \n` +
                      `Jenis Usaha: \n` +
                      `Nama Usaha / Produk: \n` +
                      `Lokasi Usaha: \n` +
                      `Koordinator: \`\n\n` +
                      `⚠️ *Catatan Penting:*\n` +
                      `▫️ Biarkan \`/simpandata\` di baris pertama.\n` +
                      `▫️ Isi data tepat setelah tanda titik dua ( : ).\n` +
                      `▫️ *Jenis Kelamin:* Laki-laki / Perempuan.\n` +
                      `▫️ *Jenis Usaha:* Kuliner / Bukan Kuliner.\n` +
                      `▫️ *Nama Usaha:* Nama warung/toko/produk Anda.`;
        await sendMessage(chatId, reply);
      } 
      else if (text.startsWith('/simpandata')) {
        const lines = text.split(/\n|\\n/);
        let parsedData: any = {};
        lines.forEach((line: string) => {
          if (line.includes(':')) {
            const parts = line.split(':');
            const key = parts[0].trim().toLowerCase();
            const value = parts.slice(1).join(':').trim();
            if (key.includes('nama lengkap') || key === 'nama') parsedData.fullName = value;
            else if (key.includes('jenis kelamin') || key === 'kelamin' || key === 'jk') {
              if (value.toLowerCase().includes('perempuan')) parsedData.gender = "Perempuan";
              else if (value.toLowerCase().includes('laki')) parsedData.gender = "Laki-laki";
              else parsedData.gender = value;
            }
            else if (key.includes('nik')) parsedData.nik = value.replace(/[^0-9]/g, '');
            else if (key.includes('nomor kk') || key === 'kk' || key === 'no kk') parsedData.noKK = value.replace(/[^0-9]/g, '');
            else if (key.includes('ttl') || key === 'pobdob') parsedData.pobDob = value;
            else if (key.includes('nomor hp') || key === 'hp' || key === 'wa' || key === 'no hp' || key === 'telepon') parsedData.phone = value;
            else if (key.includes('alamat')) parsedData.address = value;
            else if (key.includes('rt/rw') || key === 'rt rw') parsedData.rtRw = value;
            else if (key.includes('kelurahan')) {
              const kelList = [
                "Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat",
                "Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru",
                "Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana",
                "Air Raja", "Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"
              ];
              const matched = kelList.find(k => k.toLowerCase() === value.toLowerCase());
              parsedData.kelurahan = matched || value;
            }
            else if (key.includes('kecamatan')) parsedData.kecamatan = value;
            else if (key.includes('jenis usaha') || key.includes('kategori')) {
              if (value.toLowerCase().includes('bukan kuliner')) parsedData.businessCategory = "Bukan Kuliner";
              else if (value.toLowerCase().includes('kuliner')) parsedData.businessCategory = "Kuliner";
              else parsedData.businessCategory = value;
            }
            else if (key.includes('nama usaha') || key.includes('produk') || key === 'usaha' || key === 'produk' || key.includes('product') || key === 'nama produk') parsedData.businessName = value;
            else if (key.includes('lokasi usaha') || key.includes('lokasi') || key.includes('tempat usaha')) parsedData.businessLocation = value;
            else if (key.includes('koordinator') || key === 'koor') parsedData.coordinator = normalizeCoordinator(value);
          }
        });

        if (parsedData.kelurahan && !parsedData.kecamatan) {
          const groupKota = ["Tanjungpinang Kota", "Senggarang", "Kampung Bugis", "Penyengat"];
          const groupBarat = ["Tanjungpinang Barat", "Kemboja", "Bukit Cermin", "Kampung Baru"];
          const groupTimur = ["Batu IX", "Kampung Bulang", "Melayu Kota Piring", "Pinang Kencana", "Air Raja"];
          const groupBestari = ["Sei jang", "Dompak", "Tanjung Unggat", "Tanjungpinang Timur", "Tanjung Ayun Sakti"];
          if (groupKota.includes(parsedData.kelurahan)) parsedData.kecamatan = "Tanjungpinang Kota";
          else if (groupBarat.includes(parsedData.kelurahan)) parsedData.kecamatan = "Tanjungpinang Barat";
          else if (groupTimur.includes(parsedData.kelurahan)) parsedData.kecamatan = "Tanjungpinang Timur";
          else if (groupBestari.includes(parsedData.kelurahan)) parsedData.kecamatan = "Bukit Bestari";
        }

        if (!parsedData.fullName || !parsedData.nik) {
          await sendMessage(chatId, `❌ Gagal menyimpan. Pastikan format /simpandata tidak rusak dan isian NIK serta Nama Lengkap tidak kosong.`);
          return NextResponse.json({ ok: true });
        }
        await sendMessage(chatId, `⏳ _Memproses input data untuk NIK: ${parsedData.nik}..._`);

        const actorsRef = ref(database, 'businessActors');
        const snapshot = await get(actorsRef);
        let duplicate = false;
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const val = child.val();
            if ((parsedData.nik && val.nik === parsedData.nik) || (parsedData.noKK && val.noKK === parsedData.noKK)) {
              duplicate = true;
            }
          });
        }
        if (duplicate) {
          await sendMessage(chatId, `❌ *Input Ditolak*\n\nNIK \`${parsedData.nik}\` sudah terdaftar dalam sistem (sedang pending atau sudah terverifikasi).`);
          return NextResponse.json({ ok: true });
        }

        const selectedCoordinator = normalizeCoordinator(parsedData.coordinator || "")?.toUpperCase().trim();
        if (selectedCoordinator) {
          const quotaRef = ref(database, 'koordinator_kuotas');
          const quotaSnapshot = await get(quotaRef);
          if (quotaSnapshot.exists()) {
            const quotaData = Object.values(quotaSnapshot.val()) as any[];
            const coordQuota = quotaData.find(q => {
              const qNorm = normalizeCoordinator(q.name || "").toUpperCase().trim();
              return qNorm === selectedCoordinator;
            });
            if (coordQuota) {
              const limit = coordQuota.quota || 0;
              let achieved = 0;
              if (snapshot.exists()) {
                snapshot.forEach((child) => {
                  const val = child.val();
                  const isCancel = isCancelDinas(val);
                  const isVerified = isVerifiedStatus(val) && !isCancel;
                  const cNorm = normalizeCoordinator(val.coordinator || "").toUpperCase().trim();
                  if (isVerified && cNorm === selectedCoordinator) {
                    achieved++;
                  }
                });
              }
              if (achieved >= limit) {
                await sendMessage(chatId, `❌ *AKSES DITOLAK*\n\nMaaf, kuota untuk koordinator *${selectedCoordinator}* telah habis (${achieved}/${limit}).`);
                return NextResponse.json({ ok: true });
              }
            }
          }
        }
        try {
          const newData = {
            ownerId: auth.currentUser?.uid || "telegram_bot",
            createdBy: `Telegram Bot (${chatId})`,
            fullName: parsedData.fullName || "",
            nik: parsedData.nik || "",
            noKK: parsedData.noKK || "",
            pobDob: parsedData.pobDob || "",
            gender: parsedData.gender || "",
            phone: parsedData.phone || "",
            address: parsedData.address || "",
            rtRw: parsedData.rtRw || "",
            kelurahan: parsedData.kelurahan || "",
            kecamatan: parsedData.kecamatan || "",
            businessCategory: parsedData.businessCategory || "",
            businessName: parsedData.businessName || "",
            businessLocation: parsedData.businessLocation || "",
            coordinator: normalizeCoordinator(parsedData.coordinator || ""),
            status: "pending",
            createdAt: new Date().toISOString(),
          };
          const newActorRef = push(actorsRef);
          await set(newActorRef, newData);
          
          // Update stats and search index atomically
          await updateStatsOnNewActor(database, { ...newData, id: newActorRef.key });

          await sendMessage(chatId, `✅ *DATA BERHASIL DIINPUT*\n\n` +
                                   `👤 Nama: *${parsedData.fullName}*\n` +
                                   `🆔 NIK: \`${parsedData.nik}\`\n` +
                                   `🏬 Usaha: *${parsedData.businessName || "-"}*\n` +
                                   `📍 Lokasi: ${parsedData.businessLocation || "-"}\n\n` +
                                   `Data telah masuk ke sistem SIMPU dan sedang menunggu verifikasi oleh tim Admin.`);
          
          await logActivity({
            query: `INPUT: ${parsedData.fullName} (${parsedData.nik})`,
            results: `Berhasil Simpan`,
            device: 'Bot',
            source: 'Telegram',
            method: 'INPUT DATA',
            chatId: String(chatId)
          });
        } catch (error) {
           console.error("Error saving data from bot:", error);
           await sendMessage(chatId, `❌ *Error:* Gagal menyimpan data ke database.`);
        }
      } 
      else {
        await sendMessage(chatId, "❌ *Perintah tidak dikenali.*\nGunakan /start untuk melihat menu.");
      }
    }

    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ ok: true });
  }
}
