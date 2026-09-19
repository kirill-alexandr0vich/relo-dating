/**
 * Anti-abuse day boundary for the free swipe limit (12): never trust the
 * device clock, only the server's own notion of "now" and the
 * `swipesResetAt` this module last wrote.
 */
export function hasSwipeCounterExpired(
  resetAt: Date | undefined,
  now: Date,
): boolean {
  return !resetAt || now.getTime() >= resetAt.getTime();
}

export function getNextUtcMidnight(from: Date): Date {
  return new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
}
