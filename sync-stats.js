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
            total: 0,
            pending: 0,
            verified: 0,
            rejected: 0,
            gender: {
                "Laki-laki": 0,
                "Perempuan": 0
            },
            coordinator: {}
        };

        snapshot.forEach((child) => {
            const actor = child.val();
            stats.total++;
            
            // Status counts
            if (actor.status === 'pending') stats.pending++;
            else if (actor.status === 'verified_actor') stats.verified++;
            else if (actor.status === 'rejected') stats.rejected++;

            // Gender counts
            const gender = actor.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki';
            stats.gender[gender]++;

            // Coordinator counts (Verified only)
            if (actor.status === 'verified_actor' && actor.coordinator) {
                const coord = actor.coordinator.toUpperCase().trim();
                stats.coordinator[coord] = (stats.coordinator[coord] || 0) + 1;
            }
        });

        console.log("Statistik Baru:", stats);
        
        await set(ref(database, 'system_stats'), stats);
        console.log("BERHASIL: Statistik database telah diperbarui sesuai data riil.");
    } catch (error) {
        console.error("Gagal sinkronisasi:", error);
    }
}

syncStats().then(() => process.exit());
