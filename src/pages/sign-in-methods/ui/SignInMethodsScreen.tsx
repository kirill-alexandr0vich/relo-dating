import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { AuthFlowParamList } from 'app/navigation/AuthFlowNavigator';
import { Checkbox } from 'shared/ui/Checkbox';
import { Button } from 'shared/ui/Button';
import { handleFirebaseError } from 'shared/api/handleFirebaseError';
import {
  signInWithApple,
  signInWithGoogle,
  isAppleSignInAvailable,
  isAccountExistsError,
  getPendingCredential,
  useFinishSignIn,
  usePendingLinkStore,
} from 'features/sign-in';

type Navigation = NativeStackNavigationProp<AuthFlowParamList, 'SignInMethods'>;

export function SignInMethodsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const setPendingLink = usePendingLinkStore(state => state.setPendingLink);
  const finishSignIn = useFinishSignIn();
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignInAttempt(
    signIn: () => Promise<FirebaseAuthTypes.UserCredential | null>,
  ) {
    if (!ageConfirmed || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await signIn();
      if (result) {
        await finishSignIn(result);
      }
    } catch (error) {
      if (isAccountExistsError(error)) {
        const credential = getPendingCredential(error);
        if (credential) {
          setPendingLink({ email: error.email, credential });
          navigation.navigate('AccountLinking');
          return;
        }
      }
      const handled = handleFirebaseError(error);
      Alert.alert(t('auth.title'), t(`errors.${handled.translationKey}`));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.title')}</Text>

      <View style={styles.ageBlock}>
        <Checkbox
          checked={ageConfirmed}
          onChange={setAgeConfirmed}
          label={t('auth.ageConfirmation')}
        />
        {!ageConfirmed && (
          <Text style={styles.hint}>{t('auth.ageConfirmationHint')}</Text>
        )}
      </View>

      <View style={styles.buttons}>
        {isAppleSignInAvailable && (
          <Button
            label={t('auth.continueWithApple')}
            disabled={!ageConfirmed || isSubmitting}
            onPress={() => handleSignInAttempt(signInWithApple)}
          />
        )}
        <Button
          label={t('auth.continueWithGoogle')}
          disabled={!ageConfirmed || isSubmitting}
          onPress={() => handleSignInAttempt(signInWithGoogle)}
        />
        <Button
          label={t('auth.continueWithEmail')}
          disabled={!ageConfirmed || isSubmitting}
          onPress={() => navigation.navigate('EmailAuth')}
        />
        <Button
          label={t('auth.continueWithPhone')}
          disabled={!ageConfirmed || isSubmitting}
          onPress={() => navigation.navigate('PhoneAuth')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ageBlock: {
    gap: 8,
    marginBottom: 32,
  },
  buttons: {
    gap: 12,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  hint: {
    color: '#9A9A9A',
    fontSize: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
});
