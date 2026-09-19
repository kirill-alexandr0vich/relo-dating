import firestore from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { UserRecord } from 'entities/user';
import type { SwipeFilters } from '../model/filterTypes';

/**
 * Over-fetched on purpose: after client-side filtering (matchingRules)
 * this typically yields well under the batch size, so the caller keeps
 * requesting batches until it has a comfortable prefetch buffer (12 —
 * "предзагрузка следующих 10–15 анкет заранее").
 */
const CANDIDATE_BATCH_SIZE = 20;

export interface CandidateBatch {
  candidates: UserRecord[];
  /** `null` once a full pass over the pool has been made — the caller should wrap around to the start. */
  nextCursor: number | null;
}

/**
 * 4.2.1 — random order without a real "ORDER BY random()" (Firestore has
 * none): every registered user gets a stable `sortKey` in [0, 1) at
 * registration time, and each fetch starts from a fresh random point in
 * that range, wrapping around when it runs off the end.
 */
export async function fetchCandidateBatch(
  viewer: Pick<UserRecord, 'country' | 'nativeLanguage'>,
  filters: SwipeFilters,
  cursor: number | null,
): Promise<CandidateBatch> {
  let query = firestore()
    .collection('users')
    .orderBy('sortKey') as FirebaseFirestoreTypes.Query;

  if (filters.mode === 'country' || filters.mode === 'both') {
    query = query.where('country', '==', viewer.country);
  }
  if (filters.mode === 'language' || filters.mode === 'both') {
    query = query.where('nativeLanguage', '==', viewer.nativeLanguage);
  }

  const startAt = cursor ?? Math.random();
  const snapshot = await query
    .startAt(startAt)
    .limit(CANDIDATE_BATCH_SIZE)
    .get();
  const candidates = snapshot.docs.map(doc => doc.data() as UserRecord);
  const lastSortKey = candidates.at(-1)?.sortKey;

  return {
    candidates,
    nextCursor:
      candidates.length < CANDIDATE_BATCH_SIZE || lastSortKey === undefined
        ? null
        : lastSortKey,
  };
}
