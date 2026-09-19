import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { AuthFlowParamList } from 'app/navigation/AuthFlowNavigator';
import { Button } from 'shared/ui/Button';
import { handleFirebaseError } from 'shared/api/handleFirebaseError';
import {
  signInWithApple,
  signInWithGoogle,
  isAppleSignInAvailable,
  fetchExistingSignInMethods,
  useFinishSignIn,
  usePendingLinkStore,
} from 'features/sign-in';

type Navigation = NativeStackNavigationProp<
  AuthFlowParamList,
  'AccountLinking'
>;

export function AccountLinkingScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const pendingLink = usePendingLinkStore(state => state.pendingLink);
  const finishSignIn = useFinishSignIn();
  const [availableMethods, setAvailableMethods] = useState<string[] | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!pendingLink?.email) {
      setAvailableMethods([]);
      return;
    }
    fetchExistingSignInMethods(pendingLink.email).then(setAvailableMethods);
  }, [pendingLink?.email]);

  // If a lookup succeeded, only offer the providers it actually returned;
  // if it came back empty (lookup disabled or still loading), fall back to
  // showing every method rather than blocking the user.
  const showAll = !availableMethods || availableMethods.length === 0;
  const canShowApple =
    isAppleSignInAvailable &&
    (showAll || availableMethods.includes('apple.com'));
  const canShowGoogle = showAll || availableMethods.includes('google.com');
  const canShowEmail = showAll || availableMethods.includes('password');
  const canShowPhone = showAll || availableMethods.includes('phone');

  async function handleSocialSignIn(
    signIn: () => Promise<FirebaseAuthTypes.UserCredential | null>,
  ) {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await signIn();
      if (result) {
        await finishSignIn(result);
        Alert.alert(t('auth.title'), t('auth.linkingSuccess'));
      }
    } catch (error) {
      const handled = handleFirebaseError(error);
      Alert.alert(t('auth.title'), t(`errors.${handled.translationKey}`));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.linkingTitle')}</Text>
      <Text style={styles.description}>
        {t('auth.linkingDescription', { email: pendingLink?.email ?? '' })}
      </Text>

      <View style={styles.buttons}>
        {canShowApple && (
          <Button
            label={t('auth.continueWithApple')}
            disabled={isSubmitting}
            onPress={() => handleSocialSignIn(signInWithApple)}
          />
        )}
        {canShowGoogle && (
          <Button
            label={t('auth.continueWithGoogle')}
            disabled={isSubmitting}
            onPress={() => handleSocialSignIn(signInWithGoogle)}
          />
        )}
        {canShowEmail && (
          <Button
            label={t('auth.continueWithEmail')}
            disabled={isSubmitting}
            onPress={() => navigation.navigate('EmailAuth')}
          />
        )}
        {canShowPhone && (
          <Button
            label={t('auth.continueWithPhone')}
            disabled={isSubmitting}
            onPress={() => navigation.navigate('PhoneAuth')}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttons: {
    gap: 12,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  description: {
    color: '#5A5A5A',
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
});
