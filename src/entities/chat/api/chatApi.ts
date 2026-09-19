import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type { Chat, Message } from '../model/types';

export function subscribeToChats(
  uid: string,
  onChange: (chats: Chat[]) => void,
  onError: (error: unknown) => void,
) {
  return firestore()
    .collection('chats')
    .where('participantIds', 'array-contains', uid)
    .orderBy('lastMessageAt', 'desc')
    .onSnapshot(snapshot => {
      onChange(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Chat, 'id'>),
        })),
      );
    }, onError);
}

export function subscribeToMessages(
  chatId: string,
  onChange: (messages: Message[]) => void,
  onError: (error: unknown) => void,
) {
  return firestore()
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snapshot => {
      onChange(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Message, 'id'>),
        })),
      );
    }, onError);
}

/** 6.2/7.2 — moderated + connection-checked server-side; see functions/src/chat/sendMessage. */
export async function sendChatMessage(
  chatId: string,
  text: string,
): Promise<string> {
  const callable = functions().httpsCallable<
    { chatId: string; text: string },
    { messageId: string }
  >('sendMessage');
  const response = await callable({ chatId, text });
  return response.data.messageId;
}

/** A `resource-exhausted` error from sendChatMedia means the daily media-message cap was hit, not a network failure. */
export const MEDIA_LIMIT_REACHED_CODE = 'resource-exhausted';

/** 6.1/6.3 — moderated + connection-checked server-side; see functions/src/chat/sendChatMedia. */
export async function sendChatPhoto(
  chatId: string,
  pendingPath: string,
): Promise<string> {
  const callable = functions().httpsCallable<
    { chatId: string; pendingPath: string; type: 'image' },
    { messageId: string; url: string }
  >('sendChatMedia');
  const response = await callable({ chatId, pendingPath, type: 'image' });
  return response.data.url;
}

/** 6.1/6.3 — no automated moderation for voice; see functions/src/chat/sendChatMedia's doc comment. */
export async function sendChatVoice(
  chatId: string,
  pendingPath: string,
  durationSeconds: number,
): Promise<string> {
  const callable = functions().httpsCallable<
    {
      chatId: string;
      pendingPath: string;
      type: 'voice';
      durationSeconds: number;
    },
    { messageId: string; url: string }
  >('sendChatMedia');
  const response = await callable({
    chatId,
    pendingPath,
    type: 'voice',
    durationSeconds,
  });
  return response.data.url;
}

/** 6.2 — stamps my own read position on this chat; see functions/src/chat/markChatRead. */
export async function markChatRead(chatId: string): Promise<void> {
  const callable = functions().httpsCallable<
    { chatId: string },
    { marked: boolean }
  >('markChatRead');
  await callable({ chatId });
}

/** 6.2 — removes the shared match/friendship server-side; see functions/src/chat/blockUser. */
export async function blockUser(targetUid: string): Promise<void> {
  const callable = functions().httpsCallable<
    { targetUid: string },
    { blocked: boolean }
  >('blockUser');
  await callable({ targetUid });
}

export async function unblockUser(
  uid: string,
  targetUid: string,
): Promise<void> {
  await firestore()
    .collection('users')
    .doc(uid)
    .update({ blockedUserIds: firestore.FieldValue.arrayRemove(targetUid) });
}
