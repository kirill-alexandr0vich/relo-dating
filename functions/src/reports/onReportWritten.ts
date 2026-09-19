import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import { shouldAutoHide, type ReportReason } from './autoHideThresholds';

interface ReportDoc {
  targetId: string;
  reason: ReportReason;
}

/**
 * 7.3 — recomputes the unique-reporter count for this (target, reason)
 * pair on every report create/update and flips `autoHidden` once the
 * threshold is met. Cheap to recompute even on a repeat report from the
 * same reporter (updates their existing doc's `createdAt`, not a new
 * doc — see firestore.rules' deterministic report id): the count of
 * matching docs already equals the unique reporter count, since a
 * reporter can only ever have one doc per (target, reason).
 *
 * Never unsets `autoHidden` — 7.3 requires a moderator to do that
 * manually, and there's no admin panel in this mobile-only pass to do
 * it from (flagged as a follow-up, not implemented here).
 */
export const onReportWritten = onDocumentWritten(
  'reports/{reportId}',
  async event => {
    const after = event.data?.after;
    if (!after?.exists) {
      return;
    }
    const report = after.data() as ReportDoc;

    const matchingReports = await db
      .collection('reports')
      .where('targetId', '==', report.targetId)
      .where('reason', '==', report.reason)
      .get();

    if (!shouldAutoHide(report.reason, matchingReports.size)) {
      return;
    }

    await db
      .collection('users')
      .doc(report.targetId)
      .set(
        { autoHidden: true, autoHiddenAt: FieldValue.serverTimestamp() },
        { merge: true },
      );

    // Worth surfacing in logs even though it's not an error path: this is
    // the one moderation event with no admin panel to observe it from yet.
    logger.warn('onReportWritten: user auto-hidden', {
      targetId: report.targetId,
      reason: report.reason,
      uniqueReporterCount: matchingReports.size,
    });
  },
);
