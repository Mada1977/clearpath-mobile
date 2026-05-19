import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, LANGUAGES } from '../../src/constants';
import { LanguagePickerModal } from '../../src/components/LanguagePickerModal';

const LOCALE_KEY = 'clearpath_locale';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
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
  }

  async function handleLogin() {
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const isNetwork = err.code === 'ERR_NETWORK' || err.message?.includes('Network Error');
      let msg: string;
      if (isTimeout || isNetwork) {
        msg = 'Server is waking up (cold start) — please wait a few seconds and try again.';
      } else {
        msg = err.response?.data?.error || err.message || 'Sign in failed. Please check your credentials.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>Bravely Path</Text>
        <Text style={styles.tagline}>Your recovery companion</Text>

        <TouchableOpacity style={styles.langBtn} onPress={() => setShowLangPicker(true)}>
          <Text style={styles.langFlag}>{currentLang.flag}</Text>
          <Text style={styles.langText}>{currentLang.nativeLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Email"
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
            placeholder="Password"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>

        {!!errorMsg && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></Text>
          </TouchableOpacity>
        </Link>
      </View>

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
  container:    { flex: 1, backgroundColor: COLORS.background },
  inner:        { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo:         { fontSize: 36, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 6 },
  tagline:      { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', marginBottom: 20 },
  langBtn:      { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 24 },
  langFlag:     { fontSize: 18 },
  langText:     { fontSize: 14, fontWeight: '500', color: COLORS.text },
  input:        { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, marginBottom: 14 },
  passwordRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, marginBottom: 14 },
  passwordInput:{ flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text },
  eyeBtn:       { paddingHorizontal: 14, paddingVertical: 14 },
  button:       { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  buttonText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorBox:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 12 },
  errorText:    { flex: 1, color: COLORS.danger, fontSize: 14, lineHeight: 20 },
  link:         { marginTop: 24, alignItems: 'center' },
  linkText:     { color: COLORS.textMuted, fontSize: 14 },
  linkBold:     { color: COLORS.primary, fontWeight: '600' },
});
