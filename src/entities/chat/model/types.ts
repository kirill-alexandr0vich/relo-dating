import { buildPairId } from 'shared/lib/pairId';

export type MessageType = 'text' | 'image' | 'voice' | 'call_log';

export interface Chat {
  id: string;
  participantIds: [string, string];
  lastMessage?: string;
  lastMessageAt?: number;
}

export interface Message {
  id: string;
  senderId: string;
  type: MessageType;
  content: string;
  createdAt: number;
  readAt?: number;
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
