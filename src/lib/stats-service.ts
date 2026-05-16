import { Database, ref, runTransaction } from "firebase/database";

export interface SystemStats {
  totalActors: number;
  gender: {
    laki: number;
    perempuan: number;
    unknown: number;
  };
  status: {
    pending: number;
    verified: number;
    rejected: number;
    finish: number;
  };
  kelurahan: Record<string, number>;
  coordinator: Record<string, number>;
  lastUpdated: string;
}

// Helper to determine if a status is considered "Verified" for stats purposes
const isVerifiedStatus = (s: string) => {
  const status = (s || "").toLowerCase();
  return ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish'].includes(status);
};

// Helper to get general category
const getCategory = (s: string) => {
  const status = (s || "").toLowerCase();
  if (status === 'pending' || status === 'lengkapi_data' || status === 'verifikasi_manual') return 'pending';
  if (isVerifiedStatus(status)) return 'verified';
  if (status === 'rejected') return 'rejected';
  if (status === 'finish') return 'finish';
  return null;
};

// Helper to normalize gender
const normGender = (g: string) => {
  const val = (g || "").toLowerCase().trim();
  if (val === 'laki-laki' || val === 'l') return 'laki';
  if (val === 'perempuan' || val === 'p') return 'perempuan';
  return 'unknown';
};

export async function updateStatsOnNewActor(database: Database, actorData: any) {
  const statsRef = ref(database, 'system_stats');
  
  await runTransaction(statsRef, (currentStats: SystemStats | null) => {
    if (!currentStats) {
      currentStats = {
        totalActors: 0,
        gender: { laki: 0, perempuan: 0, unknown: 0 },
        status: { pending: 0, verified: 0, rejected: 0, finish: 0 },
        kelurahan: {},
        coordinator: {},
        lastUpdated: new Date().toISOString()
      };
    }
    
    currentStats.totalActors += 1;
    
    // Update gender stats
    const g = normGender(actorData.gender);
    currentStats.gender[g] = (currentStats.gender[g] || 0) + 1;
    
    // Update status stats
    const cat = getCategory(actorData.status || 'pending');
    if (cat) {
      currentStats.status[cat as keyof typeof currentStats.status] = (currentStats.status[cat as keyof typeof currentStats.status] || 0) + 1;
    }
    
    // Kelurahan & Coordinator stats are ONLY for verified actors
    if (isVerifiedStatus(actorData.status)) {
      if (actorData.kelurahan) {
        const kel = actorData.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = (currentStats.kelurahan[kel] || 0) + 1;
      }
      if (actorData.coordinator) {
        const coord = actorData.coordinator.toUpperCase().trim();
        currentStats.coordinator[coord] = (currentStats.coordinator[coord] || 0) + 1;
      }
    }

    currentStats.lastUpdated = new Date().toISOString();
    return currentStats;
  });
}

export async function updateStatsOnStatusChange(database: Database, oldStatus: string, newStatus: string, actorData: any) {
  const statsRef = ref(database, 'system_stats');
  
  await runTransaction(statsRef, (currentStats: SystemStats | null) => {
    if (!currentStats) return currentStats;
    
    const oldCat = getCategory(oldStatus);
    const newCat = getCategory(newStatus);
    
    if (oldCat === newCat) return currentStats; // No category change, no count change

    // Decrement old category
    if (oldCat && currentStats.status[oldCat as keyof typeof currentStats.status] > 0) {
      currentStats.status[oldCat as keyof typeof currentStats.status] -= 1;
    }
    
    // Increment new category
    if (newCat) {
      currentStats.status[newCat as keyof typeof currentStats.status] = (currentStats.status[newCat as keyof typeof currentStats.status] || 0) + 1;
    }

    // Handle Kelurahan & Coordinator stats (only for verified)
    const wasVerified = isVerifiedStatus(oldStatus);
    const isVerified = isVerifiedStatus(newStatus);

    if (!wasVerified && isVerified) {
      // Adding to verified stats
      if (actorData.kelurahan) {
        const kel = actorData.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = (currentStats.kelurahan[kel] || 0) + 1;
      }
      if (actorData.coordinator) {
        const coord = actorData.coordinator.toUpperCase().trim();
        currentStats.coordinator[coord] = (currentStats.coordinator[coord] || 0) + 1;
      }
    } else if (wasVerified && !isVerified) {
      // Removing from verified stats
      if (actorData.kelurahan) {
        const kel = actorData.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = Math.max(0, (currentStats.kelurahan[kel] || 0) - 1);
      }
      if (actorData.coordinator) {
        const coord = actorData.coordinator.toUpperCase().trim();
        currentStats.coordinator[coord] = Math.max(0, (currentStats.coordinator[coord] || 0) - 1);
      }
    }
    
    currentStats.lastUpdated = new Date().toISOString();
    return currentStats;
  });
}

