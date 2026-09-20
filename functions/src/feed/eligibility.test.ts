import {
  isEligibleCandidate,
  isMutuallyVisible,
  type FeedProfile,
  type SwipeFilters,
} from './eligibility';

const DEFAULT_FILTERS: SwipeFilters = {
  mode: 'both',
  ageMin: null,
  ageMax: null,
  interestTags: [],
  onlyVerified: false,
};

describe('isMutuallyVisible', () => {
  it('is visible when neither side set a preference', () => {
    expect(isMutuallyVisible({}, {})).toBe(true);
  });

  it('is visible when both sides prefer each other', () => {
    expect(
      isMutuallyVisible(
        { gender: 'female', lookingFor: 'male' },
        { gender: 'male', lookingFor: 'female' },
      ),
    ).toBe(true);
  });

  it("is hidden when the candidate does not want the viewer's gender", () => {
    expect(
      isMutuallyVisible(
        { gender: 'male' },
        { gender: 'female', lookingFor: 'female' },
      ),
    ).toBe(false);
  });

  it("is hidden when the viewer does not want the candidate's gender", () => {
    expect(
      isMutuallyVisible(
        { gender: 'male', lookingFor: 'female' },
        { gender: 'male' },
      ),
    ).toBe(false);
  });

  it('"all" always matches', () => {
    expect(
      isMutuallyVisible(
        { gender: 'male', lookingFor: 'all' },
        { gender: 'other', lookingFor: 'all' },
      ),
    ).toBe(true);
  });

  it('is symmetric', () => {
    const a = { gender: 'male' as const, lookingFor: 'female' as const };
    const b = { gender: 'male' as const, lookingFor: 'female' as const };
    expect(isMutuallyVisible(a, b)).toBe(isMutuallyVisible(b, a));
  });
});

function makeProfile(overrides: Partial<FeedProfile>): FeedProfile {
  return {
    uid: 'viewer',
    name: 'Sam',
    avatarUrls: ['photo.jpg'],
    country: 'GE',
    nativeLanguage: 'ru',
    blockedUserIds: [],
    ...overrides,
  };
}

describe('isEligibleCandidate', () => {
  const viewer = makeProfile({ uid: 'viewer' });

  it('excludes the viewer themself', () => {
    const self = makeProfile({ uid: 'viewer' });
    expect(isEligibleCandidate(viewer, self, DEFAULT_FILTERS, new Set())).toBe(
      false,
    );
  });

  it('excludes an already-swiped candidate', () => {
    const candidate = makeProfile({ uid: 'candidate' });
    expect(
      isEligibleCandidate(
        viewer,
        candidate,
        DEFAULT_FILTERS,
        new Set(['candidate']),
      ),
    ).toBe(false);
  });

  it('excludes a candidate with no photos (3.2)', () => {
    const candidate = makeProfile({ uid: 'candidate', avatarUrls: [] });
    expect(
      isEligibleCandidate(viewer, candidate, DEFAULT_FILTERS, new Set()),
    ).toBe(false);
  });

  it('excludes a half-registered candidate with no required fields yet', () => {
    const candidate = makeProfile({ uid: 'candidate', name: undefined });
    expect(
      isEligibleCandidate(viewer, candidate, DEFAULT_FILTERS, new Set()),
    ).toBe(false);
  });

  it('excludes a candidate blocked by the viewer', () => {
    const blocker = makeProfile({
      uid: 'viewer',
      blockedUserIds: ['candidate'],
    });
    const candidate = makeProfile({ uid: 'candidate' });
    expect(
      isEligibleCandidate(blocker, candidate, DEFAULT_FILTERS, new Set()),
    ).toBe(false);
  });

  it('excludes a candidate who has blocked the viewer', () => {
    const candidate = makeProfile({
      uid: 'candidate',
      blockedUserIds: ['viewer'],
    });
    expect(
      isEligibleCandidate(viewer, candidate, DEFAULT_FILTERS, new Set()),
    ).toBe(false);
  });

  it('excludes an auto-hidden candidate (7.3)', () => {
    const candidate = makeProfile({ uid: 'candidate', autoHidden: true });
    expect(
      isEligibleCandidate(viewer, candidate, DEFAULT_FILTERS, new Set()),
    ).toBe(false);
  });

  it('applies the age range filter when set', () => {
    const candidate = makeProfile({ uid: 'candidate', age: 17 });
    const filters = { ...DEFAULT_FILTERS, ageMin: 18, ageMax: 40 };
    expect(isEligibleCandidate(viewer, candidate, filters, new Set())).toBe(
      false,
    );
  });

  it('excludes candidates with no age set once an age filter is active', () => {
    const candidate = makeProfile({ uid: 'candidate' });
    const filters = { ...DEFAULT_FILTERS, ageMin: 18, ageMax: 40 };
    expect(isEligibleCandidate(viewer, candidate, filters, new Set())).toBe(
      false,
    );
  });

  it('requires at least one shared interest tag when the filter is set', () => {
    const candidate = makeProfile({ uid: 'candidate', interests: ['cars'] });
    const filters = { ...DEFAULT_FILTERS, interestTags: ['travel'] };
    expect(isEligibleCandidate(viewer, candidate, filters, new Set())).toBe(
      false,
    );
  });

  it('passes a candidate meeting every filter', () => {
    const candidate = makeProfile({
      uid: 'candidate',
      age: 25,
      interests: ['travel'],
      verified: true,
    });
    const filters = {
      ...DEFAULT_FILTERS,
      ageMin: 18,
      ageMax: 40,
      interestTags: ['travel'],
      onlyVerified: true,
    };
    expect(isEligibleCandidate(viewer, candidate, filters, new Set())).toBe(
      true,
    );
  });
});
