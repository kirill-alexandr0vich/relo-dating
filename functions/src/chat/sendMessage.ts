import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import { containsProfanity } from '../moderation/textModeration';
import { getConnectionForPair } from './getConnectionForPair';
import { otherParticipantOrThrow } from './parseChatId';
import { sendMessageInputSchema } from './schema';

/**
 * 6.2/7.2 — the only way a text message is written. `chatId` is the
 * deterministic sorted-uid pair id, so it doubles as the /matches and
 * /friends doc id for this pair — one lookup each tells us whether
 * they're allowed to talk at all, before the text is even moderated.
 * See sendChatMedia.ts for photo/voice messages (6.1/6.3).
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
  const otherUid = otherParticipantOrThrow(chatId, uid);

  const connection = await getConnectionForPair(uid, otherUid, chatId);
  if (!connection.canSend) {
    throw new HttpsError(
      'permission-denied',
      connection.reason ?? 'not_connected',
    );
  }

  if (containsProfanity(text)) {
    logger.warn('sendMessage: rejected by profanity filter', {
      uid,
      chatId,
    });
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
        // The sender has implicitly "read" up to their own message —
        // see markChatRead.ts for the recipient's side (6.2 unread state).
        readBy: { [uid]: now },
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
