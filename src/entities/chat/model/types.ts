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
  /**
   * 12 — participants who deleted their account. The conversation is kept
   * for the other side, so `participantIds` still lists them; this is what
   * says the person behind that uid is gone.
   */
  deletedParticipantIds?: string[];
}

export interface Message {
  id: string;
  senderId: string;
  type: MessageType;
  /**
   * Text for `type: 'text'`; for `'image'`/`'voice'` a Cloud Storage
   * path, readable only by the two participants — resolve it with
   * `resolveChatMediaUrl` before handing it to an image or audio player.
   */
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
 * 12 — whether that participant deleted their account. Their profile is
 * gone, so there is no name or photo to show and nothing to send to: the
 * chat becomes a read-only record of what was said.
 */
export function isParticipantDeleted(
  chat: Pick<Chat, 'deletedParticipantIds'>,
  uid: string,
): boolean {
  return (chat.deletedParticipantIds ?? []).includes(uid);
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
