import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import mr from './locales/mr.json';
import en from './locales/en.json';

export const LANG_STORAGE_KEY = 'chala-kheluya-lang';
export const SUPPORTED_LANGS = ['mr', 'en'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export function readSavedLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && (SUPPORTED_LANGS as readonly string[]).includes(saved)) {
      return saved as Lang;
    }
  } catch {
    // localStorage unavailable
  }
  return 'mr';
}

export function applyLangToDocument(lang: Lang) {
  document.documentElement.lang = lang;
}

i18n.use(initReactI18next).init({
  resources: {
    mr: { translation: mr },
    en: { translation: en },
  },
  lng: readSavedLang(),
  fallbackLng: 'mr',
  interpolation: {
    escapeValue: false,
  },
});

applyLangToDocument(readSavedLang());
