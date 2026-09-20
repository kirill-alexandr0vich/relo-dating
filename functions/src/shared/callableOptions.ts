import type { CallableOptions } from 'firebase-functions/v2/https';

/**
 * 14.2 — "App Check включён для мобильного клиента — Cloud Functions
 * принимают вызовы только от настоящего приложения".
 *
 * Enforcement is a deploy-time switch rather than a hardcoded `true`
 * because turning it on before the app is registered in the Firebase
 * console rejects every call from the real app too. Set
 * `ENFORCE_APP_CHECK=true` in `functions/.env` (see `.env.example`) once
 * the console side is done, then redeploy.
 */
export function isAppCheckEnforced(): boolean {
  return process.env.ENFORCE_APP_CHECK === 'true';
}

/** Shared options for every callable, so App Check can't be forgotten on a new one. */
export function callableOptions(extra: CallableOptions = {}): CallableOptions {
  return { enforceAppCheck: isAppCheckEnforced(), ...extra };
}
