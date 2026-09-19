import ISO6391 from 'iso-639-1';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const LANGUAGES: LanguageOption[] = ISO6391.getLanguages(
  ISO6391.getAllCodes(),
).sort((a, b) => a.name.localeCompare(b.name));

export function getLanguageName(code: string): string | undefined {
  return LANGUAGES.find(language => language.code === code)?.name;
}
