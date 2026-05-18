import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { COLORS, ADDICTIONS, STAGES } from '../../src/constants';
import { useLanguage } from '../../src/hooks/useLanguage';
import { LanguagePickerModal } from '../../src/components/LanguagePickerModal';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { currentLanguage, setLanguage } = useLanguage();

  const [saving, setSaving] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [selectedAddictions, setSelectedAddictions] = useState<string[]>(user?.addictions ?? []);
  const [stage, setStage] = useState(user?.stage ?? 'curious');

  function toggleAddiction(value: string) {
    setSelectedAddictions(prev =>
      prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]
    );
  }

  async function handleLanguageSelect(locale: string) {
    await setLanguage(locale);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.patch('/users/me', { addictions: selectedAddictions, stage });
      await refreshUser();
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'AGE_VERIFICATION_REQUIRED') {
        Alert.alert(
          'Age verification required',
          'You must confirm you are 18+ to add this content.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'I confirm I am 18+',
              onPress: async () => {
                await api.post('/users/me/verify-age', { confirmed: true });
                await api.patch('/users/me', { addictions: selectedAddictions, stage });
                await refreshUser();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', err.response?.data?.error || 'Could not save profile.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        {/* Account card */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || user?.email || 'U')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Anonymous'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>⭐ Premium</Text>
            </View>
          )}
        </View>

        {/* Language selector */}
        <Text style={styles.sectionLabel}>Language</Text>
        <TouchableOpacity style={styles.langRow} onPress={() => setLangModalVisible(true)} activeOpacity={0.7}>
          <Text style={styles.langFlag}>{currentLanguage.flag}</Text>
          <View style={styles.langLabels}>
            <Text style={styles.langName}>{currentLanguage.nativeLabel}</Text>
            <Text style={styles.langSub}>{currentLanguage.label} · AI responds in this language</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Addictions */}
        <Text style={styles.sectionLabel}>What are you working on?</Text>
        <View style={styles.wrap}>
          {ADDICTIONS.map(a => (
            <TouchableOpacity
              key={a.value}
              style={[styles.chip, selectedAddictions.includes(a.value) && styles.chipActive]}
              onPress={() => toggleAddiction(a.value)}
            >
              <Text style={[styles.chipText, selectedAddictions.includes(a.value) && styles.chipTextActive]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stage */}
        <Text style={styles.sectionLabel}>Your current stage</Text>
        <View style={styles.wrap}>
          {STAGES.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[styles.chip, stage === s.value && styles.chipActive]}
              onPress={() => setStage(s.value)}
            >
              <Text style={[styles.chipText, stage === s.value && styles.chipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save changes</Text>}
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      <LanguagePickerModal
        visible={langModalVisible}
        currentLocale={user?.locale ?? 'en-US'}
        onSelect={handleLanguageSelect}
        onClose={() => setLangModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.background },
  container:       { padding: 24, paddingBottom: 48 },
  title:           { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 24 },
  card:            { backgroundColor: COLORS.card, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  avatar:          { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:      { color: '#fff', fontSize: 28, fontWeight: '800' },
  name:            { fontSize: 18, fontWeight: '700', color: COLORS.text },
  email:           { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  premiumBadge:    { marginTop: 10, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  premiumText:     { color: '#92400E', fontSize: 12, fontWeight: '700' },
  sectionLabel:    { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, marginBottom: 10, marginTop: 18 },
  langRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  langFlag:        { fontSize: 28, marginRight: 14 },
  langLabels:      { flex: 1 },
  langName:        { fontSize: 16, fontWeight: '600', color: COLORS.text },
  langSub:         { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  wrap:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive:      { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  chipText:        { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive:  { color: COLORS.primary, fontWeight: '700' },
  saveButton:      { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
  saveButtonText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutButton:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingVertical: 14 },
  logoutText:      { color: COLORS.danger, fontSize: 15, fontWeight: '600' },
});
