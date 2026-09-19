import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import type { ImageStyle as FastImageStyle } from 'react-native-fast-image';
import { useTranslation } from 'react-i18next';
import type { UserRecord } from 'entities/user';
import type { ResidencyBadge } from 'entities/user';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_OUT_DURATION = 250;

export interface SwipeCardHandle {
  swipeLeft: () => void;
  swipeRight: () => void;
}

interface SwipeCardProps {
  candidate: UserRecord;
  compatibilityScore: number;
  residencyBadge: ResidencyBadge | null;
  isTop: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  function SwipeCardImpl(
    {
      candidate,
      compatibilityScore,
      residencyBadge,
      isTop,
      onSwipeLeft,
      onSwipeRight,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const position = useRef(new Animated.ValueXY()).current;
    const [photoIndex, setPhotoIndex] = useState(0);

    function forceSwipe(direction: 'left' | 'right') {
      const targetX =
        direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
      Animated.timing(position, {
        toValue: { x: targetX, y: 0 },
        duration: SWIPE_OUT_DURATION,
        // ValueXY + the rotate interpolation below aren't supported by the native driver.
        useNativeDriver: false,
      }).start(() => {
        position.setValue({ x: 0, y: 0 });
        if (direction === 'right') {
          onSwipeRight();
        } else {
          onSwipeLeft();
        }
      });
    }

    function resetPosition() {
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
    }

    useImperativeHandle(ref, () => ({
      swipeLeft: () => forceSwipe('left'),
      swipeRight: () => forceSwipe('right'),
    }));

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => isTop,
        onPanResponderMove: (_event, gesture) => {
          position.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            forceSwipe('right');
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            forceSwipe('left');
          } else {
            resetPosition();
          }
        },
      }),
    ).current;

    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: ['-10deg', '0deg', '10deg'],
    });
    const likeOpacity = position.x.interpolate({
      inputRange: [0, SWIPE_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    const nopeOpacity = position.x.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    const photoUrl =
      candidate.avatarUrls[photoIndex] ?? candidate.avatarUrls[0];

    return (
      <Animated.View
        {...(isTop ? panResponder.panHandlers : {})}
        style={[
          styles.card,
          { transform: [...position.getTranslateTransform(), { rotate }] },
        ]}
      >
        <FastImage
          source={{ uri: photoUrl }}
          // react-native-fast-image's bundled style types import a
          // `FlexStyle` export that this RN version no longer has, so its
          // `ImageStyle` ends up an unrelated, near-empty type that rejects
          // ordinary layout properties like `position`/insets. The style
          // itself is valid RN style at runtime; only this stale third-party
          // type is wrong.
          style={styles.photo as unknown as FastImageStyle}
          resizeMode={FastImage.resizeMode.cover}
        />

        {candidate.avatarUrls.length > 1 && (
          <View
            style={styles.photoTapZones}
            pointerEvents={isTop ? 'auto' : 'none'}
          >
            <Pressable
              style={styles.photoTapZone}
              onPress={() => setPhotoIndex(index => Math.max(index - 1, 0))}
            />
            <Pressable
              style={styles.photoTapZone}
              onPress={() =>
                setPhotoIndex(index =>
                  Math.min(index + 1, candidate.avatarUrls.length - 1),
                )
              }
            />
          </View>
        )}

        {candidate.avatarUrls.length > 1 && (
          <View style={styles.photoDots}>
            {candidate.avatarUrls.map((url, index) => (
              <View
                key={url}
                style={[
                  styles.photoDot,
                  index === photoIndex && styles.photoDotActive,
                ]}
              />
            ))}
          </View>
        )}

        <Animated.View
          style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}
        >
          <Text style={[styles.stampText, styles.likeStampText]}>
            {t('swipes.like')}
          </Text>
        </Animated.View>
        <Animated.View
          style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}
        >
          <Text style={[styles.stampText, styles.nopeStampText]}>
            {t('swipes.nope')}
          </Text>
        </Animated.View>

        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeText}>
            {t('swipes.matchPercent', { score: compatibilityScore })}
          </Text>
        </View>

        <View style={styles.infoOverlay}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {candidate.name}
              {candidate.age !== undefined ? `, ${candidate.age}` : ''}
            </Text>
          </View>
          {residencyBadge && (
            <View style={styles.residencyBadge}>
              <Text style={styles.residencyBadgeText}>
                {t(`swipes.badges.${residencyBadge}`)}
              </Text>
            </View>
          )}
          {candidate.interests && candidate.interests.length > 0 && (
            <View style={styles.tags}>
              {candidate.interests.slice(0, 5).map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{t(`interests.${tag}`)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  infoOverlay: {
    bottom: 0,
    left: 0,
    padding: 16,
    position: 'absolute',
    right: 0,
  },
  likeStamp: {
    borderColor: '#4CD964',
    left: 24,
    transform: [{ rotate: '-20deg' }],
  },
  likeStampText: {
    color: '#4CD964',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  nameRow: {
    marginBottom: 6,
  },
  nopeStamp: {
    borderColor: '#FF3B30',
    right: 24,
    transform: [{ rotate: '20deg' }],
  },
  nopeStampText: {
    color: '#FF3B30',
  },
  photo: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  photoDot: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  photoDotActive: {
    backgroundColor: '#FFFFFF',
  },
  photoDots: {
    flexDirection: 'row',
    gap: 4,
    position: 'absolute',
    right: 16,
    top: 16,
  },
  photoTapZone: {
    flex: 1,
  },
  photoTapZones: {
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  residencyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  residencyBadgeText: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '600',
  },
  scoreBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    position: 'absolute',
    right: 16,
    top: 16,
  },
  scoreBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stamp: {
    borderRadius: 8,
    borderWidth: 4,
    padding: 8,
    position: 'absolute',
    top: 48,
  },
  stampText: {
    fontSize: 28,
    fontWeight: '800',
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    marginBottom: 6,
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
