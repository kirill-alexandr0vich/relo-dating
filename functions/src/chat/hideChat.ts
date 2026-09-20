import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import { callableOptions } from '../shared/callableOptions';
import { otherParticipantOrThrow } from './parseChatId';
import { hideChatInputSchema } from './schema';

/**
 * 6.2 — "свайп по чату — удалить". Deleting hides the conversation from
 * the caller's own list rather than erasing it: the chat belongs to both
 * people (see deleteAccount for the same reasoning), so one side cannot
 * take the other's history away. A stamp beats a boolean flag here — a
 * later message is newer than the stamp, so the chat comes back on its
 * own when the conversation resumes, the way messengers behave.
 *
 * Routed through a callable because `/chats` is Cloud-Function-write-only
 * (firestore.rules).
 */
export const hideChat = onCall(callableOptions(), async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = hideChatInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid payload.');
  }
  const { chatId } = parsed.data;
  otherParticipantOrThrow(chatId, uid);

  const chatRef = db.collection('chats').doc(chatId);
  const snapshot = await chatRef.get();
  if (!snapshot.exists) {
    return { hidden: false };
  }

  await chatRef.set(
    { hiddenAt: { [uid]: FieldValue.serverTimestamp() } },
    { merge: true },
  );
  return { hidden: true };
});
