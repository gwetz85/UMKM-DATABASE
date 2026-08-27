const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');
const { getAuth, signInAnonymously } = require('firebase/auth');

const firebaseConfig = {
  projectId: "studio-5698120445-3dc5c",
  appId: "1:686375933955:web:7e3d2792c8bd9e801c5636",
  apiKey: "AIzaSyB6WCsFNPYLeHAikLwNzrHz5gIWpVJB4-s",
  authDomain: "studio-5698120445-3dc5c.firebaseapp.com",
  databaseURL: "https://studio-5698120445-3dc5c-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "studio-5698120445-3dc5c.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

async function run() {
  try {
    console.log('Login anonim...');
    await signInAnonymously(auth);
    console.log('Login OK\n');
    
    const snapshot = await get(ref(database, 'businessActors'));
    if (!snapshot.exists()) { console.log('Tidak ada data'); return; }
    
    const actors = snapshot.val();
    const entries = Object.entries(actors);
    
    console.log('Total businessActors:', entries.length);
    
    // Semua status
    const statusMap = {};
    entries.forEach(([k, v]) => {
      const s = v.status || 'NULL';
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    
    console.log('\n=== SEMUA STATUS ===');
    Object.entries(statusMap).sort().forEach(([s,c]) => console.log('  "' + s + '": ' + c));
    
    // Cari data "ghost" - verified tapi tidak masuk detailedStatus manapun
    const verifiedStatuses = ['verified_actor','verified_dinas','bank_pending','lpj_pending','finish','dihapus_dinas'];
    const ghost = [];
    
    entries.forEach(([key, actor]) => {
      if (!actor || !actor.status) return;
      const s = actor.status;
      const isCancelDinas = (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(actor.alasanCancelDinas);
      const isVerified = verifiedStatuses.includes(s) && !isCancelDinas;
      if (!isVerified) return;
      
      // Cek apakah masuk ke detailedStage
      let stage = null;
      if (s === 'verified_actor') stage = 'survey'; 
      else if (s === 'lpj_pending') stage = 'survey';
      else if (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Lolos' && actor.berkasDinasVerified) stage = 'hasilVerifikasi';
      else if (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Lolos' && !actor.berkasDinasVerified) stage = 'verifikasi';
      else if (s === 'bank_pending') stage = 'verifikasi';
      else if (s === 'finish') stage = actor.readyForLPJ && !actor.lpjNominal ? 'lpj' : 'selesai';
      
      if (!stage) {
        ghost.push({ key, nama: actor.fullName || actor.nama || '-', status: s, hasilVerif: actor.hasilVerifikasiDinas || 'KOSONG', berkasDinas: actor.berkasDinasVerified || false, coordinator: actor.coordinator || '-' });
      }
    });
    
    console.log('\n=== DATA "GHOST" (verified tapi tidak masuk tahap mana pun) ===');
    console.log('Jumlah: ' + ghost.length);
    ghost.forEach((g, i) => {
      console.log('\n  #' + (i+1));
      console.log('  ID        : ' + g.key);
      console.log('  Nama      : ' + g.nama);
      console.log('  Status    : ' + g.status);
      console.log('  hasilVerif: ' + g.hasilVerif);
      console.log('  berkasDinas: ' + g.berkasDinas);
      console.log('  Coordinator: ' + g.coordinator);
    });
    
  } catch(err) {
    console.error('Error:', err.message || err);
  }
  process.exit(0);
}
run();
