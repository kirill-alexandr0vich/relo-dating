import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useUserStore } from 'entities/user';
import {
  useSwipeFiltersStore,
  type SwipeFeedMode,
  type SwipeFilters,
} from 'features/swipe-feed';
import { INTEREST_TAGS } from 'shared/lib/constants/interests';
import { Button } from 'shared/ui/Button';
import { Checkbox } from 'shared/ui/Checkbox';
import { TextField } from 'shared/ui/TextField';

const MODES: SwipeFeedMode[] = ['country', 'language', 'both'];

interface SwipeFiltersModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SwipeFiltersModal({
  visible,
  onClose,
}: SwipeFiltersModalProps) {
  const { t } = useTranslation();
  const isPremium = Boolean(useUserStore(state => state.record?.premium));
  const filters = useSwipeFiltersStore(state => state.filters);
  const setFilters = useSwipeFiltersStore(state => state.setFilters);
  const [draft, setDraft] = useState<SwipeFilters>(filters);

  useEffect(() => {
    if (visible) {
      setDraft(filters);
    }
  }, [visible, filters]);

  function toggleTag(tag: string) {
    setDraft(previous => ({
      ...previous,
      interestTags: previous.interestTags.includes(tag)
        ? previous.interestTags.filter(existing => existing !== tag)
        : [...previous.interestTags, tag],
    }));
  }

  function handleApply() {
    setFilters(draft);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('swipes.filtersTitle')}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('swipes.filterModeTitle')}
            </Text>
            <View style={styles.modeOptions}>
              {MODES.map(mode => {
                const selected = draft.mode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() =>
                      setDraft(previous => ({ ...previous, mode }))
                    }
                    style={[
                      styles.modeOption,
                      selected && styles.modeOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeOptionText,
                        selected && styles.modeOptionTextSelected,
                      ]}
                    >
                      {t(`swipes.filterMode.${mode}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {t('swipes.filterAgeTitle')}
              </Text>
              {!isPremium && (
                <Text style={styles.premiumLock}>
                  {t('swipes.premiumOnly')}
                </Text>
              )}
            </View>
            <View style={styles.ageRow}>
              <View style={styles.ageField}>
                <TextField
                  label={t('swipes.ageMin')}
                  keyboardType="number-pad"
                  editable={isPremium}
                  value={draft.ageMin?.toString() ?? ''}
                  onChangeText={text =>
                    setDraft(previous => ({
                      ...previous,
                      ageMin: text ? Number(text) : null,
                    }))
                  }
                />
              </View>
              <View style={styles.ageField}>
                <TextField
                  label={t('swipes.ageMax')}
                  keyboardType="number-pad"
                  editable={isPremium}
                  value={draft.ageMax?.toString() ?? ''}
                  onChangeText={text =>
                    setDraft(previous => ({
                      ...previous,
                      ageMax: text ? Number(text) : null,
                    }))
                  }
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {t('swipes.filterTagsTitle')}
              </Text>
              {!isPremium && (
                <Text style={styles.premiumLock}>
                  {t('swipes.premiumOnly')}
                </Text>
              )}
            </View>
            <View style={styles.tagsWrap}>
              {INTEREST_TAGS.map(tag => {
                const selected = draft.interestTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    disabled={!isPremium}
                    onPress={() => toggleTag(tag)}
                    style={[styles.tagChip, selected && styles.tagChipActive]}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        selected && styles.tagChipTextActive,
                      ]}
                    >
                      {t(`interests.${tag}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Checkbox
              checked={draft.onlyVerified}
              disabled={!isPremium}
              onChange={checked =>
                setDraft(previous => ({ ...previous, onlyVerified: checked }))
              }
              label={t('swipes.filterVerifiedOnly')}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label={t('swipes.applyFilters')} onPress={handleApply} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ageField: {
    flex: 1,
  },
  ageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  footer: {
    borderTopColor: '#EFEFEF',
    borderTopWidth: 1,
    padding: 20,
  },
  modeOption: {
    borderColor: '#D0D0D0',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modeOptionSelected: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  modeOptionText: {
    fontSize: 14,
  },
  modeOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  premiumLock: {
    color: '#9A9A9A',
    fontSize: 12,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  tagChip: {
    borderColor: '#D0D0D0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipActive: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  tagChipText: {
    fontSize: 13,
  },
  tagChipTextActive: {
    color: '#FFFFFF',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
});
