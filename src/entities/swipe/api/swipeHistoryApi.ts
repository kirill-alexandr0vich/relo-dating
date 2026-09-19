import firestore from '@react-native-firebase/firestore';

/**
 * Every uid this user has already swiped on, so the feed never shows the
 * same candidate twice in a session. Reads the client's own `/swipes`
 * (allowed by firestore.rules); writing swipes goes through the
 * `recordSwipe` Cloud Function instead — see features/swipe-feed.
 *
 * Scales linearly with a user's lifetime swipe count; fine for MVP, but a
 * denormalized `swipedUserIds` array on the user doc would be cheaper at
 * scale.
 */
export async function fetchSwipedTargetIds(uid: string): Promise<Set<string>> {
  const snapshot = await firestore()
    .collection('swipes')
    .where('swiperId', '==', uid)
    .get();
  return new Set(snapshot.docs.map(doc => doc.data().targetId as string));
}
