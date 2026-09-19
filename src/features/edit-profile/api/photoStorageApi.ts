import storage from '@react-native-firebase/storage';

/** Uploads to the private staging path — see storage.rules and submitProfilePhoto. */
export async function uploadToPendingStorage(
  uid: string,
  localUri: string,
  extension: string,
): Promise<string> {
  const path = `users/${uid}/pending/${Date.now()}.${extension}`;
  await storage().ref(path).putFile(localUri);
  return path;
}
