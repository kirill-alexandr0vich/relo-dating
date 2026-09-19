import { z } from 'zod';

export const submitProfileTextInputSchema = z.object({
  field: z.enum(['name', 'bio']),
  value: z.string().min(1).max(500),
});

export type SubmitProfileTextInput = z.infer<
  typeof submitProfileTextInputSchema
>;

export const submitProfilePhotoInputSchema = z.object({
  pendingPath: z.string().min(1),
});

export type SubmitProfilePhotoInput = z.infer<
  typeof submitProfilePhotoInputSchema
>;
