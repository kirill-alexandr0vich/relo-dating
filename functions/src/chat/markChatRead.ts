import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import { otherParticipantOrThrow } from './parseChatId';
import { markChatReadInputSchema } from './schema';

/**
 * 6.2 — stamps the caller's own read position on a chat, so the chat
 * list can tell whether `lastMessageAt` is newer than what they've seen
 * (see entities/chat's `isChatUnread`). Client-writable data would be
 * fine here in principle (it's only the user's own read receipt), but
 * `/chats` is entirely Cloud-Function-write-only in firestore.rules —
 * routed through a callable instead of carving out a narrower rule for
 * one nested map key.
 *
 * No-ops (rather than creating a doc) if the chat doesn't exist yet —
 * nothing to mark read before a first message has ever been sent.
 */
export const markChatRead = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = markChatReadInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid payload.');
  }
  const { chatId } = parsed.data;
  otherParticipantOrThrow(chatId, uid);

  const chatRef = db.collection('chats').doc(chatId);
  const snapshot = await chatRef.get();
  if (!snapshot.exists) {
    return { marked: false };
  }

  await chatRef.set(
    { readBy: { [uid]: FieldValue.serverTimestamp() } },
    { merge: true },
  );
  return { marked: true };
});
