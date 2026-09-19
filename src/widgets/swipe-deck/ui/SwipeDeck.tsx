import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { UserRecord } from 'entities/user';
import { getResidencyBadge } from 'entities/user';
import { calculateCompatibilityScore } from 'features/swipe-feed';
import { SwipeCard, type SwipeCardHandle } from 'features/swipe-card';

const VISIBLE_CARD_COUNT = 2;

export interface SwipeDeckHandle {
  swipeTopLeft: () => void;
  swipeTopRight: () => void;
}

interface SwipeDeckProps {
  viewer: UserRecord;
  candidates: UserRecord[];
  onSwipeLeft: (candidate: UserRecord) => void;
  onSwipeRight: (candidate: UserRecord) => void;
}

export const SwipeDeck = forwardRef<SwipeDeckHandle, SwipeDeckProps>(
  function SwipeDeckImpl(
    { viewer, candidates, onSwipeLeft, onSwipeRight },
    ref,
  ) {
    const topCardRef = useRef<SwipeCardHandle>(null);

    useImperativeHandle(ref, () => ({
      swipeTopLeft: () => topCardRef.current?.swipeLeft(),
      swipeTopRight: () => topCardRef.current?.swipeRight(),
    }));

    const visible = candidates.slice(0, VISIBLE_CARD_COUNT);

    return (
      <View style={styles.container}>
        {[...visible].reverse().map((candidate, reversedIndex) => {
          const index = visible.length - 1 - reversedIndex;
          const isTop = index === 0;
          return (
            <SwipeCard
              key={candidate.uid}
              ref={isTop ? topCardRef : undefined}
              candidate={candidate}
              compatibilityScore={calculateCompatibilityScore(
                viewer,
                candidate,
              )}
              residencyBadge={getResidencyBadge(candidate.hereSince)}
              isTop={isTop}
              onSwipeLeft={() => onSwipeLeft(candidate)}
              onSwipeRight={() => onSwipeRight(candidate)}
            />
          );
        })}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
