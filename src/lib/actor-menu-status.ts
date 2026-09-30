import { BusinessActor } from "@/app/lib/types";

export type ActorMenuIconType = 
  | 'admin'
  | 'data_actor'
  | 'survey'
  | 'berkas'
  | 'hasil'
  | 'rekening'
  | 'lpj'
  | 'finish'
  | 'rejected'
  | 'blacklist'
  | 'hold';

export interface ActorMenuStatusInfo {
  menuName: string;          // e.g. "Survey Dinas", "Verifikasi Dinas", "Hasil Verifikasi"
  menuPath: string;          // URL path e.g. "/verifikasi-dinas"
  displayLabel: string;      // e.g. "Menu: Survey Dinas"
  stageLabel: string;        // e.g. "Tahap Survey Lapangan"
  description: string;       // detailed info for tooltip / popover
  badgeColorClass: string;   // Tailwind classes for the badge (background, text, border)
  iconType: ActorMenuIconType;
  stepNumber: number;        // Workflow step order: 1 (Admin) -> 2 (Data Pelaku) -> 3 (Survey) -> 4 (Verifikasi Berkas) -> 5 (Hasil) -> 6 (Cetak Berkas) -> 7 (LPJ) -> 8 (Selesai)
}

/**
 * Menentukan posisi menu dan alur berkas terkini dari seorang Pelaku Usaha.
 * Membantu admin, monitoring, dan koordinator melacak berkas sedang berada di menu mana.
 */
