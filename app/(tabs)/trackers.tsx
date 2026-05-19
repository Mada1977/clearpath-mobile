import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import api from '../../src/services/api';
import { COLORS, ADDICTIONS } from '../../src/constants';

type Tracker = {
  id: string;
  category: string;
  name: string | null;
  startDate: string;
  isPaused: boolean;
  notes: string | null;
  daysSober: number;
};

const CATEGORY_ICONS: Record<string, string> = {
  smoking:      '🚬',
  alcohol:      '🍷',
  drugs:        '💊',
  gambling:     '🎰',
  pornography:  '🔒',
  gaming:       '🎮',
  social_media: '📱',
  shopping:     '🛍️',
};

export default function TrackersScreen() {
  const [trackers, setTrackers]   = useState<Tracker[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [category, setCategory]   = useState('smoking');
  const [customName, setCustomName] = useState('');
  const [saving, setSaving]       = useState(false);

  useFocusEffect(useCallback(() => { loadTrackers(); }, []));

  async function loadTrackers() {
    try {
      const { data } = await api.get('/trackers');
      setTrackers(data.trackers);
    } catch {}
    finally { setLoading(false); }
  }

  async function addTracker() {
    setSaving(true);
    try {
      const { data } = await api.post('/trackers', {
        category,
        name: customName.trim() || null,
        startDate: new Date().toISOString(),
      });
      setTrackers(prev => [...prev, data]);
      setModalVisible(false);
      setCustomName('');
      setCategory('smoking');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not create tracker.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePause(tracker: Tracker) {
    try {
      const { data } = await api.patch(`/trackers/${tracker.id}`, {
        isPaused: !tracker.isPaused,
      });
      setTrackers(prev => prev.map(t => t.id === data.id ? data : t));
    } catch {}
  }

  async function archiveTracker(id: string) {
    Alert.alert('Remove tracker', 'Archive this tracker?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/trackers/${id}`);
            setTrackers(prev => prev.filter(t => t.id !== id));
          } catch {}
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trackers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : trackers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No trackers yet</Text>
          <Text style={styles.emptyText}>Add your first addiction tracker to start counting your sober days.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyBtnText}>Add tracker</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {trackers.map(t => (
            <View key={t.id} style={[styles.card, t.isPaused && styles.cardPaused]}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>{CATEGORY_ICONS[t.category] ?? '🔷'}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{t.name || ADDICTIONS.find(a => a.value === t.category)?.label || t.category}</Text>
                  {t.isPaused && <Text style={styles.pausedBadge}>Paused</Text>}
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.daysNumber}>{t.daysSober}</Text>
                <Text style={styles.daysLabel}>days</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => togglePause(t)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name={t.isPaused ? 'play-circle-outline' : 'pause-circle-outline'}
                    size={22}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => archiveTracker(t.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="archive-outline" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add tracker modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Add tracker</Text>

              <Text style={styles.sheetLabel}>Category</Text>
              <View style={styles.chipWrap}>
                {ADDICTIONS.map(a => (
                  <TouchableOpacity
                    key={a.value}
                    style={[styles.chip, category === a.value && styles.chipActive]}
                    onPress={() => setCategory(a.value)}
                  >
                    <Text style={[styles.chipText, category === a.value && styles.chipTextActive]}>
                      {CATEGORY_ICONS[a.value]} {a.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sheetLabel}>Custom name (optional)</Text>
              <TextInput
                style={styles.input}
                value={customName}
                onChangeText={setCustomName}
                placeholder="e.g. Morning cigarettes"
                placeholderTextColor={COLORS.textMuted}
                maxLength={80}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={addTracker} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Start tracking today</Text>
                }
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.background },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  title:          { fontSize: 24, fontWeight: '800', color: COLORS.text },
  addBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  list:           { padding: 16, gap: 12, paddingBottom: 100 },
  card:           { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  cardPaused:     { opacity: 0.6 },
  cardLeft:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon:       { fontSize: 28 },
  cardInfo:       { flex: 1 },
  cardName:       { fontSize: 15, fontWeight: '700', color: COLORS.text },
  pausedBadge:    { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  cardRight:      { alignItems: 'center', marginHorizontal: 12 },
  daysNumber:     { fontSize: 26, fontWeight: '900', color: COLORS.primary },
  daysLabel:      { fontSize: 11, color: COLORS.textMuted },
  cardActions:    { flexDirection: 'row', gap: 10 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:      { fontSize: 56, marginBottom: 16 },
  emptyTitle:     { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptyText:      { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  emptyBtn:       { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  emptyBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle:     { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  sheetLabel:     { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, marginTop: 16 },
  chipWrap:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background },
  chipActive:     { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  chipText:       { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  input:          { backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: COLORS.text, marginTop: 4 },
  saveBtn:        { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
