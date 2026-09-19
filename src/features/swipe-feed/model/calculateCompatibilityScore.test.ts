import { calculateCompatibilityScore } from './calculateCompatibilityScore';

describe('calculateCompatibilityScore', () => {
  it('is 0 when nothing matches', () => {
    expect(
      calculateCompatibilityScore(
        { country: 'GE', nativeLanguage: 'ru', interests: [] },
        { country: 'US', nativeLanguage: 'en', interests: [] },
      ),
    ).toBe(0);
  });

  it('gives 40 for a country match alone', () => {
    expect(
      calculateCompatibilityScore(
        { country: 'GE', nativeLanguage: 'ru' },
        { country: 'GE', nativeLanguage: 'en' },
      ),
    ).toBe(40);
  });

  it('gives 30 for a native language match alone', () => {
    expect(
      calculateCompatibilityScore(
        { country: 'GE', nativeLanguage: 'ru' },
        { country: 'US', nativeLanguage: 'ru' },
      ),
    ).toBe(30);
  });

  it('caps the interests contribution at 3 shared tags (30 points)', () => {
    expect(
      calculateCompatibilityScore(
        { interests: ['travel', 'coffee', 'music', 'books'] },
        { interests: ['travel', 'coffee', 'music', 'wine'] },
      ),
    ).toBe(30);
  });

  it('is not an error for missing interests on either side (scores 0 for that part)', () => {
    expect(
      calculateCompatibilityScore(
        { country: 'GE', nativeLanguage: 'ru', interests: undefined },
        { country: 'GE', nativeLanguage: 'ru', interests: ['travel'] },
      ),
    ).toBe(70);
  });

  it('adds up all three parts and rounds to the nearest percent', () => {
    // 40 (country) + 30 (language) + 1/3 * 30 = 80 -> rounds to 80
    expect(
      calculateCompatibilityScore(
        { country: 'GE', nativeLanguage: 'ru', interests: ['travel'] },
        {
          country: 'GE',
          nativeLanguage: 'ru',
          interests: ['travel', 'coffee'],
        },
      ),
    ).toBe(80);
  });
});
