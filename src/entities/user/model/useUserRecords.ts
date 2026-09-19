import { useEffect, useRef, useState } from 'react';
import { fetchUserRecord } from '../api/userApi';
import type { UserRecord } from './types';

/**
 * Resolves a list of uids to their profiles, fetching each one only
 * once (cached for the component's lifetime — not a live subscription,
 * a deliberate simplification for lists like friends/chats where many
 * concurrent listeners would be excessive).
 */
export function useUserRecords(uids: string[]): Record<string, UserRecord> {
  const [records, setRecords] = useState<Record<string, UserRecord>>({});
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const toFetch = uids.filter(uid => !fetchedRef.current.has(uid));
    if (toFetch.length === 0) {
      return;
    }
    toFetch.forEach(uid => fetchedRef.current.add(uid));
    Promise.all(toFetch.map(uid => fetchUserRecord(uid))).then(results => {
      setRecords(previous => {
        const next = { ...previous };
        results.forEach((record, index) => {
          if (record) {
            next[toFetch[index]] = record;
          }
        });
        return next;
      });
    });
  }, [uids]);

  return records;
}
