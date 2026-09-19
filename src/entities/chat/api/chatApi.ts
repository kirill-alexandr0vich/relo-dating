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
