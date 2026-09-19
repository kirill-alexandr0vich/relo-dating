import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  REPORT_REASONS,
  submitReport,
  type ReportReason,
} from 'entities/report';
import { useUserStore } from 'entities/user';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  /** Set when reporting a specific chat message (7.3 — snapshot survives later edits/deletes). */
  contentSnapshot?: string;
}

export function ReportModal({
  visible,
  onClose,
  targetId,
  contentSnapshot,
}: ReportModalProps) {
  const { t } = useTranslation();
  const uid = useUserStore(state => state.record?.uid);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setReason(null);
    setComment('');
  }

  async function handleSubmit() {
    if (!reason || !uid || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await submitReport(uid, targetId, reason, {
        comment: comment.trim() || undefined,
        contentSnapshot,
      });
      reset();
      onClose();
      Alert.alert(t('report.title'), t('report.submitted'));
    } catch (error) {
      console.error('Failed to submit report', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.title}>{t('report.title')}</Text>

        <View style={styles.reasons}>
          {REPORT_REASONS.map(option => (
            <Pressable
              key={option}
              onPress={() => setReason(option)}
              style={[
                styles.reasonRow,
                reason === option && styles.reasonRowSelected,
              ]}
            >
              <Text
                style={[
                  styles.reasonText,
                  reason === option && styles.reasonTextSelected,
                ]}
              >
                {t(`report.reasons.${option}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {reason === 'other' && (
          <View style={styles.commentField}>
            <TextField
              label={t('report.commentLabel')}
              placeholder={t('report.commentPlaceholder')}
              value={comment}
              onChangeText={setComment}
              multiline
            />
          </View>
        )}

        <View style={styles.actions}>
          <Button
            label={t('report.submit')}
            onPress={handleSubmit}
            disabled={!reason || isSubmitting}
          />
          <Text style={styles.cancelLink} onPress={onClose}>
            {t('common.cancel')}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 16,
    marginTop: 24,
  },
  cancelLink: {
    color: '#9A9A9A',
    textAlign: 'center',
  },
  commentField: {
    marginTop: 16,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  reasonRow: {
    borderColor: '#D0D0D0',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reasonRowSelected: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  reasonText: {
    fontSize: 15,
  },
  reasonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reasons: {
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
});
