import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { COLORS, ADDICTIONS } from '../../src/constants';

const LOG_TYPES = [
  { value: 'resisted',    label: 'Resisted',     icon: '💪' },
  { value: 'used',        label: 'Slipped',       icon: '😔' },
  { value: 'craving_sos', label: 'SOS Craving',   icon: '🆘' },
];

const TRIGGERS = ['stress', 'boredom', 'social', 'emotional', 'habit', 'celebration', 'physical', 'seeing_others', 'unknown'];
const MOODS    = ['rough', 'okay', 'good', 'great'];

export default function LogsScreen() {
  const { user } = useAuth();
  const [type, setType]           = useState('resisted');
  const [addiction, setAddiction] = useState(user?.addictions?.[0] || 'smoking');
  const [trigger, setTrigger]     = useState('stress');
  const [mood, setMood]           = useState('okay');
  const [loading, setLoading]     = useState(false);
  const [sosSteps, setSosSteps]   = useState<string[]>([]);

  async function handleSubmit() {
    setLoading(true);
    setSosSteps([]);
    try {
      const { data } = await api.post('/logs', { type, addiction, trigger, mood });
      if (data.sos?.length) {
        setSosSteps(data.sos);
        Alert.alert('SOS Steps', 'Your personalised steps are shown below.');
      } else {
        Alert.alert('Logged!', type === 'resisted' ? 'Great job staying strong! 💪' : 'It\'s okay — tomorrow is a new day.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not save log.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Log entry</Text>

        <Label text="What happened?" />
        <Row>
          {LOG_TYPES.map(t => (
            <Chip key={t.value} label={`${t.icon} ${t.label}`} active={type === t.value} onPress={() => setType(t.value)} />
          ))}
        </Row>

        <Label text="Which addiction?" />
        <View style={styles.wrap}>
          {(user?.addictions?.length ? user.addictions : ADDICTIONS.map(a => a.value)).map(a => {
            const label = ADDICTIONS.find(x => x.value === a)?.label ?? a;
            return <Chip key={a} label={label} active={addiction === a} onPress={() => setAddiction(a)} />;
          })}
        </View>

        <Label text="Trigger?" />
        <View style={styles.wrap}>
          {TRIGGERS.map(t => <Chip key={t} label={t} active={trigger === t} onPress={() => setTrigger(t)} />)}
        </View>

        <Label text="Mood?" />
        <Row>
          {MOODS.map(m => <Chip key={m} label={m} active={mood === m} onPress={() => setMood(m)} />)}
        </Row>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save log</Text>}
        </TouchableOpacity>

        {sosSteps.length > 0 && (
          <View style={styles.sosBox}>
            <Text style={styles.sosTitle}>Your SOS steps</Text>
            {sosSteps.map((step, i) => (
              <Text key={i} style={styles.sosStep}>{i + 1}. {step}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.background },
  container:     { padding: 24, paddingBottom: 48 },
  title:         { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 24 },
  label:         { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, marginBottom: 10, marginTop: 18 },
  row:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wrap:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive:    { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  chipText:      { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive:{ color: COLORS.primary, fontWeight: '700' },
  button:        { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 32 },
  buttonText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  sosBox:        { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16, marginTop: 24 },
  sosTitle:      { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  sosStep:       { fontSize: 14, color: COLORS.text, lineHeight: 22, marginBottom: 6 },
});
