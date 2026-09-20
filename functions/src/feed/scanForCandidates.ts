import {
  isEligibleCandidate,
  type FeedProfile,
  type SwipeFilters,
} from './eligibility';
import { toPublicProfile, type PublicProfile } from './publicProfile';
import type { FeedCursor } from './schema';

/** Docs read per query — over-fetched, since most get filtered out. */
export const QUERY_BATCH_SIZE = 40;
/** 12 — "предзагрузка следующих 10–15 анкет заранее". */
export const TARGET_CANDIDATE_COUNT = 15;
/** Cost ceiling for one call, so a heavily-filtered pool can't scan the whole collection. */
export const MAX_SCANNED_DOCS = 400;

export type ScannedProfile = FeedProfile & { sortKey: number };

export interface FeedPageRequest {
  /** Inclusive lower bound — only set when a fresh pass starts at its random origin. */
  startAt: number | null;
  /** Exclusive lower bound — resumes just past the last doc already scanned. */
  startAfter: number | null;
  /** Exclusive upper bound — stops the wrapped half just before the pass origin. */
  endBefore: number | null;
  limit: number;
}

export type FeedPageFetcher = (
  page: FeedPageRequest,
) => Promise<ScannedProfile[]>;

export interface ScanResult {
  candidates: PublicProfile[];
  /** `null` once a full pass over the pool is done — nothing left to show. */
  nextCursor: FeedCursor | null;
}

/**
 * 4.2.1 — one page of the randomly-ordered feed, as a circular scan of
 * the `sortKey` range.
 *
 * A pass starts at a random point in [0, 1) and reads forward. When it
 * runs off the end it WRAPS to 0 and keeps reading until just before
 * where it started, so every profile in the pool is reachable from any
 * starting point. A plain forward-only `startAt(random)` (what this
 * replaced) systematically under-shows users with a high `sortKey`: they
 * are only reachable from the shrinking slice of origins below them.
 */
export async function scanForCandidates(
  fetchPage: FeedPageFetcher,
  viewer: FeedProfile,
  filters: SwipeFilters,
  swipedIds: ReadonlySet<string>,
  cursor: FeedCursor | null,
): Promise<ScanResult> {
  const origin = cursor?.origin ?? Math.random();
  let isWrapped = cursor?.wrapped ?? false;
  let scannedUpTo: number | null = cursor?.sortKey ?? null;

  const candidates: PublicProfile[] = [];
  let scannedCount = 0;
  let isExhausted = false;

  while (
    candidates.length < TARGET_CANDIDATE_COUNT &&
    scannedCount < MAX_SCANNED_DOCS &&
    !isExhausted
  ) {
    const page = await fetchPage({
      startAt: !isWrapped && scannedUpTo === null ? origin : null,
      startAfter: scannedUpTo,
      endBefore: isWrapped ? origin : null,
      limit: QUERY_BATCH_SIZE,
    });
    scannedCount += page.length;

    for (const profile of page) {
      if (isEligibleCandidate(viewer, profile, filters, swipedIds)) {
        candidates.push(toPublicProfile(profile));
      }
    }

    if (page.length > 0) {
      scannedUpTo = page[page.length - 1].sortKey;
    }

    if (page.length < QUERY_BATCH_SIZE) {
      if (isWrapped) {
        isExhausted = true;
      } else {
        // End of the range — continue from the start of it (no lower
        // bound at all, so a profile sitting exactly at 0 is included)
        // up to `origin`.
        isWrapped = true;
        scannedUpTo = null;
      }
    }
  }

  if (isExhausted) {
    return { candidates, nextCursor: null };
  }
  return {
    candidates,
    nextCursor: { origin, sortKey: scannedUpTo, wrapped: isWrapped },
  };
}
