import { getNextUtcMidnight, hasSwipeCounterExpired } from './dateUtils';

describe('hasSwipeCounterExpired', () => {
  const now = new Date('2026-01-15T12:00:00Z');

  it('is expired when there is no reset time yet (brand-new user)', () => {
    expect(hasSwipeCounterExpired(undefined, now)).toBe(true);
  });

  it('is expired once the reset time has passed', () => {
    expect(hasSwipeCounterExpired(new Date('2026-01-15T00:00:00Z'), now)).toBe(
      true,
    );
  });

  it('is expired exactly at the reset time (boundary is inclusive)', () => {
    expect(hasSwipeCounterExpired(now, now)).toBe(true);
  });

  it('is not expired while the reset time is still in the future', () => {
    expect(hasSwipeCounterExpired(new Date('2026-01-16T00:00:00Z'), now)).toBe(
      false,
    );
  });
});

describe('getNextUtcMidnight', () => {
  it('rolls over to the next UTC day at 00:00:00', () => {
    expect(
      getNextUtcMidnight(new Date('2026-01-15T12:34:56Z')).toISOString(),
    ).toBe('2026-01-16T00:00:00.000Z');
  });

  it('rolls over the month at a month boundary', () => {
    expect(
      getNextUtcMidnight(new Date('2026-01-31T23:59:59Z')).toISOString(),
    ).toBe('2026-02-01T00:00:00.000Z');
  });

  it('rolls over the year at a year boundary', () => {
    expect(
      getNextUtcMidnight(new Date('2026-12-31T08:00:00Z')).toISOString(),
    ).toBe('2027-01-01T00:00:00.000Z');
  });
});
