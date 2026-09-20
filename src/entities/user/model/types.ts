import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type Gender = 'male' | 'female' | 'other';
export type LookingFor = 'male' | 'female' | 'all';

/**
 * Shape of `/users/{uid}` as it can look at ANY point in time, including
 * mid-onboarding right after sign-in and before the required fields are
 * filled in. Counters/flags owned by Cloud Functions (verified, premium,
 * swipesUsedToday, ...) are optional here because the client must never
 * assume they exist before a Cloud Function has initialized them.
 */
export interface UserRecord {
  uid: string;
  name?: string;
  avatarUrls: string[];
  country?: string;
  nativeLanguage?: string;
  age?: number;
  gender?: Gender;
  lookingFor?: LookingFor;
  interests?: string[];
  bio?: string;
  username?: string;
  verified?: boolean;
  premium?: boolean;
  premiumExpiresAt?: number;
  swipesUsedToday?: number;
  /** Written by the recordSwipe Cloud Function as a real Firestore Timestamp, not a plain number. */
  swipesResetAt?: FirebaseFirestoreTypes.Timestamp;
  callMinutesUsedToday?: number;
  callMinutesResetAt?: number;
  /** 12 — anti-abuse cap on chat photo/voice messages; see functions/src/chat/sendChatMedia. */
  mediaMessagesUsedToday?: number;
  mediaMessagesResetAt?: FirebaseFirestoreTypes.Timestamp;
  allowFriendMessagesWithoutMatch: boolean;
  autoHidden?: boolean;
  autoHiddenAt?: number;
  ageConfirmed18: boolean;
  createdAt: number;
  lastActiveAt: number;
  blockedUserIds: string[];
  hereSince?: string;
  /**
   * Not part of the TZ's documented schema (Приложение B) — an
   * implementation detail added to support 4.2.1's random feed shuffling
   * via a Firestore range query (`orderBy('sortKey').startAt(random)`).
   * Set once, alongside the required fields, when registration completes.
   */
  sortKey?: number;
}

/**
 * Someone else's profile, as served by the `fetchSwipeCandidates` and
 * `lookupUserByUsername` Cloud Functions (functions/src/feed). This is
 * everything the client is given about a user it isn't connected to —
 * `/users` documents themselves are only readable for your own profile
 * and for people you already share a match/friendship/chat with (see
 * firestore.rules), so counters, block lists and moderation flags never
 * reach another user's device.
 */
export interface PublicProfile {
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
  username?: string;
  verified?: boolean;
  hereSince?: string;
}

/** A `UserRecord` that has completed the required registration fields (3.2). */
export interface User extends UserRecord {
  name: string;
  country: string;
  nativeLanguage: string;
}

export function isRegistrationComplete(record: UserRecord): record is User {
  return Boolean(
    record.name &&
      record.country &&
      record.nativeLanguage &&
      record.ageConfirmed18,
  );
}
