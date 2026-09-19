export type FriendStatus = 'pending' | 'accepted' | 'declined';
export type AddedVia = 'match' | 'qr' | 'username_search';

export interface Friendship {
  id: string;
  userIds: [string, string];
  requestedBy: string;
  addedVia: AddedVia;
  status: FriendStatus;
  createdAt: number;
  respondedAt?: number;
}

export function getOtherParticipant(
  friendship: Pick<Friendship, 'userIds'>,
  uid: string,
): string {
  return friendship.userIds[0] === uid
    ? friendship.userIds[1]
    : friendship.userIds[0];
}

export function isIncomingRequest(
  friendship: Pick<Friendship, 'requestedBy' | 'status'>,
  uid: string,
): boolean {
  return friendship.status === 'pending' && friendship.requestedBy !== uid;
}
