export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'fake_profile'
  | 'inappropriate_content'
  | 'underage'
  | 'other';

// 7.3 — "несовершеннолетний" и "неприемлемый контент" auto-hide at 1
// report; everything else needs 5 unique reporters.
const CRITICAL_REASONS: ReportReason[] = ['underage', 'inappropriate_content'];
const CRITICAL_THRESHOLD = 1;
const STANDARD_THRESHOLD = 5;

export function getAutoHideThreshold(reason: ReportReason): number {
  return CRITICAL_REASONS.includes(reason)
    ? CRITICAL_THRESHOLD
    : STANDARD_THRESHOLD;
}

export function shouldAutoHide(
  reason: ReportReason,
  uniqueReporterCount: number,
): boolean {
  return uniqueReporterCount >= getAutoHideThreshold(reason);
}
