import { getAutoHideThreshold, shouldAutoHide } from './autoHideThresholds';

describe('getAutoHideThreshold', () => {
  it('is 1 for underage', () => {
    expect(getAutoHideThreshold('underage')).toBe(1);
  });

  it('is 1 for inappropriate_content', () => {
    expect(getAutoHideThreshold('inappropriate_content')).toBe(1);
  });

  it('is 5 for every other reason', () => {
    expect(getAutoHideThreshold('spam')).toBe(5);
    expect(getAutoHideThreshold('harassment')).toBe(5);
    expect(getAutoHideThreshold('fake_profile')).toBe(5);
    expect(getAutoHideThreshold('other')).toBe(5);
  });
});

describe('shouldAutoHide', () => {
  it('hides after a single critical report', () => {
    expect(shouldAutoHide('underage', 1)).toBe(true);
  });

  it('does not hide a non-critical reason below 5 reports', () => {
    expect(shouldAutoHide('spam', 4)).toBe(false);
  });

  it('hides a non-critical reason at exactly 5 reports', () => {
    expect(shouldAutoHide('spam', 5)).toBe(true);
  });
});
