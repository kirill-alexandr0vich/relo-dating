import { getOtherParticipant } from './types';

describe('getOtherParticipant', () => {
  it('returns the second uid when the first is me', () => {
    expect(getOtherParticipant({ userIds: ['a', 'b'] }, 'a')).toBe('b');
  });

  it('returns the first uid when the second is me', () => {
    expect(getOtherParticipant({ userIds: ['a', 'b'] }, 'b')).toBe('a');
  });
});
