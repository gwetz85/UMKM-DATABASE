import { Database, ref, runTransaction } from "firebase/database";

export interface SystemStats {
  totalActors: number;
  gender: {
    laki: number;
    perempuan: number;
    unknown: number;
  };
  verifiedGender?: {
    'Laki-laki': number;
    'Perempuan': number;
  };
  status: {
    pending: number;
    verified: number;
    rejected: number;
    finish: number;
  };
  detailedStatus?: {
    survey: number;
    verifikasi: number;
    hasilVerifikasi: number;
    lpj: number;
    selesai: number;
  };
  kelurahan: Record<string, number>;
  coordinator: Record<string, number>;
  lastUpdated: string;
}

// Helper to determine if an actor is cancelled by dinas
export const isCancelDinas = (actorData: any) => {
  if (!actorData) return false;
  const status = (actorData.status || "").toLowerCase();
  return (status === 'verified_dinas' && actorData.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(actorData.alasanCancelDinas);
};

// Helper to determine if a status/actor is considered "Verified" for stats purposes
export const isVerifiedStatus = (actorData: any) => {
  if (!actorData) return false;
  if (typeof actorData === 'object' && isCancelDinas(actorData)) return false;
  const status = (typeof actorData === 'string' ? actorData : actorData.status || "").toLowerCase();
  return ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(status);
};

// Helper to get general category
export const getCategory = (actorData: any) => {
  if (!actorData) return null;
  if (typeof actorData === 'object' && isCancelDinas(actorData)) return 'rejected';
  const status = (typeof actorData === 'string' ? actorData : actorData.status || "").toLowerCase();
  if (status === 'pending' || status === 'lengkapi_data' || status === 'verifikasi_manual') return 'pending';
  if (isVerifiedStatus(actorData)) return 'verified';
  if (status === 'rejected') return 'rejected';
  if (status === 'finish') return 'finish';
  return null;
};

// Helper to determine if an actor is "Processed" (Verified or Rejected/Cancelled)
export const isProcessed = (actorData: any) => {
  const cat = getCategory(actorData);
  return cat === 'verified' || cat === 'rejected';
};

// Helper to normalize gender
export const normGender = (g: string) => {
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
        detailedStatus: { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 },
        kelurahan: {},
        coordinator: {},
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Update total and gender counts ONLY if processed
    if (isProcessed(actorData)) {
      currentStats.totalActors += 1;
      const g = normGender(actorData.gender);
      currentStats.gender[g] = (currentStats.gender[g] || 0) + 1;
    }
    
    // Update status stats (always update these)
    const cat = getCategory(actorData);
    if (cat) {
      currentStats.status[cat as keyof typeof currentStats.status] = (currentStats.status[cat as keyof typeof currentStats.status] || 0) + 1;
    }
    
    // Kelurahan & Coordinator stats are ONLY for verified actors (excluding cancelled)
    if (isVerifiedStatus(actorData)) {
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

export async function updateStatsOnStatusChange(database: Database, oldStatusOrData: any, newStatusOrData: any, actorData: any) {
  const statsRef = ref(database, 'system_stats');
  
  await runTransaction(statsRef, (currentStats: SystemStats | null) => {
    if (!currentStats) return currentStats;
    
    const oldObj = typeof oldStatusOrData === 'object' ? oldStatusOrData : { ...actorData, status: oldStatusOrData };
    const newObj = typeof newStatusOrData === 'object' ? newStatusOrData : { ...actorData, status: newStatusOrData };

    const oldCat = getCategory(oldObj);
    const newCat = getCategory(newObj);
    
    if (oldCat === newCat) return currentStats; // No category change, no count change

    // Decrement old category
    if (oldCat && currentStats.status[oldCat as keyof typeof currentStats.status] > 0) {
      currentStats.status[oldCat as keyof typeof currentStats.status] -= 1;
    }
    
    // Increment new category
    if (newCat) {
      currentStats.status[newCat as keyof typeof currentStats.status] = (currentStats.status[newCat as keyof typeof currentStats.status] || 0) + 1;
    }

    // Handle Total Actors and Gender counts (only for processed)
    const wasProcessed = isProcessed(oldObj);
    const isProcessedNow = isProcessed(newObj);

    if (!wasProcessed && isProcessedNow) {
      currentStats.totalActors += 1;
      const g = normGender(actorData.gender);
      currentStats.gender[g] = (currentStats.gender[g] || 0) + 1;
    } else if (wasProcessed && !isProcessedNow) {
      currentStats.totalActors = Math.max(0, currentStats.totalActors - 1);
      const g = normGender(actorData.gender);
      currentStats.gender[g] = Math.max(0, (currentStats.gender[g] || 0) - 1);
    }

    // Handle Kelurahan & Coordinator stats (only for verified - cancell does not count towards quota)
    const wasVerified_KC = isVerifiedStatus(oldObj);
    const isVerifiedNow_KC = isVerifiedStatus(newObj);
    
    if (!wasVerified_KC && isVerifiedNow_KC) {
      if (actorData.kelurahan) {
        const kel = actorData.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = (currentStats.kelurahan[kel] || 0) + 1;
      }
      if (actorData.coordinator) {
        const coor = actorData.coordinator.toUpperCase().trim();
        currentStats.coordinator[coor] = (currentStats.coordinator[coor] || 0) + 1;
      }
    } else if (wasVerified_KC && !isVerifiedNow_KC) {
      if (actorData.kelurahan) {
        const kel = actorData.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = Math.max(0, (currentStats.kelurahan[kel] || 0) - 1);
      }
      if (actorData.coordinator) {
        const coor = actorData.coordinator.toUpperCase().trim();
        currentStats.coordinator[coor] = Math.max(0, (currentStats.coordinator[coor] || 0) - 1);
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

    // Update gender if changed (ONLY if processed)
    const processed = isProcessed(newData);
    if (processed) {
      const oldGen = normGender(oldData.gender);
      const newGen = normGender(newData.gender);
      if (oldGen !== newGen) {
        currentStats.gender[oldGen] = Math.max(0, (currentStats.gender[oldGen] || 0) - 1);
        currentStats.gender[newGen] = (currentStats.gender[newGen] || 0) + 1;
      }
    }

    // Kelurahan & Coordinator updates only matter if the actor is verified
    const verified = isVerifiedStatus(newData);
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
    
    // Update total and gender counts (ONLY if processed)
    if (isProcessed(actorData)) {
      currentStats.totalActors = Math.max(0, currentStats.totalActors - 1);
      const g = normGender(actorData.gender);
      currentStats.gender[g] = Math.max(0, (currentStats.gender[g] || 0) - 1);
    }
    
    // Update status stats
    const cat = getCategory(actorData);
    if (cat) {
      currentStats.status[cat as keyof typeof currentStats.status] = Math.max(0, (currentStats.status[cat as keyof typeof currentStats.status] || 0) - 1);
    }
    
    // Update kelurahan & coordinator stats (only if verified)
    if (isVerifiedStatus(actorData)) {
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
