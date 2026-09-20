import {
  clampOffset,
  isHorizontalSwipe,
  resolveRestOffset,
} from './swipeRowGesture';

const REVEAL = 100;

describe('isHorizontalSwipe', () => {
  it('claims a clearly sideways drag', () => {
    expect(isHorizontalSwipe(-40, 5)).toBe(true);
  });

  // The row sits in a scrolling list: taking over a vertical drag would
  // make the list impossible to scroll.
  it('leaves a vertical drag to the list', () => {
    expect(isHorizontalSwipe(-10, 40)).toBe(false);
  });

  it('ignores the jitter of a tap', () => {
    expect(isHorizontalSwipe(-3, 1)).toBe(false);
  });
});

describe('clampOffset', () => {
  it('follows the finger while the row is closed', () => {
    expect(clampOffset(-40, false, REVEAL)).toBe(-40);
  });

  it('will not open past the action strip', () => {
    expect(clampOffset(-400, false, REVEAL)).toBe(-REVEAL);
  });

  it('will not drag a closed row to the right', () => {
    expect(clampOffset(60, false, REVEAL)).toBe(0);
  });

  it('closes from the open position as the finger moves back', () => {
    expect(clampOffset(30, true, REVEAL)).toBe(-70);
    expect(clampOffset(400, true, REVEAL)).toBe(0);
  });
});

describe('resolveRestOffset', () => {
  it('opens once the drag passes the activation point', () => {
    expect(resolveRestOffset(-50, false, REVEAL)).toBe(-REVEAL);
  });

  it('springs back when the drag was too short', () => {
    expect(resolveRestOffset(-20, false, REVEAL)).toBe(0);
  });

  it('closes an open row on a long enough pull back', () => {
    expect(resolveRestOffset(50, true, REVEAL)).toBe(0);
  });

  it('stays open when the pull back was too short', () => {
    expect(resolveRestOffset(20, true, REVEAL)).toBe(-REVEAL);
  });

  it('never rests halfway', () => {
    for (const dx of [-90, -45, -5, 5, 45, 90]) {
      for (const isOpen of [true, false]) {
        expect([0, -REVEAL]).toContain(resolveRestOffset(dx, isOpen, REVEAL));
      }
    }
  });
});
