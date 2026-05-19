import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/services/api';
import { COLORS, ADDICTIONS, STAGES } from '../src/constants';

const ROLES = [
  { value: 'self',         icon: '🙋',  label: 'For myself',        sub: 'I want to recover' },
  { value: 'friend',       icon: '🤝',  label: 'For someone I love', sub: 'Supporting a friend or family member' },
  { value: 'professional', icon: '🏥',  label: 'As a professional',  sub: 'I support people in recovery' },
];

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [step, setStep]             = useState(0);
  const [role, setRole]             = useState('');
  const [addictions, setAddictions] = useState<string[]>([]);
  const [stage, setStage]           = useState('');
  const [saving, setSaving]         = useState(false);

  function toggleAddiction(val: string) {
    setAddictions(prev => prev.includes(val) ? prev.filter(a => a !== val) : [...prev, val]);
  }

  function canContinue() {
    if (step === 1) return !!role;
    if (step === 2) return addictions.length > 0;
    if (step === 3) return !!stage;
    return true;
  }

  async function finish() {
    setSaving(true);
    try {
      await api.patch('/users/me', { role, addictions, stage });
      await refreshUser();
      await AsyncStorage.setItem('bravelypath_onboarded', 'true');
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
    else finish();
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <View style={styles.step}>
            <Text style={styles.emoji}>✨</Text>
            <Text style={styles.heading}>Welcome to{'\n'}Bravely Path</Text>
            <Text style={styles.sub}>Your private, AI-powered recovery companion. Let's set up your profile in just a few steps.</Text>
          </View>
        )}

        {/* Step 1 — Role */}
        {step === 1 && (
          <View style={styles.step}>
            <Text style={styles.heading}>Who are you here for?</Text>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleCard, role === r.value && styles.roleCardActive]}
                onPress={() => setRole(r.value)}
              >
                <Text style={styles.roleIcon}>{r.icon}</Text>
                <View style={styles.roleText}>
                  <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>{r.label}</Text>
                  <Text style={styles.roleSub}>{r.sub}</Text>
                </View>
                {role === r.value && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 2 — Addictions */}
        {step === 2 && (
          <View style={styles.step}>
            <Text style={styles.heading}>What would you like{'\n'}to work on?</Text>
            <Text style={styles.sub}>Select all that apply. You can change this later.</Text>
            <View style={styles.chipWrap}>
              {ADDICTIONS.map(a => (
                <TouchableOpacity
                  key={a.value}
                  style={[styles.chip, addictions.includes(a.value) && styles.chipActive]}
                  onPress={() => toggleAddiction(a.value)}
                >
                  <Text style={[styles.chipText, addictions.includes(a.value) && styles.chipTextActive]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3 — Stage */}
        {step === 3 && (
          <View style={styles.step}>
            <Text style={styles.heading}>Where are you right now?</Text>
            <Text style={styles.sub}>Be honest — there's no wrong answer.</Text>
            {STAGES.map(s => (
              <TouchableOpacity
                key={s.value}
                style={[styles.stageCard, stage === s.value && styles.stageCardActive]}
                onPress={() => setStage(s.value)}
              >
                <Text style={[styles.stageLabel, stage === s.value && styles.stageLabelActive]}>{s.label}</Text>
                {stage === s.value && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, !canContinue() && styles.nextBtnDisabled]}
          onPress={next}
          disabled={!canContinue() || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>{step === TOTAL_STEPS - 1 ? "Let's go" : 'Continue'}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.background },
  progressBar:     { height: 4, backgroundColor: COLORS.border, margin: 0 },
  progressFill:    { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  container:       { flexGrow: 1, padding: 28, paddingBottom: 16 },
  step:            { flex: 1, paddingTop: 20 },
  emoji:           { fontSize: 52, marginBottom: 16 },
  heading:         { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 12, lineHeight: 36 },
  sub:             { fontSize: 15, color: COLORS.textMuted, lineHeight: 22, marginBottom: 28 },
  roleCard:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: COLORS.border },
  roleCardActive:  { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  roleIcon:        { fontSize: 28, marginRight: 14 },
  roleText:        { flex: 1 },
  roleLabel:       { fontSize: 15, fontWeight: '700', color: COLORS.text },
  roleLabelActive: { color: COLORS.primary },
  roleSub:         { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  chipWrap:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:            { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive:      { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  chipText:        { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive:  { color: COLORS.primary, fontWeight: '700' },
  stageCard:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: 14, padding: 18, marginBottom: 10, borderWidth: 1.5, borderColor: COLORS.border },
  stageCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  stageLabel:      { fontSize: 15, fontWeight: '600', color: COLORS.text },
  stageLabelActive:{ color: COLORS.primary },
  footer:          { flexDirection: 'row', padding: 20, gap: 12 },
  backBtn:         { width: 50, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card },
  nextBtn:         { flex: 1, height: 52, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled: { backgroundColor: COLORS.border },
  nextBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
