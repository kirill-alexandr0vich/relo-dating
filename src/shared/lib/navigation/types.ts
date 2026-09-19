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
  Tabs: undefined;
  ChatConversation: { chatId: string; otherUid: string };
  AddFriend: undefined;
  PrivacySettings: undefined;
};
