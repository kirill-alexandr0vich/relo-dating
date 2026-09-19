/**
 * Deterministic id for anything keyed by an unordered pair of uids
 * (matches, friends, chats) — order-independent so the same pair always
 * maps to the same document, regardless of who acted first. Mirrors
 * functions/src/shared/pairId.ts (a separate npm package, so it can't be
 * imported directly); keep the two in sync if this scheme ever changes.
 */
export function buildPairId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}
