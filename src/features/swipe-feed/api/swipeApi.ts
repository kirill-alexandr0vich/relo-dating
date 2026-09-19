import functions from '@react-native-firebase/functions';
import type { SwipeAction } from 'entities/swipe';

export const SWIPE_LIMIT_REACHED_CODE = 'resource-exhausted';

interface RecordSwipeResponse {
  swipeId: string;
}

/**
 * The only way a swipe is written (see firestore.rules — direct client
 * writes to `/swipes` are blocked). The Cloud Function enforces the
 * daily free-tier limit atomically; a `resource-exhausted` error means
 * the limit was hit, not a network failure.
 */
export async function recordSwipe(
  targetId: string,
  action: SwipeAction,
): Promise<string> {
  const callable = functions().httpsCallable<
    { targetId: string; action: SwipeAction },
    RecordSwipeResponse
  >('recordSwipe');
  const response = await callable({ targetId, action });
  return response.data.swipeId;
}
