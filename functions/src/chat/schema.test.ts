import { sendChatMediaInputSchema } from './schema';

describe('sendChatMediaInputSchema', () => {
  it('accepts an image without durationSeconds', () => {
    const result = sendChatMediaInputSchema.safeParse({
      chatId: 'a_b',
      pendingPath: 'chats/a_b/pending/a/1.jpg',
      type: 'image',
    });
    expect(result.success).toBe(true);
  });

  it('requires durationSeconds for voice', () => {
    const result = sendChatMediaInputSchema.safeParse({
      chatId: 'a_b',
      pendingPath: 'chats/a_b/pending/a/1.m4a',
      type: 'voice',
    });
    expect(result.success).toBe(false);
  });

  it('accepts voice with a valid durationSeconds', () => {
    const result = sendChatMediaInputSchema.safeParse({
      chatId: 'a_b',
      pendingPath: 'chats/a_b/pending/a/1.m4a',
      type: 'voice',
      durationSeconds: 12,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a voice clip over the 300s cap', () => {
    const result = sendChatMediaInputSchema.safeParse({
      chatId: 'a_b',
      pendingPath: 'chats/a_b/pending/a/1.m4a',
      type: 'voice',
      durationSeconds: 301,
    });
    expect(result.success).toBe(false);
  });
});
