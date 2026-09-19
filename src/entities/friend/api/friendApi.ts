import firestore from '@react-native-firebase/firestore';
import type { AddedVia, Friendship } from '../model/types';

function buildPairId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export type SendFriendRequestResult = 'sent' | 'already_exists';

/** 5.2 — via QR or username search; starts `pending`, needs the other side's accept. */
export async function sendFriendRequest(
  uid: string,
  targetUid: string,
  addedVia: Extract<AddedVia, 'qr' | 'username_search'>,
): Promise<SendFriendRequestResult> {
  const ref = firestore()
    .collection('friends')
    .doc(buildPairId(uid, targetUid));
  const existing = await ref.get();
  if (existing.exists) {
    return 'already_exists';
  }
  await ref.set({
    userIds: [uid, targetUid].sort(),
    requestedBy: uid,
    addedVia,
    status: 'pending',
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  return 'sent';
}

/** 5 — "Добавить в друзья" from a match's chat: no confirmation needed, both sides already agreed via the match. */
export async function addFriendFromMatch(
  uid: string,
  targetUid: string,
): Promise<void> {
  const ref = firestore()
    .collection('friends')
    .doc(buildPairId(uid, targetUid));
  const existing = await ref.get();
  if (existing.exists) {
    return;
  }
  await ref.set({
    userIds: [uid, targetUid].sort(),
    requestedBy: uid,
    addedVia: 'match',
    status: 'accepted',
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function respondToFriendRequest(
  friendshipId: string,
  response: 'accepted' | 'declined',
): Promise<void> {
  await firestore().collection('friends').doc(friendshipId).update({
    status: response,
    respondedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function cancelFriendship(friendshipId: string): Promise<void> {
  await firestore().collection('friends').doc(friendshipId).delete();
}

export function subscribeToFriendships(
  uid: string,
  onChange: (friendships: Friendship[]) => void,
  onError: (error: unknown) => void,
) {
  return firestore()
    .collection('friends')
    .where('userIds', 'array-contains', uid)
    .onSnapshot(snapshot => {
      onChange(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Friendship, 'id'>),
        })),
      );
    }, onError);
}
