import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { sendChatVoice, uploadToPendingChatStorage } from 'entities/chat';

async function hasMicPermission(): Promise<boolean> {
  // iOS prompts automatically from NSMicrophoneUsageDescription on first
  // record attempt; Android needs an explicit runtime request.
  if (Platform.OS !== 'android') {
    return true;
  }
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// Matches the server schema's cap (functions/src/chat/schema.ts) — the
// TZ sets no explicit voice-message length limit, so this just guards
// against a forgotten recording running indefinitely.
const MAX_DURATION_SECONDS = 300;
const MIN_DURATION_SECONDS = 1;

interface UseChatVoiceRecorderResult {
  isRecording: boolean;
  isSending: boolean;
  elapsedSeconds: number;
  startRecording: () => Promise<void>;
  /** Discards the recording without sending (e.g. slide-to-cancel). */
  cancelRecording: () => Promise<void>;
  stopAndSendRecording: () => Promise<void>;
}

/** 6.1/6.3 — records, then uploads and sends. No automated moderation for voice — see functions/src/chat/sendChatMedia's doc comment. */
export function useChatVoiceRecorder(
  chatId: string,
  uid: string,
): UseChatVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recorderRef = useRef<AudioRecorderPlayer | null>(null);
  // Guards cancelRecording/stopAndSendRecording against both firing on a
  // near-simultaneous double-tap of two different buttons — both would
  // otherwise read the same stale `isRecording` closure and both try to
  // stop an already-stopping recorder.
  const isStoppingRef = useRef(false);
  const stopAndSendRecordingRef = useRef<() => Promise<void>>(async () => {});

  function getRecorder(): AudioRecorderPlayer {
    if (!recorderRef.current) {
      recorderRef.current = new AudioRecorderPlayer();
    }
    return recorderRef.current;
  }

  const startRecording = useCallback(async () => {
    if (!(await hasMicPermission())) {
      throw new Error('mic_permission_denied');
    }
    const recorder = getRecorder();
    setElapsedSeconds(0);
    await recorder.startRecorder();
    recorder.addRecordBackListener(meta => {
      const seconds = Math.floor(meta.currentPosition / 1000);
      setElapsedSeconds(seconds);
      if (seconds >= MAX_DURATION_SECONDS) {
        // Route the auto-stop through the same stop+send path a manual
        // tap would use, rather than calling recorder.stopRecorder()
        // directly here — that would desync isRecording from the
        // native recorder's actual state and leave the UI stuck.
        stopAndSendRecordingRef.current();
      }
    });
    setIsRecording(true);
  }, []);

  const cancelRecording = useCallback(async () => {
    if (!isRecording || isStoppingRef.current) {
      return;
    }
    isStoppingRef.current = true;
    try {
      const recorder = getRecorder();
      await recorder.stopRecorder();
      recorder.removeRecordBackListener();
      setIsRecording(false);
      setElapsedSeconds(0);
    } finally {
      isStoppingRef.current = false;
    }
  }, [isRecording]);

  const stopAndSendRecording = useCallback(async () => {
    if (!isRecording || isStoppingRef.current) {
      return;
    }
    isStoppingRef.current = true;
    try {
      const recorder = getRecorder();
      const uri = await recorder.stopRecorder();
      recorder.removeRecordBackListener();
      setIsRecording(false);
      const durationSeconds = elapsedSeconds;
      setElapsedSeconds(0);

      if (durationSeconds < MIN_DURATION_SECONDS) {
        // The recording is discarded; its temp file lives in the OS
        // cache/temp directory (default when no explicit uri is passed
        // to startRecorder), which the OS reclaims on its own — not
        // worth a new filesystem dependency just to unlink it eagerly.
        return;
      }

      setIsSending(true);
      try {
        const pendingPath = await uploadToPendingChatStorage(
          chatId,
          uid,
          uri,
          'm4a',
        );
        await sendChatVoice(chatId, pendingPath, durationSeconds);
      } finally {
        setIsSending(false);
      }
    } finally {
      isStoppingRef.current = false;
    }
  }, [chatId, uid, isRecording, elapsedSeconds]);

  useEffect(() => {
    stopAndSendRecordingRef.current = stopAndSendRecording;
  }, [stopAndSendRecording]);

  useEffect(() => {
    // Leaving the chat mid-recording must not leave the microphone
    // running with no UI left to stop it.
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stopRecorder().catch(() => {});
        recorderRef.current.removeRecordBackListener();
      }
    };
  }, []);

  return {
    isRecording,
    isSending,
    elapsedSeconds,
    startRecording,
    cancelRecording,
    stopAndSendRecording,
  };
}
