export { signInWithGoogle } from './api/googleSignIn';
export { signInWithApple, isAppleSignInAvailable } from './api/appleSignIn';
export { signUpWithEmail, signInWithEmail } from './api/emailAuth';
export {
  sendPhoneVerificationCode,
  confirmPhoneVerificationCode,
} from './api/phoneAuth';
export {
  isAccountExistsError,
  getPendingCredential,
  fetchExistingSignInMethods,
} from './api/accountLinking';
export { useFinishSignIn } from './model/useFinishSignIn';
export { usePendingLinkStore } from './model/pendingLinkStore';
export type { PendingLink } from './model/pendingLinkStore';
