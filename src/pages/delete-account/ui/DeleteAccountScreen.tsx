import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useDeleteAccount } from 'features/delete-account';
import { Checkbox } from 'shared/ui/Checkbox';
import { handleFirebaseError } from 'shared/api/handleFirebaseError';

const DELETED_ITEM_KEYS = [
  'itemProfile',
  'itemPhotos',
  'itemMatches',
  'itemChats',
  'itemUsername',
] as const;

/**
 * 12 — "Настройки → Удалить аккаунт", required by App Store 5.1.1(v) and
 * Google Play. A screen rather than a single alert: the action is
 * irreversible, so it spells out what goes, asks for an explicit
 * acknowledgement, and only then shows the final confirmation.
 */
export function DeleteAccountScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isDeleting, deleteAccount } = useDeleteAccount();
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  async function runDeletion() {
    try {
      await deleteAccount();
      // No navigation on success: the session is gone, so AuthProvider
      // swaps the whole navigator for the sign-in flow.
    } catch (error) {
      const handled = handleFirebaseError(error);
      Alert.alert(
        t('deleteAccount.title'),
        t(`errors.${handled.translationKey}`),
      );
    }
  }

  function confirmDeletion() {
    Alert.alert(
      t('deleteAccount.confirmTitle'),
      t('deleteAccount.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('deleteAccount.confirmCta'),
          style: 'destructive',
          onPress: runDeletion,
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.backLink} onPress={() => navigation.goBack()}>
        {t('common.back')}
      </Text>
      <Text style={styles.title}>{t('deleteAccount.title')}</Text>
      <Text style={styles.description}>{t('deleteAccount.description')}</Text>

      <View style={styles.list}>
        {DELETED_ITEM_KEYS.map(key => (
          <Text key={key} style={styles.listItem}>
            {`• ${t(`deleteAccount.${key}`)}`}
          </Text>
        ))}
      </View>

      <Checkbox
        checked={isAcknowledged}
        onChange={setIsAcknowledged}
        label={t('deleteAccount.acknowledge')}
      />

      <Pressable
        style={({ pressed }) => [
          styles.deleteButton,
          (!isAcknowledged || isDeleting) && styles.deleteButtonDisabled,
          pressed && styles.deleteButtonPressed,
        ]}
        disabled={!isAcknowledged || isDeleting}
        onPress={confirmDeletion}
      >
        <Text style={styles.deleteButtonLabel}>
          {isDeleting ? t('deleteAccount.deleting') : t('deleteAccount.cta')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backLink: {
    color: '#9A9A9A',
    marginBottom: 12,
  },
  container: {
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingTop: 60,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonPressed: {
    opacity: 0.85,
  },
  description: {
    color: '#5A5A5A',
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 6,
  },
  listItem: {
    color: '#1A1A1A',
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
});
