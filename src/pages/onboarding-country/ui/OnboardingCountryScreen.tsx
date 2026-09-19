import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthFlowParamList } from 'app/navigation/AuthFlowNavigator';
import { Button } from 'shared/ui/Button';
import { SelectField } from 'shared/ui/SelectField';
import { COUNTRIES } from 'shared/lib/constants/countries';
import { useRegistrationDraftStore } from 'features/complete-registration';

type Navigation = NativeStackNavigationProp<
  AuthFlowParamList,
  'OnboardingCountry'
>;

export function OnboardingCountryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const country = useRegistrationDraftStore(state => state.country);
  const setCountry = useRegistrationDraftStore(state => state.setCountry);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('registration.countryTitle')}</Text>
      <View style={styles.field}>
        <SelectField
          label={t('registration.countryTitle')}
          placeholder={t('registration.countryPlaceholder')}
          searchPlaceholder={t('registration.countrySearchPlaceholder')}
          options={COUNTRIES}
          value={country}
          onSelect={setCountry}
        />
      </View>
      <Button
        label={t('common.next')}
        disabled={!country}
        onPress={() => navigation.navigate('OnboardingLanguage')}
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
