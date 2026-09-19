import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sendFriendRequest } from 'entities/friend';
import { useUserStore } from 'entities/user';
import { parseAddFriendDeepLink } from 'shared/lib/deepLinks';

/**
 * 5.2 — handles `relocantapp://addfriend/{uid}`, whether it's opened via
 * our own in-app QR scanner or by any other means (a system camera app,
 * a shared link). Mounted once at the app/tab level so it's live no
 * matter which tab the user is on.
 */
export function useAddFriendDeepLink() {
  const { t } = useTranslation();
  const uid = useUserStore(state => state.record?.uid);

  useEffect(() => {
    if (!uid) {
      return;
    }

    async function handleUrl(url: string | null | undefined) {
      const targetUid = url ? parseAddFriendDeepLink(url) : null;
      if (!targetUid || targetUid === uid) {
        return;
      }
      const result = await sendFriendRequest(uid as string, targetUid, 'qr');
      Alert.alert(
        t('friends.title'),
        result === 'sent'
          ? t('friends.requestSent')
          : t('friends.requestAlreadyExists'),
      );
    }

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', event => {
      handleUrl(event.url);
    });
    return () => subscription.remove();
  }, [uid, t]);
}
