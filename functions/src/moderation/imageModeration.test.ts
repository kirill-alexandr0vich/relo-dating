import { isRejectedBySafeSearch } from './imageModeration';

describe('isRejectedBySafeSearch', () => {
  it('passes a clean image', () => {
    expect(
      isRejectedBySafeSearch({
        adult: 'VERY_UNLIKELY',
        violence: 'UNLIKELY',
        racy: 'POSSIBLE',
      }),
    ).toBe(false);
  });

  it('rejects a likely-adult image', () => {
    expect(isRejectedBySafeSearch({ adult: 'LIKELY' })).toBe(true);
  });

  it('rejects a very-likely-violent image', () => {
    expect(isRejectedBySafeSearch({ violence: 'VERY_LIKELY' })).toBe(true);
  });

  it('treats a missing annotation as safe (defensive default; Vision always returns one when requested)', () => {
    expect(isRejectedBySafeSearch(null)).toBe(false);
    expect(isRejectedBySafeSearch(undefined)).toBe(false);
  });
});
