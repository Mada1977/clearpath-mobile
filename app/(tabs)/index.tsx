import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { COLORS, ADDICTIONS } from '../../src/constants';
import { useOffline } from '../../src/hooks/useOffline';
import { cacheStats, getCachedStats, cacheCopingTips } from '../../src/services/offlineCache';
import { useRouter } from 'expo-router';
import { StabilityScore } from '../../src/components/StabilityScore';
import { getMusicEnabled, loadMusic, playMusic, pauseMusic, toggleMusic } from '../../src/services/audioPlayer';

type TrackerSummary = { id: string; category: string; name: string | null; daysSober: number };
type StabilityData  = { score: number; label: string };

type Stats = {
  streak: number;
  totalResisted: number;
  totalUsed: number;
  totalSos: number;
};

const TRACKER_ICONS: Record<string, string> = {
  smoking:'🚬', alcohol:'🍷', drugs:'💊', gambling:'🎰',
  pornography:'🔒', gaming:'🎮', social_media:'📱', shopping:'🛍️',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackers, setTrackers]   = useState<TrackerSummary[]>([]);
  const [stability, setStability] = useState<StabilityData | null>(null);
  const [musicOn, setMusicOn] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchTrackers();
    fetchStability();
    initMusic();
  }, []);

  async function initMusic() {
    await loadMusic();
    const enabled = await getMusicEnabled();
    setMusicOn(enabled);
    if (enabled) await playMusic();
  }

  async function handleMusicToggle() {
    const next = await toggleMusic();
    setMusicOn(next);
  }

  useEffect(() => {
    if (!isOffline) { fetchStats(); fetchTrackers(); fetchStability(); }
  }, [isOffline]);

  async function fetchTrackers() {
    try {
      const { data } = await api.get('/trackers');
      setTrackers(data.trackers.slice(0, 4));
    } catch {}
  }

  async function fetchStability() {
    if (isOffline) return;
    try {
      const { data } = await api.get('/users/me/stability-score');
      setStability({ score: data.score, label: data.label });
    } catch {}
  }

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
      cacheStats(data);
      if (user?.locale) cacheCopingTips(user.locale);
    } catch {
      const cached = await getCachedStats();
      if (cached) setStats(cached);
    } finally {
      setLoading(false);
    }
  }

  const addictionLabels = (user?.addictions ?? [])
    .map(a => ADDICTIONS.find(x => x.value === a)?.label)
    .filter(Boolean)
    .join(', ') || 'None set yet';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.safe}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
          <Text style={styles.offlineBannerText}>Offline mode — showing cached data</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()}, {user?.name || 'friend'}</Text>
            <Text style={styles.sub}>Keep going — every day counts.</Text>
          </View>
          <TouchableOpacity style={styles.musicBtn} onPress={handleMusicToggle} activeOpacity={0.7}>
            <Ionicons name={musicOn ? 'musical-notes' : 'musical-notes-outline'} size={20} color={musicOn ? COLORS.primary : COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Streak card */}
        <View style={styles.streakCard}>
          <Ionicons name="flame" size={40} color="#F59E0B" />
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />
          ) : (
            <>
              <Text style={styles.streakNumber}>{stats?.streak ?? 0}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats?.totalResisted ?? 0}</Text>
            <Text style={styles.statLabel}>Resisted</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats?.totalSos ?? 0}</Text>
            <Text style={styles.statLabel}>SOS used</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats?.totalUsed ?? 0}</Text>
            <Text style={styles.statLabel}>Slips</Text>
          </View>
        </View>

        {/* Stability score */}
        {stability && (
          <StabilityScore score={stability.score} label={stability.label} />
        )}

        {/* Tracker summary */}
        {trackers.length > 0 && (
          <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/trackers')} activeOpacity={0.8}>
            <Text style={styles.cardTitle}>Active trackers</Text>
            <View style={styles.trackerRow}>
              {trackers.map(t => (
                <View key={t.id} style={styles.trackerChip}>
                  <Text style={styles.trackerIcon}>{TRACKER_ICONS[t.category] ?? '🔷'}</Text>
                  <Text style={styles.trackerDays}>{t.daysSober}d</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}

        {/* Profile summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My recovery</Text>
          <Row icon="warning-outline" label="Working on" value={addictionLabels} />
          <Row icon="trending-up-outline" label="Stage" value={user?.stage ?? '—'} />
          <Row icon="chatbubble-outline" label="Daily AI messages" value={`${user?.dailyGoal ?? 10} / day`} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={COLORS.primary} style={{ marginRight: 10 }} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: COLORS.background },
  offlineBanner:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.textMuted, paddingHorizontal: 16, paddingVertical: 6 },
  offlineBannerText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  trackerRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  trackerChip:       { alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 54 },
  trackerIcon:       { fontSize: 20, marginBottom: 2 },
  trackerDays:       { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  container:    { padding: 24 },
  greetingRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 28 },
  greeting:     { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sub:          { fontSize: 14, color: COLORS.textMuted },
  musicBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  streakCard:   { backgroundColor: COLORS.card, borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  streakNumber: { fontSize: 56, fontWeight: '900', color: COLORS.primary, lineHeight: 64 },
  streakLabel:  { fontSize: 16, color: COLORS.textMuted, marginTop: 4 },
  statsRow:     { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox:      { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statNumber:   { fontSize: 26, fontWeight: '800', color: COLORS.text },
  statLabel:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  card:         { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle:    { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  row:          { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rowLabel:     { flex: 1, fontSize: 14, color: COLORS.textMuted },
  rowValue:     { fontSize: 14, fontWeight: '600', color: COLORS.text },
});
