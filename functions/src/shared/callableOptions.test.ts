import { callableOptions, isAppCheckEnforced } from './callableOptions';

describe('App Check enforcement switch', () => {
  const original = process.env.ENFORCE_APP_CHECK;

  afterEach(() => {
    process.env.ENFORCE_APP_CHECK = original;
  });

  // Defaulting to on would reject every call from the real app until the
  // console side is configured — see .env.example.
  it('is off unless explicitly enabled', () => {
    delete process.env.ENFORCE_APP_CHECK;
    expect(isAppCheckEnforced()).toBe(false);

    process.env.ENFORCE_APP_CHECK = 'false';
    expect(isAppCheckEnforced()).toBe(false);
  });

  it('is on when the deploy sets it', () => {
    process.env.ENFORCE_APP_CHECK = 'true';
    expect(callableOptions().enforceAppCheck).toBe(true);
  });

  it('keeps per-function options alongside it', () => {
    process.env.ENFORCE_APP_CHECK = 'true';
    expect(callableOptions({ timeoutSeconds: 300 })).toEqual({
      enforceAppCheck: true,
      timeoutSeconds: 300,
    });
  });
});
