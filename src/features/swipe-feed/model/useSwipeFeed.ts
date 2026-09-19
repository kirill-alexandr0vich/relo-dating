import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserRecord } from 'entities/user';
import { fetchSwipedTargetIds, type SwipeAction } from 'entities/swipe';
import { fetchCandidateBatch } from '../api/candidateApi';
import { recordSwipe, SWIPE_LIMIT_REACHED_CODE } from '../api/swipeApi';
import { isEligibleCandidate } from './matchingRules';
import { useSwipeFiltersStore } from './swipeFiltersStore';

// 12 — "предзагрузка следующих 10–15 анкет заранее".
const PREFETCH_THRESHOLD = 10;
// Bounds how many batches one refill will fetch before giving up, so a
// mostly-filtered-out pool can't spin in an unbounded fetch loop.
const MAX_BATCHES_PER_REFILL = 4;

function dedupeByUid(records: UserRecord[]): UserRecord[] {
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
  candidates: UserRecord[];
  isLoading: boolean;
  isLimitReached: boolean;
  swipe: (candidate: UserRecord, action: SwipeAction) => Promise<void>;
}

export function useSwipeFeed(viewer: UserRecord): UseSwipeFeedResult {
  const filters = useSwipeFiltersStore(state => state.filters);
  const [candidates, setCandidates] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const swipedIdsRef = useRef<Set<string>>(new Set());
  const cursorRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);
  const isFirstFilterEffect = useRef(true);

  const refill = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      let collected: UserRecord[] = [];
      for (
        let batchCount = 0;
        batchCount < MAX_BATCHES_PER_REFILL;
        batchCount += 1
      ) {
        const batch = await fetchCandidateBatch(
          viewer,
          filters,
          cursorRef.current,
        );
        cursorRef.current = batch.nextCursor;
        collected = collected.concat(
          batch.candidates.filter(candidate =>
            isEligibleCandidate(
              viewer,
              candidate,
              filters,
              swipedIdsRef.current,
            ),
          ),
        );
        if (
          collected.length >= PREFETCH_THRESHOLD ||
          batch.candidates.length === 0
        ) {
          break;
        }
      }
      setCandidates(previous => dedupeByUid([...previous, ...collected]));
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [viewer, filters]);

  // Initial load: fetch this user's swipe history once, then load the first page.
  useEffect(() => {
    let isCancelled = false;
    cursorRef.current = null;
    setCandidates([]);
    fetchSwipedTargetIds(viewer.uid).then(ids => {
      if (isCancelled) {
        return;
      }
      swipedIdsRef.current = ids;
      refill();
    });
    return () => {
      isCancelled = true;
    };
    // Re-fetching swipe history only makes sense if the viewer changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer.uid]);

  // Filter changes reset and reload the pool — but skip the very first
  // run, which would otherwise race the swipe-history fetch above.
  useEffect(() => {
    if (isFirstFilterEffect.current) {
      isFirstFilterEffect.current = false;
      return;
    }
    cursorRef.current = null;
    setCandidates([]);
    refill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (!isLoading && candidates.length < PREFETCH_THRESHOLD) {
      refill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates.length]);

  const swipe = useCallback(
    async (candidate: UserRecord, action: SwipeAction) => {
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
