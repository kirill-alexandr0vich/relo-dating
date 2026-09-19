import { HttpsError } from 'firebase-functions/v2/https';
import { buildPairId } from '../shared/pairId';

/**
 * Validates that `chatId` is a well-formed deterministic pair id
 * (see shared/pairId.ts) and that `uid` is really one of its two
 * participants, then returns the other one. Shared by every callable
 * that takes a `chatId` from the client, so a malformed or spoofed id
 * is rejected the same way everywhere.
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
