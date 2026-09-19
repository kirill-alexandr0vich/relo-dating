import firestore from '@react-native-firebase/firestore';

export type ClaimUsernameResult = 'ok' | 'taken';

/**
 * 3.2/5.2 — `/usernames/{lowercased}` is a uniqueness reservation
 * collection; its doc id IS the lowercased username, matching
 * firestore.rules' case-insensitive uniqueness check. No moderation is
 * needed here (usernames aren't in 7.2's moderated-fields list), so this
 * is a plain client-side transaction rather than a Cloud Function.
 */
export async function claimUsername(
  uid: string,
  username: string,
  previousUsername?: string,
): Promise<ClaimUsernameResult> {
  const lower = username.toLowerCase();
  const usernameRef = firestore().collection('usernames').doc(lower);
  const userRef = firestore().collection('users').doc(uid);

  try {
    await firestore().runTransaction(async transaction => {
      const existing = await transaction.get(usernameRef);
      if (existing.exists && (existing.data() as { uid: string }).uid !== uid) {
        throw new Error('USERNAME_TAKEN');
      }
      if (previousUsername && previousUsername.toLowerCase() !== lower) {
        transaction.delete(
          firestore()
            .collection('usernames')
            .doc(previousUsername.toLowerCase()),
        );
      }
      transaction.set(usernameRef, { uid });
      transaction.update(userRef, { username });
    });
    return 'ok';
  } catch (error) {
    if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
      return 'taken';
    }
    throw error;
  }
}
