import { getMessaging } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import {
  buildNotification,
  resolveNotificationLanguage,
  type NotificationKind,
  type NotificationParams,
} from './notificationContent';

interface PushSettingsDoc {
  fcmTokens?: string[];
  interfaceLanguage?: string;
  activeChatId?: string | null;
}

/** 10 — private per-user push state; see src/entities/user/api/pushSettingsApi for why it isn't on `/users/{uid}`. */
export function pushSettingsRef(uid: string) {
  return db.collection('users').doc(uid).collection('private').doc('push');
}

export async function readPushSettings(uid: string): Promise<PushSettingsDoc> {
  const snapshot = await pushSettingsRef(uid).get();
  return (snapshot.data() as PushSettingsDoc | undefined) ?? {};
}

/** Firebase reports these when a device uninstalled the app or the token rotated. */
const DEAD_TOKEN_ERROR_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
];

/**
 * 10 — the single path every push goes through. Loads the recipient to
 * get their device tokens AND their interface language (11), since the
 * text must be in the language of whoever receives it.
 *
 * Tokens that Firebase rejects as dead are pruned from the user document,
 * so an uninstalled device doesn't keep costing a failed send on every
 * notification forever.
 */
export async function notifyUser(
  uid: string,
  kind: NotificationKind,
  params: NotificationParams,
  data: Record<string, string>,
): Promise<void> {
  const settings = await readPushSettings(uid);
  const tokens = settings.fcmTokens ?? [];
  if (tokens.length === 0) {
    return;
  }

  const notification = buildNotification(
    kind,
    resolveNotificationLanguage(settings.interfaceLanguage),
    params,
  );

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification,
    data,
  });

  const deadTokens = response.responses.flatMap((result, index) =>
    !result.success && DEAD_TOKEN_ERROR_CODES.includes(result.error?.code ?? '')
      ? [tokens[index]]
      : [],
  );
  if (deadTokens.length > 0) {
    await pushSettingsRef(uid).set(
      { fcmTokens: FieldValue.arrayRemove(...deadTokens) },
      { merge: true },
    );
  }

  if (response.failureCount > 0) {
    logger.warn('notifyUser: some sends failed', {
      uid,
      kind,
      failureCount: response.failureCount,
      prunedTokens: deadTokens.length,
    });
  }
}
