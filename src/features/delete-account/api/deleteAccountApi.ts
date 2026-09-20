import functions from '@react-native-firebase/functions';

/**
 * 12 — deletes the account and everything attached to it. Server-side
 * (see functions/src/account/deleteAccount): the client SDK's own
 * `user.delete()` fails with `auth/requires-recent-login` for anyone who
 * signed in a while ago, and it wouldn't touch Firestore or Storage.
 */
export async function requestAccountDeletion(): Promise<void> {
  const callable = functions().httpsCallable<
    Record<string, never>,
    { deleted: boolean }
  >('deleteAccount');
  await callable({});
}
