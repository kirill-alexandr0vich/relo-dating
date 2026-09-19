import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { buildPairId } from 'shared/lib/pairId';

export type MessageType = 'text' | 'image' | 'voice' | 'call_log';

export interface Chat {
  id: string;
  participantIds: [string, string];
  lastMessage?: string;
  lastMessageAt?: FirebaseFirestoreTypes.Timestamp;
  /** 6.2 — each participant's own last-read stamp, set by markChatRead / on send. */
  readBy?: Record<string, FirebaseFirestoreTypes.Timestamp>;
}

export interface Message {
  id: string;
  senderId: string;
  type: MessageType;
  /** Text content for `type: 'text'`, a public URL for `'image'`/`'voice'`. */
  content: string;
  createdAt: number;
  /** 6.3 — only set for `type: 'voice'`. */
  durationSeconds?: number;
}

/** Deterministic — matches the id scheme functions/src/shared/pairId.ts uses for matches/friends/chats. */
export function buildChatId(uidA: string, uidB: string): string {
  return buildPairId(uidA, uidB);
}

export function getOtherParticipant(
  chat: Pick<Chat, 'participantIds'>,
  uid: string,
): string {
  return chat.participantIds[0] === uid
    ? chat.participantIds[1]
    : chat.participantIds[0];
}

/**
 * 6.2 — a chat is unread for `uid` if the last message is newer than
 * their own read stamp. Sending a message stamps the sender's own
 * `readBy` at the same time (see sendMessage/sendChatMedia Cloud
 * Functions), so a chat the viewer just sent into never shows as
 * unread for them.
 */
export function isChatUnread(
  chat: Pick<Chat, 'lastMessageAt' | 'readBy'>,
  uid: string,
): boolean {
  if (!chat.lastMessageAt) {
    return false;
  }
  const myReadAt = chat.readBy?.[uid];
  if (!myReadAt) {
    return true;
  }
  return chat.lastMessageAt.toMillis() > myReadAt.toMillis();
}
