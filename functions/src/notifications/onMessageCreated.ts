import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { db } from '../firebaseAdmin';
import { shouldNotifyAboutMessage } from './notificationRules';
import { notifyUser, readPushSettings } from './sendPush';
import type { NotificationKind } from './notificationContent';

interface MessageDoc {
  senderId: string;
  type: 'text' | 'image' | 'voice' | 'call_log';
  content: string;
}

const KIND_BY_MESSAGE_TYPE: Record<string, NotificationKind> = {
  text: 'message_text',
  image: 'message_image',
  voice: 'message_voice',
};

/**
 * 10 — "Новое сообщение (текст/фото/голосовое)". Runs off the written
 * message rather than inside sendMessage/sendChatMedia, so one code path
 * covers every way a message can appear and a push failure can't fail
 * the send (14.2).
 */
export const onMessageCreated = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async event => {
    const message = event.data?.data() as MessageDoc | undefined;
    const kind = message && KIND_BY_MESSAGE_TYPE[message.type];
    if (!message || !kind) {
      return;
    }

    const { chatId } = event.params;
    const chatSnapshot = await db.collection('chats').doc(chatId).get();
    const participantIds =
      (chatSnapshot.data()?.participantIds as string[] | undefined) ?? [];
    const recipientId = participantIds.find(id => id !== message.senderId);
    if (!recipientId) {
      return;
    }

    const [recipientPushSettings, senderSnapshot] = await Promise.all([
      readPushSettings(recipientId),
      db.collection('users').doc(message.senderId).get(),
    ]);

    const shouldNotify = shouldNotifyAboutMessage({
      senderId: message.senderId,
      recipientId,
      chatId,
      recipientActiveChatId: recipientPushSettings.activeChatId,
    });
    if (!shouldNotify) {
      return;
    }

    await notifyUser(
      recipientId,
      kind,
      {
        name: (senderSnapshot.data()?.name as string) ?? '',
        // Only text previews its content; for media `content` is a
        // Storage path, which is meaningless in a banner.
        preview: message.type === 'text' ? message.content : undefined,
      },
      { type: 'message', chatId, uid: message.senderId },
    );
  },
);
