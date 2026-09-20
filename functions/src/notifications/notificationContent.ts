export type NotificationLanguage = 'en' | 'ru';

export type NotificationKind =
  | 'match'
  | 'message_text'
  | 'message_image'
  | 'message_voice'
  | 'friend_request'
  | 'friend_request_accepted';

export interface NotificationParams {
  /** Display name of whoever caused the notification. */
  name: string;
  /** Message text, for the one kind that previews it. */
  preview?: string;
}

export interface NotificationContent {
  title: string;
  body: string;
}

/** 11 — English is the fallback; only these two exist for MVP. */
const FALLBACK_LANGUAGE: NotificationLanguage = 'en';

type Template = (params: NotificationParams) => NotificationContent;

const TEMPLATES: Record<
  NotificationLanguage,
  Record<NotificationKind, Template>
> = {
  en: {
    match: ({ name }) => ({
      title: "It's a match!",
      body: `You and ${name} liked each other.`,
    }),
    message_text: ({ name, preview }) => ({
      title: name,
      body: preview ?? '',
    }),
    message_image: ({ name }) => ({
      title: name,
      body: 'Sent a photo',
    }),
    message_voice: ({ name }) => ({
      title: name,
      body: 'Sent a voice message',
    }),
    friend_request: ({ name }) => ({
      title: 'New friend request',
      body: `${name} wants to add you as a friend.`,
    }),
    friend_request_accepted: ({ name }) => ({
      title: 'Friend request accepted',
      body: `${name} accepted your friend request.`,
    }),
  },
  ru: {
    match: ({ name }) => ({
      title: 'Это мэтч!',
      body: `Вы с ${name} понравились друг другу.`,
    }),
    message_text: ({ name, preview }) => ({
      title: name,
      body: preview ?? '',
    }),
    message_image: ({ name }) => ({
      title: name,
      body: 'Отправил(а) фото',
    }),
    message_voice: ({ name }) => ({
      title: name,
      body: 'Отправил(а) голосовое сообщение',
    }),
    friend_request: ({ name }) => ({
      title: 'Новая заявка в друзья',
      body: `${name} хочет добавить вас в друзья.`,
    }),
    friend_request_accepted: ({ name }) => ({
      title: 'Заявка принята',
      body: `${name} принял(а) вашу заявку в друзья.`,
    }),
  },
};

/**
 * 10/11 — push text follows the RECIPIENT's interface language, not the
 * sender's and not the server's. The client stores its resolved language
 * on the user document; anything unknown (or missing, for someone who
 * installed before this existed) falls back to English.
 */
export function resolveNotificationLanguage(
  storedLanguage: string | undefined,
): NotificationLanguage {
  return storedLanguage?.toLowerCase().startsWith('ru')
    ? 'ru'
    : FALLBACK_LANGUAGE;
}

/** Push bodies are truncated by the OS anyway; cutting here keeps the payload small. */
const MAX_PREVIEW_LENGTH = 120;

export function buildNotification(
  kind: NotificationKind,
  language: NotificationLanguage,
  params: NotificationParams,
): NotificationContent {
  const preview =
    params.preview && params.preview.length > MAX_PREVIEW_LENGTH
      ? `${params.preview.slice(0, MAX_PREVIEW_LENGTH - 1)}…`
      : params.preview;
  return TEMPLATES[language][kind]({ ...params, preview });
}
