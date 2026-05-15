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
    const gender = (actorData.gender || "").toLowerCase().trim();
    if (gender === 'laki-laki' || gender === 'l') {
      currentStats.gender.laki = (currentStats.gender.laki || 0) + 1;
    } else if (gender === 'perempuan' || gender === 'p') {
      currentStats.gender.perempuan = (currentStats.gender.perempuan || 0) + 1;
    } else {
      currentStats.gender.unknown = (currentStats.gender.unknown || 0) + 1;
    }
    
    // Update status stats
    const status = (actorData.status || "pending").toLowerCase();
    if (status === 'pending') currentStats.status.pending = (currentStats.status.pending || 0) + 1;
    else if (['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending'].includes(status)) {
      currentStats.status.verified = (currentStats.status.verified || 0) + 1;
    }
    else if (status === 'rejected') currentStats.status.rejected = (currentStats.status.rejected || 0) + 1;
    else if (status === 'finish') currentStats.status.finish = (currentStats.status.finish || 0) + 1;
    
    // Update kelurahan stats
    if (actorData.kelurahan) {
      const kel = actorData.kelurahan.toUpperCase().trim();
      currentStats.kelurahan[kel] = (currentStats.kelurahan[kel] || 0) + 1;
    }

    // Update coordinator stats
    if (actorData.coordinator) {
      const coord = actorData.coordinator.toUpperCase().trim();
      currentStats.coordinator[coord] = (currentStats.coordinator[coord] || 0) + 1;
    }

    currentStats.lastUpdated = new Date().toISOString();
    return currentStats;
  });
}

export async function updateStatsOnStatusChange(database: Database, oldStatus: string, newStatus: string) {
  const statsRef = ref(database, 'system_stats');
  
  await runTransaction(statsRef, (currentStats: SystemStats | null) => {
    if (!currentStats) return currentStats;
    
    const getCategory = (s: string) => {
      s = s.toLowerCase();
      if (s === 'pending') return 'pending';
      if (['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending'].includes(s)) return 'verified';
      if (s === 'rejected') return 'rejected';
      if (s === 'finish') return 'finish';
      return null;
    };
    
    const oldCat = getCategory(oldStatus);
    const newCat = getCategory(newStatus);
    
    if (oldCat && currentStats.status[oldCat as keyof typeof currentStats.status] > 0) {
      currentStats.status[oldCat as keyof typeof currentStats.status] -= 1;
    }
    
    if (newCat) {
      currentStats.status[newCat as keyof typeof currentStats.status] += 1;
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
    const gender = (actorData.gender || "").toLowerCase().trim();
    if (gender === 'laki-laki' || gender === 'l') {
      currentStats.gender.laki = Math.max(0, currentStats.gender.laki - 1);
    } else if (gender === 'perempuan' || gender === 'p') {
      currentStats.gender.perempuan = Math.max(0, currentStats.gender.perempuan - 1);
    } else {
      currentStats.gender.unknown = Math.max(0, currentStats.gender.unknown - 1);
    }
    
    // Update status stats
    const status = (actorData.status || "pending").toLowerCase();
    const getCategory = (s: string) => {
      if (s === 'pending') return 'pending';
      if (['verified_actor', 'verified_dinas', 'bank_pending', 'lpj_pending'].includes(s)) return 'verified';
      if (s === 'rejected') return 'rejected';
      if (s === 'finish') return 'finish';
      return null;
    };
    
    const cat = getCategory(status);
    if (cat) {
      currentStats.status[cat as keyof typeof currentStats.status] = Math.max(0, (currentStats.status[cat as keyof typeof currentStats.status] || 0) - 1);
    }
    
    // Update kelurahan stats
    if (actorData.kelurahan) {
      const kel = actorData.kelurahan.toUpperCase().trim();
      if (currentStats.kelurahan[kel]) {
        currentStats.kelurahan[kel] = Math.max(0, currentStats.kelurahan[kel] - 1);
      }
    }

    // Update coordinator stats
    if (actorData.coordinator) {
      const coord = actorData.coordinator.toUpperCase().trim();
      if (currentStats.coordinator[coord]) {
        currentStats.coordinator[coord] = Math.max(0, currentStats.coordinator[coord] - 1);
      }
    }

    currentStats.lastUpdated = new Date().toISOString();
    return currentStats;
  });
}
