export type Gender = 'male' | 'female' | 'other';
export type LookingFor = 'male' | 'female' | 'all';

export interface User {
  uid: string;
  name: string;
  avatarUrls: string[];
  country: string;
  nativeLanguage: string;
  age?: number;
  gender?: Gender;
  lookingFor?: LookingFor;
  interests?: string[];
  bio?: string;
  username: string;
  verified: boolean;
  premium: boolean;
  premiumExpiresAt?: number;
  swipesUsedToday: number;
  swipesResetAt: number;
  callMinutesUsedToday: number;
  callMinutesResetAt: number;
  allowFriendMessagesWithoutMatch: boolean;
  autoHidden: boolean;
  autoHiddenAt?: number;
  ageConfirmed18: boolean;
  createdAt: number;
  lastActiveAt: number;
  blockedUserIds: string[];
  hereSince?: string;
}
