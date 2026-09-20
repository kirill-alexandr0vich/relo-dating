import { HttpsError, onCall } from 'firebase-functions/v2/https';
import type { DocumentData, Query } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';
import type { FeedProfile } from './eligibility';
import {
  scanForCandidates,
  type FeedPageRequest,
  type ScannedProfile,
} from './scanForCandidates';
import { fetchSwipeCandidatesInputSchema } from './schema';

/**
 * 4.2/4.2.1 — serves one page of the swipe feed.
 *
 * Two reasons this is a Cloud Function rather than a client-side query.
 * Privacy: filtering blocked, auto-hidden and preference-mismatched users
 * on the device means first shipping those profiles to the device — with
 * the feed here, `/users` reads are restricted to people the caller is
 * actually connected to (see firestore.rules) and nobody can page through
 * the user base with a raw SDK query. Trust: the country/language the
 * feed filters on come from the caller's own stored profile, not from the
 * request payload, and only whitelisted profile fields are returned (see
 * publicProfile.ts) instead of whole `/users` documents.
 */
export const fetchSwipeCandidates = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = fetchSwipeCandidatesInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid feed request.');
  }
  const { filters, cursor } = parsed.data;

  const viewerSnapshot = await db.collection('users').doc(uid).get();
  const viewerData = viewerSnapshot.data() as FeedProfile | undefined;
  if (!viewerData?.country || !viewerData.nativeLanguage) {
    throw new HttpsError('failed-precondition', 'registration_incomplete');
  }
  const viewer: FeedProfile = { ...viewerData, uid };

  const swipedSnapshot = await db
    .collection('swipes')
    .where('swiperId', '==', uid)
    .select('targetId')
    .get();
  const swipedIds = new Set(
    swipedSnapshot.docs.map(doc => doc.get('targetId') as string),
  );

  let baseQuery = db.collection('users') as Query<DocumentData>;
  if (filters.mode === 'country' || filters.mode === 'both') {
    baseQuery = baseQuery.where('country', '==', viewer.country);
  }
  if (filters.mode === 'language' || filters.mode === 'both') {
    baseQuery = baseQuery.where('nativeLanguage', '==', viewer.nativeLanguage);
  }
  // Docs without a `sortKey` (registration never finished) are excluded by
  // the orderBy itself, so every scanned doc has one.
  baseQuery = baseQuery.orderBy('sortKey');

  return scanForCandidates(
    page => fetchPage(baseQuery, page),
    viewer,
    filters,
    swipedIds,
    cursor,
  );
});

async function fetchPage(
  baseQuery: Query<DocumentData>,
  page: FeedPageRequest,
): Promise<ScannedProfile[]> {
  let query = baseQuery;
  if (page.startAt !== null) {
    query = query.startAt(page.startAt);
  }
  if (page.startAfter !== null) {
    query = query.startAfter(page.startAfter);
  }
  if (page.endBefore !== null) {
    query = query.endBefore(page.endBefore);
  }
  const snapshot = await query.limit(page.limit).get();
  return snapshot.docs.map(doc => ({
    ...(doc.data() as FeedProfile),
    uid: doc.id,
    sortKey: doc.get('sortKey') as number,
  }));
}
