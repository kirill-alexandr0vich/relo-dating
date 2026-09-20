import type { PublicProfile, UserRecord } from 'entities/user';
import { renderHook } from 'shared/lib/testing/renderHook';
import type { FeedPage } from '../api/feedApi';
import { useSwipeFeed } from './useSwipeFeed';

jest.mock('../api/feedApi', () => ({
  fetchSwipeCandidates: jest.fn(),
}));
jest.mock('../api/swipeApi', () => ({
  recordSwipe: jest.fn(() => Promise.resolve('swipe-id')),
  SWIPE_LIMIT_REACHED_CODE: 'resource-exhausted',
}));

const { fetchSwipeCandidates } = jest.requireMock('../api/feedApi') as {
  fetchSwipeCandidates: jest.Mock<Promise<FeedPage>>;
};
const { recordSwipe } = jest.requireMock('../api/swipeApi') as {
  recordSwipe: jest.Mock;
};

const viewer = {
  uid: 'viewer',
  name: 'Sam',
  avatarUrls: [],
  country: 'GE',
  nativeLanguage: 'ru',
  allowFriendMessagesWithoutMatch: true,
  ageConfirmed18: true,
  createdAt: 0,
  lastActiveAt: 0,
  blockedUserIds: [],
} as UserRecord;

function makeCandidates(uids: string[]): PublicProfile[] {
  return uids.map(uid => ({
    uid,
    name: uid,
    avatarUrls: ['photo.jpg'],
    country: 'GE',
    nativeLanguage: 'ru',
  }));
}

function page(uids: string[], nextCursor: FeedPage['nextCursor']): FeedPage {
  return { candidates: makeCandidates(uids), nextCursor };
}

const CURSOR = { origin: 0.5, sortKey: 0.6, wrapped: false };

describe('useSwipeFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serves the first page and keeps the cursor for the next call', async () => {
    fetchSwipeCandidates
      .mockResolvedValueOnce(page(['a', 'b', 'c', 'd', 'e', 'f'], CURSOR))
      .mockResolvedValue(page([], null));

    const hook = await renderHook(() => useSwipeFeed(viewer));
    const state = await hook.waitForUpdate();

    expect(state.candidates.map(candidate => candidate.uid)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
    ]);
    expect(fetchSwipeCandidates).toHaveBeenCalledWith(expect.anything(), null);
  });

  it('pages with the cursor the server returned', async () => {
    fetchSwipeCandidates
      .mockResolvedValueOnce(page(['a'], CURSOR))
      .mockResolvedValueOnce(page(['b', 'c', 'd', 'e', 'f'], null));

    const hook = await renderHook(() => useSwipeFeed(viewer));
    await hook.waitForUpdate();
    await hook.waitForUpdate();

    expect(fetchSwipeCandidates).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      CURSOR,
    );
  });

  it('stops asking once the server reports the pool is exhausted', async () => {
    fetchSwipeCandidates.mockResolvedValue(page([], null));

    const hook = await renderHook(() => useSwipeFeed(viewer));
    await hook.waitForUpdate();
    await hook.waitForUpdate();
    await hook.waitForUpdate();

    expect(fetchSwipeCandidates).toHaveBeenCalledTimes(1);
  });

  it('gives up after repeated pages with nothing usable', async () => {
    fetchSwipeCandidates.mockResolvedValue(page([], CURSOR));

    const hook = await renderHook(() => useSwipeFeed(viewer));
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await hook.waitForUpdate();
    }

    expect(fetchSwipeCandidates).toHaveBeenCalledTimes(3);
  });

  it('removes a swiped card and records the swipe', async () => {
    fetchSwipeCandidates
      .mockResolvedValueOnce(page(['a', 'b', 'c', 'd', 'e'], CURSOR))
      .mockResolvedValue(page([], null));

    const hook = await renderHook(() => useSwipeFeed(viewer));
    const state = await hook.waitForUpdate();
    await hook.act(() => state.swipe(state.candidates[0], 'like'));
    const next = await hook.waitForUpdate();

    expect(recordSwipe).toHaveBeenCalledWith('a', 'like');
    expect(next.candidates.map(candidate => candidate.uid)).not.toContain('a');
  });

  it('never re-serves a card swiped in this session', async () => {
    fetchSwipeCandidates
      .mockResolvedValueOnce(page(['a', 'b', 'c', 'd', 'e'], CURSOR))
      // The /swipes write may not be visible to the next query yet.
      .mockResolvedValueOnce(page(['a', 'f'], null));

    const hook = await renderHook(() => useSwipeFeed(viewer));
    const state = await hook.waitForUpdate();
    await hook.act(() => state.swipe(state.candidates[0], 'dislike'));
    await hook.waitForUpdate();
    const next = await hook.waitForUpdate();

    expect(next.candidates.map(candidate => candidate.uid)).not.toContain('a');
  });

  it('flags the daily limit when the swipe is rejected for it', async () => {
    fetchSwipeCandidates
      .mockResolvedValueOnce(page(['a', 'b', 'c', 'd', 'e'], CURSOR))
      .mockResolvedValue(page([], null));
    recordSwipe.mockRejectedValueOnce({ code: 'resource-exhausted' });

    const hook = await renderHook(() => useSwipeFeed(viewer));
    const state = await hook.waitForUpdate();
    await hook.act(async () => {
      await expect(
        state.swipe(state.candidates[0], 'like'),
      ).rejects.toBeTruthy();
    });
    const next = await hook.waitForUpdate();

    expect(next.isLimitReached).toBe(true);
  });
});
