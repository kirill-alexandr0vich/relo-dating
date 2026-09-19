import storage from '@react-native-firebase/storage';

/** Uploads to the private per-chat staging path — see storage.rules and functions/src/chat/sendChatMedia. */
export async function uploadToPendingChatStorage(
  chatId: string,
  uid: string,
  localUri: string,
  extension: string,
): Promise<string> {
  const path = `chats/${chatId}/pending/${uid}/${Date.now()}.${extension}`;
  await storage().ref(path).putFile(localUri);
  return path;
}
