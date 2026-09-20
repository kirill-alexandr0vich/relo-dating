import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { callableOptions } from '../shared/callableOptions';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import { containsProfanity } from './textModeration';
import { submitProfileTextInputSchema } from './schema';

const FIELD_LENGTH_LIMITS: Record<
  'name' | 'bio',
  { min: number; max: number }
> = {
  name: { min: 2, max: 30 },
  bio: { min: 0, max: 500 },
};

/**
 * 7.2 — "имя" and "о себе" go through moderation before being saved, so
 * both fields are blocked from direct client writes in firestore.rules;
 * this callable is the only way to set them.
 */
export const submitProfileText = onCall(callableOptions(), async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  const parsed = submitProfileTextInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError('invalid-argument', 'Invalid payload.');
  }
  const { field, value } = parsed.data;

  const limits = FIELD_LENGTH_LIMITS[field];
  if (value.length < limits.min || value.length > limits.max) {
    throw new HttpsError('invalid-argument', 'Value length out of range.');
  }

  if (containsProfanity(value)) {
    logger.warn('submitProfileText: rejected by profanity filter', {
      uid,
      field,
    });
    throw new HttpsError('failed-precondition', 'moderation_rejected');
  }

  await db
    .collection('users')
    .doc(uid)
    .set({ [field]: value }, { merge: true });

  return { field, value };
});
