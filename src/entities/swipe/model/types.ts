export type SwipeAction = 'like' | 'dislike';

export interface Swipe {
  id: string;
  swiperId: string;
  targetId: string;
  action: SwipeAction;
  createdAt: number;
}
