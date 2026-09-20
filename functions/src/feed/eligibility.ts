export type Gender = 'male' | 'female' | 'other';
export type LookingFor = 'male' | 'female' | 'all';
export type SwipeFeedMode = 'country' | 'language' | 'both';

export interface SwipeFilters {
  mode: SwipeFeedMode;
  ageMin: number | null;
  ageMax: number | null;
  interestTags: string[];
  onlyVerified: boolean;
}

export interface FeedProfile {
  uid: string;
  name?: string;
  avatarUrls?: string[];
  country?: string;
  nativeLanguage?: string;
  age?: number;
  gender?: Gender;
  lookingFor?: LookingFor;
  interests?: string[];
  verified?: boolean;
  autoHidden?: boolean;
  blockedUserIds?: string[];
}

/**
 * 4.2 — mutual, in both directions: a pair is excluded from BOTH feeds if
 * either side has a specific preference the other doesn't match. An unset
 * `lookingFor` on either side simply doesn't filter on that side.
 */
export function isMutuallyVisible(
  viewer: Pick<FeedProfile, 'gender' | 'lookingFor'>,
  candidate: Pick<FeedProfile, 'gender' | 'lookingFor'>,
): boolean {
  const candidateAcceptsViewer =
    !candidate.lookingFor ||
    candidate.lookingFor === 'all' ||
    candidate.lookingFor === viewer.gender;
  const viewerAcceptsCandidate =
    !viewer.lookingFor ||
    viewer.lookingFor === 'all' ||
    viewer.lookingFor === candidate.gender;
  return candidateAcceptsViewer && viewerAcceptsCandidate;
}

/**
 * Every reason a user doc must not reach someone's swipe deck. This runs
 * on the server (and only on the server): the feed is served by the
 * fetchSwipeCandidates callable, and firestore.rules lets a client read
 * `/users/{uid}` only for people it is already connected to. Deciding
 * this client-side would mean shipping blocked, auto-hidden and
 * preference-mismatched profiles to the device and trusting it not to
 * look (12 — Security Rules are part of the feature, not a later pass).
 */
export function isEligibleCandidate(
  viewer: FeedProfile,
  candidate: FeedProfile,
  filters: SwipeFilters,
  alreadySwipedIds: ReadonlySet<string>,
): boolean {
  if (candidate.uid === viewer.uid) {
    return false;
  }
  if (alreadySwipedIds.has(candidate.uid)) {
    return false;
  }
  // 3.2 — at least 1 photo is required to appear in anyone's feed.
  if (!candidate.avatarUrls || candidate.avatarUrls.length === 0) {
    return false;
  }
  // 3.2 — registration isn't finished until these exist; a half-registered
  // doc has nothing to render on a card.
  if (!candidate.name || !candidate.country || !candidate.nativeLanguage) {
    return false;
  }
  if (
    (viewer.blockedUserIds ?? []).includes(candidate.uid) ||
    (candidate.blockedUserIds ?? []).includes(viewer.uid)
  ) {
    return false;
  }
  // 7.3 — auto-hidden users disappear from everyone else's feed.
  if (candidate.autoHidden) {
    return false;
  }
  if (!isMutuallyVisible(viewer, candidate)) {
    return false;
  }
  if (
    filters.ageMin !== null &&
    (candidate.age === undefined || candidate.age < filters.ageMin)
  ) {
    return false;
  }
  if (
    filters.ageMax !== null &&
    (candidate.age === undefined || candidate.age > filters.ageMax)
  ) {
    return false;
  }
  if (filters.interestTags.length > 0) {
    const candidateInterests = candidate.interests ?? [];
    const hasSharedTag = filters.interestTags.some(tag =>
      candidateInterests.includes(tag),
    );
    if (!hasSharedTag) {
      return false;
    }
  }
  if (filters.onlyVerified && !candidate.verified) {
    return false;
  }
  return true;
}
