import { buildChatId, getOtherParticipant } from './types';

describe('buildChatId', () => {
  it('is independent of argument order', () => {
    expect(buildChatId('a', 'b')).toBe(buildChatId('b', 'a'));
  });
});

describe('getOtherParticipant', () => {
  it('returns whichever participant is not me', () => {
    expect(getOtherParticipant({ participantIds: ['a', 'b'] }, 'a')).toBe('b');
  });
});
