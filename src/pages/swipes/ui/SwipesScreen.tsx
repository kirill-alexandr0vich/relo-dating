import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { UserRecord } from 'entities/user';
import { useUserStore } from 'entities/user';
import type { SwipeAction } from 'entities/swipe';
import { useMatchNotifications } from 'entities/match';
import {
  getRemainingSwipes,
  SWIPE_LIMIT_REACHED_CODE,
  useSwipeFeed,
} from 'features/swipe-feed';
import { SwipeDeck, type SwipeDeckHandle } from 'widgets/swipe-deck';
import { SwipeFiltersModal } from 'pages/swipe-filters';
import { MatchModal } from 'pages/match';
import { handleFirebaseError } from 'shared/api/handleFirebaseError';

export function SwipesScreen() {
  const { t } = useTranslation();
  // This tab only mounts once RootNavigator has confirmed status === 'ready', so record is always a complete User by then.
  const record = useUserStore(state => state.record)!;
  const deckRef = useRef<SwipeDeckHandle>(null);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  const { candidates, isLoading, isLimitReached, swipe } = useSwipeFeed(record);
  const { notification, dismiss } = useMatchNotifications(record.uid);

  const remainingSwipes = getRemainingSwipes({
    premium: record.premium,
    swipesUsedToday: record.swipesUsedToday,
    swipesResetAtMillis: record.swipesResetAt?.toMillis(),
  });

  async function handleSwipe(candidate: UserRecord, action: SwipeAction) {
    try {
      await swipe(candidate, action);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== SWIPE_LIMIT_REACHED_CODE) {
        const handled = handleFirebaseError(error);
        Alert.alert(
          t('swipes.errorTitle'),
          t(`errors.${handled.translationKey}`),
        );
      }
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('tabs.swipes')}</Text>
        <Pressable onPress={() => setIsFiltersVisible(true)}>
          <Text style={styles.filtersLink}>{t('swipes.filters')}</Text>
        </Pressable>
      </View>

      {remainingSwipes !== null && (
        <Text style={styles.remaining}>
          {t('swipes.remaining', { count: remainingSwipes })}
        </Text>
      )}

      <View style={styles.deckArea}>
        {isLimitReached ? (
          <EmptyState
            title={t('swipes.limitReachedTitle')}
            description={t('swipes.limitReachedDescription')}
          />
        ) : candidates.length > 0 ? (
          <SwipeDeck
            ref={deckRef}
            viewer={record}
            candidates={candidates}
            onSwipeLeft={candidate => handleSwipe(candidate, 'dislike')}
            onSwipeRight={candidate => handleSwipe(candidate, 'like')}
          />
        ) : isLoading ? (
          <ActivityIndicator size="large" color="#FF5A5F" />
        ) : (
          <EmptyState
            title={t('swipes.emptyTitle')}
            description={t('swipes.emptyDescription')}
          />
        )}
      </View>

      {candidates.length > 0 && !isLimitReached && (
        <View style={styles.actions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => deckRef.current?.swipeTopLeft()}
            accessibilityLabel={t('swipes.nope')}
          >
            <Text style={styles.actionIconNope}>✕</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.actionButtonDisabled]}
            disabled
            accessibilityLabel={t('swipes.undo')}
          >
            <Text style={styles.actionIconUndo}>↺</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => deckRef.current?.swipeTopRight()}
            accessibilityLabel={t('swipes.like')}
          >
            <Text style={styles.actionIconLike}>♥</Text>
          </Pressable>
        </View>
      )}

      <SwipeFiltersModal
        visible={isFiltersVisible}
        onClose={() => setIsFiltersVisible(false)}
      />
      <MatchModal notification={notification} onClose={dismiss} />
    </View>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    elevation: 2,
    height: 64,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    width: 64,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionIconLike: {
    color: '#FF5A5F',
    fontSize: 26,
  },
  actionIconNope: {
    color: '#9A9A9A',
    fontSize: 22,
    fontWeight: '700',
  },
  actionIconUndo: {
    color: '#F5A623',
    fontSize: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  container: {
    flex: 1,
  },
  deckArea: {
    flex: 1,
    padding: 16,
  },
  emptyDescription: {
    color: '#9A9A9A',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  filtersLink: {
    color: '#FF5A5F',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  remaining: {
    color: '#9A9A9A',
    fontSize: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
});
