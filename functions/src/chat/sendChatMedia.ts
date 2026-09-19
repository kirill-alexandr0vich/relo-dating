import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import { isImageSafe } from '../moderation/imageModeration';
import { getConnectionForPair } from './getConnectionForPair';
import { otherParticipantOrThrow } from './parseChatId';
import { sendChatMediaInputSchema } from './schema';

/**
 * 6.1/6.3 — photo/voice chat messages. Same connection check as
 * sendMessage; the content is a file the client already uploaded to a
 * private per-chat staging path in Storage rather than inline text.
 *
 * Published media is made public (same mechanism as submitProfilePhoto)
 * rather than gated by a Storage rule scoped to the two participants —
 * a stricter per-participant read rule would need either a cross-service
 * Storage rule reading /chats from Firestore, or short-lived signed URLs
 * issued per request, and neither can be verified end-to-end without a
 * live deploy and a real device, unavailable in this environment. The
 * URL is unguessable (Firestore-generated id as the filename) but not
 * access-controlled beyond that — documented in docs/STATUS.md as a
 * known limitation, not shipped silently.
 *
 * Voice has no automated moderation: 7.2 requires moderating all user
 * content, but there is no audio moderation pipeline available here
 * (would need speech-to-text + text moderation, or a dedicated audio
 * moderation API — a new external dependency). Documented gap, not an
 * oversight.
 */
export const sendChatMedia = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = sendChatMediaInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid payload.');
  }
  const { chatId, pendingPath, type } = parsed.data;
  const otherUid = otherParticipantOrThrow(chatId, uid);

  if (!pendingPath.startsWith(`chats/${chatId}/pending/${uid}/`)) {
    throw new HttpsError(
      'permission-denied',
      'Can only publish your own pending upload.',
    );
  }

  const connection = await getConnectionForPair(uid, otherUid, chatId);
  if (!connection.canSend) {
    throw new HttpsError(
      'permission-denied',
      connection.reason ?? 'not_connected',
    );
  }

  const bucket = getStorage().bucket();
  const pendingFile = bucket.file(pendingPath);
  const [exists] = await pendingFile.exists();
  if (!exists) {
    throw new HttpsError('not-found', 'Pending upload not found.');
  }

  if (type === 'image') {
    const isSafe = await isImageSafe(`gs://${bucket.name}/${pendingPath}`);
    if (!isSafe) {
      await pendingFile.delete({ ignoreNotFound: true });
      logger.warn('sendChatMedia: image rejected by SafeSearch', {
        uid,
        chatId,
      });
      throw new HttpsError('failed-precondition', 'moderation_rejected');
    }
  }

  const fileName = pendingPath.split('/').pop();
  const mediaPath = `chats/${chatId}/media/${fileName}`;
  await pendingFile.move(mediaPath);
  const mediaFile = bucket.file(mediaPath);
  await mediaFile.makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${mediaPath}`;

  const chatRef = db.collection('chats').doc(chatId);
  const messageRef = chatRef.collection('messages').doc();
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction: Transaction) => {
    transaction.set(
      chatRef,
      {
        participantIds: [uid, otherUid].sort(),
        lastMessage: type === 'image' ? '📷' : '🎤',
        lastMessageAt: now,
        readBy: { [uid]: now },
      },
      { merge: true },
    );
    transaction.set(messageRef, {
      senderId: uid,
      type,
      content: url,
      createdAt: now,
      ...(type === 'voice'
        ? { durationSeconds: parsed.data.durationSeconds }
        : {}),
    });
  });

  return { messageId: messageRef.id, url };
});
