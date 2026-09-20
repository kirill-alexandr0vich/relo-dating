import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import { getConnectionForPair } from './getConnectionForPair';
import { otherParticipantOrThrow } from './parseChatId';
import { sendMessageInputSchema } from './schema';

/**
 * 6.2 — the only way a text message is written. `chatId` is the
 * deterministic sorted-uid pair id, so it doubles as the /matches and
 * /friends doc id for this pair — one lookup each tells us whether
 * they're allowed to talk at all. See sendChatMedia.ts for photo/voice
 * messages (6.1/6.3).
 *
 * Message text is NOT run through the profanity filter, a deliberate
 * departure from 7.2's "текст в чате проверяется синхронно": a word list
 * between two people who already agreed to talk blocks ordinary adult
 * conversation and catches none of what actually goes wrong in private
 * chat (harassment, scams, minors). Those are handled by reports and
 * auto-hiding (7.3) and blocking (6.2). Photos in chat are still
 * moderated — see sendChatMedia.
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
