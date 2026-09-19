import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import { buildPairId } from '../shared/pairId';
import { containsProfanity } from '../moderation/textModeration';
import { evaluateConnection } from './connection';
import { sendMessageInputSchema } from './schema';

interface UserDoc {
  blockedUserIds?: string[];
  allowFriendMessagesWithoutMatch?: boolean;
}

interface FriendDoc {
  status?: 'pending' | 'accepted' | 'declined';
}

/**
 * 6.2/7.2 — the only way a message is written. `chatId` is the
 * deterministic sorted-uid pair id, so it doubles as the /matches and
 * /friends doc id for this pair — one lookup each tells us whether
 * they're allowed to talk at all, before the text is even moderated.
 */
export const sendMessage = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = sendMessageInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid payload.');
  }
  const { chatId, text } = parsed.data;

  const participantIds = chatId.split('_');
  const otherUid = participantIds.find(id => id !== uid);
  if (
    participantIds.length !== 2 ||
    !otherUid ||
    buildPairId(uid, otherUid) !== chatId
  ) {
    throw new HttpsError('invalid-argument', 'Malformed chat id.');
  }

  const [selfSnapshot, otherSnapshot, matchSnapshot, friendSnapshot] =
    await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(otherUid).get(),
      db.collection('matches').doc(chatId).get(),
      db.collection('friends').doc(chatId).get(),
    ]);

  const self = selfSnapshot.data() as UserDoc | undefined;
  const other = otherSnapshot.data() as UserDoc | undefined;
  const friend = friendSnapshot.data() as FriendDoc | undefined;

  const connection = evaluateConnection({
    hasMatch: matchSnapshot.exists,
    friendStatus: friend?.status ?? null,
    selfBlockedOther: (self?.blockedUserIds ?? []).includes(otherUid),
    otherBlockedSelf: (other?.blockedUserIds ?? []).includes(uid),
    selfAllowsFriendMessages: self?.allowFriendMessagesWithoutMatch ?? true,
    otherAllowsFriendMessages: other?.allowFriendMessagesWithoutMatch ?? true,
  });

  if (!connection.canSend) {
    throw new HttpsError(
      'permission-denied',
      connection.reason ?? 'not_connected',
    );
  }

  if (containsProfanity(text)) {
    throw new HttpsError('failed-precondition', 'moderation_rejected');
  }

  const chatRef = db.collection('chats').doc(chatId);
  const messageRef = chatRef.collection('messages').doc();
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction: Transaction) => {
    transaction.set(
      chatRef,
      {
        participantIds: [uid, otherUid].sort(),
        lastMessage: text,
        lastMessageAt: now,
      },
      { merge: true },
    );
    transaction.set(messageRef, {
      senderId: uid,
      type: 'text',
      content: text,
      createdAt: now,
    });
  });

  return { messageId: messageRef.id };
});
