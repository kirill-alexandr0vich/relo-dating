export type { Friendship, FriendStatus, AddedVia } from './model/types';
export { getOtherParticipant, isIncomingRequest } from './model/types';
export {
  sendFriendRequest,
  addFriendFromMatch,
  respondToFriendRequest,
  cancelFriendship,
  subscribeToFriendships,
} from './api/friendApi';
export type { SendFriendRequestResult } from './api/friendApi';
