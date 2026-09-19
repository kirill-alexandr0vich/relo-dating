import React, { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
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
type SectionKind = 'requests' | 'friends';

interface FriendSection {
  key: SectionKind;
  title: string;
  data: Friendship[];
}

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

  // Two bounded-but-growing lists — SectionList (14.1: no ScrollView+map
  // for lists that grow with user data) over one combined list, since
  // requests and friends need different row actions.
  const sections: FriendSection[] = [
    ...(incomingRequests.length > 0
      ? [
          {
            key: 'requests' as const,
            title: t('friends.requestsTitle'),
            data: incomingRequests,
          },
        ]
      : []),
    { key: 'friends' as const, title: t('friends.listTitle'), data: accepted },
  ];

  return (
    <SectionList
      style={styles.container}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={friendship => friendship.id}
      ListHeaderComponent={
        <>
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
        </>
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionTitle}>{section.title}</Text>
      )}
      renderSectionFooter={({ section }) =>
        section.key === 'friends' && section.data.length === 0 ? (
          <Text style={styles.emptyText}>{t('friends.empty')}</Text>
        ) : null
      }
      renderItem={({ item: friendship, section }) => {
        const otherUid = getOtherParticipant(friendship, uid);
        const profile = profiles[otherUid];
        const avatar = profile?.avatarUrls[0] && (
          <FastImage
            source={{ uri: profile.avatarUrls[0] }}
            style={styles.avatar}
          />
        );
        if (section.key === 'requests') {
          return (
            <View style={styles.row}>
              {avatar}
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
        }
        return (
          <View style={styles.row}>
            {avatar}
            <Text style={styles.rowName}>{profile?.name ?? '…'}</Text>
            <Text style={styles.messageLink} onPress={() => openChat(otherUid)}>
              {t('friends.message')}
            </Text>
          </View>
        );
      }}
    />
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
});
