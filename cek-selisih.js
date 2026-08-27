const https = require('https');
const config = { databaseURL: 'https://studio-5698120445-3dc5c-default-rtdb.asia-southeast1.firebasedatabase.app' };
async function fetchData(path) {
  const url = config.databaseURL + '/' + path + '.json';
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({error:'parse error'}); } });
    }).on('error', (e) => resolve({ error: e.message }));
  });
}
async function run() {
  console.log('=== CEK SELISIH DATA ===');
  const actors = await fetchData('businessActors');
  if (!actors || actors.error) { console.log('Error:', actors); return; }
  const statusCount = {};
  const statusDetails = {};
  let total = 0;
  Object.entries(actors).forEach(([key, actor]) => {
    if (!actor) return;
    total++;
    const s = actor.status || 'NULL_UNDEFINED';
    statusCount[s] = (statusCount[s] || 0) + 1;
    if (!statusDetails[s]) statusDetails[s] = [];
    statusDetails[s].push({ id: key, nama: actor.name || actor.nama || '-' });
  });
  console.log('TOTAL DATA di Firebase: ' + total);
  console.log('\n=== SEMUA STATUS ===');
  const known = ['survey_dinas','pending_survey','surveyed','verifikasi_dinas','verified_dinas','dinas_verification','hasil_verifikasi','verified_actor','verified','rekening_terinput','bank_pending','finish','lpj_pending','rejected','cancelled','cancel','pending','NULL_UNDEFINED'];
  Object.entries(statusCount).sort().forEach(([s,c]) => {
    const flag = known.includes(s) ? '' : ' <-- TIDAK DIKENAL';
    console.log('  "' + s + '": ' + c + flag);
  });
  const unknown = Object.keys(statusCount).filter(s => !known.includes(s));
  if (unknown.length > 0 || statusCount['NULL_UNDEFINED']) {
    console.log('\n=== DATA STATUS TIDAK DIKENAL / NULL ===');
    [...unknown, 'NULL_UNDEFINED'].forEach(s => {
      if (statusDetails[s]) statusDetails[s].forEach(d => console.log('  ID: ' + d.id + ' | Nama: ' + d.nama + ' | Status: ' + s));
    });
  }
}
run().catch(console.error);
