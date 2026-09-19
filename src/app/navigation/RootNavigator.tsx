import React from 'react';
import { useUserStore } from 'entities/user';
import { SplashScreen } from 'pages/splash';
import { AuthFlowNavigator } from './AuthFlowNavigator';
import { MainNavigator } from './MainNavigator';

export function RootNavigator() {
  const status = useUserStore(state => state.status);

  if (status === 'loading') {
    return <SplashScreen />;
  }

  if (status === 'signed-out') {
    return <AuthFlowNavigator initialRouteName="SignInMethods" />;
  }

  if (status === 'registration-incomplete') {
    return <AuthFlowNavigator initialRouteName="OnboardingName" />;
  }

  return <MainNavigator />;
}
