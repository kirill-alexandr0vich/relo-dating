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
