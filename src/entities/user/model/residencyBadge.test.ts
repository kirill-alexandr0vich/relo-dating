import { getResidencyBadge } from './residencyBadge';

const now = new Date('2026-07-15T00:00:00Z');

describe('getResidencyBadge', () => {
  it('returns null when hereSince is not set', () => {
    expect(getResidencyBadge(undefined, now)).toBeNull();
  });

  it('returns null for a malformed value', () => {
    expect(getResidencyBadge('not-a-date', now)).toBeNull();
  });

  it('is "newcomer" for under a month of residency', () => {
    expect(getResidencyBadge('2026-07', now)).toBe('newcomer');
  });

  it('has no badge between 1 and 6 months', () => {
    expect(getResidencyBadge('2026-04', now)).toBeNull();
  });

  it('is "oldTimer" at 6 months or more', () => {
    expect(getResidencyBadge('2026-01', now)).toBe('oldTimer');
  });

  it('is "oldTimer" for someone who has lived there for years', () => {
    expect(getResidencyBadge('2020-01', now)).toBe('oldTimer');
  });
});
