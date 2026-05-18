import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LANGUAGES } from '../constants';

const STORAGE_KEY = 'clearpath_locale';

export function useLanguage() {
  const { user, refreshUser } = useAuth();

  // Resolve the current language entry from the user's locale (e.g. "fr-FR" → fr entry)
  const currentCode = (user?.locale ?? 'en').split('-')[0].toLowerCase();
  const currentLanguage = LANGUAGES.find(l => l.code === currentCode) ?? LANGUAGES[0];

  const setLanguage = useCallback(async (locale: string) => {
    try {
      // Persist locally first so UI feels instant
      await AsyncStorage.setItem(STORAGE_KEY, locale);
      // Sync to backend — AI will now respond in the new language
      await api.patch('/users/me', { locale });
      // Update the in-memory user object
      await refreshUser();
    } catch (err) {
      // Swallow network errors — locale is already saved locally
    }
  }, [refreshUser]);

  return { currentLanguage, setLanguage };
}
