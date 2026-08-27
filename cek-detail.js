const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');
const { getAuth, signInAnonymously } = require('firebase/auth');

const app = initializeApp({
  apiKey: "AIzaSyB6WCsFNPYLeHAikLwNzrHz5gIWpVJB4-s",
  authDomain: "studio-5698120445-3dc5c.firebaseapp.com",
  databaseURL: "https://studio-5698120445-3dc5c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "studio-5698120445-3dc5c",
  appId: "1:686375933955:web:7e3d2792c8bd9e801c5636"
});
const db = getDatabase(app);
const auth = getAuth(app);

async function run() {
  await signInAnonymously(auth);
  const snap = await get(ref(db, 'businessActors'));
  const actors = Object.entries(snap.val());

  let survey=0, verifikasi=0, hasilVerif=0, selesai=0, lpj=0;
  let cancelDinas=0, rejected=0;
  let vd_kosong=[];

  actors.forEach(([key, a]) => {
    if (!a) return;
    const s = a.status || '';
    const isCancelDinas = (s === 'verified_dinas' && a.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(a.alasanCancelDinas);

    if (s === 'lpj_pending') survey++;
    else if (s === 'verified_actor') survey++;  // DKUKM
    else if (s === 'verified_dinas') {
      if (isCancelDinas) { cancelDinas++; }
      else if (a.hasilVerifikasiDinas === 'Lolos' && a.berkasDinasVerified) hasilVerif++;
      else if (a.hasilVerifikasiDinas === 'Lolos' && !a.berkasDinasVerified) verifikasi++;
      else {
        // verified_dinas tapi hasilVerifikasiDinas bukan 'Lolos' dan bukan 'Tidak Lolos'
        vd_kosong.push({ key, nama: a.fullName || a.nama || '-', hasilVerif: a.hasilVerifikasiDinas || 'KOSONG', coordinator: a.coordinator || '-', alasanCancel: a.alasanCancelDinas || '-' });
      }
    }
    else if (s === 'bank_pending') verifikasi++;
    else if (s === 'finish') {
      if (a.readyForLPJ && !a.lpjNominal) lpj++;
      else selesai++;
    }
    else if (s === 'rejected') rejected++;
  });

  console.log('=== BREAKDOWN LENGKAP ===');
  console.log('Tahap 1 - Survey    (lpj_pending+verified_actor):', survey);
  console.log('  lpj_pending  :', 489);
  console.log('  verified_actor (DKUKM):', 19);
  console.log('Tahap 2 - Verifikasi:', verifikasi);
  console.log('Tahap 3 - HasilVerif:', hasilVerif);
  console.log('Tahap 4 - Selesai   :', selesai);
  console.log('LPJ                 :', lpj);
  console.log('Cancel Dinas        :', cancelDinas);
  console.log('Rejected            :', rejected);
  const total = survey + verifikasi + hasilVerif + selesai + lpj + cancelDinas + rejected;
  console.log('TOTAL               :', total);
  console.log('\n=== verified_dinas TANPA hasilVerif yang jelas ===');
  console.log('Jumlah:', vd_kosong.length);
  vd_kosong.forEach((g,i) => {
    console.log('\n#'+(i+1)+' ID: '+g.key);
    console.log('  Nama         :', g.nama);
    console.log('  hasilVerif   :', g.hasilVerif);
    console.log('  alasanCancel :', g.alasanCancel);
    console.log('  Coordinator  :', g.coordinator);
  });
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