export function getActorCurrentMenu(actor: BusinessActor | any): ActorMenuStatusInfo {
  try {
    if (!actor) {
      return {
        menuName: "Belum Terdata",
        menuPath: "/actor-data",
        displayLabel: "Menu: -",
        stageLabel: "Belum Terdata",
        description: "Data pelaku usaha tidak ditemukan.",
        badgeColorClass: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
        iconType: "admin",
        stepNumber: 0
      };
    }

    const status = String(actor.status || '').toLowerCase().trim();
    const hasilVerifikasiDinas = String(actor.hasilVerifikasiDinas || '').trim();
    const hasCancelDinasReason = Boolean((actor as any).alasanCancelDinas);

    // 1. Blacklist (Status Blacklist atau lewat batas 14 hari)
    if (status === 'blacklist') {
      return {
        menuName: "Menu Blacklist",
        menuPath: "/blacklist",
        displayLabel: "Menu: Blacklist",
        stageLabel: "Daftar Blacklist",
        description: "Pelaku usaha masuk daftar Blacklist karena melewati batas waktu LPJ 14 hari.",
        badgeColorClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
        iconType: "blacklist",
        stepNumber: 99
      };
    }

    // 2. Cancel Dinas (Tidak Lolos Survey Lapangan Dinas)
    const isCancelDinas = 
      (status === 'verified_dinas' && hasilVerifikasiDinas === 'Tidak Lolos') ||
      hasilVerifikasiDinas === 'Tidak Lolos' ||
      hasCancelDinasReason;

    if (isCancelDinas) {
      const reason = (actor as any).alasanCancelDinas || actor.keteranganDinas || 'Tidak Lolos Verifikasi Lapangan';
      return {
        menuName: "Data Ditolak",
        menuPath: "/rejected",
        displayLabel: "Menu: Data Ditolak",
        stageLabel: "Cancel Dinas",
        description: `Dibatalkan pada survey lapangan dinas: ${reason}`,
        badgeColorClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
        iconType: "rejected",
        stepNumber: 99
      };
    }

    // 3. Ditolak Admin
    if (status === 'rejected') {
      return {
        menuName: "Data Ditolak",
        menuPath: "/rejected",
        displayLabel: "Menu: Data Ditolak",
        stageLabel: "Ditolak Admin",
        description: `Ditolak pada tahap Verifikasi Admin: ${actor.rejectionReason || 'Tidak Memenuhi Syarat'}`,
        badgeColorClass: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
        iconType: "rejected",
        stepNumber: 99
      };
    }

    // 4. Dihapus Dinas
    if (status === 'dihapus_dinas') {
      return {
        menuName: "Verifikasi Dinas",
        menuPath: "/verifikasi-dinas",
        displayLabel: "Status: Dihapus Dinas",
        stageLabel: "Dihapus dari Dinas",
        description: "Data telah dihapus dari antrean Verifikasi Dinas.",
        badgeColorClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        iconType: "rejected",
        stepNumber: 99
      };
    }

    // 5. Tahap Finish (Selesai LPJ, Menunggu LPJ, atau Cetak Berkas Pencairan)
    if (status === 'finish') {
      // 5a. Selesai LPJ (sudah ada nominal LPJ)
      if (actor.lpjNominal && Number(actor.lpjNominal) > 0) {
        return {
          menuName: "Data Selesai",
          menuPath: "/finish",
          displayLabel: "Menu: Data Selesai",
          stageLabel: "Selesai (LPJ Lengkap)",
          description: `Seluruh tahapan selesai. LPJ sebesar Rp ${Number(actor.lpjNominal).toLocaleString('id-ID')} telah diverifikasi dan diarsipkan.`,
          badgeColorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
          iconType: "finish",
          stepNumber: 8
        };
      }

      // 5b. Menunggu Penginputan LPJ (readyForLPJ atau ada tanggal entry LPJ)
      if (actor.readyForLPJ || actor.lpjEntryDate) {
        return {
          menuName: "LPJ",
          menuPath: "/lpj",
          displayLabel: "Menu: LPJ",
          stageLabel: "Menunggu Input LPJ",
          description: "Dana telah dicairkan. Berkas berada di Menu LPJ menunggu penyerahan bukti Laporan Pertanggungjawaban.",
          badgeColorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
          iconType: "lpj",
          stepNumber: 7
        };
      }

      // 5c. Cetak Berkas Pencairan (sudah ada nomor rekening bank, siap cetak pernyataan)
      const bankNum = String(actor.bankNumber || '').trim();
      if (bankNum !== '') {
        return {
          menuName: "Cetak Berkas",
          menuPath: "/cetak-berkas",
          displayLabel: "Menu: Cetak Berkas",
          stageLabel: "Pemberkasan Pencairan",
          description: `Rekening terdaftar (${actor.bankName || 'Bank'}: ${bankNum}). Berkas siap dicetak Surat Pernyataan Pencairan Dana.`,
          badgeColorClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
          iconType: "rekening",
          stepNumber: 6
        };
      }

      // 5d. Default Finish (arsip selesai)
      return {
        menuName: "Data Selesai",
        menuPath: "/finish",
        displayLabel: "Menu: Data Selesai",
        stageLabel: "Tahap Selesai",
        description: "Data berstatus Selesai di sistem database.",
        badgeColorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
        iconType: "finish",
        stepNumber: 8
      };
    }

    // 6. Tahap Hasil Verifikasi (Lolos survey dinas dan berkas sudah diverifikasi lengkap)
    if (status === 'verified_dinas' && hasilVerifikasiDinas === 'Lolos' && Boolean((actor as any).berkasDinasVerified)) {
      return {
        menuName: "Hasil Verifikasi",
        menuPath: "/hasil-verifikasi",
        displayLabel: "Menu: Hasil Verifikasi",
        stageLabel: "Lolos & Berkas Lengkap",
        description: "Survey dinas lolos dan berkas administrasi telah diverifikasi lengkap. Berada di Menu Hasil Verifikasi.",
        badgeColorClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
        iconType: "hasil",
        stepNumber: 5
      };
    }

    // 7. Tahap Verifikasi Dinas (Lolos survey lapangan, menunggu cek berkas dinas)
    if (status === 'verified_dinas' && !(actor as any).berkasDinasVerified) {
      return {
        menuName: "Verifikasi Dinas",
        menuPath: "/verifikasi-dinas-berkas",
        displayLabel: "Menu: Verifikasi Dinas",
        stageLabel: "Cek Kelengkapan Berkas",
        description: "Survey lapangan dinas selesai, saat ini di Menu Verifikasi Dinas menunggu validasi kelengkapan berkas fisik.",
        badgeColorClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
        iconType: "berkas",
        stepNumber: 4
      };
    }

    // 8. Tahap Bank Pending (Menunggu verifikasi rekening)
    if (status === 'bank_pending') {
      return {
        menuName: "Data Rekening",
        menuPath: "/data-rekening",
        displayLabel: "Menu: Data Rekening",
        stageLabel: "Verifikasi Rekening",
        description: "Menunggu pengecekan kelengkapan rekening bank di Menu Data Rekening.",
        badgeColorClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
        iconType: "rekening",
        stepNumber: 6
      };
    }

    // 9. Tahap Survey Dinas (status === 'lpj_pending')
    if (status === 'lpj_pending') {
      const surveyor = actor.petugasSurvey && String(actor.petugasSurvey).trim() !== '' && String(actor.petugasSurvey).trim() !== '-' && String(actor.petugasSurvey).trim().toUpperCase() !== 'BELUM ADA' 
        ? `oleh Petugas ${actor.petugasSurvey}` 
        : 'oleh Petugas Dinas';
      return {
        menuName: "Survey Dinas",
        menuPath: `/verifikasi-dinas?actorId=${actor.id}`,
        displayLabel: "Menu: Survey Dinas",
        stageLabel: "Survey Lapangan",
        description: `Sedang dalam tahapan survey lapangan dinas ${surveyor}. Berada di Menu Survey Dinas.`,
        badgeColorClass: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800",
        iconType: "survey",
        stepNumber: 3
      };
    }

    // 10. Tahap Data Pelaku Usaha (status === 'verified_actor')
    if (status === 'verified_actor') {
      return {
        menuName: "Data Pelaku Usaha",
        menuPath: "/actor-data",
        displayLabel: "Menu: Data Pelaku Usaha",
        stageLabel: "Antrean Survey Dinas",
        description: "Data telah disetujui Admin. Saat ini di Menu Data Pelaku Usaha (antrean untuk dilanjutkan ke Survey Dinas).",
        badgeColorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
        iconType: "data_actor",
        stepNumber: 2
      };
    }

    // 11. Tahap Verifikasi Admin (Hold, Lengkapi Data, Verifikasi Manual, Pending)
    if (status === 'hold') {
      return {
        menuName: "Verifikasi Admin",
        menuPath: "/verify-actor",
        displayLabel: "Menu: Verifikasi Admin",
        stageLabel: "Ditahan (Hold)",
        description: "Data berstatus Hold (ditahan) di Menu Verifikasi Admin.",
        badgeColorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
        iconType: "hold",
        stepNumber: 1
      };
    }

    if (status === 'lengkapi_data') {
      return {
        menuName: "Verifikasi Admin",
        menuPath: "/verify-actor",
        displayLabel: "Menu: Verifikasi Admin",
        stageLabel: "Perlu Lengkapi Data",
        description: "Data perlu dilengkapi kembali oleh koordinator/pendaftar di Menu Verifikasi Admin.",
        badgeColorClass: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800",
        iconType: "hold",
        stepNumber: 1
      };
    }

    if (status === 'verifikasi_manual') {
      return {
        menuName: "Verifikasi Admin",
        menuPath: "/verify-actor",
        displayLabel: "Menu: Verifikasi Admin",
        stageLabel: "Verifikasi Manual",
        description: "Memerlukan pengecekan verifikasi manual oleh Admin di Menu Verifikasi Admin.",
        badgeColorClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
        iconType: "admin",
        stepNumber: 1
      };
    }

    // Fallback default: Menu Verifikasi Admin (Pending)
    return {
      menuName: "Verifikasi Admin",
      menuPath: "/verify-actor",
      displayLabel: "Menu: Verifikasi Admin",
      stageLabel: "Menunggu Persetujuan Admin",
      description: "Data baru diinput, menunggu verifikasi persetujuan di Menu Verifikasi Admin.",
      badgeColorClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
      iconType: "admin",
      stepNumber: 1
    };
  } catch (err) {
    console.error("Error in getActorCurrentMenu:", err);
    return {
      menuName: "Data Pelaku Usaha",
      menuPath: "/actor-data",
      displayLabel: "Menu: Data Pelaku Usaha",
      stageLabel: "Pelaku Usaha",
      description: "Data pelaku usaha terdaftar.",
      badgeColorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
      iconType: "data_actor",
      stepNumber: 2
    };
  }
}
