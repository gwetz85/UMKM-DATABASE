const https = require('https');

const config = {
  "databaseURL": "https://studio-5698120445-3dc5c-default-rtdb.asia-southeast1.firebasedatabase.app"
};

async function fetchData(path) {
  const url = `${config.databaseURL}/${path}.json`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ error: "Failed to parse" }); }
      });
    }).on('error', (e) => { resolve({ error: e.message }); });
  });
}

async function run() {
  console.log("🔍 Mengambil data businessActors...\n");
  const actors = await fetchData('businessActors');
  
  if (!actors || typeof actors !== 'object') {
    console.log("❌ Gagal mengambil data");
    return;
  }

  const allActorList = Object.keys(actors).map(k => ({ id: k, ...actors[k] }));
  console.log(`✅ Total businessActors: ${allActorList.length}\n`);

  // Cari semua variasi nama yang mengandung "irwan"
  const irwanActors = allActorList.filter(a => {
    const ps = (a.petugasSurvey || a.createdBy || "").toLowerCase();
    return ps.includes('irwan');
  });

  console.log(`📊 Pelaku Usaha dengan nama mengandung "irwan": ${irwanActors.length}`);
  console.log("─────────────────────────────────────────────────────────────");
  
  // Tampilkan variasi nama yang ditemukan
  const nameVariants = {};
  irwanActors.forEach(a => {
    const ps = (a.petugasSurvey || '').trim();
    const cb = (a.createdBy || '').trim();
    const key = `petugasSurvey="${ps}" | createdBy="${cb}"`;
    nameVariants[key] = (nameVariants[key] || 0) + 1;
  });

  console.log("\n🔤 Variasi nama yang tersimpan di database:");
  Object.entries(nameVariants).forEach(([k, v]) => {
    console.log(`  [${v}x] ${k}`);
  });

  // Hitung dengan logika yang sama persis seperti di kode
  const actorCountsMap = new Map();
  allActorList.forEach(a => {
    const pName = (a.petugasSurvey || a.createdBy || "").toUpperCase().trim();
    if (pName) {
      actorCountsMap.set(pName, (actorCountsMap.get(pName) || 0) + 1);
    }
  });

  const irwanKey = "IRWAN HERIYANTO";
  console.log(`\n✅ Jumlah yang terhitung untuk "${irwanKey}": ${actorCountsMap.get(irwanKey) || 0}`);

  // Cek apakah ada variasi nama lain yang mirip IRWAN
  console.log("\n🔍 Semua key di actorCountsMap yang mengandung 'IRWAN':");
  for (const [k, v] of actorCountsMap.entries()) {
    if (k.includes('IRWAN')) {
      console.log(`  "${k}" => ${v} data`);
    }
  }

  // Tampilkan detail semua pelaku Irwan
  console.log("\n📋 Detail semua pelaku usaha Irwan:");
  irwanActors.forEach((a, i) => {
    console.log(`  ${i+1}. ID: ${a.id}`);
    console.log(`     Nama: ${a.fullName || '-'}`);
    console.log(`     petugasSurvey: "${a.petugasSurvey || '(kosong)'}"`);
    console.log(`     createdBy: "${a.createdBy || '(kosong)'}"`);
    console.log('');
  });
}

run();
