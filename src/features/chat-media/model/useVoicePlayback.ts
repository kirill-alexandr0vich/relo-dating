import { useCallback, useEffect, useRef, useState } from 'react';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { resolveChatMediaUrl } from 'entities/chat';

interface UseVoicePlaybackResult {
  /** Storage path of the message currently playing, or `null` if nothing is. */
  playingPath: string | null;
  /** Tapping the same message again stops it; tapping a different one switches. */
  toggle: (path: string) => Promise<void>;
}

/**
 * 6.1/6.3 — plays one voice message bubble at a time. Takes the message's
 * Storage path, not a URL: chat media is readable only by the two
 * participants, so the playable URL is fetched per path (and cached by
 * `resolveChatMediaUrl`).
 */
export function useVoicePlayback(): UseVoicePlaybackResult {
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const playerRef = useRef<AudioRecorderPlayer | null>(null);

  function getPlayer(): AudioRecorderPlayer {
    if (!playerRef.current) {
      playerRef.current = new AudioRecorderPlayer();
    }
    return playerRef.current;
  }

  const toggle = useCallback(
    async (path: string) => {
      const player = getPlayer();

      if (playingPath) {
        await player.stopPlayer();
        player.removePlayBackListener();
        setPlayingPath(null);
        if (playingPath === path) {
          return;
        }
      }

      const url = await resolveChatMediaUrl(path);
      await player.startPlayer(url);
      setPlayingPath(path);
      player.addPlayBackListener(meta => {
        if (meta.isFinished) {
          player.removePlayBackListener();
          setPlayingPath(null);
        }
      });
    },
    [playingPath],
  );

  useEffect(() => {
    // Leaving the chat mid-playback must not leave audio running with no
    // UI left to stop it.
    return () => {
      if (playerRef.current) {
        playerRef.current.stopPlayer().catch(() => {});
        playerRef.current.removePlayBackListener();
      }
    };
  }, []);

  return { playingPath, toggle };
}
