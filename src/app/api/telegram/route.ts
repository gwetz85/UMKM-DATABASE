import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

// Helper function to send message back to Telegram
async function sendMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is not set!");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate anonymously if not already signed in, to bypass auth != null rule
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const body = await req.json();
    
    // Telegram sends message object
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id;
      const text = body.message.text.trim();
      
      console.log(`Received message from ${chatId}: ${text}`);

      if (text.startsWith('/start') || text.startsWith('/help')) {
        const reply = `Selamat datang di *Bot UMKM Database* 🏬\n\n` +
                      `Bot ini hanya melayani pemantauan data (Read-Only).\n` +
                      `✅ *Menu Perintah:*\n` +
                      `📊 /stats - Ringkasan data\n` +
                      `🔍 /search [kata] - Cari umum\n` +
                      `📌 /nik [nomor] - Cari berdasar NIK\n` +
                      `👤 /nama [nama] - Cari berdasar Nama\n` +
                      `📱 /hp [nomor] - Cari berdasar No. HP\n` +
                      `🏢 /koor [nama] - Cari berdasar Koordinator\n` +
                      `✅ /cekdata [nomor] - Cek NIK/KK dengan Master Data\n` +
                      `ℹ️ /about - Informasi Aplikasi\n`;
        await sendMessage(chatId, reply);
      } 
      else if (text.startsWith('/about')) {
        const reply = `Selamat datang di Aplikasi *SIMPU*\n` +
                      `\\- SISTEM INFORMASI MANAJEMEN PELAKU USAHA \\-\n` +
                      `*Versi 7.0* Update tanggal 05042026 2250\n\n` +
                      `_"Aplikasi ini dikembangkan dan dibuat secara Mandiri dan Independent oleh Tim Admin yang bekerja. Hak Cipta Sepenuhnya dimiliki oleh Pencipta aplikasi."_\n\n` +
                      `⚡ *Pembaruan Aplikasi*\n` +
                      `▫️ Penambahan Fitur Bot Telegram\n` +
                      `▫️ Penambahan Fitur Chat\n` +
                      `▫️ Penambahan Halaman Bank\n` +
                      `▫️ Penambahan Database 2.965 data\n` +
                      `▫️ Perbaikan di beberapa fitur tampilan\n` +
                      `▫️ Penambahan & perbaikan file system\n\n` +
                      `✉️ *Kontak & Saran*\n` +
                      `Pengembang: *AGUS SURIYADI*\n` +
                      `Email: agussuriyadipunya@gmail\\.com\n` +
                      `Whatsapp: 0817319885\n\n` +
                      `© 2026 SIMPU \\- All Rights Reserved`;
        await sendMessage(chatId, reply);
      } 
      else if (text.startsWith('/stats')) {
        await sendMessage(chatId, "⏳ _Sedang mengambil data dari server..._");
        
        const actorsRef = ref(database, 'businessActors');
        const snapshot = await get(actorsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const actors = Object.values(data) as any[];
          
          let total = actors.length;
          let verified = actors.filter(a => a.status === 'verified_actor').length;
          let pending = actors.filter(a => a.status === 'pending').length;
          let rejected = actors.filter(a => a.status === 'rejected').length;
          
          const reply = `📈 *STATISTIK PELAKU USAHA*\n\n` +
                        `Total Data: *${total}*\n` +
                        `✅ Terverifikasi: ${verified}\n` +
                        `⏳ Menunggu Verifikasi: ${pending}\n` +
                        `❌ Ditolak: ${rejected}`;
          await sendMessage(chatId, reply);
        } else {
          await sendMessage(chatId, "Belum ada data pendaftar UMKM.");
        }
      }
      else if (text.startsWith('/search') || text.startsWith('/nik') || text.startsWith('/nama') || text.startsWith('/hp') || text.startsWith('/koor')) {
        
        let keyword = '';
        let type = '';
        if (text.startsWith('/search')) { keyword = text.replace('/search', '').trim().toLowerCase(); type = 'search'; }
        else if (text.startsWith('/nik')) { keyword = text.replace('/nik', '').trim().toLowerCase(); type = 'nik'; }
        else if (text.startsWith('/nama')) { keyword = text.replace('/nama', '').trim().toLowerCase(); type = 'nama'; }
        else if (text.startsWith('/hp')) { keyword = text.replace('/hp', '').trim().toLowerCase(); type = 'hp'; }
        else if (text.startsWith('/koor')) { keyword = text.replace('/koor', '').trim().toLowerCase(); type = 'koor'; }

        if (!keyword) {
          let example = type === 'search' ? 'bengkel' : (type === 'nik' || type === 'hp') ? '08123' : 'agus';
          await sendMessage(chatId, `Ketikkan kata kunci di sebelah perintah. Contoh: \`/${type} ${example}\``);
          return NextResponse.json({ ok: true });
        }
        
        await sendMessage(chatId, `⏳ _Mencari data dengan kata kunci "${keyword}"..._`);
        
        const actorsRef = ref(database, 'businessActors');
        const snapshot = await get(actorsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const actors = Object.values(data) as any[];
          
          const results = actors.filter(a => {
            if (type === 'nik') return a.nik && a.nik.includes(keyword);
            if (type === 'nama') return a.fullName && a.fullName.toLowerCase().includes(keyword);
            if (type === 'hp') return a.phone && a.phone.includes(keyword);
            if (type === 'koor') return a.coordinator && a.coordinator.toLowerCase().includes(keyword);
            
            // Default 'search' (Cari ke semua kolom)
            return (a.fullName && a.fullName.toLowerCase().includes(keyword)) ||
                   (a.nik && a.nik.includes(keyword)) ||
                   (a.businessName && a.businessName.toLowerCase().includes(keyword)) ||
                   (a.phone && a.phone.includes(keyword)) ||
                   (a.coordinator && a.coordinator.toLowerCase().includes(keyword));
          }).slice(0, 5); // Limit 5 results
          
          if (results.length > 0) {
            let reply = `🔍 *Hasil Pencarian [${type.toUpperCase()}]:*\n\n`;
            results.forEach((r, i) => {
              reply += `*${i+1}. ${r.businessName || "TANPA NAMA USAHA"}*\n`;
              
              reply += `👤 *Data Pribadi*\n`;
              reply += `▫️ Nama: ${r.fullName}\n`;
              reply += `▫️ NIK: \`${r.nik}\`\n`;
              reply += `▫️ KK: \`${r.noKK || "-"}\`\n`;
              reply += `▫️ Kelamin: ${r.gender || "-"}\n`;
              reply += `▫️ TTL: ${r.pobDob || "-"}\n`;
              reply += `▫️ HP: \`${r.phone || "-"}\`\n\n`;
              
              reply += `🏠 *Alamat*\n`;
              reply += `▫️ Detail: ${r.address || "-"}\n`;
              reply += `▫️ RT/RW: ${r.rtRw || "-"}\n`;
              let kel = r.kelurahan ? `Kel. ${r.kelurahan}` : "";
              let kec = r.kecamatan ? `Kec. ${r.kecamatan}` : "";
              reply += `▫️ Wilayah: ${kel}${kel && kec ? ', ' : ''}${kec || "-"}\n\n`;
              
              reply += `🏢 *Usaha & Lapangan*\n`;
              reply += `▫️ Kategori: ${r.businessCategory || "-"}\n`;
              reply += `▫️ Lokasi Usaha: ${r.businessLocation || "-"}\n`;
              reply += `▫️ Koordinator: ${r.coordinator || "-"}\n\n`;
              
              reply += `💳 *Bank*\n`;
              reply += `▫️ Bank: ${r.bankName || "-"}\n\n`;
              
              let statusLabel = r.status?.toUpperCase().replace('_', ' ') || "UNKNOWN";
              reply += `📍 Status: ${statusLabel === 'VERIFIED ACTOR' ? '✅ VERIFIED ACTOR' : statusLabel}\n`;
              let timestamp = r.createdAt ? new Date(r.createdAt).toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}) : "-";
              reply += `📅 Input: ${timestamp}\n\n`;
            });
            if (results.length === 5) {
              reply += `_Hanya menampilkan 5 data pertama._`;
            }
            await sendMessage(chatId, reply);
          } else {
            await sendMessage(chatId, `Tidak ditemukan data untuk pencarian "${keyword}".`);
          }
        } else {
           await sendMessage(chatId, "Belum ada data pendaftar UMKM.");
        }
      } else if (text.startsWith('/cekdata')) {
        const keyword = text.replace('/cekdata', '').trim();
        if (!keyword) {
          await sendMessage(chatId, "Ketikkan nomor NIK atau KK setelah perintah. Contoh: `/cekdata 1234567890123456`");
          return NextResponse.json({ ok: true });
        }
        
        await sendMessage(chatId, `⏳ _Mengecek data "${keyword}" di Database Master..._`);
        
        let foundResults: any[] = [];
        const nikQuery = query(ref(database, 'master_data'), orderByChild('nik'), equalTo(keyword));
        const kkQuery = query(ref(database, 'master_data'), orderByChild('noKK'), equalTo(keyword));
        
        try {
          const [nikSnap, kkSnap] = await Promise.all([get(nikQuery), get(kkQuery)]);
          
          if (nikSnap.exists()) {
            foundResults = [...foundResults, ...Object.values(nikSnap.val())];
          }
          if (kkSnap.exists()) {
            // Filter duplicates if any
            const existingNiks = new Set(foundResults.map((r: any) => r.nik));
            Object.values(kkSnap.val()).forEach((r: any) => {
              if (!existingNiks.has(r.nik)) foundResults.push(r);
            });
          }
        } catch (error) {
          console.error("Master data query error:", error);
          await sendMessage(chatId, `❌ Terjadi kesalahan atau batas waktu server terlampaui saat memuat data dari database. Pastikan NIK/KK valid.`);
          return NextResponse.json({ ok: true });
        }
        
        if (foundResults.length > 0) {
          let reply = `✅ *DATA DITEMUKAN* (${foundResults.length} record)\n\n`;
          const formatCurrency = (val: any) => {
            if (!val) return "Rp 0";
            const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) : val;
            return isNaN(num) ? val : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
          };
          
          foundResults.slice(0, 5).forEach((r, i) => {
            reply += `*${i+1}. ${r.nama || "-"}*\n`;
            reply += `▫️ Nomor: ${r.nomor || "-"}\n`;
            reply += `▫️ NIK: \`${r.nik || "-"}\`\n`;
            reply += `▫️ Nomor KK: \`${r.noKK || "-"}\`\n`;
            reply += `▫️ Usaha: ${r.usaha || "-"}\n`;
            reply += `▫️ Kategori Status: ${r.status || "-"}\n`;
            reply += `▫️ Status LPJ: ${r.statusLpj || "-"}\n`;
            reply += `▫️ Nominal: ${formatCurrency(r.nominal)}\n`;
            reply += `▫️ Tahun: ${r.tahunPengajuan || "-"}\n`;
            reply += `▫️ Kelurahan: ${r.kelurahan || "-"}\n`;
            reply += `▫️ Alamat: ${r.alamat || "-"}\n\n`;
          });
          if (foundResults.length > 5) reply += `_Hanya menampilkan 5 data pertama._`;
          await sendMessage(chatId, reply);
        } else {
          await sendMessage(chatId, `❌ *DATA TIDAK TERDAFTAR*\n\nMohon maaf, nomor \`${keyword}\` tidak ditemukan dalam database master.`);
        }
      } else {
        await sendMessage(chatId, "Perintah tidak dikenali. Gunakan /start untuk melihat menu.");
      }
    }
    
    // Always return 200 OK so Telegram doesn't retry
    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Still return 200 to Telegram
    return NextResponse.json({ ok: true });
  }
}
