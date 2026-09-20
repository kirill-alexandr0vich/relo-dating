import React, { PropsWithChildren, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  clampOffset,
  isHorizontalSwipe,
  resolveRestOffset,
} from './swipeRowGesture';

export interface SwipeAction {
  label: string;
  onPress: () => void;
  /** Destructive actions get the warning colour; there is at most one per row. */
  isDestructive?: boolean;
}

const ACTION_WIDTH = 96;

interface SwipeableRowProps {
  actions: SwipeAction[];
}

/**
 * 6.2 — "свайп по чату — удалить/заблокировать". Built on Animated +
 * PanResponder, the same primitives the swipe deck already uses, rather
 * than pulling in a gesture library for one screen.
 */
export function SwipeableRow({
  actions,
  children,
}: PropsWithChildren<SwipeableRowProps>) {
  const revealWidth = actions.length * ACTION_WIDTH;
  const offset = useRef(new Animated.Value(0)).current;
  const isOpenRef = useRef(false);

  function settle(target: number) {
    isOpenRef.current = target !== 0;
    Animated.spring(offset, {
      toValue: target,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Claimed on move, never on start: a plain tap must still reach
        // the row underneath.
        onMoveShouldSetPanResponder: (_event, gesture) =>
          isHorizontalSwipe(gesture.dx, gesture.dy),
        onPanResponderMove: (_event, gesture) => {
          offset.setValue(
            clampOffset(gesture.dx, isOpenRef.current, revealWidth),
          );
        },
        onPanResponderRelease: (_event, gesture) => {
          settle(resolveRestOffset(gesture.dx, isOpenRef.current, revealWidth));
        },
        onPanResponderTerminate: () => {
          settle(isOpenRef.current ? -revealWidth : 0);
        },
      }),
    // `revealWidth` is fixed for a given row; `offset` is a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revealWidth],
  );

  function handleActionPress(action: SwipeAction) {
    // Close first: after a delete the row disappears, and after a block
    // it stays — either way it should not be left hanging open.
    settle(0);
    action.onPress();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.actions, { width: revealWidth }]}>
        {actions.map(action => (
          <Pressable
            key={action.label}
            style={[
              styles.action,
              action.isDestructive
                ? styles.actionDestructive
                : styles.actionDefault,
            ]}
            onPress={() => handleActionPress(action)}
            accessibilityLabel={action.label}
          >
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <Animated.View
        style={[styles.row, { transform: [{ translateX: offset }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  actionDefault: {
    backgroundColor: '#9A9A9A',
  },
  actionDestructive: {
    backgroundColor: '#FF3B30',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  actions: {
    bottom: 0,
    flexDirection: 'row',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  container: {
    overflow: 'hidden',
  },
  row: {
    backgroundColor: '#FFFFFF',
  },
});
