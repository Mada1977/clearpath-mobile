import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { COLORS } from '../../src/constants';
import { useOffline } from '../../src/hooks/useOffline';
import { getCachedStats } from '../../src/services/offlineCache';

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
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

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

  const streak        = stats?.streak ?? 0;
  const weeklyData    = stats?.weeklyResisted ?? [0, 0, 0, 0, 0, 0, 0];
  const maxBar        = Math.max(...weeklyData, 1);
  const nextMilestone = MILESTONES.find(m => m.days > streak);
  const daysToNext    = nextMilestone ? nextMilestone.days - streak : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Progress</Text>

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
  title:              { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
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
});
