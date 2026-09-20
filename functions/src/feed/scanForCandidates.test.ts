import type { FeedProfile, SwipeFilters } from './eligibility';
import {
  scanForCandidates,
  TARGET_CANDIDATE_COUNT,
  type FeedPageFetcher,
  type ScannedProfile,
} from './scanForCandidates';

const DEFAULT_FILTERS: SwipeFilters = {
  mode: 'both',
  ageMin: null,
  ageMax: null,
  interestTags: [],
  onlyVerified: false,
};

const viewer: FeedProfile = {
  uid: 'viewer',
  name: 'Sam',
  avatarUrls: ['photo.jpg'],
  country: 'GE',
  nativeLanguage: 'ru',
  blockedUserIds: [],
};

function makePool(count: number): ScannedProfile[] {
  return Array.from({ length: count }, (_unused, index) => ({
    uid: `user-${index}`,
    name: `User ${index}`,
    avatarUrls: ['photo.jpg'],
    country: 'GE',
    nativeLanguage: 'ru',
    blockedUserIds: [],
    // Evenly spread across [0, 1) — a stand-in for the random sortKeys
    // real profiles get at registration.
    sortKey: index / count,
  }));
}

/** In-memory stand-in for the Firestore range query the callable builds. */
function fetchPageFrom(pool: ScannedProfile[]): FeedPageFetcher {
  return async page => {
    const rows = pool
      .filter(
        profile =>
          (page.startAt === null || profile.sortKey >= page.startAt) &&
          (page.startAfter === null || profile.sortKey > page.startAfter) &&
          (page.endBefore === null || profile.sortKey < page.endBefore),
      )
      .sort((a, b) => a.sortKey - b.sortKey);
    return rows.slice(0, page.limit);
  };
}

describe('scanForCandidates', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('wraps past the end of the range instead of returning nothing', async () => {
    // A pass starting at 0.95 has nothing above it in this pool: a
    // forward-only scan would come back empty, which is exactly the bias
    // the wrap-around exists to remove.
    jest.spyOn(Math, 'random').mockReturnValue(0.95);
    const pool = makePool(10);

    const result = await scanForCandidates(
      fetchPageFrom(pool),
      viewer,
      DEFAULT_FILTERS,
      new Set(),
      null,
    );

    expect(result.candidates).toHaveLength(10);
    expect(result.nextCursor).toBeNull();
  });

  it('reaches every profile in the pool from any starting point', async () => {
    const pool = makePool(60);

    for (const origin of [0.01, 0.4, 0.99]) {
      jest.spyOn(Math, 'random').mockReturnValue(origin);
      const seen = new Set<string>();
      let cursor = null as Awaited<
        ReturnType<typeof scanForCandidates>
      >['nextCursor'];

      do {
        const page = await scanForCandidates(
          fetchPageFrom(pool),
          viewer,
          DEFAULT_FILTERS,
          new Set(),
          cursor,
        );
        page.candidates.forEach(candidate => seen.add(candidate.uid));
        cursor = page.nextCursor;
      } while (cursor);

      expect(seen.size).toBe(pool.length);
    }
  });

  it('never returns the same profile twice while paging', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const pool = makePool(60);
    const seen: string[] = [];
    let cursor = null as Awaited<
      ReturnType<typeof scanForCandidates>
    >['nextCursor'];

    do {
      const page = await scanForCandidates(
        fetchPageFrom(pool),
        viewer,
        DEFAULT_FILTERS,
        new Set(),
        cursor,
      );
      seen.push(...page.candidates.map(candidate => candidate.uid));
      cursor = page.nextCursor;
    } while (cursor);

    expect(seen).toHaveLength(new Set(seen).size);
  });

  it('stops at a full circle rather than looping forever on an empty pool', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = await scanForCandidates(
      fetchPageFrom([]),
      viewer,
      DEFAULT_FILTERS,
      new Set(),
      null,
    );

    expect(result.candidates).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it('stops once it has a full page of candidates', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const pool = makePool(200);

    const result = await scanForCandidates(
      fetchPageFrom(pool),
      viewer,
      DEFAULT_FILTERS,
      new Set(),
      null,
    );

    expect(result.candidates.length).toBeGreaterThanOrEqual(
      TARGET_CANDIDATE_COUNT,
    );
    expect(result.nextCursor).not.toBeNull();
  });

  it('applies eligibility rules and skips already-swiped profiles', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const pool = makePool(4);
    pool[0].autoHidden = true;
    pool[1].blockedUserIds = ['viewer'];

    const result = await scanForCandidates(
      fetchPageFrom(pool),
      viewer,
      DEFAULT_FILTERS,
      new Set(['user-2']),
      null,
    );

    expect(result.candidates.map(candidate => candidate.uid)).toEqual([
      'user-3',
    ]);
  });

  it('returns only whitelisted public profile fields', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const pool = makePool(1);
    pool[0].blockedUserIds = ['someone'];

    const result = await scanForCandidates(
      fetchPageFrom(pool),
      viewer,
      DEFAULT_FILTERS,
      new Set(),
      null,
    );

    expect(result.candidates[0]).not.toHaveProperty('blockedUserIds');
    expect(result.candidates[0]).not.toHaveProperty('sortKey');
    expect(result.candidates[0]).not.toHaveProperty('autoHidden');
  });
});
