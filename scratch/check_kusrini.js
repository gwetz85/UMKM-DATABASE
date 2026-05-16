
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

const firebaseConfig = {
  "projectId": "studio-5698120445-3dc5c",
  "appId": "1:686375933955:web:7e3d2792c8bd9e801c5636",
  "apiKey": "AIzaSyB6WCsFNPYLeHAikLwNzrHz5gIWpVJB4-s",
  "authDomain": "studio-5698120445-3dc5c.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "686375933955",
  "databaseURL": "https://studio-5698120445-3dc5c-default-rtdb.asia-southeast1.firebasedatabase.app",
  "storageBucket": "studio-5698120445-3dc5c.firebasestorage.app"
};

async function check() {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const actorsRef = ref(db, 'businessActors');
  const snap = await get(actorsRef);
  
  if (snap.exists()) {
    const data = snap.val();
    const kusriniActors = Object.values(data).filter(a => (a.coordinator || "").toUpperCase().trim() === "KUSRINI");
    console.log(`Total for KUSRINI: ${kusriniActors.length}`);
    const statuses = kusriniActors.reduce((acc, a) => {
      acc[a.status || 'pending'] = (acc[a.status || 'pending'] || 0) + 1;
      return acc;
    }, {});
    console.log("Statuses:", JSON.stringify(statuses, null, 2));
    
    // Check system_stats too
    const statsSnap = await get(ref(db, 'system_stats'));
    if (statsSnap.exists()) {
      console.log("system_stats coordinator count for KUSRINI:", statsSnap.val().coordinator?.KUSRINI);
    }
  } else {
    console.log("No data found");
  }
  process.exit(0);
}

check();
