import { buildMatchId } from './onSwipeCreated';

describe('buildMatchId', () => {
  it('is independent of argument order', () => {
    expect(buildMatchId('uidA', 'uidB')).toBe(buildMatchId('uidB', 'uidA'));
  });

  it('joins the sorted uids with an underscore', () => {
    expect(buildMatchId('uid2', 'uid1')).toBe('uid1_uid2');
  });
});
