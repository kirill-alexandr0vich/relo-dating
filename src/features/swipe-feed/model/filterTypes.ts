export type SwipeFeedMode = 'country' | 'language' | 'both';

export interface SwipeFilters {
  mode: SwipeFeedMode;
  /** Premium-only (8) — age range, interest tags, gender via lookingFor are all free-tier locked. */
  ageMin: number | null;
  ageMax: number | null;
  interestTags: string[];
  onlyVerified: boolean;
}

export const DEFAULT_SWIPE_FILTERS: SwipeFilters = {
  mode: 'both',
  ageMin: null,
  ageMax: null,
  interestTags: [],
  onlyVerified: false,
};
