import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../src/constants';
import api from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { usePremium } from '../src/context/PremiumContext';
import {
  getOfferings,
  purchasePackage as rcPurchase,
  restorePurchases as rcRestore,
  isCancelledError,
} from '../src/services/purchases';

// ─── Static fallback plan data ────────────────────────────────────────────────
const PLANS = [
  { key: 'weekly',  price: '€6.99',  period: '/week',  label: 'Weekly',  badge: null,                    trialNote: '3 days free, then €6.99/week',   rcType: 'WEEKLY'  },
  { key: 'monthly', price: '€9.99',  period: '/month', label: 'Monthly', badge: 'Most popular',           trialNote: '3 days free, then €9.99/month',  rcType: 'MONTHLY' },
  { key: 'yearly',  price: '€59.99', period: '/year',  label: 'Yearly',  badge: 'Best value — save 50%', trialNote: '3 days free, then €59.99/year',  rcType: 'ANNUAL'  },
];

const FEATURES = [
  { icon: 'chatbubbles',      label: 'Unlimited AI chat',                free: '10 msg/day',  premium: 'Unlimited'  },
  { icon: 'people',           label: 'Family & Supporter mode',           free: false,         premium: true         },
  { icon: 'document-text',    label: 'Therapist weekly PDF report',       free: '1 free',      premium: 'Unlimited'  },
  { icon: 'analytics',        label: 'Full stability score details',      free: false,         premium: true         },
  { icon: 'notifications',    label: 'Proactive AI check-ins',            free: false,         premium: true         },
  { icon: 'timer',            label: 'Multi-addiction tracking',          free: '1 tracker',   premium: 'Unlimited'  },
  { icon: 'call',             label: 'Crisis helplines + SOS',            free: true,          premium: true         },
  { icon: 'globe',            label: 'All 10 languages',                  free: true,          premium: true         },
];

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export default function PaywallScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { isPremium, isOnTrial, trialDaysLeft } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);

  // RevenueCat offerings (null = not loaded or web)
  const [offering, setOffering] = useState<any | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(isNative);

  useEffect(() => {
    if (!isNative) return;
    getOfferings().then(o => {
      setOffering(o);
      setOfferingsLoading(false);
    });
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Build a map of packageType → RC package from the current offering
  function getRcPackageMap(): Record<string, any> {
    const map: Record<string, any> = {};
    if (offering?.availablePackages) {
      for (const pkg of offering.availablePackages) {
        map[pkg.packageType] = pkg;
      }
    }
    return map;
  }

  function getRcPackage(plan: typeof PLANS[number]): any | null {
    return getRcPackageMap()[plan.rcType] ?? null;
  }

  // Returns the localised price string from RevenueCat if available,
  // otherwise falls back to the static fallback.
  function displayPrice(plan: typeof PLANS[number]): string {
    const pkg = getRcPackage(plan);
    return pkg?.product?.priceString ?? plan.price;
  }

  // Returns the intro/trial note. If RevenueCat has intro pricing info, use it.
  function displayTrialNote(plan: typeof PLANS[number]): string {
    const pkg = getRcPackage(plan);
    const intro = pkg?.product?.introPrice;
    if (intro && intro.price === 0) {
      const unit = intro.periodUnit?.toLowerCase() ?? 'day';
      const count = intro.periodNumberOfUnits ?? 3;
      return `${count} ${unit}${count !== 1 ? 's' : ''} free, then ${pkg.product.priceString}${plan.period}`;
    }
    return plan.trialNote;
  }

  // ── Purchase flow ─────────────────────────────────────────────────────────

  async function handleNativePurchase() {
    const plan = PLANS.find(p => p.key === selectedPlan)!;
    const pkg = getRcPackage(plan);
    if (!pkg) {
      Alert.alert('Not available', 'This plan is not available right now. Please try again later.');
      return;
    }

    setLoading(true);
    try {
      await rcPurchase(pkg);
      // Sync backend so server-side limits (AI messages, etc.) are enforced
      await api.post('/users/me/upgrade', { plan: selectedPlan }).catch(() => {});
      await refreshUser();
      Alert.alert(
        'Welcome to Premium! ⭐',
        `You're now on the ${selectedPlan} plan. Enjoy unlimited access!`,
        [{ text: "Let's go!", onPress: () => router.back() }]
      );
    } catch (err: any) {
      if (!isCancelledError(err)) {
        Alert.alert('Purchase failed', err?.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Web / no-RC fallback — uses the backend trial/upgrade endpoints
  async function handleWebFallback() {
    setLoading(true);
    try {
      if (!isPremium) {
        await api.post('/users/me/start-trial');
        await refreshUser();
        Alert.alert(
          'Trial started! 🎉',
          'Your 3-day free trial has begun. Enjoy full access to Bravely Path.',
          [{ text: 'Great!', onPress: () => router.back() }]
        );
      } else {
        await api.post('/users/me/upgrade', { plan: selectedPlan });
        await refreshUser();
        Alert.alert(
          'Welcome to Premium! ⭐',
          `You're now on the ${selectedPlan} plan.`,
          [{ text: "Let's go!", onPress: () => router.back() }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error ?? 'Could not complete purchase.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    try {
      await rcRestore();
      await refreshUser();
      Alert.alert('Restored', 'Your purchases have been restored.');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not restore purchases.');
    } finally {
      setLoading(false);
    }
  }

  function handleCta() {
    if (isNative && offering) {
      handleNativePurchase();
    } else {
      handleWebFallback();
    }
  }

  // ── CTA label ─────────────────────────────────────────────────────────────

  function ctaLabel(): string {
    if (isPremium) return `Switch to ${selectedPlan} plan`;
    if (isNative && offering) {
      const plan = PLANS.find(p => p.key === selectedPlan)!;
      const pkg = getRcPackage(plan);
      const hasIntro = pkg?.product?.introPrice?.price === 0;
      return hasIntro ? 'Start free trial' : `Subscribe — ${displayPrice(plan)}${plan.period}`;
    }
    return 'Start 3-day free trial';
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {isPremium ? (
          <View style={styles.premiumBanner}>
            <Text style={styles.premiumBannerText}>
              {isOnTrial ? `⭐ Trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left` : '⭐ You have Premium'}
            </Text>
          </View>
        ) : null}

        <Text style={styles.hero}>Join thousands on{'\n'}the path to recovery</Text>
        <Text style={styles.heroSub}>
          Get unlimited AI support, family sharing, therapist reports, and more.
        </Text>

        {/* Feature comparison */}
        <View style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <Text style={[styles.featureCol, { flex: 2 }]}>Feature</Text>
            <Text style={styles.featureCol}>Free</Text>
            <Text style={[styles.featureCol, { color: COLORS.primary }]}>Premium</Text>
          </View>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureRow, i % 2 === 0 && styles.featureRowAlt]}>
              <View style={[styles.featureName, { flex: 2 }]}>
                <Ionicons name={f.icon as any} size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
              <Text style={styles.featureCol}>
                {f.free === true ? '✓' : f.free === false ? '—' : f.free}
              </Text>
              <Text style={[styles.featureCol, { color: COLORS.secondary, fontWeight: '700' }]}>
                {f.premium === true ? '✓' : f.premium}
              </Text>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <Text style={styles.sectionTitle}>Choose your plan</Text>
        {offeringsLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : (
          PLANS.map(plan => (
            <TouchableOpacity
              key={plan.key}
              style={[styles.planRow, selectedPlan === plan.key && styles.planRowSelected]}
              onPress={() => setSelectedPlan(plan.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.radio, selectedPlan === plan.key && styles.radioSelected]}>
                {selectedPlan === plan.key && <View style={styles.radioDot} />}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.planTitleRow}>
                  <Text style={styles.planName}>{plan.label}</Text>
                  {plan.badge && (
                    <View style={[styles.planBadge, plan.key === 'monthly' ? styles.badgePopular : styles.badgeSave]}>
                      <Text style={styles.planBadgeText}>{plan.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.planNote}>{displayTrialNote(plan)}</Text>
              </View>
              <Text style={styles.planPrice}>
                {displayPrice(plan)}<Text style={styles.planPeriod}>{plan.period}</Text>
              </Text>
            </TouchableOpacity>
          ))
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, (loading || offeringsLoading) && styles.ctaBtnDisabled]}
          onPress={handleCta}
          disabled={loading || offeringsLoading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaBtnText}>{ctaLabel()}</Text>}
        </TouchableOpacity>

        {isNative && (
          <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={loading}>
            <Text style={styles.restoreText}>Already subscribed? Restore purchase</Text>
          </TouchableOpacity>
        )}
        {!isNative && (
          <TouchableOpacity style={styles.restoreBtn}>
            <Text style={styles.restoreText}>Already subscribed? Restore purchase</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.background },
  container:        { padding: 24, paddingBottom: 48 },
  backBtn:          { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText:         { color: COLORS.primary, fontWeight: '600', fontSize: 15, marginLeft: 2 },
  premiumBanner:    { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 16, alignItems: 'center' },
  premiumBannerText:{ color: '#92400E', fontWeight: '700', fontSize: 14 },
  hero:             { fontSize: 28, fontWeight: '900', color: COLORS.text, lineHeight: 34, marginBottom: 8 },
  heroSub:          { fontSize: 14, color: COLORS.textMuted, lineHeight: 20, marginBottom: 24 },
  featureCard:      { backgroundColor: COLORS.card, borderRadius: 16, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  featureHeader:    { flexDirection: 'row', backgroundColor: COLORS.primary + '12', padding: 12 },
  featureRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  featureRowAlt:    { backgroundColor: COLORS.background },
  featureName:      { flexDirection: 'row', alignItems: 'center' },
  featureLabel:     { fontSize: 12, color: COLORS.text, flex: 1 },
  featureCol:       { width: 56, textAlign: 'center', fontSize: 12, color: COLORS.textMuted },
  sectionTitle:     { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  planRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: COLORS.border },
  planRowSelected:  { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  radio:            { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected:    { borderColor: COLORS.primary },
  radioDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  planTitleRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  planName:         { fontSize: 15, fontWeight: '700', color: COLORS.text },
  planNote:         { fontSize: 11, color: COLORS.textMuted },
  planPrice:        { fontSize: 18, fontWeight: '900', color: COLORS.text },
  planPeriod:       { fontSize: 12, fontWeight: '400', color: COLORS.textMuted },
  planBadge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgePopular:     { backgroundColor: COLORS.primary },
  badgeSave:        { backgroundColor: COLORS.secondary },
  planBadgeText:    { color: '#fff', fontSize: 9, fontWeight: '800' },
  ctaBtn:           { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  ctaBtnDisabled:   { opacity: 0.6 },
  ctaBtnText:       { color: '#fff', fontSize: 16, fontWeight: '800' },
  restoreBtn:       { alignItems: 'center', paddingVertical: 14 },
  restoreText:      { color: COLORS.textMuted, fontSize: 13 },
});
