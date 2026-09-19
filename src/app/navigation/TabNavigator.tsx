import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { ProfileScreen } from 'pages/profile';
import { SwipesScreen } from 'pages/swipes';
import { FriendsScreen } from 'pages/friends';
import { MessagesScreen } from 'pages/messages';

export type TabParamList = {
  Profile: undefined;
  Swipes: undefined;
  Friends: undefined;
  Messages: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      initialRouteName="Swipes"
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('tabs.profile') }}
      />
      <Tab.Screen
        name="Swipes"
        component={SwipesScreen}
        options={{ title: t('tabs.swipes') }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ title: t('tabs.friends') }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: t('tabs.messages') }}
      />
    </Tab.Navigator>
  );
}
