import {
  friendshipNotificationFor,
  shouldNotifyAboutMessage,
} from './notificationRules';

describe('shouldNotifyAboutMessage', () => {
  const base = { senderId: 'a', recipientId: 'b', chatId: 'a_b' };

  it('notifies a recipient who is elsewhere in the app', () => {
    expect(
      shouldNotifyAboutMessage({ ...base, recipientActiveChatId: null }),
    ).toBe(true);
  });

  it('notifies a recipient sitting in a different chat', () => {
    expect(
      shouldNotifyAboutMessage({ ...base, recipientActiveChatId: 'b_c' }),
    ).toBe(true);
  });

  // 10 — they are already looking at the message.
  it('stays quiet when the recipient has this chat open', () => {
    expect(
      shouldNotifyAboutMessage({ ...base, recipientActiveChatId: 'a_b' }),
    ).toBe(false);
  });

  it('never notifies the sender about their own message', () => {
    expect(shouldNotifyAboutMessage({ ...base, recipientId: 'a' })).toBe(false);
  });
});

describe('friendshipNotificationFor', () => {
  it('announces a new pending request', () => {
    expect(friendshipNotificationFor(undefined, { status: 'pending' })).toBe(
      'friend_request',
    );
  });

  // 5.1 — a friendship born from a match starts accepted, and both sides
  // already got the match push.
  it('stays quiet for a friendship created from a match', () => {
    expect(
      friendshipNotificationFor(undefined, {
        status: 'accepted',
        addedVia: 'match',
      }),
    ).toBeNull();
  });

  it('announces an accepted request', () => {
    expect(
      friendshipNotificationFor({ status: 'pending' }, { status: 'accepted' }),
    ).toBe('friend_request_accepted');
  });

  it('stays quiet for a declined request', () => {
    expect(
      friendshipNotificationFor({ status: 'pending' }, { status: 'declined' }),
    ).toBeNull();
  });

  it('stays quiet when the friendship is deleted', () => {
    expect(
      friendshipNotificationFor({ status: 'accepted' }, undefined),
    ).toBeNull();
  });
});
