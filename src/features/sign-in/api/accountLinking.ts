import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export const ACCOUNT_EXISTS_ERROR_CODE =
  'auth/account-exists-with-different-credential';

interface AccountExistsError {
  code: string;
  email?: string;
  userInfo?: { authCredential: FirebaseAuthTypes.AuthCredential | null };
}

export function isAccountExistsError(
  error: unknown,
): error is AccountExistsError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === ACCOUNT_EXISTS_ERROR_CODE
  );
}

export function getPendingCredential(
  error: AccountExistsError,
): FirebaseAuthTypes.AuthCredential | null {
  return error.userInfo?.authCredential ?? null;
}

export function linkPendingCredential(
  credential: FirebaseAuthTypes.AuthCredential,
) {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw new Error('Cannot link a credential without a signed-in user');
  }
  return currentUser.linkWithCredential(credential);
}

/**
 * Best-effort lookup of which providers an email is already registered
 * with, used to only show the relevant "sign in with your original
 * method" buttons on the account-linking screen. Some Firebase projects
 * disable this (email enumeration protection), so callers must tolerate
 * an empty/failed result and fall back to showing every method.
 */
export async function fetchExistingSignInMethods(
  email: string,
): Promise<string[]> {
  try {
    return await auth().fetchSignInMethodsForEmail(email);
  } catch {
    return [];
  }
}
