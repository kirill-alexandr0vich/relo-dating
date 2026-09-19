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
 * Published media is made public (same mechanism as submitProfilePhoto)
 * rather than gated by a Storage rule scoped to the two participants —
 * a stricter per-participant read rule would need either a cross-service
 * Storage rule reading /chats from Firestore, or short-lived signed URLs
 * issued per request, and neither can be verified end-to-end without a
 * live deploy and a real device, unavailable in this environment. The
 * URL is unguessable (Firestore-generated id as the filename) but not
 * access-controlled beyond that — documented in docs/STATUS.md as a
 * known limitation, not shipped silently. Precisely because it's public,
 * the actual file content-type is always verified below (both for
 * images and voice) — otherwise `type` is just a client-asserted label,
 * and this endpoint would double as a free, unmoderated public file host.
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
  await mediaFile.makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${mediaPath}`;

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
        content: url,
        createdAt: now,
        ...(type === 'voice'
          ? { durationSeconds: parsed.data.durationSeconds }
          : {}),
      });
    });
  } catch (error) {
    // Whatever failed (rate limit, transient Firestore error), the file
    // is already public and moved with nothing pointing at it — clean
    // it up rather than leaking it (same pattern as submitProfilePhoto).
    await mediaFile.delete({ ignoreNotFound: true });
    throw error;
  }

  return { messageId: messageRef.id, url };
});
