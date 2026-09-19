import firestore from '@react-native-firebase/firestore';
import type { ReportReason } from '../model/types';

/** 7.3 — one report per (reporter, target, reason); id matches firestore.rules' check exactly. */
function buildReportId(
  reporterId: string,
  targetId: string,
  reason: ReportReason,
): string {
  return `${reporterId}_${targetId}_${reason}`;
}

export async function submitReport(
  reporterId: string,
  targetId: string,
  reason: ReportReason,
  options: { comment?: string; contentSnapshot?: string } = {},
): Promise<void> {
  const ref = firestore()
    .collection('reports')
    .doc(buildReportId(reporterId, targetId, reason));
  await ref.set(
    {
      reporterId,
      targetId,
      reason,
      status: 'pending',
      createdAt: firestore.FieldValue.serverTimestamp(),
      ...(options.comment ? { comment: options.comment } : {}),
      ...(options.contentSnapshot
        ? { contentSnapshot: options.contentSnapshot }
        : {}),
    },
    { merge: true },
  );
}
