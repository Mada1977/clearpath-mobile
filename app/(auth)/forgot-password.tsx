import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL, COLORS } from '../../src/constants';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email.trim()) {
      setError(t('auth.emailRequired3'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email: email.trim().toLowerCase() });
      setSent(true);
    } catch {
      // Always show the success message to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>{t('auth.checkInbox')}</Text>
          <Text style={styles.subtitle}>{t('auth.checkInboxSubtitle', { email })}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>{t('auth.backToSignIn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>{t('auth.backToSignIn')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('auth.forgotTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.forgotSubtitle')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('auth.emailAddress')}
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoFocus
        />

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.sendResetLink')}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  inner:       { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  backRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 },
  backText:    { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  iconCircle:  { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  title:       { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 10 },
  subtitle:    { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  input:       { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, marginBottom: 14 },
  errorBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText:   { flex: 1, color: COLORS.danger, fontSize: 14 },
  button:      { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  buttonText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});
