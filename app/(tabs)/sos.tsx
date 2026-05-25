import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { COLORS, ADDICTIONS } from '../../src/constants';
import { getHelplinesByLocale, openHelpline, type Helpline } from '../../src/constants/helplines';
import { useOffline } from '../../src/hooks/useOffline';
import { getCachedCopingTips } from '../../src/services/offlineCache';
import { pauseMusic, getMusicEnabled, playMusic } from '../../src/services/audioPlayer';

const TIMER_SECONDS = 5 * 60;

export default function SosScreen() {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const { t } = useTranslation();
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
        outcome === 'resisted' ? t('sos.wellDone') : t('sos.itsOkay'),
        outcome === 'resisted' ? t('sos.wellDoneMsg') : t('sos.itsOkayMsg')
      );
    } catch {
      Alert.alert('Error', t('sos.couldNotSave'));
    }
  }

  function selectAddiction(val: string) {
    setSelectedAddiction(val);
    if (active) loadSteps(val);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('sos.title')}</Text>
        <Text style={styles.sub}>{t('sos.sub')}</Text>

        {/* Addiction selector */}
        <View style={styles.chipWrap}>
          {userAddictions.map(a => {
            const label = t(`addictions.${a}`, ADDICTIONS.find(x => x.value === a)?.label ?? a);
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
            <Text style={styles.timerLabel}>{active ? t('sos.stayStrong') : '5:00'}</Text>
          </View>

          {!active ? (
            <TouchableOpacity style={styles.startBtn} onPress={startSos}>
              <Ionicons name="flash" size={22} color="#fff" />
              <Text style={styles.startBtnText}>{t('sos.havingACraving')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetBtnText}>{t('sos.cancel')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SOS steps */}
        {active && (
          <View style={styles.stepsBox}>
            <Text style={styles.stepsTitle}>{t('sos.sosSteps')}</Text>
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
              <Text style={styles.noSteps}>{t('sos.breathe')}</Text>
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
              <Text style={styles.outcomeBtnText}>{t('sos.iResisted')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outcomeBtn, styles.outcomeBtnSlip]}
              onPress={() => logCraving('gave_in')}
            >
              <Text style={[styles.outcomeBtnText, { color: COLORS.textMuted }]}>{t('sos.iSlipped')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {logged && (
          <View style={styles.loggedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
            <Text style={styles.loggedText}>{t('sos.logged')}</Text>
          </View>
        )}

        <HelplineSection locale={user?.locale ?? 'en-US'} addictions={user?.addictions} />
      </ScrollView>
    </SafeAreaView>
  );
}

function HelplineSection({ locale, addictions }: { locale: string; addictions?: string[] }) {
  const { t } = useTranslation();
  const helplines = getHelplinesByLocale(locale, addictions);
  return (
    <View style={styles.helpCard}>
      <View style={styles.helpHeader}>
        <Ionicons name="call" size={18} color={COLORS.danger} />
        <Text style={styles.helpTitle}>{t('sos.emergency')}</Text>
      </View>
      <Text style={styles.helpNote}>{t('sos.dial112Note')}</Text>
      {helplines.map((h, i) => (
        <HelplineRow key={i} h={h} />
      ))}
    </View>
  );
}

function HelplineRow({ h }: { h: Helpline }) {
  return (
    <TouchableOpacity
      style={[styles.helpRow, h.isEmergency && styles.helpRowEmergency]}
      onPress={() => openHelpline(h)}
      activeOpacity={0.7}
    >
      <View style={styles.helpRowLeft}>
        {h.isEmergency && (
          <Ionicons name="alert-circle" size={15} color={COLORS.danger} style={{ marginRight: 4 }} />
        )}
        <Text style={[styles.helpName, h.isEmergency && styles.helpNameEmergency]}>
          {h.name}
        </Text>
      </View>
      <View style={styles.helpRowRight}>
        <Text style={[styles.helpNumber, h.isWeb && styles.helpNumberWeb]}>{h.number}</Text>
        {h.available && <Text style={styles.helpAvail}>{h.available}</Text>}
      </View>
    </TouchableOpacity>
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
  helpCard:         { backgroundColor: COLORS.card, borderRadius: 16, padding: 18, marginTop: 8, borderWidth: 1.5, borderColor: COLORS.danger + '30' },
  helpHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  helpTitle:        { fontSize: 15, fontWeight: '700', color: COLORS.danger },
  helpNote:         { fontSize: 12, color: COLORS.textMuted, marginBottom: 14, lineHeight: 18 },
  helpRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  helpRowEmergency: { backgroundColor: COLORS.danger + '08', marginHorizontal: -18, paddingHorizontal: 18, borderTopColor: COLORS.danger + '30' },
  helpRowLeft:      { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  helpName:         { fontSize: 13, color: COLORS.text, fontWeight: '500', flexShrink: 1 },
  helpNameEmergency:{ color: COLORS.danger, fontWeight: '700' },
  helpRowRight:     { alignItems: 'flex-end' },
  helpNumber:       { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  helpNumberWeb:    { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  helpAvail:        { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
});
