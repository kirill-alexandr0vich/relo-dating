import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from 'shared/ui/Button';
import { SelectField } from 'shared/ui/SelectField';
import { LANGUAGES } from 'shared/lib/constants/languages';
import { handleFirebaseError } from 'shared/api/handleFirebaseError';
import { MODERATION_REJECTED_MESSAGE, useUserStore } from 'entities/user';
import {
  useRegistrationDraftStore,
  submitRequiredProfileFields,
} from 'features/complete-registration';

export function OnboardingLanguageScreen() {
  const { t } = useTranslation();
  const uid = useUserStore(state => state.record?.uid);
  const name = useRegistrationDraftStore(state => state.name);
  const country = useRegistrationDraftStore(state => state.country);
  const nativeLanguage = useRegistrationDraftStore(
    state => state.nativeLanguage,
  );
  const setNativeLanguage = useRegistrationDraftStore(
    state => state.setNativeLanguage,
  );
  const reset = useRegistrationDraftStore(state => state.reset);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    Boolean(uid && country && nativeLanguage && name.trim()) && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit || !uid || !country || !nativeLanguage) {
      return;
    }
    setIsSubmitting(true);
    try {
      await submitRequiredProfileFields(uid, {
        name: name.trim(),
        country,
        nativeLanguage,
      });
      reset();
      // RootNavigator switches to the main tabs once AuthProvider's
      // Firestore subscription picks up the now-complete record.
    } catch (error) {
      if (
        (error as { message?: string }).message === MODERATION_REJECTED_MESSAGE
      ) {
        Alert.alert(t('auth.title'), t('errors.moderation_rejected_name'));
      } else {
        const handled = handleFirebaseError(error);
        Alert.alert(t('auth.title'), t(`errors.${handled.translationKey}`));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('registration.languageTitle')}</Text>
      <View style={styles.field}>
        <SelectField
          label={t('registration.languageTitle')}
          placeholder={t('registration.languagePlaceholder')}
          searchPlaceholder={t('registration.languageSearchPlaceholder')}
          options={LANGUAGES}
          value={nativeLanguage}
          onSelect={setNativeLanguage}
        />
      </View>
      <Button
        label={t('common.next')}
        disabled={!canSubmit}
        onPress={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  field: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
});
