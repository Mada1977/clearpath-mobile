import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LANGUAGES } from '../constants';
import { applyLocale } from '../i18n';

const STORAGE_KEY = 'clearpath_locale';

export function useLanguage() {
  const { user, refreshUser } = useAuth();

  const currentCode = (user?.locale ?? 'en').split('-')[0].toLowerCase();
  const currentLanguage = LANGUAGES.find(l => l.code === currentCode) ?? LANGUAGES[0];

  const setLanguage = useCallback(async (locale: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, locale);
      applyLocale(locale);
      await api.patch('/users/me', { locale });
      await refreshUser();
    } catch (err) {
      // Swallow network errors — locale is already saved locally
    }
  }, [refreshUser]);

  return { currentLanguage, setLanguage };
}
