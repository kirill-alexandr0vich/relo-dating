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
  markChatRead,
  blockUser,
  formatDuration,
  MEDIA_LIMIT_REACHED_CODE,
  type Message,
} from 'entities/chat';
import { addFriendFromMatch } from 'entities/friend';
import { useUserStore, useUserRecords } from 'entities/user';
import {
  ChatPhotoMessage,
  useChatPhotoUpload,
  useChatVoiceRecorder,
  useVoicePlayback,
} from 'features/chat-media';
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

  const { isUploading: isUploadingPhoto, pickAndSendPhoto } =
    useChatPhotoUpload(chatId, uid);
  const {
    isRecording,
    isSending: isSendingVoice,
    elapsedSeconds,
    startRecording,
    cancelRecording,
    stopAndSendRecording,
  } = useChatVoiceRecorder(chatId, uid);
  const voicePlayback = useVoicePlayback();

  useEffect(() => {
    return subscribeToMessages(chatId, setMessages, error => {
      console.error('Failed to subscribe to messages', error);
    });
  }, [chatId]);

  useEffect(() => {
    // 6.2 — mark read on opening the chat, and again whenever a new
    // *incoming* message arrives while it's still open. Skipped when the
    // newest message is my own — sendMessage/sendChatMedia already stamp
    // my readBy in the same transaction, so this would just be a
    // redundant Cloud Function call on every message I send.
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.senderId === uid) {
      return;
    }
    markChatRead(chatId).catch(error => {
      console.error('Failed to mark chat read', error);
    });
  }, [chatId, messages, uid]);

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

  function showSendError(error: unknown) {
    const { code, message } = error as { code?: string; message?: string };
    if (message === 'moderation_rejected') {
      Alert.alert(t('messages.title'), t('errors.moderation_rejected_message'));
    } else if (message && CONNECTION_ERROR_REASONS.includes(message)) {
      Alert.alert(
        t('messages.title'),
        t(`messages.connectionError.${message}`),
      );
    } else if (message === 'mic_permission_denied') {
      Alert.alert(t('messages.title'), t('errors.mic_permission_denied'));
    } else if (code === MEDIA_LIMIT_REACHED_CODE) {
      Alert.alert(t('messages.title'), t('errors.media_limit_reached'));
    } else {
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
      showSendError(error);
    } finally {
      setIsSending(false);
    }
  }

  async function handleAttachPhoto() {
    try {
      await pickAndSendPhoto();
    } catch (error) {
      showSendError(error);
    }
  }

  async function handleStartRecording() {
    try {
      await startRecording();
    } catch (error) {
      showSendError(error);
    }
  }

  async function handleStopAndSendRecording() {
    try {
      await stopAndSendRecording();
    } catch (error) {
      showSendError(error);
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

  function renderMessageContent(item: Message, isMine: boolean) {
    if (item.type === 'image') {
      return <ChatPhotoMessage path={item.content} />;
    }
    if (item.type === 'voice') {
      const isPlaying = voicePlayback.playingPath === item.content;
      return (
        <Pressable
          onPress={() =>
            voicePlayback.toggle(item.content).catch(error => {
              console.error('Failed to play voice message', error);
            })
          }
        >
          <Text
            style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}
          >
            {isPlaying ? '⏸' : '▶'} {formatDuration(item.durationSeconds ?? 0)}
          </Text>
        </Pressable>
      );
    }
    return (
      <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
        {item.content}
      </Text>
    );
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
        renderItem={({ item }) => {
          const isMine = item.senderId === uid;
          return (
            <Pressable
              onLongPress={() => !isMine && setReportSnapshot(item.content)}
              style={[
                styles.bubble,
                isMine ? styles.bubbleMine : styles.bubbleTheirs,
              ]}
            >
              {renderMessageContent(item, isMine)}
            </Pressable>
          );
        }}
      />

      <View style={styles.composer}>
        {isRecording ? (
          <View style={styles.recordingRow}>
            <Text style={styles.recordingLabel}>
              {t('messages.recording')} {formatDuration(elapsedSeconds)}
            </Text>
            <Text
              style={styles.cancelRecordingLink}
              onPress={cancelRecording}
              accessibilityLabel={t('messages.cancelRecording')}
            >
              ✕
            </Text>
            <Button
              label={t('messages.send')}
              onPress={handleStopAndSendRecording}
            />
          </View>
        ) : (
          <>
            <Pressable
              style={styles.mediaButton}
              onPress={handleAttachPhoto}
              disabled={isUploadingPhoto}
              accessibilityLabel={t('messages.attachPhoto')}
            >
              <Text style={styles.mediaButtonText}>
                {isUploadingPhoto ? '…' : '📎'}
              </Text>
            </Pressable>
            <View style={styles.composerInput}>
              <TextField
                value={text}
                onChangeText={setText}
                placeholder={t('messages.placeholder')}
              />
            </View>
            <Pressable
              style={styles.mediaButton}
              onPress={handleStartRecording}
              disabled={isSendingVoice}
              accessibilityLabel={t('messages.recordVoice')}
            >
              <Text style={styles.mediaButtonText}>
                {isSendingVoice ? '…' : '🎤'}
              </Text>
            </Pressable>
            <Button
              label={t('messages.send')}
              onPress={handleSend}
              disabled={isSending || !text.trim()}
            />
          </>
        )}
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
  cancelRecordingLink: {
    color: '#FF3B30',
    fontSize: 20,
    fontWeight: '700',
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
  mediaButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 32,
  },
  mediaButtonText: {
    fontSize: 20,
  },
  messageList: {
    padding: 16,
  },
  recordingLabel: {
    color: '#5A5A5A',
    flex: 1,
    fontSize: 14,
  },
  recordingRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
});
