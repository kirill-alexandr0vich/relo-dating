import { FREE_DAILY_SWIPE_LIMIT, getRemainingSwipes } from './swipeLimits';

const now = new Date('2026-01-15T12:00:00Z').getTime();

describe('getRemainingSwipes', () => {
  it('is unlimited (null) for a premium user', () => {
    expect(
      getRemainingSwipes({ premium: true, swipesUsedToday: 999 }, now),
    ).toBeNull();
  });

  it('is the full limit for a brand-new user with no counter yet', () => {
    expect(getRemainingSwipes({}, now)).toBe(FREE_DAILY_SWIPE_LIMIT);
  });

  it("subtracts today's usage while the reset time is still in the future", () => {
    expect(
      getRemainingSwipes(
        { swipesUsedToday: 12, swipesResetAtMillis: now + 1000 },
        now,
      ),
    ).toBe(FREE_DAILY_SWIPE_LIMIT - 12);
  });

  it('treats the counter as reset once the reset time has passed', () => {
    expect(
      getRemainingSwipes(
        { swipesUsedToday: 20, swipesResetAtMillis: now - 1000 },
        now,
      ),
    ).toBe(FREE_DAILY_SWIPE_LIMIT);
  });

  it('never goes negative', () => {
    expect(
      getRemainingSwipes(
        { swipesUsedToday: 999, swipesResetAtMillis: now + 1000 },
        now,
      ),
    ).toBe(0);
  });
});
