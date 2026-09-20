import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FastImage from 'react-native-fast-image';
import {
  subscribeToChats,
  getOtherParticipant,
  isChatUnread,
  isChatHidden,
  isParticipantDeleted,
  hideChat,
  blockUser,
  type Chat,
} from 'entities/chat';
import { useUserStore, useUserRecords } from 'entities/user';
import { handleFirebaseError } from 'shared/api/handleFirebaseError';
import { SwipeableRow, type SwipeAction } from 'shared/ui/SwipeableRow';
import type { MainStackParamList } from 'shared/lib/navigation/types';

type Navigation = NativeStackNavigationProp<MainStackParamList>;

export function MessagesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const uid = useUserStore(state => state.record?.uid) as string;
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    return subscribeToChats(uid, setChats, error => {
      console.error('Failed to subscribe to chats', error);
    });
  }, [uid]);

  // 6.2 — a chat the user deleted stays out of the list until the
  // conversation resumes; filtered here rather than server-side because
  // the rule depends on `lastMessageAt`, which changes with every message.
  const visibleChats = useMemo(
    () => chats.filter(chat => !isChatHidden(chat, uid)),
    [chats, uid],
  );
  const otherUids = useMemo(
    () => visibleChats.map(chat => getOtherParticipant(chat, uid)),
    [visibleChats, uid],
  );
  const profiles = useUserRecords(otherUids);

  function confirm(title: string, message: string, onConfirm: () => void) {
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: title, style: 'destructive', onPress: onConfirm },
    ]);
  }

  function reportFailure(error: unknown) {
    const handled = handleFirebaseError(error);
    Alert.alert(t('messages.title'), t(`errors.${handled.translationKey}`));
  }

  function buildRowActions(chat: Chat, isOtherDeleted: boolean): SwipeAction[] {
    const actions: SwipeAction[] = [
      {
        label: t('messages.delete'),
        isDestructive: true,
        onPress: () =>
          confirm(t('messages.delete'), t('messages.deleteChatConfirm'), () => {
            hideChat(chat.id).catch(reportFailure);
          }),
      },
    ];
    // Blocking an account that no longer exists would do nothing.
    if (!isOtherDeleted) {
      actions.unshift({
        label: t('messages.block'),
        onPress: () =>
          confirm(t('messages.block'), t('messages.blockConfirm'), () => {
            blockUser(getOtherParticipant(chat, uid)).catch(reportFailure);
          }),
      });
    }
    return actions;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{t('tabs.messages')}</Text>
      <FlatList
        data={visibleChats}
        keyExtractor={chat => chat.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t('messages.empty')}</Text>
        }
        renderItem={({ item }) => {
          const otherUid = getOtherParticipant(item, uid);
          const isOtherDeleted = isParticipantDeleted(item, otherUid);
          const profile = isOtherDeleted ? undefined : profiles[otherUid];
          const unread = isChatUnread(item, uid);
          return (
            <SwipeableRow actions={buildRowActions(item, isOtherDeleted)}>
              <Pressable
                style={styles.row}
                onPress={() =>
                  navigation.navigate('ChatConversation', {
                    chatId: item.id,
                    otherUid,
                  })
                }
              >
                {profile?.avatarUrls[0] && (
                  <FastImage
                    source={{ uri: profile.avatarUrls[0] }}
                    style={styles.avatar}
                  />
                )}
                <View style={styles.rowText}>
                  <Text
                    style={[
                      styles.rowName,
                      unread && styles.rowNameUnread,
                      isOtherDeleted && styles.rowNameDeleted,
                    ]}
                  >
                    {isOtherDeleted
                      ? t('messages.deletedUser')
                      : profile?.name ?? '…'}
                  </Text>
                  {item.lastMessage && (
                    <Text
                      style={[
                        styles.lastMessage,
                        unread && styles.lastMessageUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage}
                    </Text>
                  )}
                </View>
                {unread && <View style={styles.unreadDot} />}
              </Pressable>
            </SwipeableRow>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 24,
    height: 48,
    marginRight: 12,
    width: 48,
  },
  container: {
    flex: 1,
  },
  emptyText: {
    color: '#9A9A9A',
    paddingHorizontal: 20,
  },
  lastMessage: {
    color: '#9A9A9A',
    fontSize: 13,
  },
  lastMessageUnread: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  list: {
    paddingBottom: 20,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowNameDeleted: {
    color: '#9A9A9A',
    fontStyle: 'italic',
  },
  rowNameUnread: {
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  unreadDot: {
    backgroundColor: '#FF5A5F',
    borderRadius: 5,
    height: 10,
    marginLeft: 8,
    width: 10,
  },
});
