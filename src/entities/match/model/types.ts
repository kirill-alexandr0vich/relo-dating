export interface Match {
  id: string;
  userIds: [string, string];
  createdAt: number;
  lastMessageAt: number;
}

export function getOtherParticipant(
  match: Pick<Match, 'userIds'>,
  uid: string,
): string {
  return match.userIds[0] === uid ? match.userIds[1] : match.userIds[0];
}
