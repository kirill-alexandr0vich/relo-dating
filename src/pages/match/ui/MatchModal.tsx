import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import FastImage from 'react-native-fast-image';
import type { MatchNotification } from 'entities/match';
import { Button } from 'shared/ui/Button';

interface MatchModalProps {
  notification: MatchNotification | null;
  onClose: () => void;
}

export function MatchModal({ notification, onClose }: MatchModalProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();

  if (!notification) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Text style={styles.title}>{t('swipes.matchTitle')}</Text>
        <FastImage
          source={{ uri: notification.otherUser.avatarUrls[0] }}
          style={styles.photo}
          resizeMode={FastImage.resizeMode.cover}
        />
        <Text style={styles.name}>{notification.otherUser.name}</Text>

        <View style={styles.buttons}>
          <Button
            label={t('swipes.sendMessage')}
            onPress={() => {
              onClose();
              // Cross-tab navigation from outside the tab navigator's own
              // layer (its TabParamList type lives in app/, which pages
              // must not import from) — the Messages tab doesn't exist
              // as a chat screen yet either (section 6, not built).
              navigation.navigate('Messages' as never);
            }}
          />
          <Text style={styles.dismissLink} onPress={onClose}>
            {t('swipes.keepSwiping')}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  buttons: {
    gap: 16,
    marginTop: 32,
    width: '100%',
  },
  dismissLink: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
  },
  photo: {
    borderColor: '#FFFFFF',
    borderRadius: 90,
    borderWidth: 4,
    height: 180,
    width: 180,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 32,
    textAlign: 'center',
  },
});
