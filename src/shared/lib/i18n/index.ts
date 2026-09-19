import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { findBestLanguageTag } from 'react-native-localize';
import en from './locales/en.json';
import ru from './locales/ru.json';

const SUPPORTED_LANGUAGE_TAGS = ['en', 'ru'];
const FALLBACK_LANGUAGE = 'en';

const bestLanguage = findBestLanguageTag(SUPPORTED_LANGUAGE_TAGS);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: bestLanguage?.languageTag ?? FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
