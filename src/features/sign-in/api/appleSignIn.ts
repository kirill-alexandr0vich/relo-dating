import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import { appleAuth } from '@invertase/react-native-apple-authentication';

export const isAppleSignInAvailable =
  Platform.OS === 'ios' && appleAuth.isSupported;

/** Resolves to `null` when the user cancels the native Apple sign-in sheet. */
export async function signInWithApple() {
  const response = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });
  if (!response.identityToken) {
    return null;
  }
  const credential = auth.AppleAuthProvider.credential(
    response.identityToken,
    response.nonce,
  );
  return auth().signInWithCredential(credential);
}
