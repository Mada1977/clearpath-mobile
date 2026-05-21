import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, LANGUAGES } from '../../src/constants';
import { LanguagePickerModal } from '../../src/components/LanguagePickerModal';
import { applyLocale } from '../../src/i18n';

const LOCALE_KEY = 'clearpath_locale';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState('en-US');
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_KEY).then(saved => {
      if (saved) setLocale(saved);
    });
  }, []);

  const currentLang = LANGUAGES.find(l => l.locale === locale) ?? LANGUAGES[0];

  async function handleSelectLocale(newLocale: string) {
    setLocale(newLocale);
    await AsyncStorage.setItem(LOCALE_KEY, newLocale);
    applyLocale(newLocale);
  }

  async function handleRegister() {
    if (!email || !password) {
      Alert.alert('Error', t('auth.emailRequired2'));
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', t('auth.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim(), locale);
    } catch (err: any) {
      Alert.alert(t('auth.registrationFailed'), err.response?.data?.error || t('auth.signInFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Bravely Path</Text>
        <Text style={styles.tagline}>{t('auth.taglineRegister')}</Text>

        <TouchableOpacity style={styles.langBtn} onPress={() => setShowLangPicker(true)}>
          <Text style={styles.langFlag}>{currentLang.flag}</Text>
          <Text style={styles.langText}>{currentLang.nativeLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={t('auth.namePlaceholder')}
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder={t('auth.email')}
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('auth.passwordMin')}
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.createAccount')}</Text>}
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>{t('auth.haveAccount')} <Text style={styles.linkBold}>{t('auth.signIn')}</Text></Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>

      <LanguagePickerModal
        visible={showLangPicker}
        currentLocale={locale}
        onSelect={handleSelectLocale}
        onClose={() => setShowLangPicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  inner:         { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  logo:          { fontSize: 36, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 6 },
  tagline:       { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', marginBottom: 20 },
  langBtn:       { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 24 },
  langFlag:      { fontSize: 18 },
  langText:      { fontSize: 14, fontWeight: '500', color: COLORS.text },
  input:         { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, marginBottom: 14 },
  passwordRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, marginBottom: 14 },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text },
  eyeBtn:        { paddingHorizontal: 14, paddingVertical: 14 },
  button:        { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  buttonText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:          { marginTop: 24, alignItems: 'center' },
  linkText:      { color: COLORS.textMuted, fontSize: 14 },
  linkBold:      { color: COLORS.primary, fontWeight: '600' },
});
