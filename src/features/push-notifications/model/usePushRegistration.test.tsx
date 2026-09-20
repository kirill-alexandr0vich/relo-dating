import { renderHook } from 'shared/lib/testing/renderHook';
import { usePushRegistration } from './usePushRegistration';

type TokenRefreshListener = (token: string) => void;

const mockMessaging = {
  requestPermission: jest.fn<Promise<number>, []>(() => Promise.resolve(1)),
  getToken: jest.fn<Promise<string>, []>(() => Promise.resolve('device-token')),
  onTokenRefresh: jest.fn<() => void, [TokenRefreshListener]>(() => jest.fn()),
};

jest.mock('@react-native-firebase/messaging', () => {
  const messaging = Object.assign(
    jest.fn(() => mockMessaging),
    {
      AuthorizationStatus: {
        NOT_DETERMINED: -1,
        DENIED: 0,
        AUTHORIZED: 1,
        PROVISIONAL: 2,
      },
    },
  );
  return { __esModule: true, default: messaging };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'ru' } }),
}));

const mockStoreState = { record: { uid: 'me' } as { uid: string } | null };

jest.mock('entities/user', () => ({
  useUserStore: (selector: (state: typeof mockStoreState) => unknown) =>
    selector(mockStoreState),
  saveDeviceToken: jest.fn(() => Promise.resolve()),
  saveInterfaceLanguage: jest.fn(() => Promise.resolve()),
}));

const { saveDeviceToken, saveInterfaceLanguage } = jest.requireMock(
  'entities/user',
) as {
  saveDeviceToken: jest.Mock;
  saveInterfaceLanguage: jest.Mock;
};

describe('usePushRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.record = { uid: 'me' };
    mockMessaging.requestPermission.mockResolvedValue(1);
  });

  it('stores the device token and the interface language', async () => {
    const hook = await renderHook(() => usePushRegistration());
    await hook.waitForUpdate();

    expect(saveDeviceToken).toHaveBeenCalledWith('me', 'device-token');
    expect(saveInterfaceLanguage).toHaveBeenCalledWith('me', 'ru');
  });

  // A declined permission is an ordinary outcome, not an error: the app
  // keeps working, the account simply has no tokens to send to.
  it('registers no token when the permission is declined', async () => {
    mockMessaging.requestPermission.mockResolvedValue(0);

    const hook = await renderHook(() => usePushRegistration());
    await hook.waitForUpdate();

    expect(mockMessaging.getToken).not.toHaveBeenCalled();
    expect(saveDeviceToken).not.toHaveBeenCalled();
  });

  it('does nothing at all until someone is signed in', async () => {
    mockStoreState.record = null;

    const hook = await renderHook(() => usePushRegistration());
    await hook.waitForUpdate();

    expect(mockMessaging.requestPermission).not.toHaveBeenCalled();
    expect(saveInterfaceLanguage).not.toHaveBeenCalled();
  });

  it('saves a rotated token so delivery does not silently stop', async () => {
    const hook = await renderHook(() => usePushRegistration());
    await hook.waitForUpdate();

    const onRefresh = mockMessaging.onTokenRefresh.mock.calls[0][0];
    await hook.act(() => onRefresh('rotated-token'));

    expect(saveDeviceToken).toHaveBeenCalledWith('me', 'rotated-token');
  });

  it('stops listening for token refreshes when unmounted', async () => {
    const unsubscribe = jest.fn();
    mockMessaging.onTokenRefresh.mockReturnValueOnce(unsubscribe);

    const hook = await renderHook(() => usePushRegistration());
    await hook.unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
