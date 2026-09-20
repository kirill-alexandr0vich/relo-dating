import { AppState } from 'react-native';
import { renderHook } from 'shared/lib/testing/renderHook';
import { useChatPresence } from './useChatPresence';

const mockStoreState = { record: { uid: 'me' } as { uid: string } | null };

jest.mock('entities/user', () => ({
  useUserStore: (selector: (state: typeof mockStoreState) => unknown) =>
    selector(mockStoreState),
  setActiveChatId: jest.fn(() => Promise.resolve()),
}));

const { setActiveChatId } = jest.requireMock('entities/user') as {
  setActiveChatId: jest.Mock;
};

describe('useChatPresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.record = { uid: 'me' };
  });

  it('marks the chat as open while the screen is mounted', async () => {
    await renderHook(() => useChatPresence('a_b'));

    expect(setActiveChatId).toHaveBeenCalledWith('me', 'a_b');
  });

  it('clears the flag when leaving the chat', async () => {
    const hook = await renderHook(() => useChatPresence('a_b'));
    await hook.unmount();

    expect(setActiveChatId).toHaveBeenLastCalledWith('me', null);
  });

  // A chat left open behind a locked screen is not being read — without
  // this, every push from that person would be suppressed.
  it('clears the flag when the app goes to the background', async () => {
    const addEventListener = jest.spyOn(AppState, 'addEventListener');
    await renderHook(() => useChatPresence('a_b'));

    const handler = addEventListener.mock.calls[0][1] as (
      state: string,
    ) => void;
    handler('background');
    expect(setActiveChatId).toHaveBeenLastCalledWith('me', null);

    handler('active');
    expect(setActiveChatId).toHaveBeenLastCalledWith('me', 'a_b');
  });
});
