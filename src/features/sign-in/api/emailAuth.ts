import auth from '@react-native-firebase/auth';

export function signUpWithEmail(email: string, password: string) {
  return auth().createUserWithEmailAndPassword(email, password);
}

export function signInWithEmail(email: string, password: string) {
  return auth().signInWithEmailAndPassword(email, password);
}
