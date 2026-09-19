import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import FastImage from 'react-native-fast-image';
import type { MatchNotification } from 'entities/match';
import { buildChatId } from 'entities/chat';
import type { MainStackParamList } from 'shared/lib/navigation/types';
import { useUserStore } from 'entities/user';
import { Button } from 'shared/ui/Button';

type Navigation = NativeStackNavigationProp<MainStackParamList>;

interface MatchModalProps {
  notification: MatchNotification | null;
  onClose: () => void;
}

export function MatchModal({ notification, onClose }: MatchModalProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const uid = useUserStore(state => state.record?.uid);

  if (!notification || !uid) {
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
              navigation.navigate('ChatConversation', {
                chatId: buildChatId(uid, notification.otherUser.uid),
                otherUid: notification.otherUser.uid,
              });
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
