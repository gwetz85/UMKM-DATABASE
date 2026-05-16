const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set } = require('firebase/database');

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

async function syncStats() {
    console.log("Memulai sinkronisasi data...");
    try {
        const actorsRef = ref(database, 'businessActors');
        const snapshot = await get(actorsRef);
        
        if (!snapshot.exists()) {
            console.log("Tidak ada data pelaku usaha.");
            return;
        }

        const stats = {
            totalActors: 0,
            gender: {
                "Laki-laki": 0,
                "Perempuan": 0,
                "unknown": 0
            },
            status: {
                pending: 0,
                verified: 0,
                rejected: 0,
                finish: 0
            },
            kelurahan: {},
            coordinator: {},
            lastUpdated: new Date().toISOString()
        };

        snapshot.forEach((child) => {
            const actor = child.val();
            stats.totalActors++;
            
            // Status counts
            const s = actor.status || 'pending';
            if (['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish'].includes(s)) {
                stats.status.verified++;
                
                if (actor.coordinator) {
                    const coord = actor.coordinator.toUpperCase().trim();
                    stats.coordinator[coord] = (stats.coordinator[coord] || 0) + 1;
                }
                if (actor.kelurahan) {
                    const k = actor.kelurahan.toUpperCase().trim();
                    stats.kelurahan[k] = (stats.kelurahan[k] || 0) + 1;
                }
            } else if (s === 'pending') {
                stats.status.pending++;
            } else if (s === 'rejected') {
                stats.status.rejected++;
            }

            // Gender counts
            const gender = actor.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki';
            stats.gender[gender]++;
        });

        console.log("Statistik Baru:", stats);
        
        await set(ref(database, 'system_stats'), stats);
        console.log("BERHASIL: Statistik database telah diperbarui sesuai data riil.");
    } catch (error) {
        console.error("Gagal sinkronisasi:", error);
    }
}

syncStats().then(() => process.exit());
