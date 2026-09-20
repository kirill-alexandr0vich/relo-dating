import { z } from 'zod';

const feedFiltersSchema = z.object({
  mode: z.enum(['country', 'language', 'both']),
  ageMin: z.number().int().min(18).max(120).nullable(),
  ageMax: z.number().int().min(18).max(120).nullable(),
  interestTags: z.array(z.string().min(1).max(64)).max(36),
  onlyVerified: z.boolean(),
});

/**
 * Opaque to the client — it only ever echoes back what a previous call
 * returned. Validated anyway (14.2 — never trust client data): the worst
 * a forged cursor can do is re-order the caller's own feed, but it must
 * still be a number in `sortKey`'s range or the range query is nonsense.
 */
const feedCursorSchema = z.object({
  origin: z.number().min(0).max(1),
  /** Last `sortKey` already scanned; `null` means "from the start of the range". */
  sortKey: z.number().min(0).max(1).nullable(),
  wrapped: z.boolean(),
});

export const fetchSwipeCandidatesInputSchema = z.object({
  filters: feedFiltersSchema,
  cursor: feedCursorSchema.nullable(),
});

export const lookupUserByUsernameInputSchema = z.object({
  username: z.string().min(3).max(20),
});

export type FeedCursor = z.infer<typeof feedCursorSchema>;
