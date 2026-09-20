import { renderHook } from 'shared/lib/testing/renderHook';
import { useChatVoiceRecorder } from './useChatVoiceRecorder';

const mockRecorder = {
  startRecorder: jest.fn(() => Promise.resolve('file:///tmp/voice.m4a')),
  stopRecorder: jest.fn(() => Promise.resolve('file:///tmp/voice.m4a')),
  addRecordBackListener: jest.fn(),
  removeRecordBackListener: jest.fn(),
};

jest.mock('react-native-audio-recorder-player', () => ({
  __esModule: true,
  default: jest.fn(() => mockRecorder),
}));

jest.mock('entities/chat', () => ({
  uploadToPendingChatStorage: jest.fn(() =>
    Promise.resolve('chats/a_b/pending/a/1.m4a'),
  ),
  sendChatVoice: jest.fn(() => Promise.resolve('chats/a_b/media/1.m4a')),
}));

const { uploadToPendingChatStorage, sendChatVoice } = jest.requireMock(
  'entities/chat',
) as {
  uploadToPendingChatStorage: jest.Mock;
  sendChatVoice: jest.Mock;
};

/** Drives the recorder's progress callback, like the native module would. */
function emitProgress(milliseconds: number) {
  const listener = mockRecorder.addRecordBackListener.mock.calls.at(-1)?.[0];
  listener?.({ currentPosition: milliseconds });
}

describe('useChatVoiceRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads and sends a recording with its measured duration', async () => {
    const hook = await renderHook(() => useChatVoiceRecorder('a_b', 'a'));

    await hook.act(() => hook.current.startRecording());
    await hook.act(() => emitProgress(3000));
    await hook.act(() => hook.current.stopAndSendRecording());

    expect(uploadToPendingChatStorage).toHaveBeenCalledWith(
      'a_b',
      'a',
      'file:///tmp/voice.m4a',
      'm4a',
    );
    expect(sendChatVoice).toHaveBeenCalledWith(
      'a_b',
      'chats/a_b/pending/a/1.m4a',
      3,
    );
    expect(hook.current.isRecording).toBe(false);
  });

  it('discards a recording shorter than a second instead of sending it', async () => {
    const hook = await renderHook(() => useChatVoiceRecorder('a_b', 'a'));

    await hook.act(() => hook.current.startRecording());
    await hook.act(() => emitProgress(400));
    await hook.act(() => hook.current.stopAndSendRecording());

    expect(sendChatVoice).not.toHaveBeenCalled();
    expect(hook.current.isRecording).toBe(false);
  });

  it('cancelling does not send anything', async () => {
    const hook = await renderHook(() => useChatVoiceRecorder('a_b', 'a'));

    await hook.act(() => hook.current.startRecording());
    await hook.act(() => emitProgress(5000));
    await hook.act(() => hook.current.cancelRecording());

    expect(mockRecorder.stopRecorder).toHaveBeenCalledTimes(1);
    expect(sendChatVoice).not.toHaveBeenCalled();
    expect(hook.current.elapsedSeconds).toBe(0);
  });

  it('a double tap on cancel + send only stops the recorder once', async () => {
    const hook = await renderHook(() => useChatVoiceRecorder('a_b', 'a'));

    await hook.act(() => hook.current.startRecording());
    await hook.act(() => emitProgress(5000));
    await hook.act(() =>
      Promise.all([
        hook.current.cancelRecording(),
        hook.current.stopAndSendRecording(),
      ]),
    );

    expect(mockRecorder.stopRecorder).toHaveBeenCalledTimes(1);
  });

  it('releases the microphone when the chat screen unmounts', async () => {
    const hook = await renderHook(() => useChatVoiceRecorder('a_b', 'a'));

    await hook.act(() => hook.current.startRecording());
    await hook.unmount();

    expect(mockRecorder.stopRecorder).toHaveBeenCalled();
    expect(mockRecorder.removeRecordBackListener).toHaveBeenCalled();
  });

  it('auto-stops a recording that hits the maximum length', async () => {
    const hook = await renderHook(() => useChatVoiceRecorder('a_b', 'a'));

    await hook.act(() => hook.current.startRecording());
    await hook.act(() => emitProgress(300_000));

    expect(mockRecorder.stopRecorder).toHaveBeenCalledTimes(1);
    expect(sendChatVoice).toHaveBeenCalled();
    expect(hook.current.isRecording).toBe(false);
  });
});
