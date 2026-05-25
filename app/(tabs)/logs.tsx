import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { COLORS, ADDICTIONS } from '../../src/constants';

const LOG_TYPE_KEYS = [
  { value: 'resisted',    tKey: 'logs.resisted',   },
  { value: 'used',        tKey: 'logs.slipped',    },
  { value: 'craving_sos', tKey: 'logs.sosCraving', },
];

const TRIGGER_KEYS      = ['stress', 'boredom', 'social', 'emotional', 'habit', 'celebration', 'physical', 'seeing_others', 'unknown'];
const WORK_TRIGGER_KEYS = ['overworking', 'stress', 'fear_of_failure', 'need_for_control', 'perfectionism'];
const MOOD_KEYS         = ['rough', 'okay', 'good', 'great'];

export default function LogsScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
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
        Alert.alert(t('logs.sosAlert'), t('logs.sosAlertMsg'));
      } else {
        Alert.alert(
          t('logs.sosAlert'),
          type === 'resisted' ? t('logs.loggedResisted') : t('logs.loggedSlipped')
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || t('logs.couldNotSave'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('logs.title')}</Text>

        <Label text={t('logs.whatHappened')} />
        <Row>
          {LOG_TYPE_KEYS.map(ty => (
            <Chip key={ty.value} label={t(ty.tKey)} active={type === ty.value} onPress={() => setType(ty.value)} />
          ))}
        </Row>

        <Label text={t('logs.whichAddiction')} />
        <View style={styles.wrap}>
          {(user?.addictions?.length ? user.addictions : ADDICTIONS.map(a => a.value)).map(a => {
            const label = t('addictions.' + a, ADDICTIONS.find(x => x.value === a)?.label ?? a);
            return <Chip key={a} label={label} active={addiction === a} onPress={() => setAddiction(a)} />;
          })}
        </View>

        <Label text={t('logs.trigger')} />
        <View style={styles.wrap}>
          {(addiction === 'work' ? WORK_TRIGGER_KEYS : TRIGGER_KEYS).map(tk => (
            <Chip key={tk} label={t('logs.' + tk)} active={trigger === tk} onPress={() => setTrigger(tk)} />
          ))}
        </View>

        <Label text={t('logs.mood')} />
        <Row>
          {MOOD_KEYS.map(mk => (
            <Chip key={mk} label={t('logs.' + mk)} active={mood === mk} onPress={() => setMood(mk)} />
          ))}
        </Row>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('logs.saveLog')}</Text>}
        </TouchableOpacity>

        {sosSteps.length > 0 && (
          <View style={styles.sosBox}>
            <Text style={styles.sosTitle}>{t('logs.sosStepsTitle')}</Text>
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
