import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { SignInMethodsScreen } from 'pages/sign-in-methods';
import { EmailAuthScreen } from 'pages/email-auth';
import { PhoneAuthScreen } from 'pages/phone-auth';
import { PhoneCodeScreen } from 'pages/phone-code';
import { AccountLinkingScreen } from 'pages/account-linking';
import { OnboardingNameScreen } from 'pages/onboarding-name';
import { OnboardingCountryScreen } from 'pages/onboarding-country';
import { OnboardingLanguageScreen } from 'pages/onboarding-language';

export type AuthFlowParamList = {
  SignInMethods: undefined;
  EmailAuth: undefined;
  PhoneAuth: undefined;
  PhoneCode: {
    confirmation: FirebaseAuthTypes.ConfirmationResult;
    phoneNumber: string;
  };
  AccountLinking: undefined;
  OnboardingName: undefined;
  OnboardingCountry: undefined;
  OnboardingLanguage: undefined;
};

const Stack = createNativeStackNavigator<AuthFlowParamList>();

interface AuthFlowNavigatorProps {
  initialRouteName: keyof AuthFlowParamList;
}

export function AuthFlowNavigator({
  initialRouteName,
}: AuthFlowNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="SignInMethods" component={SignInMethodsScreen} />
      <Stack.Screen name="EmailAuth" component={EmailAuthScreen} />
      <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
      <Stack.Screen name="PhoneCode" component={PhoneCodeScreen} />
      <Stack.Screen name="AccountLinking" component={AccountLinkingScreen} />
      <Stack.Screen name="OnboardingName" component={OnboardingNameScreen} />
      <Stack.Screen
        name="OnboardingCountry"
        component={OnboardingCountryScreen}
      />
      <Stack.Screen
        name="OnboardingLanguage"
        component={OnboardingLanguageScreen}
      />
    </Stack.Navigator>
  );
}
