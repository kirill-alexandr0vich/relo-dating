import { submitProfileTextInputSchema } from './schema';

describe('submitProfileTextInputSchema', () => {
  it('allows an empty bio (clearing it is valid)', () => {
    const result = submitProfileTextInputSchema.safeParse({
      field: 'bio',
      value: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a value over the blanket payload-size guard', () => {
    const result = submitProfileTextInputSchema.safeParse({
      field: 'bio',
      value: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown field', () => {
    const result = submitProfileTextInputSchema.safeParse({
      field: 'username',
      value: 'x',
    });
    expect(result.success).toBe(false);
  });
});
