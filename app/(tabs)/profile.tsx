import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { usePremium } from '../../src/context/PremiumContext';
import api from '../../src/services/api';
import { COLORS, ADDICTIONS, STAGES } from '../../src/constants';
import { useLanguage } from '../../src/hooks/useLanguage';
import { LanguagePickerModal } from '../../src/components/LanguagePickerModal';

type SupporterLink = {
  id: string;
  supporterEmail: string;
  inviteCode: string;
  status: 'pending' | 'active' | 'revoked';
  shareStreak: boolean;
  shareMood: boolean;
};

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { currentLanguage, setLanguage } = useLanguage();
  const { isPremium, isOnTrial, trialDaysLeft } = usePremium();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [selectedAddictions, setSelectedAddictions] = useState<string[]>(user?.addictions ?? []);
  const [stage, setStage] = useState(user?.stage ?? 'curious');

  // Supporters state
  const [supporters, setSupporters] = useState<SupporterLink[]>([]);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [shareStreak, setShareStreak] = useState(true);
  const [shareMood, setShareMood] = useState(false);
  const [inviting, setInviting] = useState(false);

  useFocusEffect(useCallback(() => {
    loadSupporters();
  }, []));

  async function loadSupporters() {
    try {
      const res = await api.get('/supporters/mine');
      setSupporters(res.data.supporters);
    } catch {}
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await api.post('/supporters/invite', {
        supporterEmail: inviteEmail.trim(),
        shareStreak,
        shareMood,
      });
      const code = res.data.inviteCode;
      setInviteModalVisible(false);
      setInviteEmail('');
      await loadSupporters();
      Share.share({
        message: `I'd like to share my recovery progress with you on Bravely Path. Use this invite code to follow my journey: ${code}`,
        title: 'Bravely Path — Supporter Invite',
      });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not create invite.');
    } finally {
      setInviting(false);
    }
  }

  async function revokeSupporter(id: string, email: string) {
    Alert.alert('Revoke access', `Remove ${email} as your supporter?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/supporters/${id}`);
            await loadSupporters();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Could not revoke.');
          }
        },
      },
    ]);
  }

  async function shareInviteCode(code: string) {
    Share.share({
      message: `Use this code to follow my Bravely Path recovery journey: ${code}`,
      title: 'Bravely Path — Supporter Invite',
    });
  }

  function toggleAddiction(value: string) {
    setSelectedAddictions(prev =>
      prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]
    );
  }

  async function handleLanguageSelect(locale: string) {
    await setLanguage(locale);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.patch('/users/me', { addictions: selectedAddictions, stage });
      await refreshUser();
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'AGE_VERIFICATION_REQUIRED') {
        Alert.alert(
          'Age verification required',
          'You must confirm you are 18+ to add this content.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'I confirm I am 18+',
              onPress: async () => {
                await api.post('/users/me/verify-age', { confirmed: true });
                await api.patch('/users/me', { addictions: selectedAddictions, stage });
                await refreshUser();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', err.response?.data?.error || 'Could not save profile.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        {/* Account card */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || user?.email || 'U')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Anonymous'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {isPremium ? (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>
                {isOnTrial ? `⭐ Free Trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left` : '⭐ Premium'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.goPremiumBtn} onPress={() => router.push('/paywall')}>
              <Ionicons name="star-outline" size={14} color="#fff" />
              <Text style={styles.goPremiumText}>Go Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Language selector */}
        <Text style={styles.sectionLabel}>Language</Text>
        <TouchableOpacity style={styles.langRow} onPress={() => setLangModalVisible(true)} activeOpacity={0.7}>
          <Text style={styles.langFlag}>{currentLanguage.flag}</Text>
          <View style={styles.langLabels}>
            <Text style={styles.langName}>{currentLanguage.nativeLabel}</Text>
            <Text style={styles.langSub}>{currentLanguage.label} · AI responds in this language</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Addictions */}
        <Text style={styles.sectionLabel}>What are you working on?</Text>
        <View style={styles.wrap}>
          {ADDICTIONS.map(a => (
            <TouchableOpacity
              key={a.value}
              style={[styles.chip, selectedAddictions.includes(a.value) && styles.chipActive]}
              onPress={() => toggleAddiction(a.value)}
            >
              <Text style={[styles.chipText, selectedAddictions.includes(a.value) && styles.chipTextActive]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stage */}
        <Text style={styles.sectionLabel}>Your current stage</Text>
        <View style={styles.wrap}>
          {STAGES.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[styles.chip, stage === s.value && styles.chipActive]}
              onPress={() => setStage(s.value)}
            >
              <Text style={[styles.chipText, stage === s.value && styles.chipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save changes</Text>}
        </TouchableOpacity>

        {/* Family & Supporters */}
        <Text style={styles.sectionLabel}>Family & Supporters</Text>
        <View style={styles.card}>
          <Text style={styles.supportersDesc}>
            Invite a trusted family member or friend to see your progress. They'll see only what you choose to share.
          </Text>
          <TouchableOpacity style={styles.inviteBtn} onPress={() => setInviteModalVisible(true)}>
            <Ionicons name="person-add-outline" size={16} color={COLORS.primary} />
            <Text style={styles.inviteBtnText}>Invite a supporter</Text>
          </TouchableOpacity>

          {supporters.length > 0 && (
            <View style={styles.supporterList}>
              {supporters.map(s => (
                <View key={s.id} style={styles.supporterRow}>
                  <View style={styles.supporterInfo}>
                    <View style={[styles.statusDot, { backgroundColor: s.status === 'active' ? COLORS.secondary : COLORS.warning }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.supporterEmail}>{s.supporterEmail}</Text>
                      <Text style={styles.supporterStatus}>
                        {s.status === 'active' ? 'Active' : 'Pending'} ·{' '}
                        {s.shareStreak ? 'Streak' : ''}{s.shareStreak && s.shareMood ? ' + ' : ''}{s.shareMood ? 'Mood' : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.supporterActions}>
                    {s.status === 'pending' && (
                      <TouchableOpacity onPress={() => shareInviteCode(s.inviteCode)} style={styles.iconBtn}>
                        <Ionicons name="share-outline" size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => revokeSupporter(s.id, s.supporterEmail)} style={styles.iconBtn}>
                      <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Invite modal */}
      <Modal visible={inviteModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Invite a supporter</Text>
            <Text style={styles.modalDesc}>
              They'll receive a code to view your progress in Bravely Path.
            </Text>

            <Text style={styles.inputLabel}>Supporter's email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="their@email.com"
              placeholderTextColor={COLORS.textMuted}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>What can they see?</Text>
            <TouchableOpacity style={styles.toggleRow} onPress={() => setShareStreak(v => !v)}>
              <View style={[styles.toggle, shareStreak && styles.toggleOn]}>
                {shareStreak && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.toggleLabel}>Sobriety streak (days sober)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggleRow} onPress={() => setShareMood(v => !v)}>
              <View style={[styles.toggle, shareMood && styles.toggleOn]}>
                {shareMood && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.toggleLabel}>Last reported mood</Text>
            </TouchableOpacity>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setInviteModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, (!inviteEmail.trim() || inviting) && styles.modalBtnDisabled]}
                onPress={sendInvite}
                disabled={!inviteEmail.trim() || inviting}
              >
                {inviting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Send invite</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LanguagePickerModal
        visible={langModalVisible}
        currentLocale={user?.locale ?? 'en-US'}
        onSelect={handleLanguageSelect}
        onClose={() => setLangModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.background },
  container:       { padding: 24, paddingBottom: 48 },
  title:           { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 24 },
  card:            { backgroundColor: COLORS.card, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  avatar:          { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:      { color: '#fff', fontSize: 28, fontWeight: '800' },
  name:            { fontSize: 18, fontWeight: '700', color: COLORS.text },
  email:           { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  premiumBadge:    { marginTop: 10, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  premiumText:     { color: '#92400E', fontSize: 12, fontWeight: '700' },
  goPremiumBtn:    { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  goPremiumText:   { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionLabel:    { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, marginBottom: 10, marginTop: 18 },
  langRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  langFlag:        { fontSize: 28, marginRight: 14 },
  langLabels:      { flex: 1 },
  langName:        { fontSize: 16, fontWeight: '600', color: COLORS.text },
  langSub:         { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  wrap:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive:      { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  chipText:        { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chipTextActive:  { color: COLORS.primary, fontWeight: '700' },
  saveButton:      { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
  saveButtonText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutButton:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingVertical: 14 },
  logoutText:      { color: COLORS.danger, fontSize: 15, fontWeight: '600' },

  // Supporters
  supportersDesc:      { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 14 },
  inviteBtn:           { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  inviteBtnText:       { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  supporterList:       { marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, gap: 12 },
  supporterRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  supporterInfo:       { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot:           { width: 8, height: 8, borderRadius: 4 },
  supporterEmail:      { fontSize: 14, fontWeight: '600', color: COLORS.text },
  supporterStatus:     { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  supporterActions:    { flexDirection: 'row', gap: 4 },
  iconBtn:             { padding: 6 },

  // Invite modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal:              { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
  modalTitle:         { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  modalDesc:          { fontSize: 13, color: COLORS.textMuted, marginBottom: 20, lineHeight: 18 },
  inputLabel:         { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  textInput:          { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text, marginBottom: 16 },
  toggleRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  toggle:             { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  toggleOn:           { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  toggleLabel:        { fontSize: 14, color: COLORS.text },
  modalBtns:          { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn:     { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalCancelText:    { color: COLORS.textMuted, fontWeight: '600', fontSize: 15 },
  modalConfirmBtn:    { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalConfirmText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalBtnDisabled:   { opacity: 0.5 },
});
