import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';
import { handleFirebaseError } from 'shared/api/handleFirebaseError';
import {
  signInWithEmail,
  signUpWithEmail,
  useFinishSignIn,
} from 'features/sign-in';

type Mode = 'signUp' | 'signIn';

export function EmailAuthScreen() {
  const { t } = useTranslation();
  const finishSignIn = useFinishSignIn();
  const [mode, setMode] = useState<Mode>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    email.trim().length > 0 && password.length >= 6 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result =
        mode === 'signUp'
          ? await signUpWithEmail(email.trim(), password)
          : await signInWithEmail(email.trim(), password);
      await finishSignIn(result);
    } catch (error) {
      const handled = handleFirebaseError(error);
      Alert.alert(t('auth.title'), t(`errors.${handled.translationKey}`));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === 'signUp' ? t('auth.signUp') : t('auth.signIn')}
      </Text>

      <View style={styles.fields}>
        <TextField
          label={t('auth.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label={t('auth.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
        />
      </View>

      <Button
        label={mode === 'signUp' ? t('auth.signUp') : t('auth.signIn')}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />

      <Text
        style={styles.switchLink}
        onPress={() => setMode(mode === 'signUp' ? 'signIn' : 'signUp')}
      >
        {mode === 'signUp'
          ? t('auth.switchToSignIn')
          : t('auth.switchToSignUp')}
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
    gap: 16,
    marginBottom: 24,
  },
  switchLink: {
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
