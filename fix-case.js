const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update } = require('firebase/database');

const firebaseConfig = {
  "projectId": "studio-5698120445-3dc5c",
  "appId": "1:686375933955:web:7e3d2792c8bd9e801c5636",
  "apiKey": "AIzaSyB6WCsFNPYLeHAikLwNzrHz5gIWpVJB4-s",
  "authDomain": "studio-5698120445-3dc5c.firebaseapp.com",
  "databaseURL": "https://studio-5698120445-3dc5c-default-rtdb.asia-southeast1.firebasedatabase.app",
  "storageBucket": "studio-5698120445-3dc5c.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function fixCase() {
    console.log("Memulai perbaikan huruf kapital...");
    try {
        const actorsRef = ref(database, 'businessActors');
        const snapshot = await get(actorsRef);
        
        if (!snapshot.exists()) {
            console.log("Data kosong.");
            return;
        }

        const updates = {};
        let count = 0;

        snapshot.forEach((child) => {
            const actor = child.val();
            if (actor.coordinator) {
                const upper = actor.coordinator.toUpperCase().trim();
                if (actor.coordinator !== upper) {
                    updates[child.key + '/coordinator'] = upper;
                    count++;
                }
            }
        });

        if (count > 0) {
            console.log(`Menemukan ${count} data yang perlu diperbaiki. Menyimpan...`);
            await update(actorsRef, updates);
            console.log("BERHASIL!");
        } else {
            console.log("Semua data sudah menggunakan huruf kapital.");
        }
    } catch (error) {
        console.error("Gagal:", error);
    }
}

fixCase().then(() => process.exit());
