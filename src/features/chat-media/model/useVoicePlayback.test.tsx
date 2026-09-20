import { renderHook } from 'shared/lib/testing/renderHook';
import { useVoicePlayback } from './useVoicePlayback';

const mockPlayer = {
  startPlayer: jest.fn(() => Promise.resolve('')),
  stopPlayer: jest.fn(() => Promise.resolve('')),
  addPlayBackListener: jest.fn(),
  removePlayBackListener: jest.fn(),
};

jest.mock('react-native-audio-recorder-player', () => ({
  __esModule: true,
  default: jest.fn(() => mockPlayer),
}));

jest.mock('entities/chat', () => ({
  resolveChatMediaUrl: jest.fn((path: string) =>
    Promise.resolve(`https://storage.test/${path}`),
  ),
}));

const VOICE_PATH = 'chats/a_b/media/1.m4a';

describe('useVoicePlayback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('plays the participant-only url resolved from the message path', async () => {
    const hook = await renderHook(() => useVoicePlayback());

    await hook.act(() => hook.current.toggle(VOICE_PATH));

    expect(mockPlayer.startPlayer).toHaveBeenCalledWith(
      `https://storage.test/${VOICE_PATH}`,
    );
    expect(hook.current.playingPath).toBe(VOICE_PATH);
  });

  it('stops when the same message is tapped again', async () => {
    const hook = await renderHook(() => useVoicePlayback());

    await hook.act(() => hook.current.toggle(VOICE_PATH));
    await hook.act(() => hook.current.toggle(VOICE_PATH));

    expect(mockPlayer.stopPlayer).toHaveBeenCalledTimes(1);
    expect(mockPlayer.startPlayer).toHaveBeenCalledTimes(1);
    expect(hook.current.playingPath).toBeNull();
  });

  it('switches to another message without leaving the first one playing', async () => {
    const hook = await renderHook(() => useVoicePlayback());
    const otherPath = 'chats/a_b/media/2.m4a';

    await hook.act(() => hook.current.toggle(VOICE_PATH));
    await hook.act(() => hook.current.toggle(otherPath));

    expect(mockPlayer.stopPlayer).toHaveBeenCalledTimes(1);
    expect(hook.current.playingPath).toBe(otherPath);
  });

  it('stops playback when the chat screen unmounts', async () => {
    const hook = await renderHook(() => useVoicePlayback());

    await hook.act(() => hook.current.toggle(VOICE_PATH));
    await hook.unmount();

    expect(mockPlayer.stopPlayer).toHaveBeenCalled();
    expect(mockPlayer.removePlayBackListener).toHaveBeenCalled();
  });
});
