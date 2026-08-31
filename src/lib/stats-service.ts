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
  coordinatorRekening: Record<string, number>;
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
  if (['pending', 'lengkapi_data', 'verifikasi_manual', 'hold'].includes(status)) return 'pending';
  if (status === 'rejected') return 'rejected';
  if (isVerifiedStatus(actorData)) return 'verified';
  return null;
};

// Helper to get detailed stage for Dinas workflow (Tahap 1, 2, 3, 4)
export const getDetailedStage = (actorData: any): keyof NonNullable<SystemStats['detailedStatus']> | null => {
  if (!actorData || !isVerifiedStatus(actorData)) return null;
  if (isCancelDinas(actorData)) return null;
  const s = (actorData.status || "").toLowerCase();
  if (s === 'lpj_pending') return 'survey';
  if (s === 'verified_dinas') {
    if (Boolean(actorData.berkasDinasVerified)) return 'hasilVerifikasi';
    return 'verifikasi';
  }
  if (s === 'bank_pending') return 'verifikasi';
  if (s === 'finish') {
    if (actorData.readyForLPJ && !actorData.lpjNominal) return 'lpj';
    return 'selesai';
  }
  return null;
};

// Helper to determine if an actor is "Processed" (Verified or Rejected/Cancelled)
export const isProcessed = (actorData: any) => {
  const cat = getCategory(actorData);
  return cat === 'verified' || cat === 'rejected';
};

// Helper to normalize gender
export const normGender = (g?: string) => {
  const val = (g || "").toLowerCase().trim();
  if (val === 'laki-laki' || val === 'l') return 'laki';
  if (val === 'perempuan' || val === 'p') return 'perempuan';
  return 'unknown';
};

export const normGenderKey = (g?: string): 'Laki-laki' | 'Perempuan' => {
  const val = (g || "").toLowerCase().trim();
  if (val === 'perempuan' || val === 'p') return 'Perempuan';
  return 'Laki-laki';
};

const ensureStatsStructure = (currentStats: SystemStats | null): SystemStats => {
  const base: SystemStats = currentStats || {
    totalActors: 0,
    gender: { laki: 0, perempuan: 0, unknown: 0 },
    verifiedGender: { 'Laki-laki': 0, 'Perempuan': 0 },
    status: { pending: 0, verified: 0, rejected: 0, finish: 0 },
    detailedStatus: { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 },
    kelurahan: {},
    coordinator: {},
    coordinatorRekening: {},
    lastUpdated: new Date().toISOString()
  };

  if (!base.gender) base.gender = { laki: 0, perempuan: 0, unknown: 0 };
  if (!base.verifiedGender) base.verifiedGender = { 'Laki-laki': 0, 'Perempuan': 0 };
  if (!base.status) base.status = { pending: 0, verified: 0, rejected: 0, finish: 0 };
  if (!base.detailedStatus) base.detailedStatus = { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 };
  if (!base.kelurahan) base.kelurahan = {};
  if (!base.coordinator) base.coordinator = {};
  if (!base.coordinatorRekening) base.coordinatorRekening = {};

  return base;
};

