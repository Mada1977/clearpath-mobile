import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { COLORS } from '../../src/constants';
import { useOffline } from '../../src/hooks/useOffline';
import { getCachedStats } from '../../src/services/offlineCache';
import { generateAndShareReport } from '../../src/services/reportGenerator';
import type { Log } from '../../src/services/reportGenerator';

const FREE_PREVIEW_KEY = 'bp_report_free_preview_used';

type Stats = {
  streak: number;
  longestStreak: number;
  totalResisted: number;
  totalUsed: number;
  totalSos: number;
  weeklyResisted: number[];
};

const MILESTONES = [
  { days: 1,   icon: '🌱', label: '1 day'   },
  { days: 3,   icon: '🔥', label: '3 days'  },
  { days: 7,   icon: '⭐', label: '1 week'  },
  { days: 14,  icon: '🏆', label: '2 weeks' },
  { days: 30,  icon: '🥇', label: '1 month' },
  { days: 90,  icon: '💎', label: '3 months'},
  { days: 180, icon: '🚀', label: '6 months'},
  { days: 365, icon: '👑', label: '1 year'  },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ProgressScreen() {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const [stats, setStats]           = useState<Stats | null>(null);
  const [loading, setLoading]       = useState(true);
  const [logs, setLogs]             = useState<Log[]>([]);
  const [stability, setStability]   = useState<number | null>(null);
  const [reportModal, setReportModal] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchStats(); fetchLogs(); fetchStability(); }, []);

  useEffect(() => {
    if (!isOffline) fetchStats();
  }, [isOffline]);

  async function fetchStats() {
    if (isOffline) {
      const cached = await getCachedStats();
      if (cached) setStats(cached);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/users/me/stats');
      setStats(data);
    } catch {
      const cached = await getCachedStats();
      if (cached) setStats(cached);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      const { data } = await api.get('/logs?limit=30');
      setLogs(data.logs ?? data ?? []);
    } catch {}
  }

  async function fetchStability() {
    try {
      const { data } = await api.get('/users/me/stability-score');
      setStability(data.score ?? null);
    } catch {}
  }

  async function openReportModal() {
    const isPremium = (user as any)?.isPremium;
    if (!isPremium) {
      const used = await AsyncStorage.getItem(FREE_PREVIEW_KEY);
      if (used) {
        Alert.alert(
          'Premium feature',
          'Therapist reports are a premium feature. Upgrade to generate unlimited reports.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    // Pre-select logs that have notes
    const withNotes = logs.filter(l => l.notes).slice(0, 10).map(l => l.id);
    setSelectedLogIds(withNotes);
    setReportModal(true);
  }

  async function handleGenerateReport() {
    setGenerating(true);
    try {
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekLogs = logs.filter(l => new Date(l.loggedAt) >= weekAgo);

      await generateAndShareReport({
        userName: user?.name ?? null,
        streak: stats?.streak ?? 0,
        totalResisted: weekLogs.filter(l => l.outcome === 'resisted').length,
        totalSlips: weekLogs.filter(l => l.outcome === 'gave_in').length,
        stabilityScore: stability,
        logs,
        selectedLogIds,
        weekStart: weekAgo.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        weekEnd: now.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }),
      });

      // Mark free preview used if not premium
      if (!(user as any)?.isPremium) {
        await AsyncStorage.setItem(FREE_PREVIEW_KEY, '1');
      }
      setReportModal(false);
    } catch (err: any) {
      Alert.alert('Error', 'Could not generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function toggleLogSelection(id: string) {
    setSelectedLogIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  const streak        = stats?.streak ?? 0;
  const weeklyData    = stats?.weeklyResisted ?? [0, 0, 0, 0, 0, 0, 0];
  const maxBar        = Math.max(...weeklyData, 1);
  const nextMilestone = MILESTONES.find(m => m.days > streak);
  const daysToNext    = nextMilestone ? nextMilestone.days - streak : 0;

  const logsWithNotes = logs.filter(l => l.notes);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Progress</Text>
          <TouchableOpacity style={styles.reportBtn} onPress={openReportModal}>
            <Ionicons name="document-text-outline" size={15} color={COLORS.primary} />
            <Text style={styles.reportBtnText}>
              {(user as any)?.isPremium ? 'Therapist report' : 'Report (1 free)'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Streak hero */}
            <View style={styles.streakCard}>
              <View style={styles.streakLeft}>
                <Text style={styles.streakNum}>{streak}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
                {nextMilestone && (
                  <Text style={styles.nextMilestone}>
                    {daysToNext} day{daysToNext !== 1 ? 's' : ''} until {nextMilestone.icon} {nextMilestone.label}
                  </Text>
                )}
              </View>
              <Text style={styles.flameEmoji}>🔥</Text>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatBox value={stats?.totalResisted ?? 0} label="Resisted" color={COLORS.secondary} />
              <StatBox value={stats?.totalSos ?? 0}      label="SOS used" color={COLORS.primary}   />
              <StatBox value={stats?.totalUsed ?? 0}     label="Slips"    color={COLORS.warning}   />
            </View>

            {/* Weekly bar chart */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This week — times resisted</Text>
              <View style={styles.chart}>
                {weeklyData.map((val, i) => (
                  <View key={i} style={styles.barCol}>
                    <Text style={styles.barVal}>{val > 0 ? val : ''}</Text>
                    <View style={styles.barTrack}>
                      <View style={[
                        styles.barFill,
                        { height: `${(val / maxBar) * 100}%`, backgroundColor: val > 0 ? COLORS.primary : COLORS.border }
                      ]} />
                    </View>
                    <Text style={styles.barLabel}>{DAY_LABELS[i]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Milestones */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Milestones</Text>
              {MILESTONES.map(m => {
                const achieved = streak >= m.days;
                return (
                  <View key={m.days} style={[styles.milestoneRow, achieved && styles.milestoneAchieved]}>
                    <Text style={styles.milestoneIcon}>{m.icon}</Text>
                    <View style={styles.milestoneInfo}>
                      <Text style={[styles.milestoneName, achieved && styles.milestoneNameDone]}>
                        {m.label}
                      </Text>
                      <Text style={styles.milestoneDays}>{m.days} days clean</Text>
                    </View>
                    {achieved
                      ? <Ionicons name="checkmark-circle" size={22} color={COLORS.secondary} />
                      : <Text style={styles.milestoneLocked}>{m.days - streak}d left</Text>
                    }
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
      {/* Therapist Report Modal */}
      <Modal visible={reportModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Therapist Report</Text>
              <TouchableOpacity onPress={() => setReportModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              Select journal entries to include. Your streak, mood chart, and stability score are always included.
            </Text>

            {logsWithNotes.length > 0 ? (
              <ScrollView style={styles.logPicker} showsVerticalScrollIndicator={false}>
                {logsWithNotes.map(l => (
                  <TouchableOpacity
                    key={l.id}
                    style={styles.logPickerRow}
                    onPress={() => toggleLogSelection(l.id)}
                  >
                    <View style={[styles.logCheckbox, selectedLogIds.includes(l.id) && styles.logCheckboxOn]}>
                      {selectedLogIds.includes(l.id) && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logPickerDate}>
                        {new Date(l.loggedAt).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} · {l.addiction}
                      </Text>
                      <Text style={styles.logPickerNote} numberOfLines={2}>{l.notes}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noNotes}>No journal entries with notes found. The report will still include your stats and mood chart.</Text>
            )}

            <TouchableOpacity
              style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
              onPress={handleGenerateReport}
              disabled={generating}
            >
              {generating
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="share-outline" size={16} color="#fff" />
                    <Text style={styles.generateBtnText}>Generate & Share PDF</Text>
                  </>
              }
            </TouchableOpacity>
            {!(user as any)?.isPremium && (
              <Text style={styles.freeNote}>1 free report · Unlimited with Premium</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: COLORS.background },
  container:          { padding: 24, paddingBottom: 48 },
  titleRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title:              { fontSize: 24, fontWeight: '800', color: COLORS.text },
  reportBtn:          { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  reportBtnText:      { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  streakCard:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, borderRadius: 20, padding: 24, marginBottom: 16 },
  streakLeft:         { flex: 1 },
  streakNum:          { fontSize: 52, fontWeight: '900', color: '#fff', lineHeight: 58 },
  streakLabel:        { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  nextMilestone:      { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  flameEmoji:         { fontSize: 52 },
  statsRow:           { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox:            { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statNum:            { fontSize: 26, fontWeight: '800' },
  statLabel:          { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  card:               { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle:          { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  chart:              { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 },
  barCol:             { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barVal:             { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginBottom: 3, height: 14 },
  barTrack:           { width: '100%', flex: 1, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill:            { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel:           { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  milestoneRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  milestoneAchieved:  { opacity: 1 },
  milestoneIcon:      { fontSize: 24, marginRight: 12 },
  milestoneInfo:      { flex: 1 },
  milestoneName:      { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  milestoneNameDone:  { color: COLORS.text },
  milestoneDays:      { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  milestoneLocked:    { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

  // Report modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal:              { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, maxHeight: '80%' },
  modalHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle:         { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalDesc:          { fontSize: 13, color: COLORS.textMuted, marginBottom: 16, lineHeight: 18 },
  logPicker:          { maxHeight: 220, marginBottom: 16 },
  logPickerRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  logCheckbox:        { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  logCheckboxOn:      { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  logPickerDate:      { fontSize: 11, color: COLORS.textMuted, marginBottom: 2 },
  logPickerNote:      { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  noNotes:            { fontSize: 13, color: COLORS.textMuted, marginBottom: 16, fontStyle: 'italic' },
  generateBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14 },
  generateBtnDisabled:{ opacity: 0.6 },
  generateBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  freeNote:           { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: 10 },
});
