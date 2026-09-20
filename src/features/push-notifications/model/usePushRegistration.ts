import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { useTranslation } from 'react-i18next';
import {
  saveDeviceToken,
  saveInterfaceLanguage,
  useUserStore,
} from 'entities/user';

/**
 * 10 — registers this device for push once the user is signed in:
 * permission, the FCM token, and the interface language the server needs
 * to write the text in (11).
 *
 * Nothing here is fatal. A declined permission, or a device with no Play
 * Services, simply means no token — the app works exactly as before, and
 * Cloud Functions skip a user with no tokens.
 */
export function usePushRegistration() {
  const { i18n } = useTranslation();
  const uid = useUserStore(state => state.record?.uid);
  const language = i18n.language;

  useEffect(() => {
    if (!uid) {
      return;
    }
    let isCancelled = false;

    async function register(currentUid: string) {
      const status = await messaging().requestPermission();
      const isAuthorized =
        status === messaging.AuthorizationStatus.AUTHORIZED ||
        status === messaging.AuthorizationStatus.PROVISIONAL;
      if (!isAuthorized || isCancelled) {
        return;
      }
      const token = await messaging().getToken();
      if (token && !isCancelled) {
        await saveDeviceToken(currentUid, token);
      }
    }

    register(uid).catch(error => {
      console.error('Failed to register for push notifications', error);
    });

    // A token can rotate at any time (reinstall, restore, Firebase
    // rotation); a stale one would silently stop delivering.
    const unsubscribe = messaging().onTokenRefresh(token => {
      saveDeviceToken(uid, token).catch(error => {
        console.error('Failed to save refreshed push token', error);
      });
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      return;
    }
    saveInterfaceLanguage(uid, language).catch(error => {
      console.error('Failed to save interface language', error);
    });
  }, [uid, language]);
}
