import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import it from './locales/it.json';
import ro from './locales/ro.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import tr from './locales/tr.json';
import ko from './locales/ko.json';

const RTL_LANGS = new Set(['ar']);

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
      es: { translation: es },
      pt: { translation: pt },
      de: { translation: de },
      it: { translation: it },
      ro: { translation: ro },
      nl: { translation: nl },
      pl: { translation: pl },
      tr: { translation: tr },
      ko: { translation: ko },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export function langCodeFromLocale(locale: string): string {
  return locale.split('-')[0].toLowerCase();
}

export function applyLocale(locale: string) {
  const code = langCodeFromLocale(locale);
  i18n.changeLanguage(code);
  const isRTL = RTL_LANGS.has(code);
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
    I18nManager.allowRTL(isRTL);
  }
}

export default i18n;
