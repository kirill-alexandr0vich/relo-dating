import type { FeedProfile, Gender, LookingFor } from './eligibility';

/**
 * The only shape of someone else's profile that ever leaves the server.
 * Everything not listed here — `blockedUserIds`, `premium`,
 * `swipesUsedToday`, `mediaMessagesUsedToday`, `ageConfirmed18`,
 * `autoHidden`, `sortKey`, the reset timestamps — is either private or an
 * internal counter, and used to be readable by any signed-in client
 * straight from `/users` before the feed moved server-side.
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

interface StoredProfile extends FeedProfile {
  bio?: string;
  username?: string;
  hereSince?: string;
}

/** Drops every field a stranger has no business seeing, and defaults the rest. */
export function toPublicProfile(profile: StoredProfile): PublicProfile {
  return {
    uid: profile.uid,
    name: profile.name ?? '',
    avatarUrls: profile.avatarUrls ?? [],
    country: profile.country ?? '',
    nativeLanguage: profile.nativeLanguage ?? '',
    ...(profile.age !== undefined ? { age: profile.age } : {}),
    ...(profile.gender !== undefined ? { gender: profile.gender } : {}),
    ...(profile.lookingFor !== undefined
      ? { lookingFor: profile.lookingFor }
      : {}),
    ...(profile.interests !== undefined
      ? { interests: profile.interests }
      : {}),
    ...(profile.bio !== undefined ? { bio: profile.bio } : {}),
    ...(profile.username !== undefined ? { username: profile.username } : {}),
    ...(profile.verified !== undefined ? { verified: profile.verified } : {}),
    ...(profile.hereSince !== undefined
      ? { hereSince: profile.hereSince }
      : {}),
  };
}
