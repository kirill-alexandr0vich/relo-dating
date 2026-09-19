export type { User, UserRecord, Gender, LookingFor } from './model/types';
export { isRegistrationComplete } from './model/types';
export { getResidencyBadge } from './model/residencyBadge';
export type { ResidencyBadge } from './model/residencyBadge';
export { useUserStore } from './model/store';
export type { SessionStatus } from './model/store';
export {
  fetchUserRecord,
  subscribeToUserRecord,
  ensureUserRecordExists,
  saveRequiredProfileFields,
} from './api/userApi';