export async function updateStatsOnNewActor(database: Database, actorData: any) {
  const statsRef = ref(database, 'system_stats');
  
  await runTransaction(statsRef, (rawStats: SystemStats | null) => {
    const currentStats = ensureStatsStructure(rawStats);
    
    // Update total and gender counts ONLY if processed
    if (isProcessed(actorData)) {
      currentStats.totalActors += 1;
      const g = normGender(actorData.gender);
      currentStats.gender[g] = (currentStats.gender[g] || 0) + 1;
    }
    
    // Update status stats
    const cat = getCategory(actorData);
    if (cat && currentStats.status[cat as keyof typeof currentStats.status] !== undefined) {
      currentStats.status[cat as keyof typeof currentStats.status] = (currentStats.status[cat as keyof typeof currentStats.status] || 0) + 1;
    }
    
    // Kelurahan, Coordinator & Detailed stage stats are ONLY for verified actors (excluding cancelled)
    if (isVerifiedStatus(actorData)) {
      const gKey = normGenderKey(actorData.gender);
      currentStats.verifiedGender![gKey] = (currentStats.verifiedGender![gKey] || 0) + 1;

      if (actorData.kelurahan) {
        const kel = actorData.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = (currentStats.kelurahan[kel] || 0) + 1;
      }
      if (actorData.coordinator) {
        const coord = actorData.coordinator.toUpperCase().trim();
        currentStats.coordinator[coord] = (currentStats.coordinator[coord] || 0) + 1;
        // Count actors with bank account already input
        if (actorData.bankNumber && String(actorData.bankNumber).trim() !== '') {
          currentStats.coordinatorRekening[coord] = (currentStats.coordinatorRekening[coord] || 0) + 1;
        }
      }

      const stage = getDetailedStage(actorData);
      if (stage) {
        currentStats.detailedStatus![stage] = (currentStats.detailedStatus![stage] || 0) + 1;
      }
    }

    currentStats.lastUpdated = new Date().toISOString();
    return currentStats;
  });
}

export async function updateStatsOnStatusChange(
  database: Database, 
  oldStatusOrData: any, 
  newStatusOrData: any, 
  actorData?: any
) {
  const statsRef = ref(database, 'system_stats');
  
  await runTransaction(statsRef, (rawStats: SystemStats | null) => {
    const currentStats = ensureStatsStructure(rawStats);

    const baseActor = actorData || {};
    const oldObj = typeof oldStatusOrData === 'object' 
      ? { ...baseActor, ...oldStatusOrData } 
      : { ...baseActor, status: oldStatusOrData };
    const newObj = typeof newStatusOrData === 'object' 
      ? { ...baseActor, ...newStatusOrData } 
      : { ...baseActor, status: newStatusOrData };
    const mergedActor = { ...oldObj, ...newObj };

    const oldCat = getCategory(oldObj);
    const newCat = getCategory(newObj);
    
    if (oldCat !== newCat) {
      // Decrement old category
      if (oldCat && currentStats.status[oldCat as keyof typeof currentStats.status] > 0) {
        currentStats.status[oldCat as keyof typeof currentStats.status] = Math.max(0, currentStats.status[oldCat as keyof typeof currentStats.status] - 1);
      }
      
      // Increment new category
      if (newCat && currentStats.status[newCat as keyof typeof currentStats.status] !== undefined) {
        currentStats.status[newCat as keyof typeof currentStats.status] = (currentStats.status[newCat as keyof typeof currentStats.status] || 0) + 1;
      }
    }

    // Handle Total Actors and Gender counts (only for processed)
    const wasProcessed = isProcessed(oldObj);
    const isProcessedNow = isProcessed(newObj);
    const g = normGender(mergedActor.gender);

    if (!wasProcessed && isProcessedNow) {
      currentStats.totalActors += 1;
      currentStats.gender[g] = (currentStats.gender[g] || 0) + 1;
    } else if (wasProcessed && !isProcessedNow) {
      currentStats.totalActors = Math.max(0, currentStats.totalActors - 1);
      currentStats.gender[g] = Math.max(0, (currentStats.gender[g] || 0) - 1);
    }

    // Handle Kelurahan & Coordinator stats & verifiedGender (only for verified)
    const wasVerified_KC = isVerifiedStatus(oldObj);
    const isVerifiedNow_KC = isVerifiedStatus(newObj);
    const gKey = normGenderKey(mergedActor.gender);
    
    const oldHasRekening = wasVerified_KC && !!(oldObj.bankNumber && String(oldObj.bankNumber).trim() !== '');
    const newHasRekening = isVerifiedNow_KC && !!(newObj.bankNumber && String(newObj.bankNumber).trim() !== '');

    if (!wasVerified_KC && isVerifiedNow_KC) {
      currentStats.verifiedGender![gKey] = (currentStats.verifiedGender![gKey] || 0) + 1;
      if (mergedActor.kelurahan) {
        const kel = mergedActor.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = (currentStats.kelurahan[kel] || 0) + 1;
      }
      if (mergedActor.coordinator) {
        const coor = mergedActor.coordinator.toUpperCase().trim();
        currentStats.coordinator[coor] = (currentStats.coordinator[coor] || 0) + 1;
      }
    } else if (wasVerified_KC && !isVerifiedNow_KC) {
      currentStats.verifiedGender![gKey] = Math.max(0, (currentStats.verifiedGender![gKey] || 0) - 1);
      if (mergedActor.kelurahan) {
        const kel = mergedActor.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = Math.max(0, (currentStats.kelurahan[kel] || 0) - 1);
      }
      if (mergedActor.coordinator) {
        const coor = mergedActor.coordinator.toUpperCase().trim();
        currentStats.coordinator[coor] = Math.max(0, (currentStats.coordinator[coor] || 0) - 1);
      }
    }

    // Handle coordinatorRekening transitions
    if (mergedActor.coordinator) {
      const coor = mergedActor.coordinator.toUpperCase().trim();
      if (!oldHasRekening && newHasRekening) {
        currentStats.coordinatorRekening[coor] = (currentStats.coordinatorRekening[coor] || 0) + 1;
      } else if (oldHasRekening && !newHasRekening) {
        currentStats.coordinatorRekening[coor] = Math.max(0, (currentStats.coordinatorRekening[coor] || 0) - 1);
      }
    }

    // Handle Detailed Stage transitions (Survey, Verifikasi, Hasil Verifikasi, LPJ, Selesai)
    const oldStage = getDetailedStage(oldObj);
    const newStage = getDetailedStage(newObj);
    if (oldStage !== newStage) {
      if (oldStage && currentStats.detailedStatus![oldStage] > 0) {
        currentStats.detailedStatus![oldStage] = Math.max(0, currentStats.detailedStatus![oldStage] - 1);
      }
      if (newStage) {
        currentStats.detailedStatus![newStage] = (currentStats.detailedStatus![newStage] || 0) + 1;
      }
    }
    
    currentStats.lastUpdated = new Date().toISOString();
    return currentStats;
  });
}

