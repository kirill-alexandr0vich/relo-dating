import firestore from '@react-native-firebase/firestore';
import type { UserRecord } from '../model/types';

function userDoc(uid: string) {
  return firestore().collection('users').doc(uid);
}

export function subscribeToUserRecord(
  uid: string,
  onChange: (record: UserRecord | null) => void,
  onError: (error: unknown) => void,
) {
  return userDoc(uid).onSnapshot(snapshot => {
    onChange(snapshot.exists ? (snapshot.data() as UserRecord) : null);
  }, onError);
}

/**
 * Creates the initial `/users/{uid}` document right after a brand-new
 * sign-in. Only ever writes fields the client is allowed to own (see 12,
 * Firestore Security Rules) — verified/premium/swipesUsedToday/autoHidden
 * are left untouched here and are initialized server-side by a Cloud
 * Function auth trigger.
 */
export async function ensureUserRecordExists(
  uid: string,
  ageConfirmed18: boolean,
): Promise<void> {
  const ref = userDoc(uid);
  const snapshot = await ref.get();
  if (snapshot.exists) {
    return;
  }
  const now = firestore.FieldValue.serverTimestamp();
  await ref.set({
    uid,
    avatarUrls: [],
    allowFriendMessagesWithoutMatch: true,
    ageConfirmed18,
    blockedUserIds: [],
    createdAt: now,
    lastActiveAt: now,
  });
}

export async function saveRequiredProfileFields(
  uid: string,
  fields: { name: string; country: string; nativeLanguage: string },
): Promise<void> {
  await userDoc(uid).set(fields, { merge: true });
}
