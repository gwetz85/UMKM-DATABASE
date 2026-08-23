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

// Helper to get detailed stage
export const getDetailedStage = (actorData: any): keyof NonNullable<SystemStats['detailedStatus']> | null => {
  if (!actorData || !isVerifiedStatus(actorData)) return null;
  const s = (actorData.status || "").toLowerCase();
  if (s === 'lpj_pending') return 'survey';
  if (s === 'verified_dinas') {
    if (actorData.hasilVerifikasiDinas === 'Lolos' && actorData.berkasDinasVerified) return 'hasilVerifikasi';
    if (actorData.hasilVerifikasiDinas === 'Lolos' && !actorData.berkasDinasVerified) return 'verifikasi';
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
export const normGender = (g: string) => {
  const val = (g || "").toLowerCase().trim();
  if (val === 'laki-laki' || val === 'l') return 'laki';
  if (val === 'perempuan' || val === 'p') return 'perempuan';
  return 'unknown';
};

export const normGenderKey = (g: string): 'Laki-laki' | 'Perempuan' => {
  const val = (g || "").toLowerCase().trim();
  if (val === 'perempuan' || val === 'p') return 'Perempuan';
  return 'Laki-laki';
};

export async function updateStatsOnNewActor(database: Database, actorData: any) {
  const statsRef = ref(database, 'system_stats');
  
  await runTransaction(statsRef, (currentStats: SystemStats | null) => {
    if (!currentStats) {
      currentStats = {
        totalActors: 0,
        gender: { laki: 0, perempuan: 0, unknown: 0 },
        verifiedGender: { 'Laki-laki': 0, 'Perempuan': 0 },
        status: { pending: 0, verified: 0, rejected: 0, finish: 0 },
        detailedStatus: { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 },
        kelurahan: {},
        coordinator: {},
        lastUpdated: new Date().toISOString()
      };
    }

    if (!currentStats.detailedStatus) {
      currentStats.detailedStatus = { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 };
    }
    if (!currentStats.verifiedGender) {
      currentStats.verifiedGender = { 'Laki-laki': 0, 'Perempuan': 0 };
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
    
    // Kelurahan, Coordinator & Detailed stage stats are ONLY for verified actors (excluding cancelled)
    if (isVerifiedStatus(actorData)) {
      const gKey = normGenderKey(actorData.gender);
      currentStats.verifiedGender[gKey] = (currentStats.verifiedGender[gKey] || 0) + 1;

      if (actorData.kelurahan) {
        const kel = actorData.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = (currentStats.kelurahan[kel] || 0) + 1;
      }
      if (actorData.coordinator) {
        const coord = actorData.coordinator.toUpperCase().trim();
        currentStats.coordinator[coord] = (currentStats.coordinator[coord] || 0) + 1;
      }

      const stage = getDetailedStage(actorData);
      if (stage) {
        currentStats.detailedStatus[stage] = (currentStats.detailedStatus[stage] || 0) + 1;
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
    
    if (!currentStats.detailedStatus) {
      currentStats.detailedStatus = { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 };
    }
    if (!currentStats.verifiedGender) {
      currentStats.verifiedGender = { 'Laki-laki': 0, 'Perempuan': 0 };
    }

    const oldObj = typeof oldStatusOrData === 'object' ? oldStatusOrData : { ...actorData, status: oldStatusOrData };
    const newObj = typeof newStatusOrData === 'object' ? newStatusOrData : { ...actorData, status: newStatusOrData };

    const oldCat = getCategory(oldObj);
    const newCat = getCategory(newObj);
    
    if (oldCat !== newCat) {
      // Decrement old category
      if (oldCat && currentStats.status[oldCat as keyof typeof currentStats.status] > 0) {
        currentStats.status[oldCat as keyof typeof currentStats.status] -= 1;
      }
      
      // Increment new category
      if (newCat) {
        currentStats.status[newCat as keyof typeof currentStats.status] = (currentStats.status[newCat as keyof typeof currentStats.status] || 0) + 1;
      }
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

    // Handle Kelurahan & Coordinator stats & verifiedGender (only for verified - cancell does not count towards quota)
    const wasVerified_KC = isVerifiedStatus(oldObj);
    const isVerifiedNow_KC = isVerifiedStatus(newObj);
    const gKey = normGenderKey(actorData.gender);
    
    if (!wasVerified_KC && isVerifiedNow_KC) {
      currentStats.verifiedGender[gKey] = (currentStats.verifiedGender[gKey] || 0) + 1;
      if (actorData.kelurahan) {
        const kel = actorData.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = (currentStats.kelurahan[kel] || 0) + 1;
      }
      if (actorData.coordinator) {
        const coor = actorData.coordinator.toUpperCase().trim();
        currentStats.coordinator[coor] = (currentStats.coordinator[coor] || 0) + 1;
      }
    } else if (wasVerified_KC && !isVerifiedNow_KC) {
      currentStats.verifiedGender[gKey] = Math.max(0, (currentStats.verifiedGender[gKey] || 0) - 1);
      if (actorData.kelurahan) {
        const kel = actorData.kelurahan.toUpperCase().trim();
        currentStats.kelurahan[kel] = Math.max(0, (currentStats.kelurahan[kel] || 0) - 1);
      }
      if (actorData.coordinator) {
        const coor = actorData.coordinator.toUpperCase().trim();
        currentStats.coordinator[coor] = Math.max(0, (currentStats.coordinator[coor] || 0) - 1);
      }
    }

    // Handle Detailed Stage transitions (Survey, Verifikasi, Hasil Verifikasi, LPJ, Selesai)
    const oldStage = getDetailedStage(oldObj);
    const newStage = getDetailedStage(newObj);
    if (oldStage !== newStage) {
      if (oldStage && currentStats.detailedStatus[oldStage] > 0) {
        currentStats.detailedStatus[oldStage] = Math.max(0, currentStats.detailedStatus[oldStage] - 1);
      }
      if (newStage) {
        currentStats.detailedStatus[newStage] = (currentStats.detailedStatus[newStage] || 0) + 1;
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

    if (!currentStats.detailedStatus) {
      currentStats.detailedStatus = { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 };
    }
    if (!currentStats.verifiedGender) {
      currentStats.verifiedGender = { 'Laki-laki': 0, 'Perempuan': 0 };
    }

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
      const oldGKey = normGenderKey(oldData.gender);
      const newGKey = normGenderKey(newData.gender);
      if (oldGKey !== newGKey) {
        currentStats.verifiedGender[oldGKey] = Math.max(0, (currentStats.verifiedGender[oldGKey] || 0) - 1);
        currentStats.verifiedGender[newGKey] = (currentStats.verifiedGender[newGKey] || 0) + 1;
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

      // Update detailed stage if changed
      const oldStage = getDetailedStage(oldData);
      const newStage = getDetailedStage(newData);
      if (oldStage !== newStage) {
        if (oldStage && currentStats.detailedStatus[oldStage] > 0) {
          currentStats.detailedStatus[oldStage] = Math.max(0, currentStats.detailedStatus[oldStage] - 1);
        }
        if (newStage) {
          currentStats.detailedStatus[newStage] = (currentStats.detailedStatus[newStage] || 0) + 1;
        }
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
    
    if (!currentStats.detailedStatus) {
      currentStats.detailedStatus = { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 };
    }
    if (!currentStats.verifiedGender) {
      currentStats.verifiedGender = { 'Laki-laki': 0, 'Perempuan': 0 };
    }

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
    
    // Update kelurahan, coordinator & stage stats (only if verified)
    if (isVerifiedStatus(actorData)) {
      const gKey = normGenderKey(actorData.gender);
      currentStats.verifiedGender[gKey] = Math.max(0, (currentStats.verifiedGender[gKey] || 0) - 1);

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

      const stage = getDetailedStage(actorData);
      if (stage && currentStats.detailedStatus[stage] > 0) {
        currentStats.detailedStatus[stage] = Math.max(0, currentStats.detailedStatus[stage] - 1);
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

  const stats = {
    totalActors: 0,
    gender: { laki: 0, perempuan: 0, unknown: 0 },
    verifiedGender: { 'Laki-laki': 0, 'Perempuan': 0 },
    status: { pending: 0, verified: 0, rejected: 0, finish: 0 },
    detailedStatus: { survey: 0, verifikasi: 0, hasilVerifikasi: 0, lpj: 0, selesai: 0 },
    kelurahan: {} as Record<string, number>,
    coordinator: {} as Record<string, number>,
    lastUpdated: new Date().toISOString()
  };

  snap.forEach((child) => {
    const actor = child.val();
    const s = actor.status || 'pending';
    const isActorCancelDinas = (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Tidak Lolos') || Boolean(actor.alasanCancelDinas);
    const isRejected = s === 'rejected' || isActorCancelDinas;
    const isVerified = ['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending', 'finish', 'dihapus_dinas'].includes(s) && !isActorCancelDinas;

    if (isVerified || isRejected) {
      stats.totalActors++;
      const g = (actor.gender || "").toLowerCase().trim();
      const genderKey = (g === 'perempuan' || g === 'p') ? 'perempuan' : 'laki';
      stats.gender[genderKey]++;
    }

    if (isVerified) {
      stats.status.verified++;
      const g = (actor.gender || "").toLowerCase().trim();
      const genderKey = (g === 'perempuan' || g === 'p') ? 'Perempuan' : 'Laki-laki';
      stats.verifiedGender[genderKey] = (stats.verifiedGender[genderKey] || 0) + 1;

      if (s === 'lpj_pending') {
        stats.detailedStatus.survey++;
      } else if (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Lolos' && !actor.berkasDinasVerified) {
        stats.detailedStatus.verifikasi++;
      } else if (s === 'verified_dinas' && actor.hasilVerifikasiDinas === 'Lolos' && actor.berkasDinasVerified) {
        stats.detailedStatus.hasilVerifikasi++;
      } else if (s === 'bank_pending') {
        stats.detailedStatus.verifikasi++;
      } else if (s === 'finish' && actor.readyForLPJ && !actor.lpjNominal) {
        stats.detailedStatus.lpj++;
      } else if (s === 'finish' && (!actor.readyForLPJ || actor.lpjNominal)) {
        stats.detailedStatus.selesai++;
      }

      if (actor.coordinator) {
        const coord = actor.coordinator.toUpperCase().trim();
        stats.coordinator[coord] = (stats.coordinator[coord] || 0) + 1;
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

