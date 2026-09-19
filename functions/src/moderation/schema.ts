import { z } from 'zod';

// No `.min()` here: `bio` is allowed to be empty (clearing it is valid —
// see FIELD_LENGTH_LIMITS in submitProfileText.ts, which enforces the
// real per-field bounds, name:2-30 and bio:0-500). `.max(500)` stays as a
// blanket payload-size guard before that per-field check runs.
export const submitProfileTextInputSchema = z.object({
  field: z.enum(['name', 'bio']),
  value: z.string().max(500),
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

export const removeProfilePhotoInputSchema = z.object({
  url: z.string().min(1),
});

export type RemoveProfilePhotoInput = z.infer<
  typeof removeProfilePhotoInputSchema
>;

export const reorderProfilePhotosInputSchema = z.object({
  urls: z.array(z.string().min(1)),
});

export type ReorderProfilePhotosInput = z.infer<
  typeof reorderProfilePhotosInputSchema
>;
