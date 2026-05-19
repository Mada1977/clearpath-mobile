import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { COLORS, ADDICTIONS } from '../../src/constants';
import { useOffline } from '../../src/hooks/useOffline';
import { getCachedCopingTips } from '../../src/services/offlineCache';
import { pauseMusic, getMusicEnabled, playMusic } from '../../src/services/audioPlayer';

const TIMER_SECONDS = 5 * 60; // 5 minutes

export default function SosScreen() {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const [active, setActive]       = useState(false);
  const [seconds, setSeconds]     = useState(TIMER_SECONDS);
  const [steps, setSteps]         = useState<string[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [selectedAddiction, setSelectedAddiction] = useState(
    user?.addictions?.[0] ?? 'smoking'
  );
  const [logged, setLogged]       = useState(false);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  const userAddictions = user?.addictions?.length
    ? user.addictions
    : ['smoking'];

  const minutesLeft = Math.floor(seconds / 60);
  const secsLeft    = seconds % 60;
  const progress    = (TIMER_SECONDS - seconds) / TIMER_SECONDS;

  // Pause music when SOS screen is focused, resume when leaving
  useFocusEffect(useCallback(() => {
    pauseMusic();
    return () => {
      getMusicEnabled().then(enabled => { if (enabled) playMusic(); });
    };
  }, []));

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    if (seconds === 0) {
      stopTimer();
      setActive(false);
    }
  }, [seconds, stopTimer]);

  async function loadSteps(addiction: string) {
    setLoadingSteps(true);
    try {
      if (isOffline) {
        const tips = await getCachedCopingTips();
        setSteps(tips);
      } else {
        const { data } = await api.get(`/ai/sos/${addiction}`);
        setSteps(Array.isArray(data.steps) ? data.steps : []);
      }
    } catch {
      const tips = await getCachedCopingTips();
      setSteps(tips.length ? tips : []);
    } finally {
      setLoadingSteps(false);
    }
  }

  function startSos() {
    setActive(true);
    setSeconds(TIMER_SECONDS);
    setLogged(false);
    loadSteps(selectedAddiction);
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function reset() {
    stopTimer();
    setActive(false);
    setSeconds(TIMER_SECONDS);
    setSteps([]);
    setLogged(false);
  }

  async function logCraving(outcome: 'resisted' | 'gave_in') {
    try {
      await api.post('/logs', {
        type: outcome === 'resisted' ? 'resisted' : 'used',
        addiction: selectedAddiction,
        trigger: 'unknown',
        mood: 'rough',
        outcome,
      });
      setLogged(true);
      Alert.alert(
        outcome === 'resisted' ? '💪 Well done!' : '🤗 It\'s okay',
        outcome === 'resisted'
          ? 'You resisted! Every moment of strength matters.'
          : 'Every setback is a setup for a comeback. Tomorrow is a new day.'
      );
    } catch {
      Alert.alert('Error', 'Could not save log.');
    }
  }

  function selectAddiction(val: string) {
    setSelectedAddiction(val);
    if (active) loadSteps(val);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Craving SOS</Text>
        <Text style={styles.sub}>Cravings last 5 minutes. You can do this.</Text>

        {/* Addiction selector */}
        <View style={styles.chipWrap}>
          {userAddictions.map(a => {
            const label = ADDICTIONS.find(x => x.value === a)?.label ?? a;
            return (
              <TouchableOpacity
                key={a}
                style={[styles.chip, selectedAddiction === a && styles.chipActive]}
                onPress={() => selectAddiction(a)}
              >
                <Text style={[styles.chipText, selectedAddiction === a && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timer ring */}
        <View style={styles.timerBox}>
          <View style={[styles.timerRing, { borderColor: active ? COLORS.primary : COLORS.border }]}>
            <View style={[
              styles.timerFill,
              { borderColor: active ? COLORS.secondary : 'transparent', opacity: active ? 1 : 0 }
            ]} />
            <Text style={[styles.timerText, active && { color: COLORS.primary }]}>
              {String(minutesLeft).padStart(2, '0')}:{String(secsLeft).padStart(2, '0')}
            </Text>
            <Text style={styles.timerLabel}>{active ? 'Stay strong' : '5:00'}</Text>
          </View>

          {!active ? (
            <TouchableOpacity style={styles.startBtn} onPress={startSos}>
              <Ionicons name="flash" size={22} color="#fff" />
              <Text style={styles.startBtnText}>I'm having a craving</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SOS steps */}
        {active && (
          <View style={styles.stepsBox}>
            <Text style={styles.stepsTitle}>Your SOS steps</Text>
            {loadingSteps ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />
            ) : steps.length > 0 ? (
              steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noSteps}>
                Take slow deep breaths. Focus on what is in front of you right now.
              </Text>
            )}
          </View>
        )}

        {/* Log outcome buttons */}
        {active && !logged && (
          <View style={styles.outcomeRow}>
            <TouchableOpacity
              style={[styles.outcomeBtn, styles.outcomeBtnResist]}
              onPress={() => logCraving('resisted')}
            >
              <Text style={styles.outcomeBtnText}>💪 I resisted</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outcomeBtn, styles.outcomeBtnSlip]}
              onPress={() => logCraving('gave_in')}
            >
              <Text style={[styles.outcomeBtnText, { color: COLORS.textMuted }]}>I slipped</Text>
            </TouchableOpacity>
          </View>
        )}

        {logged && (
          <View style={styles.loggedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
            <Text style={styles.loggedText}>Logged</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.background },
  container:        { padding: 24, paddingBottom: 48 },
  title:            { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sub:              { fontSize: 14, color: COLORS.textMuted, marginBottom: 20 },
  chipWrap:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  chip:             { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive:       { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  chipText:         { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive:   { color: COLORS.primary, fontWeight: '700' },
  timerBox:         { alignItems: 'center', marginBottom: 28 },
  timerRing:        { width: 180, height: 180, borderRadius: 90, borderWidth: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: COLORS.card },
  timerFill:        { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 6 },
  timerText:        { fontSize: 42, fontWeight: '800', color: COLORS.textMuted },
  timerLabel:       { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  startBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.danger, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  startBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  resetBtn:         { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border },
  resetBtnText:     { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  stepsBox:         { backgroundColor: '#EEF2FF', borderRadius: 16, padding: 18, marginBottom: 20 },
  stepsTitle:       { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 14 },
  stepRow:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  stepNum:          { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText:      { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText:         { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 21 },
  noSteps:          { fontSize: 14, color: COLORS.text, lineHeight: 21 },
  outcomeRow:       { flexDirection: 'row', gap: 12, marginBottom: 16 },
  outcomeBtn:       { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  outcomeBtnResist: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  outcomeBtnSlip:   { backgroundColor: COLORS.card },
  outcomeBtnText:   { fontWeight: '700', fontSize: 14, color: '#fff' },
  loggedBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 10 },
  loggedText:       { color: COLORS.secondary, fontWeight: '600', fontSize: 14 },
});
