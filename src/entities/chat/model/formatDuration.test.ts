import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it('pads seconds under 10', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('handles a duration under a minute', () => {
    expect(formatDuration(42)).toBe('0:42');
  });
});
