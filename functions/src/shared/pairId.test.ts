import { buildPairId } from './pairId';

describe('buildPairId', () => {
  it('is independent of argument order', () => {
    expect(buildPairId('uidA', 'uidB')).toBe(buildPairId('uidB', 'uidA'));
  });

  it('joins the sorted uids with an underscore', () => {
    expect(buildPairId('uid2', 'uid1')).toBe('uid1_uid2');
  });
});
