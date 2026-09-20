import {
  buildChatId,
  getOtherParticipant,
  isChatUnread,
  isParticipantDeleted,
} from './types';

function timestamp(millis: number) {
  return { toMillis: () => millis } as never;
}

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

describe('isParticipantDeleted', () => {
  it('is false for a chat where nobody left', () => {
    expect(isParticipantDeleted({}, 'a')).toBe(false);
  });

  it('is true only for the participant who deleted their account', () => {
    const chat = { deletedParticipantIds: ['b'] };
    expect(isParticipantDeleted(chat, 'b')).toBe(true);
    expect(isParticipantDeleted(chat, 'a')).toBe(false);
  });
});

describe('isChatUnread', () => {
  it('is false when the chat has no messages yet', () => {
    expect(isChatUnread({}, 'a')).toBe(false);
  });

  it('is true when I have never read this chat', () => {
    expect(
      isChatUnread({ lastMessageAt: timestamp(100), readBy: {} }, 'a'),
    ).toBe(true);
  });

  it('is true when the last message is newer than my read stamp', () => {
    expect(
      isChatUnread(
        { lastMessageAt: timestamp(200), readBy: { a: timestamp(100) } },
        'a',
      ),
    ).toBe(true);
  });

  it("is false when I have read up to (or past) the last message — this is what makes the sender's own chat never show as unread, since sending stamps their readBy too", () => {
    expect(
      isChatUnread(
        { lastMessageAt: timestamp(100), readBy: { a: timestamp(100) } },
        'a',
      ),
    ).toBe(false);
  });
});
