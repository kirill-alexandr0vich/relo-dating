import { useCallback, useState } from 'react';
import { launchImageLibrary } from 'react-native-image-picker';
import { sendChatPhoto, uploadToPendingChatStorage } from 'entities/chat';

// 12 — "макс. сторона 1080px, JPEG качество ~80%", same as profile photos.
const MAX_PHOTO_DIMENSION = 1080;
const PHOTO_QUALITY = 0.8;

interface UseChatPhotoUploadResult {
  isUploading: boolean;
  pickAndSendPhoto: () => Promise<void>;
}

/** 6.1/6.3 — picks a gallery photo and sends it, moderated server-side (see functions/src/chat/sendChatMedia). */
export function useChatPhotoUpload(
  chatId: string,
  uid: string,
): UseChatPhotoUploadResult {
  const [isUploading, setIsUploading] = useState(false);

  const pickAndSendPhoto = useCallback(async () => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      maxWidth: MAX_PHOTO_DIMENSION,
      maxHeight: MAX_PHOTO_DIMENSION,
      quality: PHOTO_QUALITY,
      selectionLimit: 1,
    });

    if (response.didCancel || !response.assets?.[0]?.uri) {
      return;
    }

    const asset = response.assets[0];
    const extension = asset.fileName?.split('.').pop() ?? 'jpg';

    setIsUploading(true);
    try {
      const pendingPath = await uploadToPendingChatStorage(
        chatId,
        uid,
        asset.uri!,
        extension,
      );
      await sendChatPhoto(chatId, pendingPath);
    } finally {
      setIsUploading(false);
    }
  }, [chatId, uid]);

  return { isUploading, pickAndSendPhoto };
}
