import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PLANS = [
  { key: 'weekly',  price: '€8.99',  period: 'week',  label: 'Weekly',  badge: null },
  { key: 'monthly', price: '€12.99', period: 'month', label: 'Monthly', badge: 'Most popular' },
  { key: 'yearly',  price: '€69.99', period: 'year',  label: 'Yearly',  badge: 'Save 55%' },
];

const CRISIS_KEYWORDS = ['help', 'crisis', 'relapse', 'suicide', 'emergency', 'overdose'];

type Props = {
  visible: boolean;
  onClose: () => void;
  triggerMessage?: string;
};

export function UpgradePrompt({ visible, onClose, triggerMessage = '' }: Props) {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');

  // Never show if message contains crisis keywords
  const hasCrisis = CRISIS_KEYWORDS.some(kw =>
    triggerMessage.toLowerCase().includes(kw)
  );
  if (hasCrisis) return null;

  async function startTrial() {
    setLoading(true);
    try {
      await api.post('/users/me/start-trial');
      await refreshUser();
      onClose();
      Alert.alert('Trial started!', 'Your 3-day free trial has begun. Enjoy unlimited access!');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Could not start trial.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Text style={styles.headline}>Unlock your full{'\n'}recovery support</Text>
          <Text style={styles.subline}>
            You've used your 10 free messages today. Upgrade for unlimited AI support and more.
          </Text>

          {/* Plan cards */}
          <View style={styles.plansRow}>
            {PLANS.map(plan => (
              <TouchableOpacity
                key={plan.key}
                style={[styles.planCard, selectedPlan === plan.key && styles.planCardSelected]}
                onPress={() => setSelectedPlan(plan.key)}
                activeOpacity={0.8}
              >
                {plan.badge && (
                  <View style={[styles.planBadge, plan.key === 'monthly' ? styles.planBadgePopular : styles.planBadgeSave]}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}
                <Text style={styles.planLabel}>{plan.label}</Text>
                <Text style={[styles.planPrice, selectedPlan === plan.key && styles.planPriceSelected]}>
                  {plan.price}
                </Text>
                <Text style={styles.planPeriod}>/{plan.period}</Text>
                <Text style={styles.planTrial}>3-day free trial</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
            onPress={startTrial}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaBtnText}>Start 3-day free trial</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.laterBtn}>
            <Text style={styles.laterText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:              { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  closeBtn:           { alignSelf: 'flex-end', marginBottom: 8 },
  headline:           { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 8, lineHeight: 30 },
  subline:            { fontSize: 14, color: COLORS.textMuted, marginBottom: 20, lineHeight: 20 },
  plansRow:           { flexDirection: 'row', gap: 8, marginBottom: 20 },
  planCard:           { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, padding: 12, alignItems: 'center', position: 'relative', paddingTop: 20, backgroundColor: COLORS.background },
  planCardSelected:   { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  planBadge:          { position: 'absolute', top: -10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  planBadgePopular:   { backgroundColor: COLORS.primary },
  planBadgeSave:      { backgroundColor: COLORS.secondary },
  planBadgeText:      { color: '#fff', fontSize: 9, fontWeight: '800' },
  planLabel:          { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginBottom: 4 },
  planPrice:          { fontSize: 18, fontWeight: '900', color: COLORS.text },
  planPriceSelected:  { color: COLORS.primary },
  planPeriod:         { fontSize: 10, color: COLORS.textMuted },
  planTrial:          { fontSize: 9, color: COLORS.secondary, fontWeight: '700', marginTop: 4 },
  ctaBtn:             { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ctaBtnDisabled:     { opacity: 0.6 },
  ctaBtnText:         { color: '#fff', fontSize: 16, fontWeight: '800' },
  laterBtn:           { alignItems: 'center', paddingVertical: 12 },
  laterText:          { color: COLORS.textMuted, fontSize: 14 },
});
