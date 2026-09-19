import { z } from 'zod';

export const recordSwipeInputSchema = z.object({
  targetId: z.string().min(1),
  action: z.enum(['like', 'dislike']),
});

export type RecordSwipeInput = z.infer<typeof recordSwipeInputSchema>;
