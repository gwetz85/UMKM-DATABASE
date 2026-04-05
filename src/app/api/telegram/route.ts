import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
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

      if (text.startsWith('/start')) {
        const reply = `Selamat datang di *Bot UMKM Database* 🏬\n\n` +
                      `Bot ini hanya melayani pemantauan data (Read-Only).\n` +
                      `Berikut perintah yang bisa digunakan:\n` +
                      `📊 /stats - Melihat ringkasan data UMKM\n` +
                      `🔍 /search [kata_kunci] - Mencari data UMKM (Contoh: \`/search kuliner\`)\n`;
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
      else if (text.startsWith('/search')) {
        const keyword = text.replace('/search', '').trim().toLowerCase();
        
        if (!keyword) {
          await sendMessage(chatId, "Ketikkan kata kunci pencarian. Contoh: `/search warung`");
          return NextResponse.json({ ok: true });
        }
        
        await sendMessage(chatId, `⏳ _Mencari data dengan kata kunci "${keyword}"..._`);
        
        const actorsRef = ref(database, 'businessActors');
        const snapshot = await get(actorsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const actors = Object.values(data) as any[];
          
          const results = actors.filter(a => 
            (a.fullName && a.fullName.toLowerCase().includes(keyword)) ||
            (a.nik && a.nik.includes(keyword)) ||
            (a.businessName && a.businessName.toLowerCase().includes(keyword))
          ).slice(0, 5); // Limit 5 results to avoid too long messages
          
          if (results.length > 0) {
            let reply = `🔍 *Hasil Pencarian:*\n\n`;
            results.forEach((r, i) => {
              reply += `${i+1}. *${r.businessName || "Tanpa Nama Usaha"}*\n`;
              reply += `👤 Pemilik: ${r.fullName}\n`;
              reply += `💳 NIK: \`${r.nik}\`\n`;
              reply += `📍 Status: ${r.status?.toUpperCase()}\n\n`;
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
