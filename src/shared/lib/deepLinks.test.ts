import { buildAddFriendDeepLink, parseAddFriendDeepLink } from './deepLinks';

describe('add-friend deep link', () => {
  it('round-trips a uid through build and parse', () => {
    expect(parseAddFriendDeepLink(buildAddFriendDeepLink('uid123'))).toBe(
      'uid123',
    );
  });

  it('returns null for an unrelated url', () => {
    expect(parseAddFriendDeepLink('https://example.com/whatever')).toBeNull();
  });

  it('ignores trailing query params or fragments', () => {
    expect(
      parseAddFriendDeepLink('relocantapp://addfriend/uid123?ref=share'),
    ).toBe('uid123');
  });
});
