import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import {
  navigateWhenReady,
  navigationRef,
} from 'shared/lib/navigation/navigationRef';

type RemoteMessage = FirebaseMessagingTypes.RemoteMessage;

/**
 * 10 — opens what a tapped notification is about. The `data` payload is
 * written by the notification triggers (functions/src/notifications):
 * `message`/`match` carry the chat to open, `friend` points at the
 * Friends tab, where requests live.
 */
function openNotificationTarget(message: RemoteMessage | null): void {
  const data = message?.data;
  if (!data) {
    return;
  }
  const { type, chatId, uid } = data as Record<string, string | undefined>;

  if ((type === 'message' || type === 'match') && chatId && uid) {
    navigateWhenReady(() =>
      navigationRef.navigate('ChatConversation', { chatId, otherUid: uid }),
    );
    return;
  }
  if (type === 'friend') {
    navigateWhenReady(() =>
      navigationRef.navigate('Tabs', { screen: 'Friends' }),
    );
  }
}

export function usePushNavigation() {
  useEffect(() => {
    // The app was launched by the tap (it wasn't running).
    messaging()
      .getInitialNotification()
      .then(openNotificationTarget)
      .catch(error => {
        console.error('Failed to read the launching notification', error);
      });

    // The app was in the background and the tap brought it forward.
    return messaging().onNotificationOpenedApp(openNotificationTarget);
  }, []);
}
