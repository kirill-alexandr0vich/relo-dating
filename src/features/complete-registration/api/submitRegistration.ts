import { saveRequiredProfileFields } from 'entities/user';

export function submitRequiredProfileFields(
  uid: string,
  fields: { name: string; country: string; nativeLanguage: string },
) {
  return saveRequiredProfileFields(uid, fields);
}
