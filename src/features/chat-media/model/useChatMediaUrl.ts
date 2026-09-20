import { useEffect, useState } from 'react';
import { resolveChatMediaUrl } from 'entities/chat';

/**
 * 6.1/6.3 — turns a chat media message's Storage path into a URL this
 * device can load. Only a chat participant is allowed to (storage.rules),
 * so this is a network call rather than string concatenation.
 */
export function useChatMediaUrl(path: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setUrl(null);
    resolveChatMediaUrl(path)
      .then(resolved => {
        if (!isCancelled) {
          setUrl(resolved);
        }
      })
      .catch(error => {
        console.error('Failed to resolve chat media url', error);
      });
    return () => {
      isCancelled = true;
    };
  }, [path]);

  return url;
}
