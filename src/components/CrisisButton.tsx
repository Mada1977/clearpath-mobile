import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getHelplinesByLocale } from '../constants/helplines';
import { COLORS } from '../constants';
import { pauseMusic, getMusicEnabled, playMusic } from '../services/audioPlayer';

export function CrisisButton() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const helplines = getHelplinesByLocale(user?.locale ?? 'en-US');

  function call(number: string) {
    Linking.openURL(`tel:${number.replace(/\s/g, '')}`);
  }

  async function openModal() {
    await pauseMusic();
    setVisible(true);
  }

  async function closeModal() {
    setVisible(false);
    const enabled = await getMusicEnabled();
    if (enabled) await playMusic();
  }

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={openModal}
        activeOpacity={0.85}
        accessibilityLabel="Crisis helplines"
        accessibilityRole="button"
      >
        <Ionicons name="call" size={22} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Crisis helplines</Text>
                <TouchableOpacity onPress={closeModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.sub}>Free, confidential support — available 24/7</Text>

              {helplines.map((h, i) => (
                <TouchableOpacity key={i} style={styles.row} onPress={() => call(h.number)}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{h.name}</Text>
                    <Text style={styles.rowNumber}>{h.number}</Text>
                  </View>
                  <View style={styles.callBtn}>
                    <Ionicons name="call" size={16} color="#fff" />
                    <Text style={styles.callBtnText}>Call</Text>
                  </View>
                </TouchableOpacity>
              ))}

              <Text style={styles.footer}>
                In immediate danger? Call emergency services: 112 · 911 · 999
              </Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
    zIndex: 999,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.danger,
  },
  sub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  rowNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  footer: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});
