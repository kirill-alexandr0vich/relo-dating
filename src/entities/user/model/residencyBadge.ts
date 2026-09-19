export type ResidencyBadge = 'newcomer' | 'oldTimer';

const APPROX_MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;

/**
 * 3.4 — computed from the "здесь с" month+year picker. `hereSince` is
 * expected as `YYYY-MM`. Returns `null` when the field isn't set, is
 * malformed, or falls in the 1–6 month "no badge" band.
 */
export function getResidencyBadge(
  hereSince: string | undefined,
  now: Date = new Date(),
): ResidencyBadge | null {
  if (!hereSince) {
    return null;
  }
  const since = new Date(`${hereSince}-01T00:00:00Z`);
  if (Number.isNaN(since.getTime())) {
    return null;
  }
  const monthsElapsed = (now.getTime() - since.getTime()) / APPROX_MS_PER_MONTH;
  if (monthsElapsed < 1) {
    return 'newcomer';
  }
  if (monthsElapsed >= 6) {
    return 'oldTimer';
  }
  return null;
}
