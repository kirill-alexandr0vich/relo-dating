import functions from '@react-native-firebase/functions';
import type { PublicProfile } from 'entities/user';
import type { SwipeFilters } from '../model/filterTypes';

/**
 * Opaque paging state from the server — the client only ever stores it
 * and hands it back on the next call (see functions/src/feed).
 */
export interface FeedCursor {
  origin: number;
  sortKey: number | null;
  wrapped: boolean;
}

export interface FeedPage {
  candidates: PublicProfile[];
  /** `null` once the whole pool has been served — stop asking for more. */
  nextCursor: FeedCursor | null;
}

/**
 * 4.2/4.2.1 — the feed is built server-side: the client can't read
 * `/users` for people it isn't connected to, and filtering (blocks,
 * auto-hidden, gender preference, age/tags/verified) happens before
 * anything leaves the server.
 */
export async function fetchSwipeCandidates(
  filters: SwipeFilters,
  cursor: FeedCursor | null,
): Promise<FeedPage> {
  const callable = functions().httpsCallable<
    { filters: SwipeFilters; cursor: FeedCursor | null },
    FeedPage
  >('fetchSwipeCandidates');
  const response = await callable({ filters, cursor });
  return response.data;
}
