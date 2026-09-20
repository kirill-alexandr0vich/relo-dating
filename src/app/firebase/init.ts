import '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import appCheck from '@react-native-firebase/app-check';

/**
 * 12 — "список чатов и последние сообщения кэшируются локально (Firestore
 * offline persistence)". Native persistence is on by default, but the
 * default cache is size-capped and garbage-collected, which is what
 * silently evicts older chat history on a busy device. Setting it here
 * makes the requirement explicit and the behaviour deliberate rather than
 * inherited.
 *
 * Must run before the first Firestore call, hence the module-level call
 * in a file imported by AppProviders.
 */
firestore().settings({
  persistence: true,
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});

/**
 * 14.2 — App Check: Cloud Functions and Firestore should only answer the
 * real app, not a script holding a copy of the (necessarily public)
 * Firebase config.
 *
 * Debug providers in development, real attestation in release builds. A
 * debug build prints a debug token on first run that has to be registered
 * in the Firebase console, otherwise its App Check tokens are rejected —
 * see README for the console steps.
 */
const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
provider.configure({
  android: { provider: __DEV__ ? 'debug' : 'playIntegrity' },
  apple: {
    provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
  },
  isTokenAutoRefreshEnabled: true,
});

appCheck()
  .initializeAppCheck({ provider, isTokenAutoRefreshEnabled: true })
  .catch(error => {
    // A failure here must not take the app down: until App Check is
    // enforced server-side (see functions/.env), calls still go through.
    console.error('Failed to initialize App Check', error);
  });
