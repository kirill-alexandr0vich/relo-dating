import { z } from 'zod';

export const sendMessageInputSchema = z.object({
  chatId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export const blockUserInputSchema = z.object({
  targetUid: z.string().min(1),
});
