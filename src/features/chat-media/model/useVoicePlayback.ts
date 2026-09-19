import { useCallback, useRef, useState } from 'react';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

interface UseVoicePlaybackResult {
  /** The url currently playing, or `null` if nothing is. */
  playingUrl: string | null;
  /** Tapping the same url again stops it; tapping a different one switches. */
  toggle: (url: string) => Promise<void>;
}

/** 6.1/6.3 — plays one voice message bubble at a time. */
export function useVoicePlayback(): UseVoicePlaybackResult {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const playerRef = useRef<AudioRecorderPlayer | null>(null);

  function getPlayer(): AudioRecorderPlayer {
    if (!playerRef.current) {
      playerRef.current = new AudioRecorderPlayer();
    }
    return playerRef.current;
  }

  const toggle = useCallback(
    async (url: string) => {
      const player = getPlayer();

      if (playingUrl) {
        await player.stopPlayer();
        player.removePlayBackListener();
        setPlayingUrl(null);
        if (playingUrl === url) {
          return;
        }
      }

      await player.startPlayer(url);
      setPlayingUrl(url);
      player.addPlayBackListener(meta => {
        if (meta.isFinished) {
          player.removePlayBackListener();
          setPlayingUrl(null);
        }
      });
    },
    [playingUrl],
  );

  return { playingUrl, toggle };
}
