import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type { PublicProfile } from '../model/types';

export type ClaimUsernameResult = 'ok' | 'taken';

/**
 * 5.2 — resolves an `@username` to the profile behind it. Served by a
 * Cloud Function, not a direct read: `/users` is only readable for people
 * you're already connected to (see firestore.rules), and the function
 * returns `null` — indistinguishable from "no such username" — for
 * auto-hidden users (7.3) and for pairs that blocked each other (6.2).
 */
export async function lookupUserByUsername(
  username: string,
): Promise<PublicProfile | null> {
  const callable = functions().httpsCallable<
    { username: string },
    { profile: PublicProfile | null }
  >('lookupUserByUsername');
  const response = await callable({ username });
  return response.data.profile;
}

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
