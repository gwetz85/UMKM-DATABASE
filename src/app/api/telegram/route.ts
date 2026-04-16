import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, push, set } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { logActivity } from '@/lib/logger';


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
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram API Error:", errorData);
    }
  } catch (error) {
    console.error("Error sending message to Telegram:", error);
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

      if (text.startsWith('/start') || text.startsWith('/help')) {
        const reply = `Selamat datang di *Bot UMKM Database* 🏬\n\n` +
                      `Bot ini melayani pemantauan & input data.\n\n` +
                      `✅ *Menu Perintah:*\n` +
                      `📊 /stats - Ringkasan data\n` +
                      `📊 /kuota - Cek kuota koordinator\n` +
                      `🔍 /search [kata] - Cari umum\n` +
                      `📌 /nik [nomor] - Cari berdasar NIK\n` +
                      `👤 /nama [nama] - Cari berdasar Nama\n` +
                      `📍 /alamat [kata] - Cari berdasar Alamat\n` +
                      `📱 /hp [nomor] - Cari berdasar No. HP\n` +
                      `🏢 /koor [nama] - Cari berdasar Koordinator\n` +
                      `✅ /cekdata [kata] - Cek NIK/KK/Nama di Master\n` +
                      `📝 /inputdata - Input data baru via Bot\n` +
                      `ℹ️ /about - Informasi Aplikasi`;
        await sendMessage(chatId, reply);
      } 
      else if (text.startsWith('/about')) {
        const reply = `🏛️ *SIMPU v7.5*\n` +
                      `_Sistem Informasi Manajemen Pelaku Usaha_\n\n` +
                      `Update: 15/04/2026 10:42\n\n` +
                      `"Aplikasi ini dikembangkan secara mandiri dan independen oleh Tim Admin. Hak Cipta sepenuhnya dimiliki oleh pencipta aplikasi."\n\n` +
                      `🚀 *Pembaruan Terbaru:*\n` +
                      `▫️ Fitur Bot Telegram & Chat\n` +
                      `▫️ Modul Rekening Bank\n` +
                      `▫️ Sinkronisasi 4.045 data baru\n` +
                      `▫️ Optimalisasi UI/UX\n\n` +
                      `✉️ *Kontak Pengembang:*\n` +
                      `👤 *AGUS SURIYADI*\n` +
                      `📧 agussuriyadipunya@gmail.com\n` +
                      `📱 [0817319885](https://wa.me/62817319885)\n\n` +
                      `© 2026 SIMPU - All Rights Reserved`;
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
          
          const reply = `📈 *STATISTIK DATA UMKM*\n\n` +
                        `📊 Total Data: *${total}*\n\n` +
                        `✅ Terverifikasi: *${verified}*\n` +
                        `⏳ Menunggu: *${pending}*\n` +
                        `❌ Ditolak/Batal: *${rejected}*\n`;
          await sendMessage(chatId, reply);
        } else {
          await sendMessage(chatId, "Belum ada data pendaftar UMKM.");
        }
      }
      else if (text.startsWith('/search') || text.startsWith('/nik') || text.startsWith('/nama') || text.startsWith('/alamat') || text.startsWith('/hp') || text.startsWith('/koor')) {
        
        let keyword = '';
        let type = '';
        if (text.startsWith('/search')) { keyword = text.replace('/search', '').trim().toLowerCase(); type = 'search'; }
        else if (text.startsWith('/nik')) { keyword = text.replace('/nik', '').trim().toLowerCase(); type = 'nik'; }
        else if (text.startsWith('/nama')) { keyword = text.replace('/nama', '').trim().toLowerCase(); type = 'nama'; }
        else if (text.startsWith('/alamat')) { keyword = text.replace('/alamat', '').trim().toLowerCase(); type = 'alamat'; }
        else if (text.startsWith('/hp')) { keyword = text.replace('/hp', '').trim().toLowerCase(); type = 'hp'; }
        else if (text.startsWith('/koor')) { keyword = text.replace('/koor', '').trim().toLowerCase(); type = 'koor'; }

        if (!keyword) {
          let example = type === 'search' ? 'bengkel' : (type === 'nik' || type === 'hp') ? '08123' : type === 'alamat' ? 'pemuda' : 'agus';
          await sendMessage(chatId, `Ketikkan kata kunci di sebelah perintah. Contoh: \\\`/${type} ${example}\\\``);
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
            if (type === 'alamat') return a.address && a.address.toLowerCase().includes(keyword);
            if (type === 'hp') return a.phone && a.phone.includes(keyword);
            if (type === 'koor') return a.coordinator && a.coordinator.toLowerCase().includes(keyword);
            
            return (a.fullName && a.fullName.toLowerCase().includes(keyword)) ||
                   (a.nik && a.nik.includes(keyword)) ||
                   (a.businessName && a.businessName.toLowerCase().includes(keyword)) ||
                   (a.address && a.address.toLowerCase().includes(keyword)) ||
                   (a.phone && a.phone.includes(keyword)) ||
                   (a.coordinator && a.coordinator.toLowerCase().includes(keyword));
          }).slice(0, 50); // Increased limit to 50 instead of 5 for safety while respecting "semua" as much as possible within Telegram limits
          
          if (results.length > 0) {
            let reply = `🔍 *Hasil Pencarian [${type.toUpperCase()}]:*\n\n`;
            results.forEach((r, i) => {
              reply += `*${i+1}. ${r.businessName || "TANPA NAMA USAHA"}*\n`;
              reply += `■ Nama: ${r.fullName}\n`;
              reply += `■ NIK: \`${r.nik || "-"}\`\n`;
              reply += `■ KK: \`${r.noKK || "-"}\`\n`;
              reply += `■ HP: \`${r.phone || "-"}\`\n`;
              reply += `■ Alamat: ${r.address || "-"}\n`;
              reply += `■ RT/RW: ${r.rtRw || "-"}\n`;
              
              let kel = r.kelurahan ? `Kel. ${r.kelurahan}` : "";
              let kec = r.kecamatan ? `Kec. ${r.kecamatan}` : "";
              reply += `■ Wilayah: ${kel}${kel && kec ? ', ' : ''}${kec || "-"}\n`;
              reply += `■ Kategori: ${r.businessCategory || "-"}\n`;
              reply += `■ Lokasi Usaha: ${r.businessLocation || "-"}\n`;
              reply += `■ Koordinator: ${r.coordinator || "-"}\n`;
              
              let statusLabel = r.status?.toUpperCase().replace('_', ' ') || "UNKNOWN";
              let statusEmoji = "⚪";
              if (statusLabel.includes('VERIFIED')) statusEmoji = "✅";
              else if (statusLabel.includes('PENDING')) statusEmoji = "⏳";
              else if (statusLabel.includes('REJECTED')) statusEmoji = "❌";
              else if (statusLabel.includes('BLACKLIST')) statusEmoji = "🚫";
              
              reply += `■ Status: ${statusEmoji} *${statusLabel}*\n`;
              let timestamp = r.createdAt ? new Date(r.createdAt).toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}) : "-";
              reply += `■ Input: ${timestamp}\n`;
              
              let menuSource = "";
              if (r.status === 'pending') menuSource = "📥 Verifikasi Admin";
              else if (r.status === 'verified_actor') menuSource = "👥 Data Pelaku";
              else if (r.status === 'verified_dinas') menuSource = "📋 Verifikasi Dinas";
              else if (r.status === 'bank_pending') menuSource = "🏦 Verifikasi Bank";
              else if (r.status === 'rejected') menuSource = "❌ Ditolak/Cancell";
              else menuSource = "📂 Menu Lainnya";
              
              reply += `■ Menu: ${menuSource}\n`;
              reply += `■ Oleh: ${r.createdBy || "System"}\n\n`;
            });
            if (results.length === 50) {
              reply += `_Hanya menampilkan 50 data pertama (Batas Keamanan Telegram)._`;
            }
            await sendMessage(chatId, reply);
            
            // Log the activity
            logActivity({
              query: keyword,
              results: `Ditemukan ${results.length} data`,
              device: 'Bot',
              source: 'Telegram',
              chatId: String(chatId)
            }, database);
          } else {
            await sendMessage(chatId, `Tidak ditemukan data untuk pencarian "${keyword}".`);
            
            // Log the activity
            logActivity({
              query: keyword,
              results: `Tidak ditemukan`,
              device: 'Bot',
              source: 'Telegram',
              chatId: String(chatId)
            }, database);
          }
        } else {
           await sendMessage(chatId, "Belum ada data pendaftar UMKM.");
        }
      } else if (text.startsWith('/cekdata')) {
        const keyword = text.replace('/cekdata', '').trim();
        if (!keyword) {
          await sendMessage(chatId, "📌 *Cara Cek Data:*\nKetikkan NIK, No. KK, atau Nama setelah perintah.\nContoh: `/cekdata 12345` atau `/cekdata AGUS` ");
          return NextResponse.json({ ok: true });
        }
        await sendMessage(chatId, `⏳ _Mengecek "${keyword}" di Database Master & Blacklist..._`);
        
        let foundResults: any[] = [];
        try {
          const [masterSnap, blacklistSnap] = await Promise.all([
            get(ref(database, 'master_data')),
            get(ref(database, 'blacklist_data'))
          ]);
          
          const kw = keyword.toLowerCase();
          
          if (masterSnap.exists()) {
            const masterData = Object.values(masterSnap.val()) as any[];
            const matches = masterData.filter(r => 
              (r.nik && String(r.nik).trim() === keyword) || 
              (r.noKK && String(r.noKK).trim() === keyword) || 
              (r.nama && String(r.nama).toLowerCase().includes(kw)) ||
              (r.fullName && String(r.fullName).toLowerCase().includes(kw))
            ).map(r => ({ ...r, source: 'Sheet 1 (Accepted)' }));
            foundResults = [...foundResults, ...matches];
          }

          if (blacklistSnap.exists()) {
            const blacklistData = Object.values(blacklistSnap.val()) as any[];
            const matches = blacklistData.filter(r => 
              (r.nik && String(r.nik).trim() === keyword) || 
              (r.noKK && String(r.noKK).trim() === keyword) || 
              (r.nama && String(r.nama).toLowerCase().includes(kw)) ||
              (r.fullName && String(r.fullName).toLowerCase().includes(kw))
            ).map(r => ({ ...r, source: 'Sheet 2 (Rejected)' }));
            foundResults = [...foundResults, ...matches];
          }
        } catch (error) {
          console.error("Master/Blacklist data query error:", error);
          await sendMessage(chatId, `❌ *Error:* Terjadi kesalahan koneksi database.`);
          return NextResponse.json({ ok: true });
        }

        if (foundResults.length > 0) {
          let reply = `🔍 *HASIL PENGECEKKAN GANDA* (${foundResults.length} record)\n\n`;
          const formatCurrency = (val: any) => {
            if (!val) return "Rp 0";
            const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) : val;
            return isNaN(num) ? val : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
          };

          foundResults.slice(0, 50).forEach((r, i) => {
            const isBlacklist = r.source.includes('Sheet 2');
            const icon = isBlacklist ? "🚫" : "✅";
            
            reply += `${icon} *${i+1}. ${r.nama || "-"}*\n`;
            reply += `■ SUMBER: *${r.source}*\n`;
            reply += `■ No: ${r.nomor || "-"}\n`;
            reply += `■ NIK: \`${r.nik || "-"}\`\n`;
            reply += `■ KK: \`${r.noKK || "-"}\`\n`;
            reply += `■ Usaha: ${r.usaha || "-"}\n`;
            reply += `■ Status: ${r.status || "-"}\n`;
            reply += `■ LPJ: ${r.statusLpj || "-"}\n`;
            reply += `■ Nominal: ${formatCurrency(r.nominal)}\n`;
            reply += `■ Tahun: ${r.tahunPengajuan || "-"}\n`;
            reply += `■ Alamat: ${r.alamat || "-"}\n`;
            reply += `■ Wilayah: ${r.kelurahan || "-"}, ${r.kecamatan || "-"}\n`;
            reply += `■ Koordinator: ${r.coordinator || "-"}\n\n`;
          });

          if (foundResults.length > 50) reply += `_Hanya menampilkan 50 data pertama._`;
          await sendMessage(chatId, reply);

          // Log the activity
          logActivity({
            query: keyword,
            results: `Cek Data: Ditemukan ${foundResults.length} record`,
            device: 'Bot',
            source: 'Telegram',
            chatId: String(chatId)
          }, database);
        } else {
          await sendMessage(chatId, `❌ *DATA TIDAK DITEMUKAN*\n\nKata kunci \`${keyword}\` tidak terdaftar dalam Database Master maupun Blacklist.`);

          // Log the activity
          logActivity({
            query: keyword,
            results: `Cek Data: Tidak ditemukan`,
            device: 'Bot',
            source: 'Telegram',
            chatId: String(chatId)
          }, database);
        }
      } else if (text.startsWith('/inputdata')) {
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
      } else if (text.startsWith('/simpandata')) {
        // Handle both actual newlines and literal \n characters
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
            else if (key.includes('koordinator') || key === 'koor') parsedData.coordinator = value;
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

        const selectedCoordinator = (parsedData.coordinator || "")?.toUpperCase().trim();
        if (selectedCoordinator) {
          const quotaRef = ref(database, 'koordinator_kuotas');
          const quotaSnapshot = await get(quotaRef);
          if (quotaSnapshot.exists()) {
            const quotaData = Object.values(quotaSnapshot.val()) as any[];
            const coordQuota = quotaData.find(q => (q.name || "").toUpperCase().trim() === selectedCoordinator);
            if (coordQuota) {
              const limit = coordQuota.quota || 0;
              let achieved = 0;
              if (snapshot.exists()) {
                snapshot.forEach((child) => {
                  const val = child.val();
                  if (val.status !== 'rejected' && val.status !== 'blacklist' && (val.coordinator || "").toUpperCase().trim() === selectedCoordinator) {
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
            coordinator: parsedData.coordinator || "",
            status: "pending",
            createdAt: new Date().toISOString(),
          };
          const newActorRef = push(actorsRef);
          await set(newActorRef, newData);
          await sendMessage(chatId, `✅ *DATA BERHASIL DIINPUT*\n\n` +
                                   `👤 Nama: *${parsedData.fullName}*\n` +
                                   `🆔 NIK: \`${parsedData.nik}\`\n` +
                                   `🏬 Usaha: *${parsedData.businessName || "-"}*\n` +
                                   `📍 Lokasi: ${parsedData.businessLocation || "-"}\n\n` +
                                   `Data telah masuk ke sistem dan sedang menunggu verifikasi oleh tim Admin.`);
        } catch (error) {
           console.error("Error saving data from bot:", error);
           await sendMessage(chatId, `❌ *Error:* Gagal menyimpan data ke database.`);
        }
      } 
      else if (text.startsWith('/kuota')) {
        await sendMessage(chatId, `⏳ _Mengambil data kuota koordinator..._`);
        
        const actorsRef = ref(database, 'businessActors');
        const actorsSnap = await get(actorsRef);
        const actors = actorsSnap.exists() ? Object.values(actorsSnap.val()) as any[] : [];

        const usageMap = new Map<string, number>();
        actors.forEach(actor => {
            if (actor.coordinator && actor.status !== 'rejected' && actor.status !== 'blacklist') {
                const coordinatorName = (actor.coordinator || "").toUpperCase().trim();
                usageMap.set(coordinatorName, (usageMap.get(coordinatorName) || 0) + 1);
            }
        });

        const quotaRef = ref(database, 'koordinator_kuotas');
        const quotaSnap = await get(quotaRef);

        if (quotaSnap.exists()) {
          const quotaData = Object.values(quotaSnap.val()) as any[];
          let reply = `📊 *KUOTA & PENGGUNAAN*\n\n`;
          reply += `_Format: Nama (Terpakai / Total)_\n\n`;
          
          quotaData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

          quotaData.forEach((q: any) => {
            const name = q.name || "Unnamed";
            const nameUpper = name.toUpperCase().trim();
            const limit = q.quota ?? 0;
            const used = usageMap.get(nameUpper) || 0;
            const emoji = used >= limit ? '🔴' : '🟢';
            reply += `${emoji} *${name}:* ${used} / ${limit}\n`;
          });
          
          await sendMessage(chatId, reply);
        } else {
          await sendMessage(chatId, "⚠️ Tidak ada data kuota yang terdaftar.");
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
