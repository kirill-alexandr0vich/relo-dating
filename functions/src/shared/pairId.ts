/**
 * Deterministic id for anything keyed by an unordered pair of uids
 * (matches, friends, chats) — order-independent so the same pair always
 * maps to the same document, regardless of who acted first.
 */
export function buildPairId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}
