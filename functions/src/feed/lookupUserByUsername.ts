import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin';
import type { FeedProfile } from './eligibility';
import { toPublicProfile, type PublicProfile } from './publicProfile';
import { lookupUserByUsernameInputSchema } from './schema';

interface LookupResult {
  profile: PublicProfile | null;
}

/**
 * 5.2 — "Добавить друга" by `@username`. Goes through a callable for the
 * same reason the feed does: `/users` is no longer readable for people
 * the caller isn't connected to, and a username lookup must not become
 * the loophole that hands out whole user documents.
 *
 * 7.3 — an auto-hidden user resolves to `null`, exactly like a username
 * that doesn't exist, so search never reveals that someone was hidden.
 * The same goes for a pair that has blocked each other in either
 * direction (6.2).
 */
export const lookupUserByUsername = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = lookupUserByUsernameInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid username.');
  }

  const usernameSnapshot = await db
    .collection('usernames')
    .doc(parsed.data.username.trim().toLowerCase())
    .get();
  const targetUid = usernameSnapshot.data()?.uid as string | undefined;
  if (!targetUid || targetUid === uid) {
    return { profile: null } satisfies LookupResult;
  }

  const [targetSnapshot, viewerSnapshot] = await Promise.all([
    db.collection('users').doc(targetUid).get(),
    db.collection('users').doc(uid).get(),
  ]);
  const target = targetSnapshot.data() as FeedProfile | undefined;
  const viewer = viewerSnapshot.data() as FeedProfile | undefined;
  if (!target || target.autoHidden) {
    return { profile: null } satisfies LookupResult;
  }
  if (
    (target.blockedUserIds ?? []).includes(uid) ||
    (viewer?.blockedUserIds ?? []).includes(targetUid)
  ) {
    return { profile: null } satisfies LookupResult;
  }

  return {
    profile: toPublicProfile({ ...target, uid: targetUid }),
  } satisfies LookupResult;
});
