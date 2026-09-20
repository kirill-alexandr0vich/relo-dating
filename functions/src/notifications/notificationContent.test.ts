import {
  buildNotification,
  resolveNotificationLanguage,
} from './notificationContent';

describe('resolveNotificationLanguage', () => {
  it.each(['ru', 'RU', 'ru-RU'])('maps %s to russian', tag => {
    expect(resolveNotificationLanguage(tag)).toBe('ru');
  });

  // 11 — English is the fallback, including for users who installed
  // before the app started storing an interface language.
  it.each([undefined, '', 'en-US', 'ka-GE'])(
    'falls back to english for %s',
    tag => {
      expect(resolveNotificationLanguage(tag)).toBe('en');
    },
  );
});

describe('buildNotification', () => {
  it('names the other person in a match notification', () => {
    expect(buildNotification('match', 'ru', { name: 'Анна' })).toEqual({
      title: 'Это мэтч!',
      body: 'Вы с Анна понравились друг другу.',
    });
  });

  it('titles a message notification with the sender and previews the text', () => {
    expect(
      buildNotification('message_text', 'en', {
        name: 'Sam',
        preview: 'See you at 8?',
      }),
    ).toEqual({ title: 'Sam', body: 'See you at 8?' });
  });

  it('truncates a long preview instead of shipping the whole message', () => {
    const { body } = buildNotification('message_text', 'en', {
      name: 'Sam',
      preview: 'a'.repeat(400),
    });
    expect(body.length).toBeLessThanOrEqual(120);
    expect(body.endsWith('…')).toBe(true);
  });

  it('describes media instead of previewing its storage path', () => {
    expect(buildNotification('message_voice', 'ru', { name: 'Сэм' }).body).toBe(
      'Отправил(а) голосовое сообщение',
    );
    expect(buildNotification('message_image', 'en', { name: 'Sam' }).body).toBe(
      'Sent a photo',
    );
  });

  it('covers both friendship notifications in both languages', () => {
    expect(
      buildNotification('friend_request', 'en', { name: 'Sam' }).title,
    ).toBe('New friend request');
    expect(
      buildNotification('friend_request_accepted', 'ru', { name: 'Сэм' }).title,
    ).toBe('Заявка принята');
  });
});