export async function updateStatsOnEdit(database: Database, oldData: any, newData: any) {
  const statsRef = ref(database, 'system_stats');
  
  await runTransaction(statsRef, (currentStats: SystemStats | null) => {
    if (!currentStats) return currentStats;

    // Update gender if changed (affects total regardless of status)
    const oldGen = normGender(oldData.gender);
    const newGen = normGender(newData.gender);
    if (oldGen !== newGen) {
      currentStats.gender[oldGen] = Math.max(0, (currentStats.gender[oldGen] || 0) - 1);
      currentStats.gender[newGen] = (currentStats.gender[newGen] || 0) + 1;
    }

    // Kelurahan & Coordinator updates only matter if the actor is verified
    const verified = isVerifiedStatus(newData.status || oldData.status);
    if (verified) {
      // Update kelurahan if changed
      const oldKel = (oldData.kelurahan || "").toUpperCase().trim();
      const newKel = (newData.kelurahan || "").toUpperCase().trim();
      if (oldKel !== newKel) {
        if (oldKel) currentStats.kelurahan[oldKel] = Math.max(0, (currentStats.kelurahan[oldKel] || 0) - 1);
        if (newKel) currentStats.kelurahan[newKel] = (currentStats.kelurahan[newKel] || 0) + 1;
      }

      // Update coordinator if changed
      const oldCoor = (oldData.coordinator || "").toUpperCase().trim();
      const newCoor = (newData.coordinator || "").toUpperCase().trim();
      if (oldCoor !== newCoor) {
        if (oldCoor) currentStats.coordinator[oldCoor] = Math.max(0, (currentStats.coordinator[oldCoor] || 0) - 1);
        if (newCoor) currentStats.coordinator[newCoor] = (currentStats.coordinator[newCoor] || 0) + 1;
      }
    }

    currentStats.lastUpdated = new Date().toISOString();
    return currentStats;
  });
}

export async function updateStatsOnDelete(database: Database, actorData: any) {
  const statsRef = ref(database, 'system_stats');
  
  await runTransaction(statsRef, (currentStats: SystemStats | null) => {
    if (!currentStats) return currentStats;
    
    currentStats.totalActors = Math.max(0, currentStats.totalActors - 1);
    
    // Update gender stats
    const g = normGender(actorData.gender);
    currentStats.gender[g] = Math.max(0, (currentStats.gender[g] || 0) - 1);
    
    // Update status stats
    const cat = getCategory(actorData.status || "pending");
    if (cat) {
      currentStats.status[cat as keyof typeof currentStats.status] = Math.max(0, (currentStats.status[cat as keyof typeof currentStats.status] || 0) - 1);
    }
    
    // Update kelurahan & coordinator stats (only if verified)
    if (isVerifiedStatus(actorData.status)) {
      if (actorData.kelurahan) {
        const kel = actorData.kelurahan.toUpperCase().trim();
        if (currentStats.kelurahan[kel]) {
          currentStats.kelurahan[kel] = Math.max(0, currentStats.kelurahan[kel] - 1);
        }
      }
      if (actorData.coordinator) {
        const coord = actorData.coordinator.toUpperCase().trim();
        if (currentStats.coordinator[coord]) {
          currentStats.coordinator[coord] = Math.max(0, currentStats.coordinator[coord] - 1);
        }
      }
    }

    currentStats.lastUpdated = new Date().toISOString();
    return currentStats;
  });
}
