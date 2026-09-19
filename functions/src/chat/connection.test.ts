import { evaluateConnection, type ConnectionInput } from './connection';

const base: ConnectionInput = {
  hasMatch: false,
  friendStatus: null,
  selfBlockedOther: false,
  otherBlockedSelf: false,
  selfAllowsFriendMessages: true,
  otherAllowsFriendMessages: true,
};

describe('evaluateConnection', () => {
  it('allows messaging on a match regardless of anything else', () => {
    expect(evaluateConnection({ ...base, hasMatch: true })).toEqual({
      canSend: true,
    });
  });

  it('allows messaging between accepted friends when both allow it', () => {
    expect(evaluateConnection({ ...base, friendStatus: 'accepted' })).toEqual({
      canSend: true,
    });
  });

  it('rejects a pending friend request (not yet accepted)', () => {
    expect(evaluateConnection({ ...base, friendStatus: 'pending' })).toEqual({
      canSend: false,
      reason: 'not_connected',
    });
  });

  it('rejects two strangers with neither a match nor a friendship', () => {
    expect(evaluateConnection(base)).toEqual({
      canSend: false,
      reason: 'not_connected',
    });
  });

  it('goes read-only when the recipient turned off friend-without-match messages', () => {
    expect(
      evaluateConnection({
        ...base,
        friendStatus: 'accepted',
        otherAllowsFriendMessages: false,
      }),
    ).toEqual({ canSend: false, reason: 'friend_messages_disabled' });
  });

  it('goes read-only when the sender turned off friend-without-match messages', () => {
    expect(
      evaluateConnection({
        ...base,
        friendStatus: 'accepted',
        selfAllowsFriendMessages: false,
      }),
    ).toEqual({ canSend: false, reason: 'friend_messages_disabled' });
  });

  it('blocking wins even over an existing match', () => {
    expect(
      evaluateConnection({ ...base, hasMatch: true, selfBlockedOther: true }),
    ).toEqual({
      canSend: false,
      reason: 'blocked',
    });
    expect(
      evaluateConnection({ ...base, hasMatch: true, otherBlockedSelf: true }),
    ).toEqual({
      canSend: false,
      reason: 'blocked',
    });
  });
});
