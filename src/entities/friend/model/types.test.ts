import { getOtherParticipant, isIncomingRequest } from './types';

describe('getOtherParticipant', () => {
  it('returns whichever uid is not me', () => {
    expect(getOtherParticipant({ userIds: ['a', 'b'] }, 'a')).toBe('b');
    expect(getOtherParticipant({ userIds: ['a', 'b'] }, 'b')).toBe('a');
  });
});

describe('isIncomingRequest', () => {
  it('is true for a pending request someone else sent me', () => {
    expect(
      isIncomingRequest({ status: 'pending', requestedBy: 'them' }, 'me'),
    ).toBe(true);
  });

  it('is false for a pending request I sent', () => {
    expect(
      isIncomingRequest({ status: 'pending', requestedBy: 'me' }, 'me'),
    ).toBe(false);
  });

  it('is false once resolved', () => {
    expect(
      isIncomingRequest({ status: 'accepted', requestedBy: 'them' }, 'me'),
    ).toBe(false);
  });
});
