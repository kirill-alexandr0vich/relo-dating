import React from 'react';
import { StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import type { ImageStyle as FastImageStyle } from 'react-native-fast-image';
import { useChatMediaUrl } from '../model/useChatMediaUrl';

/** 6.1 — a photo bubble; `path` is the participant-only Storage path the message carries. */
export function ChatPhotoMessage({ path }: { path: string }) {
  const url = useChatMediaUrl(path);

  if (!url) {
    return <View style={styles.placeholder} />;
  }
  return (
    <FastImage
      source={{ uri: url }}
      // Same stale third-party style typing as in SwipeCard:
      // react-native-fast-image's `ImageStyle` no longer lines up with
      // this RN version's style types, though the style is valid at runtime.
      style={styles.image as unknown as FastImageStyle}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: 12,
    height: 180,
    width: 180,
  },
  placeholder: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    height: 180,
    width: 180,
  },
});
