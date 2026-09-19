import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { Camera } from 'react-native-camera-kit';
import { lookupUsername, fetchUserRecord, useUserStore } from 'entities/user';
import { sendFriendRequest } from 'entities/friend';
import {
  buildAddFriendDeepLink,
  parseAddFriendDeepLink,
} from 'shared/lib/deepLinks';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';

type Mode = 'search' | 'myQr' | 'scan';

export function AddFriendScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  // Reached only from the Friends tab, which only renders once status === 'ready'.
  const record = useUserStore(state => state.record)!;
  const [mode, setMode] = useState<Mode>('search');
  const [username, setUsername] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function sendRequestTo(
    targetUid: string,
    addedVia: 'qr' | 'username_search',
  ) {
    if (targetUid === record.uid) {
      Alert.alert(t('friends.addFriend'), t('friends.cannotAddSelf'));
      return;
    }
    const result = await sendFriendRequest(record.uid, targetUid, addedVia);
    Alert.alert(
      t('friends.addFriend'),
      result === 'sent'
        ? t('friends.requestSent')
        : t('friends.requestAlreadyExists'),
    );
  }

  async function handleSendByUsername() {
    const trimmed = username.trim();
    if (!trimmed || isSending) {
      return;
    }
    setIsSending(true);
    try {
      const targetUid = await lookupUsername(trimmed);
      // 7.3 — an auto-hidden user is invisible to search, same as if the
      // username didn't exist, so as not to reveal they've been hidden.
      const targetRecord = targetUid ? await fetchUserRecord(targetUid) : null;
      if (!targetUid || !targetRecord || targetRecord.autoHidden) {
        Alert.alert(t('friends.addFriend'), t('friends.usernameNotFound'));
        return;
      }
      await sendRequestTo(targetUid, 'username_search');
      navigation.goBack();
    } finally {
      setIsSending(false);
    }
  }

  async function handleScannedCode(value: string) {
    const targetUid = parseAddFriendDeepLink(value);
    if (!targetUid) {
      return;
    }
    setMode('search');
    try {
      await sendRequestTo(targetUid, 'qr');
    } catch (error) {
      console.error('Failed to send friend request from QR', error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.backLink} onPress={() => navigation.goBack()}>
        {t('common.back')}
      </Text>
      <Text style={styles.title}>{t('friends.addFriend')}</Text>

      <View style={styles.modeRow}>
        <ModeButton
          label={t('friends.searchTab')}
          active={mode === 'search'}
          onPress={() => setMode('search')}
        />
        <ModeButton
          label={t('friends.myQrTab')}
          active={mode === 'myQr'}
          onPress={() => setMode('myQr')}
        />
        <ModeButton
          label={t('friends.scanTab')}
          active={mode === 'scan'}
          onPress={() => setMode('scan')}
        />
      </View>

      {mode === 'search' && (
        <View style={styles.block}>
          <TextField
            label={t('friends.usernameLabel')}
            placeholder={t('friends.usernamePlaceholderSearch')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <Button
            label={t('friends.sendRequest')}
            onPress={handleSendByUsername}
            disabled={isSending || !username.trim()}
          />
        </View>
      )}

      {mode === 'myQr' && (
        <View style={[styles.block, styles.qrBlock]}>
          <QRCode value={buildAddFriendDeepLink(record.uid)} size={220} />
          {record.username && (
            <Text style={styles.qrHint}>@{record.username}</Text>
          )}
        </View>
      )}

      {mode === 'scan' && (
        <View style={styles.scannerBlock}>
          <Camera
            style={styles.scanner}
            scanBarcode
            onReadCode={event =>
              handleScannedCode(event.nativeEvent.codeStringValue)
            }
          />
        </View>
      )}
    </View>
  );
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeButton, active && styles.modeButtonActive]}
    >
      <Text
        style={[styles.modeButtonText, active && styles.modeButtonTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backLink: {
    color: '#9A9A9A',
    marginBottom: 12,
  },
  block: {
    gap: 16,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  modeButton: {
    borderColor: '#D0D0D0',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  modeButtonActive: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  modeButtonText: {
    fontSize: 13,
    textAlign: 'center',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  qrBlock: {
    alignItems: 'center',
  },
  qrHint: {
    color: '#5A5A5A',
    fontSize: 14,
    marginTop: 12,
  },
  scanner: {
    flex: 1,
  },
  scannerBlock: {
    borderRadius: 16,
    height: 320,
    overflow: 'hidden',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
});
