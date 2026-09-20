import { createNavigationContainerRef } from '@react-navigation/native';
import type { MainStackParamList } from './types';

/**
 * Lets code outside the navigator tree navigate — specifically a push
 * notification tap (10), which arrives from the native layer rather than
 * from a screen, so there is no `useNavigation` context to use.
 */
export const navigationRef = createNavigationContainerRef<MainStackParamList>();

/**
 * On a cold start the tap is handled before the container has mounted;
 * `isReady()` is false until then, and navigating would be dropped.
 */
export function navigateWhenReady(navigate: () => void): void {
  if (navigationRef.isReady()) {
    navigate();
    return;
  }
  const unsubscribe = navigationRef.addListener('state', () => {
    unsubscribe();
    navigate();
  });
}
