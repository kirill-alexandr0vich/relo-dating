import { renderHook } from 'shared/lib/testing/renderHook';
import { useDeleteAccount } from './useDeleteAccount';

const mockSignOut = jest.fn(() => Promise.resolve());

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({ signOut: mockSignOut })),
}));

jest.mock('../api/deleteAccountApi', () => ({
  requestAccountDeletion: jest.fn(() => Promise.resolve()),
}));

const { requestAccountDeletion } = jest.requireMock(
  '../api/deleteAccountApi',
) as { requestAccountDeletion: jest.Mock };

describe('useDeleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the account, then clears the local session', async () => {
    const hook = await renderHook(() => useDeleteAccount());

    await hook.act(() => hook.current.deleteAccount());

    expect(requestAccountDeletion).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(hook.current.isDeleting).toBe(false);
  });

  it('keeps the session when deletion fails, so it can be retried', async () => {
    requestAccountDeletion.mockRejectedValueOnce(new Error('network'));
    const hook = await renderHook(() => useDeleteAccount());

    await hook.act(async () => {
      await expect(hook.current.deleteAccount()).rejects.toThrow('network');
    });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(hook.current.isDeleting).toBe(false);
  });

  it('ignores a second press while the first one is still running', async () => {
    const hook = await renderHook(() => useDeleteAccount());

    await hook.act(() =>
      Promise.all([hook.current.deleteAccount(), hook.current.deleteAccount()]),
    );

    expect(requestAccountDeletion).toHaveBeenCalledTimes(1);
  });
});
