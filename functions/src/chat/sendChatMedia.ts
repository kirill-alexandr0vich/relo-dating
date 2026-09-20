import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  FieldValue,
  Timestamp,
  type Transaction,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import { getNextUtcMidnight, hasCounterExpired } from '../shared/dateUtils';
import { isImageSafe } from '../moderation/imageModeration';
import { getConnectionForPair } from './getConnectionForPair';
import { otherParticipantOrThrow } from './parseChatId';
import { sendChatMediaInputSchema } from './schema';

// 12 — anti-abuse: without this, an authenticated pair could use the
// public chat-media bucket (see the doc comment below) as a free,
// unlimited file host. Combined for photos+voice; not premium-gated,
// since premium doesn't exist yet — revisit once it does.
const FREE_DAILY_MEDIA_LIMIT = 30;

interface SenderDoc {
  mediaMessagesUsedToday?: number;
  mediaMessagesResetAt?: Timestamp;
}

/**
 * 6.1/6.3 — photo/voice chat messages. Same connection check as
 * sendMessage; the content is a file the client already uploaded to a
 * private per-chat staging path in Storage rather than inline text.
 *
 * Unlike profile photos (which are public by design — they have to load
 * in everyone's feed), chat media stays private: the file is never made
 * public, the message stores its Storage PATH rather than a URL, and
 * storage.rules only lets the two uids encoded in `chatId` read it. A
 * participant's client turns that path into a short-lived download URL
 * itself. The content-type of the file is still verified below for both
 * images and voice — `type` is a client-asserted label, and a mislabelled
 * file would otherwise sail past image moderation.
 *
 * Voice has no automated *content* moderation: 7.2 requires moderating
 * all user content, but there is no audio moderation pipeline available
 * here (would need speech-to-text + text moderation, or a dedicated
 * audio moderation API — a new external dependency). Documented gap,
 * not an oversight. The file's *type* (that it's actually audio) is
 * still checked, independently of content moderation.
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

  const [metadata] = await pendingFile.getMetadata();
  const contentType = metadata.contentType ?? '';
  const expectedPrefix = type === 'image' ? 'image/' : 'audio/';
  if (!contentType.startsWith(expectedPrefix)) {
    await pendingFile.delete({ ignoreNotFound: true });
    throw new HttpsError(
      'invalid-argument',
      `File is not ${expectedPrefix.slice(0, -1)} content.`,
    );
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

  try {
    await pendingFile.move(mediaPath);
  } catch {
    // Most likely a duplicate/racing call already moved this exact
    // pendingPath out from under us (Storage move deletes the source).
    throw new HttpsError(
      'failed-precondition',
      'This upload was already sent.',
    );
  }
  const mediaFile = bucket.file(mediaPath);

  const senderRef = db.collection('users').doc(uid);
  const chatRef = db.collection('chats').doc(chatId);
  const messageRef = chatRef.collection('messages').doc();
  const now = FieldValue.serverTimestamp();

  try {
    await db.runTransaction(async (transaction: Transaction) => {
      const senderSnapshot = await transaction.get(senderRef);
      const sender = (senderSnapshot.data() as SenderDoc | undefined) ?? {};
      const nowDate = Timestamp.now();
      const expired = hasCounterExpired(
        sender.mediaMessagesResetAt?.toDate(),
        nowDate.toDate(),
      );
      const usedToday = expired ? 0 : sender.mediaMessagesUsedToday ?? 0;

      if (usedToday >= FREE_DAILY_MEDIA_LIMIT) {
        throw new HttpsError(
          'resource-exhausted',
          'Daily media message limit reached.',
        );
      }

      transaction.set(
        senderRef,
        {
          mediaMessagesUsedToday: usedToday + 1,
          mediaMessagesResetAt: Timestamp.fromDate(
            expired
              ? getNextUtcMidnight(nowDate.toDate())
              : sender.mediaMessagesResetAt!.toDate(),
          ),
        },
        { merge: true },
      );

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
        // The Storage path, not a URL: only a participant can turn it
        // into a download URL (see storage.rules).
        content: mediaPath,
        createdAt: now,
        ...(type === 'voice'
          ? { durationSeconds: parsed.data.durationSeconds }
          : {}),
      });
    });
  } catch (error) {
    // Whatever failed (rate limit, transient Firestore error), the file
    // has already been moved out of staging with nothing pointing at it —
    // clean it up rather than leaving an orphan (same pattern as
    // submitProfilePhoto).
    await mediaFile.delete({ ignoreNotFound: true });
    throw error;
  }

  return { messageId: messageRef.id, path: mediaPath };
});
