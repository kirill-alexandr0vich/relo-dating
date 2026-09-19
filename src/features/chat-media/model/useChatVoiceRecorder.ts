import { useCallback, useRef, useState } from 'react';
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
        recorder.stopRecorder();
      }
    });
    setIsRecording(true);
  }, []);

  const cancelRecording = useCallback(async () => {
    if (!isRecording) {
      return;
    }
    const recorder = getRecorder();
    await recorder.stopRecorder();
    recorder.removeRecordBackListener();
    setIsRecording(false);
    setElapsedSeconds(0);
  }, [isRecording]);

  const stopAndSendRecording = useCallback(async () => {
    if (!isRecording) {
      return;
    }
    const recorder = getRecorder();
    const uri = await recorder.stopRecorder();
    recorder.removeRecordBackListener();
    setIsRecording(false);
    const durationSeconds = elapsedSeconds;
    setElapsedSeconds(0);

    if (durationSeconds < MIN_DURATION_SECONDS) {
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
  }, [chatId, uid, isRecording, elapsedSeconds]);

  return {
    isRecording,
    isSending,
    elapsedSeconds,
    startRecording,
    cancelRecording,
    stopAndSendRecording,
  };
}
