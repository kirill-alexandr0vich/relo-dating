import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export function sendPhoneVerificationCode(
  phoneNumber: string,
): Promise<FirebaseAuthTypes.ConfirmationResult> {
  return auth().signInWithPhoneNumber(phoneNumber);
}

export function confirmPhoneVerificationCode(
  confirmation: FirebaseAuthTypes.ConfirmationResult,
  code: string,
) {
  return confirmation.confirm(code);
}
