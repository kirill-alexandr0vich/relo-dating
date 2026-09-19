import auth from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from 'shared/config/googleSignIn';

let isConfigured = false;

function configureGoogleSignIn() {
  if (isConfigured) {
    return;
  }
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  isConfigured = true;
}

/** Resolves to `null` when the user cancels the native Google sign-in sheet. */
export async function signInWithGoogle() {
  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    return null;
  }
  const { idToken } = response.data;
  if (!idToken) {
    throw new Error('Google sign-in did not return an idToken');
  }
  const credential = auth.GoogleAuthProvider.credential(idToken);
  return auth().signInWithCredential(credential);
}
