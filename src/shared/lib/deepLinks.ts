export const DEEP_LINK_SCHEME = 'relocantapp';

/** 5.2 — the QR code's payload. */
export function buildAddFriendDeepLink(uid: string): string {
  return `${DEEP_LINK_SCHEME}://addfriend/${uid}`;
}

export function parseAddFriendDeepLink(url: string): string | null {
  const match = url.match(
    new RegExp(`^${DEEP_LINK_SCHEME}://addfriend/([^/?#]+)`),
  );
  return match ? match[1] : null;
}
