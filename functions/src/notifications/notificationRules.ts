interface MessageNotificationInput {
  senderId: string;
  recipientId: string;
  chatId: string;
  /** The chat screen the recipient currently has open, if any (10 — presence flag). */
  recipientActiveChatId?: string | null;
}

/**
 * 10 — "Push о новом сообщении не отправляется, если получатель прямо
 * сейчас находится в этом же чате": they are already looking at the
 * message, so a banner for it is noise.
 */
export function shouldNotifyAboutMessage({
  senderId,
  recipientId,
  chatId,
  recipientActiveChatId,
}: MessageNotificationInput): boolean {
  if (senderId === recipientId) {
    return false;
  }
  return recipientActiveChatId !== chatId;
}

interface FriendshipDoc {
  status?: string;
  addedVia?: string;
}

export type FriendshipNotification =
  | 'friend_request'
  | 'friend_request_accepted'
  | null;

/**
 * 10 — which of the two friendship notifications a write earned, if any.
 *
 * A friendship created straight as `accepted` is the one that came from a
 * match (5.1), and both sides already got the match push — notifying
 * again would just be the same news twice.
 */
export function friendshipNotificationFor(
  before: FriendshipDoc | undefined,
  after: FriendshipDoc | undefined,
): FriendshipNotification {
  if (!after) {
    return null;
  }
  if (!before) {
    return after.status === 'pending' ? 'friend_request' : null;
  }
  return before.status === 'pending' && after.status === 'accepted'
    ? 'friend_request_accepted'
    : null;
}
