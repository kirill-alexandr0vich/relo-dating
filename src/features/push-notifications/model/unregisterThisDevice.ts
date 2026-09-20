import messaging from '@react-native-firebase/messaging';
import { removeDeviceToken } from 'entities/user';

/**
 * 10 — call before signing out: otherwise the account keeps this device
 * registered and its pushes keep arriving to whoever holds the phone
 * next. Never throws — failing to clean up a token must not block
 * signing out.
 */
export async function unregisterThisDevice(uid: string): Promise<void> {
  try {
    const token = await messaging().getToken();
    if (token) {
      await removeDeviceToken(uid, token);
    }
  } catch (error) {
    console.error('Failed to unregister this device from push', error);
  }
}
