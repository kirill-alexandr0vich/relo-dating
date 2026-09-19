import { getHereSinceOptions } from './hereSinceOptions';

describe('getHereSinceOptions', () => {
  it('starts with the current month and goes backwards', () => {
    const now = new Date('2026-03-15T00:00:00Z');
    const options = getHereSinceOptions('en-US', now);
    expect(options[0].code).toBe('2026-03');
    expect(options[1].code).toBe('2026-02');
  });

  it('rolls over the year boundary', () => {
    const now = new Date('2026-01-15T00:00:00Z');
    const options = getHereSinceOptions('en-US', now);
    expect(options[1].code).toBe('2025-12');
  });

  it('returns 60 distinct months', () => {
    const options = getHereSinceOptions(
      'en-US',
      new Date('2026-03-15T00:00:00Z'),
    );
    expect(options).toHaveLength(60);
    expect(new Set(options.map(option => option.code)).size).toBe(60);
  });
});
