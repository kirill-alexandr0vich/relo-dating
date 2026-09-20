/** Minimum horizontal travel before a drag counts as a swipe rather than a tap. */
const MIN_HORIZONTAL_TRAVEL = 8;
/** Fraction of the action strip the finger must cross for the row to snap to the other state. */
const ACTIVATION_RATIO = 0.4;

/**
 * A row lives inside a vertically scrolling list, so it may only take
 * over a gesture that is clearly sideways — otherwise every attempt to
 * scroll the list would catch on a row.
 */
export function isHorizontalSwipe(dx: number, dy: number): boolean {
  return Math.abs(dx) > MIN_HORIZONTAL_TRAVEL && Math.abs(dx) > Math.abs(dy);
}

/**
 * Where the row sits mid-drag. Actions live to the right of the row, so
 * the row itself only ever moves left: offsets run from 0 (closed) to
 * `-revealWidth` (fully open), and pulling further in either direction
 * does nothing rather than dragging the row off its track.
 */
export function clampOffset(
  dx: number,
  isOpen: boolean,
  revealWidth: number,
): number {
  const base = isOpen ? -revealWidth : 0;
  return Math.min(0, Math.max(-revealWidth, base + dx));
}

/** Where the row settles once the finger lifts: fully open or fully closed, never halfway. */
export function resolveRestOffset(
  dx: number,
  isOpen: boolean,
  revealWidth: number,
): number {
  const threshold = revealWidth * ACTIVATION_RATIO;
  if (isOpen) {
    return dx > threshold ? 0 : -revealWidth;
  }
  return dx < -threshold ? -revealWidth : 0;
}
