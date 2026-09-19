import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import {
  useUserStore,
  updateAllowFriendMessagesWithoutMatch,
} from 'entities/user';
import { Checkbox } from 'shared/ui/Checkbox';

export function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const record = useUserStore(state => state.record)!;
  const [allowFriendMessages, setAllowFriendMessages] = useState(
    record.allowFriendMessagesWithoutMatch,
  );

  async function handleToggle(checked: boolean) {
    setAllowFriendMessages(checked);
    try {
      await updateAllowFriendMessagesWithoutMatch(record.uid, checked);
    } catch (error) {
      setAllowFriendMessages(!checked);
      console.error('Failed to update privacy setting', error);
    }
  }

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: {
    color: '#9A9A9A',
    marginBottom: 12,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  hint: {
    color: '#9A9A9A',
    fontSize: 13,
    marginTop: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
});
