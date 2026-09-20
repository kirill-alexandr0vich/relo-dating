import { useEffect } from 'react';
import { AppState } from 'react-native';
import { setActiveChatId, useUserStore } from 'entities/user';

/**
 * 10 — marks this chat as the one the user is currently looking at, so
 * the message trigger skips the push for messages they are already
 * reading. Cleared when they leave the screen, and also when the app goes
 * to the background: a chat left open behind a locked screen is not being
 * read, and would otherwise silence every push from that person.
 */
export function useChatPresence(chatId: string) {
  const uid = useUserStore(state => state.record?.uid);

  useEffect(() => {
    if (!uid) {
      return;
    }

    function publish(activeChatId: string | null) {
      setActiveChatId(uid as string, activeChatId).catch(error => {
        console.error('Failed to update chat presence', error);
      });
    }

    publish(chatId);
    const subscription = AppState.addEventListener('change', state => {
      publish(state === 'active' ? chatId : null);
    });

    return () => {
      subscription.remove();
      publish(null);
    };
  }, [uid, chatId]);
}
