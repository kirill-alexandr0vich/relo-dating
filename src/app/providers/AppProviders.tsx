import React, { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import 'shared/lib/i18n';
import 'app/firebase/init';
import { navigationRef } from 'shared/lib/navigation/navigationRef';
import { AuthProvider } from './AuthProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      {/* The ref lets a tapped push notification navigate (10). */}
      <NavigationContainer ref={navigationRef}>
        <AuthProvider>{children}</AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
