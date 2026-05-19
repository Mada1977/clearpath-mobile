import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants';
import api from '../src/services/api';

type DashboardData = {
  name: string | null;
  streak?: number;
  mood?: string | null;
};

const MOOD_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  great:    { emoji: '😊', label: 'Great',      color: '#10B981' },
  good:     { emoji: '🙂', label: 'Good',        color: '#34D399' },
  okay:     { emoji: '😐', label: 'Okay',        color: '#F59E0B' },
  rough:    { emoji: '😔', label: 'Struggling',  color: '#EF4444' },
};

const TIPS = [
  'Listen without judgment — presence matters more than advice.',
  'Celebrate small wins. Every sober day is a victory.',
  'Avoid shaming language. Recovery is non-linear.',
  'Encourage professional help when needed.',
  'Take care of yourself too — supporting someone in recovery is demanding.',
];

export default function SupporterDashboard() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [shareStreak, setShareStreak] = useState(true);
  const [shareMood, setShareMood] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    acceptAndLoad();
  }, [code]);

  async function acceptAndLoad() {
    try {
      // Accept invite if still pending
      await api.get(`/supporters/accept/${code}`);
      setAccepted(true);

      // Load dashboard
      const res = await api.get(`/supporters/dashboard/${code}`);
      setData(res.data.data);
      setShareStreak(res.data.shareStreak);
      setShareMood(res.data.shareMood);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  function handleSendEncouragement() {
    if (!message.trim()) return;
    // In a future update, this sends a message via the backend.
    // For now, show a confirmation.
    setSent(true);
    Alert.alert('Sent!', 'Your encouragement has been noted. Keep supporting them!');
    setMessage('');
  }

  if (!code) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>No invite code provided.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
          <Text style={styles.errorText}>This invite link is no longer valid.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const moodInfo = data.mood ? MOOD_MAP[data.mood] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Supporter Dashboard</Text>
        <Text style={styles.subtitle}>
          You are supporting{' '}
          <Text style={styles.nameHighlight}>{data.name || 'your loved one'}</Text>
          {' '}on their recovery journey.
        </Text>

        {/* Streak card */}
        {shareStreak && data.streak !== undefined && (
          <View style={[styles.card, styles.streakCard]}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNumber}>{data.streak}</Text>
            <Text style={styles.streakLabel}>day{data.streak !== 1 ? 's' : ''} sober</Text>
            {data.streak >= 7 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {data.streak >= 30 ? '🏆 30+ day streak!' : '⭐ 7+ day streak!'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Mood card */}
        {shareMood && moodInfo && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Last reported mood</Text>
            <View style={styles.moodRow}>
              <Text style={styles.moodEmoji}>{moodInfo.emoji}</Text>
              <Text style={[styles.moodText, { color: moodInfo.color }]}>{moodInfo.label}</Text>
            </View>
            {data.mood === 'rough' && (
              <Text style={styles.moodNote}>
                They might need extra support today. Consider reaching out.
              </Text>
            )}
          </View>
        )}

        {/* Encouragement input */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Send encouragement</Text>
          <Text style={styles.cardSub}>Write a short uplifting note for your next conversation.</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="I'm proud of you! Keep going…"
            placeholderTextColor={COLORS.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={280}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
            onPress={handleSendEncouragement}
            disabled={!message.trim()}
          >
            <Ionicons name="heart" size={16} color="#fff" />
            <Text style={styles.sendBtnText}>Send encouragement</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <Text style={styles.tipsTitle}>How to support someone in recovery</Text>
        {TIPS.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={styles.tipBullet}>
              <Text style={styles.tipBulletText}>{i + 1}</Text>
            </View>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.background },
  container:        { padding: 24, paddingBottom: 48 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loadingText:      { color: COLORS.textMuted, fontSize: 14, marginTop: 8 },
  errorText:        { color: COLORS.text, fontSize: 16, textAlign: 'center' },
  link:             { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  backBtn:          { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText:         { color: COLORS.primary, fontWeight: '600', fontSize: 15, marginLeft: 2 },
  title:            { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subtitle:         { fontSize: 14, color: COLORS.textMuted, marginBottom: 24, lineHeight: 20 },
  nameHighlight:    { color: COLORS.primary, fontWeight: '700' },
  card:             { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  streakCard:       { alignItems: 'center', paddingVertical: 28, backgroundColor: '#EEF2FF' },
  streakEmoji:      { fontSize: 36, marginBottom: 6 },
  streakNumber:     { fontSize: 64, fontWeight: '900', color: COLORS.primary, lineHeight: 68 },
  streakLabel:      { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
  badge:            { marginTop: 10, backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  badgeText:        { color: '#92400E', fontSize: 13, fontWeight: '700' },
  cardLabel:        { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  cardSub:          { fontSize: 13, color: COLORS.textMuted, marginBottom: 12 },
  moodRow:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moodEmoji:        { fontSize: 36 },
  moodText:         { fontSize: 22, fontWeight: '800' },
  moodNote:         { marginTop: 10, fontSize: 13, color: COLORS.danger, fontStyle: 'italic' },
  messageInput:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
  sendBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12 },
  sendBtnDisabled:  { opacity: 0.5 },
  sendBtnText:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  tipsTitle:        { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 8, marginBottom: 14 },
  tipRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  tipBullet:        { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary + '20', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tipBulletText:    { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  tipText:          { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
});
