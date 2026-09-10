/**
 * Utility untuk normalisasi dan pemetaan nama Petugas Survey kanonikal.
 * 
 * Aturan Sistem:
 * 1. Akun Petugas Survey resmi bersumber dari menu "Pembagian Petugas Survey" (system_users dengan role 'petugas' / 'petugas_survey').
 * 2. Gelar akademik, NIP, pangkat pada Pejabat Berita Acara (BA) HANYA untuk cetak dokumen Berita Acara (pejabatData).
 * 3. Field petugasSurvey pada data pelaku usaha HARUS selalu berupa nama kanonikal akun resmi (tanpa gelar)
 *    agar pembagian data tidak terpecah dan data pelaku usaha selalu terbaca oleh petugas survey yang bersangkutan.
 */

export interface SystemUserLike {
  id?: string;
  username?: string;
  fullName?: string;
  name?: string;
  role?: string;
  pejabatData?: {
    petugas?: {
      nama?: string;
      nipppk?: string;
      pangkat?: string;
      jabatan?: string;
    };
    verifikator?: {
      nama?: string;
      nipppk?: string;
      pangkat?: string;
      jabatan?: string;
    };
  };
}

/**
 * Membersihkan gelar umum dari nama jika dicocokkan
 */
export function cleanAcademicTitles(rawName: string): string {
  if (!rawName) return "";
  let name = rawName.trim();
  // Hilangkan gelar di belakang koma (misal: "DEVI KUSMIATI, S.E." -> "DEVI KUSMIATI")
  name = name.split(/,\s*/)[0].trim();
  // Hilangkan gelar umum di depan jika ada (misal: "Drs. ", "Dr. ", "Ir. ")
  name = name.replace(/^(drs\.|dr\.|dra\.|ir\.|h\.|hj\.)\s+/i, "").trim();
  return name.toUpperCase();
}

/**
 * Membangun mapping lengkap nama kanonikal, username, dan gelar pejabat BA
 */
export function buildSurveyorMaps(systemUsers?: SystemUserLike[] | any[] | null) {
  const registeredSurveyorSet = new Set<string>();
  const titleToCanonicalMap = new Map<string, string>();
  const usernameToCanonicalMap = new Map<string, string>();

  if (Array.isArray(systemUsers)) {
    systemUsers.forEach((u) => {
      const role = (u.role || "").toLowerCase();
      if (role === "petugas" || role === "petugas_survey") {
        const canonical = (u.fullName || u.name || u.id || "").toUpperCase().trim();
        if (canonical) {
          registeredSurveyorSet.add(canonical);

          // Map username -> canonical
          const username = (u.username || u.id || "").toUpperCase().trim();
          if (username) {
            usernameToCanonicalMap.set(username, canonical);
          }

          // Map Pejabat BA nama -> canonical (jika memiliki gelar berbeda)
          const pejabatNama = (u.pejabatData?.petugas?.nama || "").toUpperCase().trim();
          if (pejabatNama && pejabatNama !== canonical) {
            titleToCanonicalMap.set(pejabatNama, canonical);
            // Simpan juga versi bersih tanpa koma
            const cleaned = cleanAcademicTitles(pejabatNama);
            if (cleaned && cleaned !== canonical) {
              titleToCanonicalMap.set(cleaned, canonical);
            }
          }

          // Simpan variasi tanpa tanda baca
          const stripped = canonical.replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
          if (stripped && stripped !== canonical) {
            titleToCanonicalMap.set(stripped, canonical);
          }
        }
      }
    });
  }

  return {
    registeredSurveyors: Array.from(registeredSurveyorSet).sort((a, b) => a.localeCompare(b)),
    titleToCanonicalMap,
    usernameToCanonicalMap,
  };
}

/**
 * Menyelesaikan nama/gelar/username menjadi Nama Kanonikal Petugas Survey Resmi.
 * Jika nama cocok dengan petugas terdaftar (atau gelarnya), kembalikan nama kanonikal resmi.
 * Jika nama adalah 'BELUM ADA' atau kosong/-, kembalikan 'BELUM ADA'.
 */
export function resolveSurveyorCanonicalName(
  rawName?: string | null,
  systemUsers?: SystemUserLike[] | any[] | null
): string {
  if (!rawName) return "BELUM ADA";
  const trimmed = rawName.trim();
  const upper = trimmed.toUpperCase();

  if (upper === "" || upper === "-" || upper === "BELUM ADA") {
    return "BELUM ADA";
  }

  if (systemUsers && systemUsers.length > 0) {
    const { registeredSurveyors, titleToCanonicalMap, usernameToCanonicalMap } = buildSurveyorMaps(systemUsers);

    // 1. Cek kecocokan langsung dengan nama kanonikal
    if (registeredSurveyors.includes(upper)) {
      return upper;
    }

    // 2. Cek kecocokan dengan alias gelar Pejabat BA
    if (titleToCanonicalMap.has(upper)) {
      return titleToCanonicalMap.get(upper)!;
    }

    // 3. Cek kecocokan dengan username
    if (usernameToCanonicalMap.has(upper)) {
      return usernameToCanonicalMap.get(upper)!;
    }

    // 4. Cek setelah gelar akademik dibersihkan (misal: "DEVI KUSMIATI, S.E." -> "DEVI KUSMIATI")
    const cleaned = cleanAcademicTitles(upper);
    if (cleaned && registeredSurveyors.includes(cleaned)) {
      return cleaned;
    }

    // 5. Cek kecocokan substring nama kanonikal jika ada koma
    for (const reg of registeredSurveyors) {
      if (upper.startsWith(reg) || reg.startsWith(cleaned)) {
        return reg;
      }
    }
  }

  // Jika tidak ditemukan atau systemUsers belum termuat, kembalikan versi pembersihan dasar
  const baseCleaned = cleanAcademicTitles(upper);
  return baseCleaned || upper;
}
