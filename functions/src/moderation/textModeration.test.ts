import { containsProfanity } from './textModeration';

describe('containsProfanity', () => {
  it('passes ordinary bio text', () => {
    expect(containsProfanity('I love hiking and coffee shops.')).toBe(false);
  });

  it('flags an obvious profanity', () => {
    expect(containsProfanity('fuck you')).toBe(true);
  });
});
