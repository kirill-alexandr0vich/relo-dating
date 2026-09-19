/* eslint-env jest */
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('@react-native-firebase/app', () => ({}));

jest.mock('@react-native-firebase/auth', () => {
  const auth = jest.fn(() => ({
    currentUser: null,
    onAuthStateChanged: jest.fn(() => jest.fn()),
    signInWithCredential: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signInWithPhoneNumber: jest.fn(),
    fetchSignInMethodsForEmail: jest.fn(() => Promise.resolve([])),
  }));
  auth.GoogleAuthProvider = { credential: jest.fn() };
  auth.AppleAuthProvider = { credential: jest.fn() };
  return { __esModule: true, default: auth };
});

jest.mock('@react-native-firebase/firestore', () => {
  const doc = () => ({
    onSnapshot: jest.fn(() => jest.fn()),
    get: jest.fn(() => Promise.resolve({ exists: false, data: () => undefined })),
    set: jest.fn(() => Promise.resolve()),
  });
  const firestore = jest.fn(() => ({
    collection: jest.fn(() => ({ doc })),
  }));
  firestore.FieldValue = { serverTimestamp: jest.fn() };
  return { __esModule: true, default: firestore };
});

jest.mock('@react-native-firebase/functions', () => {
  const functions = jest.fn(() => ({
    httpsCallable: jest.fn(() => jest.fn()),
  }));
  return { __esModule: true, default: functions };
});

jest.mock('@react-native-firebase/storage', () => {
  const storage = jest.fn(() => ({
    ref: jest.fn(() => ({
      putFile: jest.fn(() => Promise.resolve()),
    })),
  }));
  return { __esModule: true, default: storage };
});

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(),
  },
  isSuccessResponse: jest.fn(() => false),
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    isSupported: false,
    performRequest: jest.fn(),
    Operation: { LOGIN: 'LOGIN' },
    Scope: { EMAIL: 'EMAIL', FULL_NAME: 'FULL_NAME' },
  },
}));
