import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatConversationScreen } from 'pages/chat-conversation';
import { AddFriendScreen } from 'pages/add-friend';
import { PrivacySettingsScreen } from 'pages/privacy-settings';
import { useAddFriendDeepLink } from 'features/add-friend';
import type { MainStackParamList } from 'shared/lib/navigation/types';
import { TabNavigator } from './TabNavigator';

const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * Wraps the tab bar in a stack so full-screen destinations (a chat,
 * add-friend, privacy settings) can be pushed OVER the tabs from any of
 * them — 5/6 need this since a chat is reachable from Friends, Messages
 * and a match's "It's a match" modal alike.
 */
export function MainNavigator() {
  useAddFriendDeepLink();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="ChatConversation"
        component={ChatConversationScreen}
      />
      <Stack.Screen name="AddFriend" component={AddFriendScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
    </Stack.Navigator>
  );
}