export async function updateStatsOnEdit(database: Database, oldData: any, newData: any) {
  const statsRef = ref(database, 'system_stats');
  
  await runTransaction(statsRef, (rawStats: SystemStats | null) => {
    const currentStats = ensureStatsStructure(rawStats);

    const oldCat = getCategory(oldData);
    const newCat = getCategory(newData);

    if (oldCat !== newCat) {
      if (oldCat && currentStats.status[oldCat as keyof typeof currentStats.status] > 0) {
        currentStats.status[oldCat as keyof typeof currentStats.status] = Math.max(0, currentStats.status[oldCat as keyof typeof currentStats.status] - 1);
      }
      if (newCat && currentStats.status[newCat as keyof typeof currentStats.status] !== undefined) {
        currentStats.status[newCat as keyof typeof currentStats.status] = (currentStats.status[newCat as keyof typeof currentStats.status] || 0) + 1;
      }
    }

    // Update gender if changed (ONLY if processed)
    const oldProcessed = isProcessed(oldData);
    const newProcessed = isProcessed(newData);
    const oldGen = normGender(oldData.gender);
    const newGen = normGender(newData.gender);

    if (!oldProcessed && newProcessed) {
      currentStats.totalActors += 1;
      currentStats.gender[newGen] = (currentStats.gender[newGen] || 0) + 1;
    } else if (oldProcessed && !newProcessed) {
      currentStats.totalActors = Math.max(0, currentStats.totalActors - 1);
      currentStats.gender[oldGen] = Math.max(0, (currentStats.gender[oldGen] || 0) - 1);
    } else if (oldProcessed && newProcessed && oldGen !== newGen) {
      currentStats.gender[oldGen] = Math.max(0, (currentStats.gender[oldGen] || 0) - 1);
      currentStats.gender[newGen] = (currentStats.gender[newGen] || 0) + 1;
    }

    // Kelurahan & Coordinator updates only matter if the actor is verified
    const wasVerified = isVerifiedStatus(oldData);
    const isVerified = isVerifiedStatus(newData);
    const oldGKey = normGenderKey(oldData.gender);
    const newGKey = normGenderKey(newData.gender);

    if (!wasVerified && isVerified) {
      currentStats.verifiedGender![newGKey] = (currentStats.verifiedGender![newGKey] || 0) + 1;
      if (newData.kelurahan) {
        const kel = newData.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = (currentStats.kelurahan[kel] || 0) + 1;
      }
      if (newData.coordinator) {
        const coord = newData.coordinator.toUpperCase().trim();
        currentStats.coordinator[coord] = (currentStats.coordinator[coord] || 0) + 1;
      }
    } else if (wasVerified && !isVerified) {
      currentStats.verifiedGender![oldGKey] = Math.max(0, (currentStats.verifiedGender![oldGKey] || 0) - 1);
      if (oldData.kelurahan) {
        const kel = oldData.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = Math.max(0, (currentStats.kelurahan[kel] || 0) - 1);
      }
      if (oldData.coordinator) {
        const coord = oldData.coordinator.toUpperCase().trim();
        currentStats.coordinator[coord] = Math.max(0, (currentStats.coordinator[coord] || 0) - 1);
      }
    } else if (wasVerified && isVerified) {
      if (oldGKey !== newGKey) {
        currentStats.verifiedGender![oldGKey] = Math.max(0, (currentStats.verifiedGender![oldGKey] || 0) - 1);
        currentStats.verifiedGender![newGKey] = (currentStats.verifiedGender![newGKey] || 0) + 1;
      }

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

    // Update coordinatorRekening: track changes in bankNumber or coordinator for verified actors
    const oldHasRekening = wasVerified && !!(oldData.bankNumber && String(oldData.bankNumber).trim() !== '');
    const newHasRekening = isVerified && !!(newData.bankNumber && String(newData.bankNumber).trim() !== '');
    const oldCoordRek = wasVerified ? (oldData.coordinator || '').toUpperCase().trim() : '';
    const newCoordRek = isVerified ? (newData.coordinator || '').toUpperCase().trim() : '';

    if (oldHasRekening && oldCoordRek) {
      currentStats.coordinatorRekening[oldCoordRek] = Math.max(0, (currentStats.coordinatorRekening[oldCoordRek] || 0) - 1);
    }
    if (newHasRekening && newCoordRek) {
      currentStats.coordinatorRekening[newCoordRek] = (currentStats.coordinatorRekening[newCoordRek] || 0) + 1;
    }

    // Update detailed stage if changed
    const oldStage = getDetailedStage(oldData);
    const newStage = getDetailedStage(newData);
    if (oldStage !== newStage) {
      if (oldStage && currentStats.detailedStatus![oldStage] > 0) {
        currentStats.detailedStatus![oldStage] = Math.max(0, currentStats.detailedStatus![oldStage] - 1);
      }
      if (newStage) {
        currentStats.detailedStatus![newStage] = (currentStats.detailedStatus![newStage] || 0) + 1;
      }
    }

    currentStats.lastUpdated = new Date().toISOString();
    return currentStats;
  });
}

export async function updateStatsOnDelete(database: Database, actorData: any) {
  const statsRef = ref(database, 'system_stats');
  
  await runTransaction(statsRef, (rawStats: SystemStats | null) => {
    const currentStats = ensureStatsStructure(rawStats);

    // Update total and gender counts (ONLY if processed)
    if (isProcessed(actorData)) {
      currentStats.totalActors = Math.max(0, currentStats.totalActors - 1);
      const g = normGender(actorData.gender);
      currentStats.gender[g] = Math.max(0, (currentStats.gender[g] || 0) - 1);
    }
    
    // Update status stats
    const cat = getCategory(actorData);
    if (cat && currentStats.status[cat as keyof typeof currentStats.status] > 0) {
      currentStats.status[cat as keyof typeof currentStats.status] = Math.max(0, currentStats.status[cat as keyof typeof currentStats.status] - 1);
    }
    
    // Update kelurahan, coordinator & stage stats (only if verified)
    if (isVerifiedStatus(actorData)) {
      const gKey = normGenderKey(actorData.gender);
      currentStats.verifiedGender![gKey] = Math.max(0, (currentStats.verifiedGender![gKey] || 0) - 1);

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
        // Decrement coordinatorRekening if actor had bank account
        if (actorData.bankNumber && String(actorData.bankNumber).trim() !== '') {
          currentStats.coordinatorRekening[coord] = Math.max(0, (currentStats.coordinatorRekening[coord] || 0) - 1);
        }
      }

      const stage = getDetailedStage(actorData);
      if (stage && currentStats.detailedStatus![stage] > 0) {
        currentStats.detailedStatus![stage] = Math.max(0, currentStats.detailedStatus![stage] - 1);
      }
    }

    currentStats.lastUpdated = new Date().toISOString();
    return currentStats;
  });
}

