import { useCallback, useState } from 'react';
import { launchImageLibrary } from 'react-native-image-picker';
import { submitProfilePhoto } from 'entities/user';
import { uploadToPendingStorage } from '../api/photoStorageApi';

// 12 — "макс. сторона 1080px, JPEG качество ~80%".
const MAX_PHOTO_DIMENSION = 1080;
const PHOTO_QUALITY = 0.8;

interface UsePhotoUploadResult {
  isUploading: boolean;
  pickAndUploadPhoto: (uid: string) => Promise<string | null>;
}

/** Resolves to `null` if the user cancels the picker. */
export function usePhotoUpload(): UsePhotoUploadResult {
  const [isUploading, setIsUploading] = useState(false);

  const pickAndUploadPhoto = useCallback(async (uid: string) => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      maxWidth: MAX_PHOTO_DIMENSION,
      maxHeight: MAX_PHOTO_DIMENSION,
      quality: PHOTO_QUALITY,
      selectionLimit: 1,
      // 7.1 requires camera-only capture for the verification selfie —
      // that restriction is specific to verification, not ordinary
      // profile photos (3.2), so the gallery is fine here.
    });

    if (response.didCancel || !response.assets?.[0]?.uri) {
      return null;
    }

    const asset = response.assets[0];
    const extension = asset.fileName?.split('.').pop() ?? 'jpg';

    setIsUploading(true);
    try {
      const pendingPath = await uploadToPendingStorage(
        uid,
        asset.uri!,
        extension,
      );
      return await submitProfilePhoto(pendingPath);
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { isUploading, pickAndUploadPhoto };
}
