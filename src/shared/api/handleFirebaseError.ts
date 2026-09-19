interface FirebaseErrorLike {
  code?: string;
  message?: string;
}

const MESSAGES_BY_CODE: Record<string, string> = {
  'auth/account-exists-with-different-credential':
    'account_exists_with_different_credential',
  'auth/invalid-credential': 'invalid_credential',
  'auth/network-request-failed': 'network_error',
  'auth/too-many-requests': 'too_many_requests',
  'auth/email-already-in-use': 'email_already_in_use',
  'auth/invalid-email': 'invalid_email',
  'auth/weak-password': 'weak_password',
  'auth/user-not-found': 'user_not_found',
  'auth/wrong-password': 'wrong_password',
  'auth/invalid-verification-code': 'invalid_verification_code',
  'auth/invalid-phone-number': 'invalid_phone_number',
  'auth/code-expired': 'code_expired',
  'firestore/permission-denied': 'permission_denied',
  'firestore/unavailable': 'network_error',
  'storage/unauthorized': 'permission_denied',
};

const FALLBACK_KEY = 'unknown_error';

export interface HandledError {
  code: string;
  translationKey: string;
  raw: unknown;
}

export function handleFirebaseError(error: unknown): HandledError {
  const firebaseError = error as FirebaseErrorLike;
  const code = firebaseError?.code ?? 'unknown';
  return {
    code,
    translationKey: MESSAGES_BY_CODE[code] ?? FALLBACK_KEY,
    raw: error,
  };
}
