import { z } from 'zod';

export const sendMessageInputSchema = z.object({
  chatId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export const blockUserInputSchema = z.object({
  targetUid: z.string().min(1),
});

export const markChatReadInputSchema = z.object({
  chatId: z.string().min(1),
});

// Voice requires durationSeconds (needed for playback UI); image doesn't.
export const sendChatMediaInputSchema = z.discriminatedUnion('type', [
  z.object({
    chatId: z.string().min(1),
    pendingPath: z.string().min(1),
    type: z.literal('image'),
  }),
  z.object({
    chatId: z.string().min(1),
    pendingPath: z.string().min(1),
    type: z.literal('voice'),
    durationSeconds: z.number().positive().max(300),
  }),
]);
