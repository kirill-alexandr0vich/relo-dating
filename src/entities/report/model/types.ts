export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'fake_profile'
  | 'inappropriate_content'
  | 'underage'
  | 'other';

export const REPORT_REASONS: ReportReason[] = [
  'spam',
  'harassment',
  'fake_profile',
  'inappropriate_content',
  'underage',
  'other',
];

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  reason: ReportReason;
  comment?: string;
  contentSnapshot?: string;
  status: 'pending' | 'resolved_dismissed' | 'resolved_banned';
  createdAt: number;
}
