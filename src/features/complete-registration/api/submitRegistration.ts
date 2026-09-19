import { saveRequiredProfileFields, submitProfileText } from 'entities/user';

export async function submitRequiredProfileFields(
  uid: string,
  fields: { name: string; country: string; nativeLanguage: string },
): Promise<void> {
  // name goes through moderation (7.2); country/nativeLanguage don't need it.
  await submitProfileText('name', fields.name);
  await saveRequiredProfileFields(uid, {
    country: fields.country,
    nativeLanguage: fields.nativeLanguage,
  });
}
