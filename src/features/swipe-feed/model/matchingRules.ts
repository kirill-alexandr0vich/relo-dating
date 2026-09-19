import type { Gender, LookingFor, UserRecord } from 'entities/user';
import type { SwipeFilters } from './filterTypes';

interface GenderPreference {
  gender?: Gender;
  lookingFor?: LookingFor;
}

/**
 * 4.2 — mutual, in both directions: a pair is excluded from BOTH feeds if
 * either side has a specific preference the other doesn't match. An unset
 * `lookingFor` on either side simply doesn't filter on that side.
 */
export function isMutuallyVisible(
  viewer: GenderPreference,
  candidate: GenderPreference,
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
 * Every client-side reason a fetched user doc should never reach the
 * swipe deck: everything the Firestore query itself can't express
 * (self, blocked either way, no photo yet, already swiped this session,
 * mutual gender visibility, and the optional premium filters).
 */
export function isEligibleCandidate(
  viewer: UserRecord,
  candidate: UserRecord,
  filters: SwipeFilters,
  alreadySwipedIds: ReadonlySet<string>,
): boolean {
  if (candidate.uid === viewer.uid) {
    return false;
  }
  if (alreadySwipedIds.has(candidate.uid)) {
    return false;
  }
  if (candidate.avatarUrls.length === 0) {
    // 3.2 — at least 1 photo is required to appear in anyone's feed.
    return false;
  }
  if (
    viewer.blockedUserIds.includes(candidate.uid) ||
    candidate.blockedUserIds.includes(viewer.uid)
  ) {
    return false;
  }
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
