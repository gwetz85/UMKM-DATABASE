/**
 * Utility untuk normalisasi nama koordinator.
 */
export function normalizeCoordinator(coordinator?: string | null): string {
  if (!coordinator) return '';
  return coordinator.trim();
}
