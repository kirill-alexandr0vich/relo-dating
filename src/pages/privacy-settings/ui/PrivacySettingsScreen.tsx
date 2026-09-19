import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import {
  useUserStore,
  useUserRecords,
  updateAllowFriendMessagesWithoutMatch,
} from 'entities/user';
import { unblockUser } from 'entities/chat';
import { Checkbox } from 'shared/ui/Checkbox';

export function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const record = useUserStore(state => state.record)!;
  const [allowFriendMessages, setAllowFriendMessages] = useState(
    record.allowFriendMessagesWithoutMatch,
  );
  const blockedProfiles = useUserRecords(record.blockedUserIds);

  async function handleToggle(checked: boolean) {
    setAllowFriendMessages(checked);
    try {
      await updateAllowFriendMessagesWithoutMatch(record.uid, checked);
    } catch (error) {
      setAllowFriendMessages(!checked);
      console.error('Failed to update privacy setting', error);
    }
  }

  async function handleUnblock(targetUid: string) {
    try {
      await unblockUser(record.uid, targetUid);
    } catch (error) {
      console.error('Failed to unblock user', error);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.backLink} onPress={() => navigation.goBack()}>
        {t('common.back')}
      </Text>
      <Text style={styles.title}>{t('friends.privacy')}</Text>

      <Checkbox
        checked={allowFriendMessages}
        onChange={handleToggle}
        label={t('friends.allowFriendMessages')}
      />
      <Text style={styles.hint}>{t('friends.allowFriendMessagesHint')}</Text>

      <Text style={styles.sectionTitle}>{t('friends.blockedUsersTitle')}</Text>
      {record.blockedUserIds.length === 0 && (
        <Text style={styles.hint}>{t('friends.blockedUsersEmpty')}</Text>
      )}
      {record.blockedUserIds.map(targetUid => {
        const profile = blockedProfiles[targetUid];
        return (
          <View key={targetUid} style={styles.row}>
            {profile?.avatarUrls[0] && (
              <FastImage
                source={{ uri: profile.avatarUrls[0] }}
                style={styles.avatar}
              />
            )}
            <Text style={styles.rowName}>{profile?.name ?? '…'}</Text>
            <Text
              style={styles.unblockLink}
              onPress={() => handleUnblock(targetUid)}
            >
              {t('friends.unblock')}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 18,
    height: 36,
    marginRight: 10,
    width: 36,
  },
  backLink: {
    color: '#9A9A9A',
    marginBottom: 12,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
    paddingTop: 60,
  },
  hint: {
    color: '#9A9A9A',
    fontSize: 13,
    marginTop: 12,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  unblockLink: {
    color: '#FF3B30',
    fontWeight: '600',
  },
});
