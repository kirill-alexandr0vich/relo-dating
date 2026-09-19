interface ScoreInput {
  country?: string;
  nativeLanguage?: string;
  interests?: string[];
}

const COUNTRY_MATCH_POINTS = 40;
const LANGUAGE_MATCH_POINTS = 30;
const MAX_INTERESTS_POINTS = 30;
const MAX_SCORED_SHARED_INTERESTS = 3;

/** 4.5 — the MVP compatibility score formula, unchanged from the TZ. */
export function calculateCompatibilityScore(
  viewer: ScoreInput,
  candidate: ScoreInput,
): number {
  const countryMatch =
    viewer.country && viewer.country === candidate.country
      ? COUNTRY_MATCH_POINTS
      : 0;
  const languageMatch =
    viewer.nativeLanguage && viewer.nativeLanguage === candidate.nativeLanguage
      ? LANGUAGE_MATCH_POINTS
      : 0;

  const viewerInterests = viewer.interests ?? [];
  const candidateInterests = new Set(candidate.interests ?? []);
  const sharedCount = viewerInterests.filter(interest =>
    candidateInterests.has(interest),
  ).length;
  const interestsScore =
    (Math.min(sharedCount, MAX_SCORED_SHARED_INTERESTS) /
      MAX_SCORED_SHARED_INTERESTS) *
    MAX_INTERESTS_POINTS;

  return Math.round(countryMatch + languageMatch + interestsScore);
}
