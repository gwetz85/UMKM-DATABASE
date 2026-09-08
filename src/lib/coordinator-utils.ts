/**
 * Utility untuk normalisasi nama koordinator.
 * Aturan sistem: Jika nama koordinator adalah DKUKM atau mengandung kata DKUKM
 * (misalnya: "DKUKM", "DKUKM PROVINSI", dll.), maka secara otomatis diubah menjadi "AGUS".
 */
export function normalizeCoordinator(coordinator?: string | null): string {
  if (!coordinator) return '';
  const trimmed = coordinator.trim();
  const upper = trimmed.toUpperCase();
  if (upper === 'DKUKM' || upper.startsWith('DKUKM') || upper.includes('DKUKM')) {
    return 'AGUS';
  }
  return trimmed;
}
