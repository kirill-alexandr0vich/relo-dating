/**
 * Anti-abuse day boundary (12): never trust the device clock, only the
 * server's own notion of "now" and the `resetAt` this module last wrote.
 * Shared by every per-day counter (swipe limit, chat-media rate limit, ...).
 */
export function hasCounterExpired(
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
