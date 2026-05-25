import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  STATS:        'bp_cache_stats',
  LOGS:         'bp_cache_logs',
  COPING_TIPS:  'bp_cache_coping_tips',
};

// ── Stats ────────────────────────────────────────────────────────
export async function cacheStats(stats: object) {
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
}

export async function getCachedStats(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(KEYS.STATS);
  return raw ? JSON.parse(raw) : null;
}

// ── Logs ─────────────────────────────────────────────────────────
export async function cacheLogs(logs: object[]) {
  await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
}

export async function getCachedLogs(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(KEYS.LOGS);
  return raw ? JSON.parse(raw) : [];
}

// ── Coping tips — sourced from locale files, not hardcoded ───────
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';
import de from '../i18n/locales/de.json';
import es from '../i18n/locales/es.json';
import it from '../i18n/locales/it.json';
import pt from '../i18n/locales/pt.json';
import ro from '../i18n/locales/ro.json';
import ar from '../i18n/locales/ar.json';
import tr from '../i18n/locales/tr.json';
import nl from '../i18n/locales/nl.json';
import pl from '../i18n/locales/pl.json';
import ko from '../i18n/locales/ko.json';

const COPING_TIPS: Record<string, string[]> = {
  en: en.sos.offlineSteps,
  fr: fr.sos.offlineSteps,
  de: de.sos.offlineSteps,
  es: es.sos.offlineSteps,
  it: it.sos.offlineSteps,
  pt: pt.sos.offlineSteps,
  ro: ro.sos.offlineSteps,
  ar: ar.sos.offlineSteps,
  tr: tr.sos.offlineSteps,
  nl: nl.sos.offlineSteps,
  pl: pl.sos.offlineSteps,
  ko: ko.sos.offlineSteps,
};

export async function cacheCopingTips(locale: string) {
  const lang = locale.slice(0, 2).toLowerCase();
  const tips = COPING_TIPS[lang] ?? COPING_TIPS['en'];
  await AsyncStorage.setItem(KEYS.COPING_TIPS, JSON.stringify(tips));
}

export async function getCachedCopingTips(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.COPING_TIPS);
  return raw ? JSON.parse(raw) : COPING_TIPS['en'];
}
