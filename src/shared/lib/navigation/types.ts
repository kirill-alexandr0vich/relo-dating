import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Navigation param-list types live here (not next to the navigators in
 * app/navigation/) specifically so pages/features can import them for
 * typed `useNavigation`/`useRoute` calls without importing from `app/`,
 * which sits above them in the FSD layer order.
 */
export type TabParamList = {
  Profile: undefined;
  Swipes: undefined;
  Friends: undefined;
  Messages: undefined;
};

export type MainStackParamList = {
  // Typed as nested params so a push tap can open a specific tab (10).
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  ChatConversation: { chatId: string; otherUid: string };
  AddFriend: undefined;
  PrivacySettings: undefined;
  DeleteAccount: undefined;
};
