export interface ConnectionInput {
  hasMatch: boolean;
  friendStatus: 'pending' | 'accepted' | 'declined' | null;
  selfBlockedOther: boolean;
  otherBlockedSelf: boolean;
  selfAllowsFriendMessages: boolean;
  otherAllowsFriendMessages: boolean;
}

export type BlockedReason =
  | 'blocked'
  | 'friend_messages_disabled'
  | 'not_connected';

export interface ConnectionResult {
  canSend: boolean;
  reason?: BlockedReason;
}

/**
 * 5/6.2 — a pair can message if they matched (unconditionally), or if
 * they're accepted friends AND both sides still allow friend-without-match
 * messages (5 — turning the toggle off makes an existing chat read-only,
 * not delete it). Blocking (either direction) always wins.
 */
export function evaluateConnection(input: ConnectionInput): ConnectionResult {
  if (input.selfBlockedOther || input.otherBlockedSelf) {
    return { canSend: false, reason: 'blocked' };
  }
  if (input.hasMatch) {
    return { canSend: true };
  }
  if (input.friendStatus === 'accepted') {
    if (input.selfAllowsFriendMessages && input.otherAllowsFriendMessages) {
      return { canSend: true };
    }
    return { canSend: false, reason: 'friend_messages_disabled' };
  }
  return { canSend: false, reason: 'not_connected' };
}