export async function recalculateAndSaveSystemStats(database: Database) {
  const { get, ref, set } = await import("firebase/database");
  const snap = await get(ref(database, 'businessActors'));
  if (!snap.exists()) return null;

  const stats: SystemStats = {
    totalActors: 0,
    gender: { laki: 0, perempuan: 0, unknown: 0 },
    verifiedGender: { 'Laki-laki': 0, 'Perempuan': 0 },
    status: { pending: 0, verified: 0, rejected: 0, finish: 0 },
    detailedStatus: { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 },
    kelurahan: {} as Record<string, number>,
    coordinator: {} as Record<string, number>,
    coordinatorRekening: {} as Record<string, number>,
    lastUpdated: new Date().toISOString()
  };

  snap.forEach((child) => {
    const actor = child.val();
    const s = (actor.status || 'pending').toLowerCase();
    const isActorCancelDinas = isCancelDinas(actor);
    const isRejected = s === 'rejected' || isActorCancelDinas;
    const isVerified = isVerifiedStatus(actor);

    if (isVerified || isRejected) {
      stats.totalActors++;
      const g = normGender(actor.gender);
      stats.gender[g] = (stats.gender[g] || 0) + 1;
    }

    if (isVerified) {
      stats.status.verified++;
      const gKey = normGenderKey(actor.gender);
      stats.verifiedGender![gKey] = (stats.verifiedGender![gKey] || 0) + 1;

      const stage = getDetailedStage(actor);
      if (stage) {
        stats.detailedStatus![stage] = (stats.detailedStatus![stage] || 0) + 1;
      }

      if (actor.coordinator) {
        const coord = actor.coordinator.toUpperCase().trim();
        stats.coordinator[coord] = (stats.coordinator[coord] || 0) + 1;
        // Count actors with bank account already input
        if (actor.bankNumber && String(actor.bankNumber).trim() !== '') {
          stats.coordinatorRekening[coord] = (stats.coordinatorRekening[coord] || 0) + 1;
        }
      }
      if (actor.kelurahan) {
        const k = actor.kelurahan.toUpperCase().trim();
        stats.kelurahan[k] = (stats.kelurahan[k] || 0) + 1;
      }
    } else if (isRejected) {
      stats.status.rejected++;
    } else {
      stats.status.pending++;
    }
  });

  await set(ref(database, 'system_stats'), stats);
  return stats;
}

