import { db } from '../firebaseAdmin';
import { evaluateConnection, type ConnectionResult } from './connection';

interface UserDoc {
  blockedUserIds?: string[];
  allowFriendMessagesWithoutMatch?: boolean;
}

interface FriendDoc {
  status?: 'pending' | 'accepted' | 'declined';
}

/**
 * Fetches everything `evaluateConnection` needs for a pair and runs it.
 * Shared by sendMessage and sendChatMedia so the match/friend/block
 * lookup isn't duplicated per content type.
 */
export async function getConnectionForPair(
  uid: string,
  otherUid: string,
  pairId: string,
): Promise<ConnectionResult> {
  const [selfSnapshot, otherSnapshot, matchSnapshot, friendSnapshot] =
    await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(otherUid).get(),
      db.collection('matches').doc(pairId).get(),
      db.collection('friends').doc(pairId).get(),
    ]);

  const self = selfSnapshot.data() as UserDoc | undefined;
  const other = otherSnapshot.data() as UserDoc | undefined;
  const friend = friendSnapshot.data() as FriendDoc | undefined;

  return evaluateConnection({
    hasMatch: matchSnapshot.exists,
    friendStatus: friend?.status ?? null,
    selfBlockedOther: (self?.blockedUserIds ?? []).includes(otherUid),
    otherBlockedSelf: (other?.blockedUserIds ?? []).includes(uid),
    selfAllowsFriendMessages: self?.allowFriendMessagesWithoutMatch ?? true,
    otherAllowsFriendMessages: other?.allowFriendMessagesWithoutMatch ?? true,
  });
}
