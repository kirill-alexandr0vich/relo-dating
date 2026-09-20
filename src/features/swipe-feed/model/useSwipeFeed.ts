import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicProfile, UserRecord } from 'entities/user';
import type { SwipeAction } from 'entities/swipe';
import { fetchSwipeCandidates, type FeedCursor } from '../api/feedApi';
import { recordSwipe, SWIPE_LIMIT_REACHED_CODE } from '../api/swipeApi';
import { useSwipeFiltersStore } from './swipeFiltersStore';

// 12 — "предзагрузка следующих 10–15 анкет заранее". The server returns
// up to 15 per page, so refilling below this keeps a card always ready.
const PREFETCH_THRESHOLD = 5;
/** Give up refilling after this many pages in a row yield no usable card. */
const MAX_CONSECUTIVE_EMPTY_PAGES = 3;

function dedupeByUid(records: PublicProfile[]): PublicProfile[] {
  const seen = new Set<string>();
  return records.filter(record => {
    if (seen.has(record.uid)) {
      return false;
    }
    seen.add(record.uid);
    return true;
  });
}

interface UseSwipeFeedResult {
  candidates: PublicProfile[];
  isLoading: boolean;
  isLimitReached: boolean;
  swipe: (candidate: PublicProfile, action: SwipeAction) => Promise<void>;
}

export function useSwipeFeed(viewer: UserRecord): UseSwipeFeedResult {
  const filters = useSwipeFiltersStore(state => state.filters);
  const [candidates, setCandidates] = useState<PublicProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const cursorRef = useRef<FeedCursor | null>(null);
  const isFetchingRef = useRef(false);
  // The server says when the pool is used up (a full pass over it). Without
  // this the hook would keep asking for more from a new random point
  // forever, re-serving profiles it already filtered out.
  const isPoolExhaustedRef = useRef(false);
  // A pool where almost everyone is filtered out would otherwise page
  // through the entire user base one call at a time on every mount.
  const emptyPagesRef = useRef(0);
  // Cards swiped in this session, in case a refill lands before the
  // server has the corresponding /swipes write.
  const swipedIdsRef = useRef<Set<string>>(new Set());

  const refill = useCallback(async () => {
    if (isFetchingRef.current || isPoolExhaustedRef.current) {
      return;
    }
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const page = await fetchSwipeCandidates(filters, cursorRef.current);
      cursorRef.current = page.nextCursor;
      const fresh = page.candidates.filter(
        candidate => !swipedIdsRef.current.has(candidate.uid),
      );
      emptyPagesRef.current =
        fresh.length === 0 ? emptyPagesRef.current + 1 : 0;
      isPoolExhaustedRef.current =
        page.nextCursor === null ||
        emptyPagesRef.current >= MAX_CONSECUTIVE_EMPTY_PAGES;
      setCandidates(previous => dedupeByUid([...previous, ...fresh]));
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [filters]);

  // A new viewer or a filter change invalidates the whole pool: reset the
  // cursor and start a fresh pass.
  useEffect(() => {
    cursorRef.current = null;
    isPoolExhaustedRef.current = false;
    emptyPagesRef.current = 0;
    setCandidates([]);
    refill();
  }, [viewer.uid, refill]);

  useEffect(() => {
    if (!isLoading && candidates.length < PREFETCH_THRESHOLD) {
      refill();
    }
    // Refilling is driven by how many cards are left, not by `refill`'s
    // identity — which changes with the filters and already triggers the
    // reset effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates.length, isLoading]);

  const swipe = useCallback(
    async (candidate: PublicProfile, action: SwipeAction) => {
      setCandidates(previous =>
        previous.filter(item => item.uid !== candidate.uid),
      );
      swipedIdsRef.current.add(candidate.uid);
      try {
        await recordSwipe(candidate.uid, action);
        setIsLimitReached(false);
      } catch (error) {
        if ((error as { code?: string }).code === SWIPE_LIMIT_REACHED_CODE) {
          setIsLimitReached(true);
        }
        throw error;
      }
    },
    [],
  );

  return { candidates, isLoading, isLimitReached, swipe };
}
