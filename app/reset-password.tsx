import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL, COLORS } from '../src/constants';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, { token, password });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} style={{ alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.title}>Invalid link</Text>
          <Text style={styles.subtitle}>This password reset link is invalid or has expired.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/forgot-password')}>
            <Text style={styles.buttonText}>Request a new link</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle-outline" size={40} color={COLORS.secondary} />
          </View>
          <Text style={styles.title}>Password updated!</Text>
          <Text style={styles.subtitle}>Your password has been reset successfully. You can now sign in with your new password.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.buttonText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Set new password</Text>
        <Text style={styles.subtitle}>Choose a strong password of at least 8 characters.</Text>

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="New password"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoFocus
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor={COLORS.textMuted}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showPassword}
        />

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset password</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  inner:         { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  iconCircle:    { width: 72, height: 72, borderRadius: 36, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  title:         { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 10 },
  subtitle:      { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  input:         { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, marginBottom: 14 },
  passwordRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, marginBottom: 14 },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text },
  eyeBtn:        { paddingHorizontal: 14, paddingVertical: 14 },
  errorBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText:     { flex: 1, color: COLORS.danger, fontSize: 14 },
  button:        { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  buttonText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});
