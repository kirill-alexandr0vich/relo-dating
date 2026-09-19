import { handleFirebaseError } from './handleFirebaseError';

describe('handleFirebaseError', () => {
  it('maps a known Firebase Auth error code to its translation key', () => {
    const result = handleFirebaseError({ code: 'auth/wrong-password' });
    expect(result).toEqual({
      code: 'auth/wrong-password',
      translationKey: 'wrong_password',
      raw: { code: 'auth/wrong-password' },
    });
  });

  it('falls back to the unknown_error key for an unmapped code', () => {
    const result = handleFirebaseError({ code: 'auth/some-new-error' });
    expect(result.translationKey).toBe('unknown_error');
  });

  it('falls back gracefully when the thrown value has no code at all', () => {
    const result = handleFirebaseError(new Error('boom'));
    expect(result.code).toBe('unknown');
    expect(result.translationKey).toBe('unknown_error');
  });
});
