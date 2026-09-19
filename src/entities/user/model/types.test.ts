import { isRegistrationComplete, type UserRecord } from './types';

function makeRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    uid: 'uid-1',
    avatarUrls: [],
    allowFriendMessagesWithoutMatch: true,
    ageConfirmed18: true,
    createdAt: 0,
    lastActiveAt: 0,
    blockedUserIds: [],
    ...overrides,
  };
}

describe('isRegistrationComplete', () => {
  it('is false right after sign-up, before any required field is filled in', () => {
    expect(isRegistrationComplete(makeRecord())).toBe(false);
  });

  it('is false when only some required fields are present', () => {
    expect(
      isRegistrationComplete(makeRecord({ name: 'Ana', country: 'GE' })),
    ).toBe(false);
  });

  it('is false when required fields are set but the 18+ checkbox was not confirmed', () => {
    expect(
      isRegistrationComplete(
        makeRecord({
          name: 'Ana',
          country: 'GE',
          nativeLanguage: 'ka',
          ageConfirmed18: false,
        }),
      ),
    ).toBe(false);
  });

  it('is true once name, country, native language and age confirmation are all set', () => {
    expect(
      isRegistrationComplete(
        makeRecord({ name: 'Ana', country: 'GE', nativeLanguage: 'ka' }),
      ),
    ).toBe(true);
  });
});
