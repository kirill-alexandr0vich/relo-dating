import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FastImage from 'react-native-fast-image';
import {
  subscribeToFriendships,
  respondToFriendRequest,
  isIncomingRequest,
  getOtherParticipant,
  type Friendship,
} from 'entities/friend';
import { useUserStore, useUserRecords } from 'entities/user';
import { buildChatId } from 'entities/chat';
import type { MainStackParamList } from 'shared/lib/navigation/types';
import { Button } from 'shared/ui/Button';

type Navigation = NativeStackNavigationProp<MainStackParamList>;

export function FriendsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const uid = useUserStore(state => state.record?.uid) as string;
  const [friendships, setFriendships] = useState<Friendship[]>([]);

  useEffect(() => {
    return subscribeToFriendships(uid, setFriendships, error => {
      console.error('Failed to subscribe to friendships', error);
    });
  }, [uid]);

  const incomingRequests = friendships.filter(friendship =>
    isIncomingRequest(friendship, uid),
  );
  const accepted = friendships.filter(
    friendship => friendship.status === 'accepted',
  );

  const otherUids = useMemo(
    () =>
      [...incomingRequests, ...accepted].map(friendship =>
        getOtherParticipant(friendship, uid),
      ),
    [incomingRequests, accepted, uid],
  );
  const profiles = useUserRecords(otherUids);

  async function handleRespond(
    friendshipId: string,
    response: 'accepted' | 'declined',
  ) {
    try {
      await respondToFriendRequest(friendshipId, response);
    } catch (error) {
      console.error('Failed to respond to friend request', error);
    }
  }

  function openChat(otherUid: string) {
    navigation.navigate('ChatConversation', {
      chatId: buildChatId(uid, otherUid),
      otherUid,
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('tabs.friends')}</Text>
        <Text
          style={styles.link}
          onPress={() => navigation.navigate('PrivacySettings')}
        >
          {t('friends.privacy')}
        </Text>
      </View>

      <Button
        label={t('friends.addFriend')}
        onPress={() => navigation.navigate('AddFriend')}
      />

      {incomingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('friends.requestsTitle')}</Text>
          {incomingRequests.map(friendship => {
            const otherUid = getOtherParticipant(friendship, uid);
            const profile = profiles[otherUid];
            return (
              <View key={friendship.id} style={styles.row}>
                {profile?.avatarUrls[0] && (
                  <FastImage
                    source={{ uri: profile.avatarUrls[0] }}
                    style={styles.avatar}
                  />
                )}
                <Text style={styles.rowName}>{profile?.name ?? '…'}</Text>
                <View style={styles.rowActions}>
                  <Text
                    style={styles.acceptLink}
                    onPress={() => handleRespond(friendship.id, 'accepted')}
                  >
                    {t('friends.accept')}
                  </Text>
                  <Text
                    style={styles.declineLink}
                    onPress={() => handleRespond(friendship.id, 'declined')}
                  >
                    {t('friends.decline')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('friends.listTitle')}</Text>
        {accepted.length === 0 && (
          <Text style={styles.emptyText}>{t('friends.empty')}</Text>
        )}
        {accepted.map(friendship => {
          const otherUid = getOtherParticipant(friendship, uid);
          const profile = profiles[otherUid];
          return (
            <View key={friendship.id} style={styles.row}>
              {profile?.avatarUrls[0] && (
                <FastImage
                  source={{ uri: profile.avatarUrls[0] }}
                  style={styles.avatar}
                />
              )}
              <Text style={styles.rowName}>{profile?.name ?? '…'}</Text>
              <Text
                style={styles.messageLink}
                onPress={() => openChat(otherUid)}
              >
                {t('friends.message')}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  acceptLink: {
    color: '#4CD964',
    fontWeight: '600',
  },
  avatar: {
    borderRadius: 20,
    height: 40,
    marginRight: 10,
    width: 40,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  declineLink: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  emptyText: {
    color: '#9A9A9A',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  link: {
    color: '#FF5A5F',
    fontWeight: '600',
  },
  messageLink: {
    color: '#FF5A5F',
    fontWeight: '600',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 16,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
});
