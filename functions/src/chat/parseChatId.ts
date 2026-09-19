import { HttpsError } from 'firebase-functions/v2/https';
import { buildPairId } from '../shared/pairId';

/**
 * Validates that `chatId` is a well-formed deterministic pair id
 * (see shared/pairId.ts) and that `uid` is really one of its two
 * participants, then returns the other one. Shared by every callable
 * that takes a `chatId` from the client, so a malformed or spoofed id
 * is rejected the same way everywhere.
 *
 * Invariant this relies on: no uid contains `_`. True for every uid in
 * this app today — they're all Firebase Auth-generated (Google/Apple/
 * Email/Phone all go through Firebase's own uid, never a provider-
 * supplied one) and use a `_`-free alphabet. If that ever changes, this
 * fails closed (a 3+-segment split is rejected as malformed) rather than
 * silently misrouting a chat, but two such users could never chat.
 */
export function otherParticipantOrThrow(chatId: string, uid: string): string {
  const participantIds = chatId.split('_');
  const otherUid = participantIds.find(id => id !== uid);
  if (
    participantIds.length !== 2 ||
    !otherUid ||
    buildPairId(uid, otherUid) !== chatId
  ) {
    throw new HttpsError('invalid-argument', 'Malformed chat id.');
  }
  return otherUid;
}
