import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthFlowParamList } from 'app/navigation/AuthFlowNavigator';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';
import { handleFirebaseError } from 'shared/api/handleFirebaseError';
import { sendPhoneVerificationCode } from 'features/sign-in';

type Navigation = NativeStackNavigationProp<AuthFlowParamList, 'PhoneAuth'>;

export function PhoneAuthScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = phoneNumber.trim().length > 0 && !isSubmitting;

  async function handleSendCode() {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      const trimmedNumber = phoneNumber.trim();
      const confirmation = await sendPhoneVerificationCode(trimmedNumber);
      navigation.navigate('PhoneCode', {
        confirmation,
        phoneNumber: trimmedNumber,
      });
    } catch (error) {
      const handled = handleFirebaseError(error);
      Alert.alert(t('auth.title'), t(`errors.${handled.translationKey}`));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.continueWithPhone')}</Text>
      <View style={styles.fields}>
        <TextField
          label={t('auth.phoneLabel')}
          placeholder={t('auth.phonePlaceholder')}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
        />
      </View>
      <Button
        label={t('auth.sendCode')}
        onPress={handleSendCode}
        disabled={!canSubmit}
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
  fields: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
});
