import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { COLORS, ADDICTIONS } from '../../src/constants';

type Stats = {
  streak: number;
  totalResisted: number;
  totalUsed: number;
  totalSos: number;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const { data } = await api.get('/users/me/stats');
      setStats(data);
    } catch {
      // stats unavailable, show empty state
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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.greeting}>{greeting()}, {user?.name || 'friend'}</Text>
        <Text style={styles.sub}>Keep going — every day counts.</Text>

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
  safe:         { flex: 1, backgroundColor: COLORS.background },
  container:    { padding: 24 },
  greeting:     { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sub:          { fontSize: 14, color: COLORS.textMuted, marginBottom: 28 },
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
