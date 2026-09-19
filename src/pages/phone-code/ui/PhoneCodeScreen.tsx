import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { AuthFlowParamList } from 'app/navigation/AuthFlowNavigator';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';
import { handleFirebaseError } from 'shared/api/handleFirebaseError';
import {
  confirmPhoneVerificationCode,
  sendPhoneVerificationCode,
  useFinishSignIn,
} from 'features/sign-in';

type Route = RouteProp<AuthFlowParamList, 'PhoneCode'>;

export function PhoneCodeScreen() {
  const { t } = useTranslation();
  const route = useRoute<Route>();
  const finishSignIn = useFinishSignIn();
  const [confirmation, setConfirmation] = useState(route.params.confirmation);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = code.trim().length > 0 && !isSubmitting;

  async function handleConfirm() {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await confirmPhoneVerificationCode(
        confirmation,
        code.trim(),
      );
      if (result) {
        await finishSignIn(result);
      }
    } catch (error) {
      const handled = handleFirebaseError(error);
      Alert.alert(t('auth.title'), t(`errors.${handled.translationKey}`));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    try {
      const nextConfirmation = await sendPhoneVerificationCode(
        route.params.phoneNumber,
      );
      setConfirmation(nextConfirmation);
    } catch (error) {
      const handled = handleFirebaseError(error);
      Alert.alert(t('auth.title'), t(`errors.${handled.translationKey}`));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.phoneCodeLabel')}</Text>
      <View style={styles.fields}>
        <TextField
          label={t('auth.phoneCodeLabel')}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoFocus
        />
      </View>
      <Button
        label={t('auth.confirmCode')}
        onPress={handleConfirm}
        disabled={!canSubmit}
      />
      <Text style={styles.resendLink} onPress={handleResend}>
        {t('auth.resendCode')}
      </Text>
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
  resendLink: {
    color: '#FF5A5F',
    marginTop: 16,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
});
