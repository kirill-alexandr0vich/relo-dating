export const FREE_DAILY_SWIPE_LIMIT = 20;

interface LimitInput {
  premium?: boolean;
  swipesUsedToday?: number;
  /** Millis, already unwrapped from the Firestore Timestamp by the caller. */
  swipesResetAtMillis?: number;
}

/**
 * Advisory only — for showing "X swipes left today" in the UI. The
 * `recordSwipe` Cloud Function is the sole authority on the actual
 * limit; the client can't write `swipesUsedToday`/`swipesResetAt` itself
 * (12), so this mirrors the server's own reset rule purely for display.
 */
export function getRemainingSwipes(
  record: LimitInput,
  now: number = Date.now(),
): number | null {
  if (record.premium) {
    return null;
  }
  const counterExpired =
    !record.swipesResetAtMillis || now >= record.swipesResetAtMillis;
  const usedToday = counterExpired ? 0 : record.swipesUsedToday ?? 0;
  return Math.max(FREE_DAILY_SWIPE_LIMIT - usedToday, 0);
}
