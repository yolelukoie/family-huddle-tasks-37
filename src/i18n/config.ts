import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { analytics } from '@/lib/analytics';
import en from './locales/en.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import hi from './locales/hi.json';
import ru from './locales/ru.json';
import he from './locales/he.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ar from './locales/ar.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  zh: { translation: zh },
  hi: { translation: hi },
  ru: { translation: ru },
  he: { translation: he },
  fr: { translation: fr },
  de: { translation: de },
  ar: { translation: ar },
};

// Get cached language from localStorage
const getCachedLanguage = (): string => {
  try {
    return localStorage.getItem('app-language') || 'en';
  } catch {
    return 'en';
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getCachedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

const RTL_LANGUAGES = ['ar', 'he'];

const applyDir = (lang: string) => {
  document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
};

applyDir(i18n.language);
analytics.setPersonProperties({ locale: i18n.language });

i18n.on('languageChanged', (lang: string) => {
  applyDir(lang);
  analytics.setPersonProperties({ locale: lang });
});

export default i18n;
