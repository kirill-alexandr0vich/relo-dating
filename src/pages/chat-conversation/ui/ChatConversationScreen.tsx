import React, { useEffect, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import {
  subscribeToMessages,
  sendChatMessage,
  blockUser,
  type Message,
} from 'entities/chat';
import { addFriendFromMatch } from 'entities/friend';
import { useUserStore, useUserRecords } from 'entities/user';
import { ReportModal } from 'features/report';
import { handleFirebaseError } from 'shared/api/handleFirebaseError';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';
import type { MainStackParamList } from 'shared/lib/navigation/types';

type Route = RouteProp<MainStackParamList, 'ChatConversation'>;

const CONNECTION_ERROR_REASONS = [
  'blocked',
  'friend_messages_disabled',
  'not_connected',
];

export function ChatConversationScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { chatId, otherUid } = route.params;
  const uid = useUserStore(state => state.record?.uid) as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const profiles = useUserRecords([otherUid]);
  const otherProfile = profiles[otherUid];
  const [canAddFriend, setCanAddFriend] = useState(false);
  const [reportSnapshot, setReportSnapshot] = useState<string | null>(null);
  const [isReportingUser, setIsReportingUser] = useState(false);

  useEffect(() => {
    return subscribeToMessages(chatId, setMessages, error => {
      console.error('Failed to subscribe to messages', error);
    });
  }, [chatId]);

  useEffect(() => {
    // 5 — "Добавить в друзья" from a match's chat is only offered when
    // there's an actual match and no friendship record yet; the write
    // itself (entities/friend/addFriendFromMatch) is what firestore.rules
    // actually enforces, this is just for the button's visibility.
    Promise.all([
      firestore().collection('matches').doc(chatId).get(),
      firestore().collection('friends').doc(chatId).get(),
    ]).then(([matchSnapshot, friendSnapshot]) => {
      setCanAddFriend(matchSnapshot.exists && !friendSnapshot.exists);
    });
  }, [chatId]);

  async function handleAddFriend() {
    try {
      await addFriendFromMatch(uid, otherUid);
      setCanAddFriend(false);
    } catch (error) {
      const handled = handleFirebaseError(error);
      Alert.alert(t('messages.title'), t(`errors.${handled.translationKey}`));
    }
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || isSending) {
      return;
    }
    setIsSending(true);
    try {
      await sendChatMessage(chatId, trimmed);
      setText('');
    } catch (error) {
      const message = (error as { message?: string }).message;
      if (message === 'moderation_rejected') {
        Alert.alert(
          t('messages.title'),
          t('errors.moderation_rejected_message'),
        );
      } else if (message && CONNECTION_ERROR_REASONS.includes(message)) {
        Alert.alert(
          t('messages.title'),
          t(`messages.connectionError.${message}`),
        );
      } else {
        const handled = handleFirebaseError(error);
        Alert.alert(t('messages.title'), t(`errors.${handled.translationKey}`));
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleBlock() {
    try {
      await blockUser(otherUid);
      navigation.goBack();
    } catch (error) {
      const handled = handleFirebaseError(error);
      Alert.alert(t('messages.title'), t(`errors.${handled.translationKey}`));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.backLink} onPress={() => navigation.goBack()}>
          {t('common.back')}
        </Text>
        <Text style={styles.headerName}>{otherProfile?.name ?? '…'}</Text>
        <Text style={styles.blockLink} onPress={() => setIsReportingUser(true)}>
          {t('report.reportUser')}
        </Text>
        <Text style={styles.blockLink} onPress={handleBlock}>
          {t('messages.block')}
        </Text>
      </View>

      {canAddFriend && (
        <Text style={styles.addFriendLink} onPress={handleAddFriend}>
          {t('messages.addFriend')}
        </Text>
      )}

      <FlatList
        data={[...messages].reverse()}
        keyExtractor={message => message.id}
        inverted
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() =>
              item.senderId !== uid && setReportSnapshot(item.content)
            }
            style={[
              styles.bubble,
              item.senderId === uid ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            <Text
              style={
                item.senderId === uid
                  ? styles.bubbleTextMine
                  : styles.bubbleTextTheirs
              }
            >
              {item.content}
            </Text>
          </Pressable>
        )}
      />

      <View style={styles.composer}>
        <View style={styles.composerInput}>
          <TextField
            value={text}
            onChangeText={setText}
            placeholder={t('messages.placeholder')}
          />
        </View>
        <Button
          label={t('messages.send')}
          onPress={handleSend}
          disabled={isSending || !text.trim()}
        />
      </View>

      <ReportModal
        visible={isReportingUser}
        targetId={otherUid}
        onClose={() => setIsReportingUser(false)}
      />
      {reportSnapshot !== null && (
        <ReportModal
          visible
          targetId={otherUid}
          contentSnapshot={reportSnapshot}
          onClose={() => setReportSnapshot(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addFriendLink: {
    color: '#FF5A5F',
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backLink: {
    color: '#9A9A9A',
  },
  blockLink: {
    color: '#FF3B30',
  },
  bubble: {
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF5A5F',
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  bubbleTextTheirs: {
    color: '#1A1A1A',
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
  },
  composer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  composerInput: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#EFEFEF',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  messageList: {
    padding: 16,
  },
});
