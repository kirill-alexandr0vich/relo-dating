import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthFlowParamList } from 'app/navigation/AuthFlowNavigator';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';
import { useRegistrationDraftStore } from 'features/complete-registration';

type Navigation = NativeStackNavigationProp<
  AuthFlowParamList,
  'OnboardingName'
>;

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 30;

export function OnboardingNameScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const name = useRegistrationDraftStore(state => state.name);
  const setName = useRegistrationDraftStore(state => state.setName);

  const trimmedLength = name.trim().length;
  const isValid =
    trimmedLength >= MIN_NAME_LENGTH && trimmedLength <= MAX_NAME_LENGTH;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('registration.nameTitle')}</Text>
      <View style={styles.field}>
        <TextField
          label={t('registration.namePlaceholder')}
          value={name}
          onChangeText={setName}
          maxLength={MAX_NAME_LENGTH}
          autoFocus
        />
      </View>
      <Button
        label={t('common.next')}
        disabled={!isValid}
        onPress={() => navigation.navigate('OnboardingCountry')}
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
