import {
  Modal, View, Text, TouchableOpacity, FlatList,
  StyleSheet, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES, COLORS } from '../constants';

type Props = {
  visible: boolean;
  currentLocale: string;
  onSelect: (locale: string) => void;
  onClose: () => void;
};

export function LanguagePickerModal({ visible, currentLocale, onSelect, onClose }: Props) {
  const currentCode = currentLocale.split('-')[0].toLowerCase();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Choose language</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={LANGUAGES}
          keyExtractor={item => item.code}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const active = item.code === currentCode;
            return (
              <TouchableOpacity
                style={[styles.row, active && styles.rowActive]}
                onPress={() => { onSelect(item.locale); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <View style={styles.labels}>
                  <Text style={[styles.label, active && styles.labelActive]}>{item.nativeLabel}</Text>
                  <Text style={styles.sublabel}>{item.label}</Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:      { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '75%' },
  handle:     { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:      { fontSize: 17, fontWeight: '700', color: COLORS.text },
  list:       { paddingHorizontal: 12, paddingTop: 8 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderRadius: 12, marginBottom: 2 },
  rowActive:  { backgroundColor: COLORS.primary + '12' },
  flag:       { fontSize: 28, marginRight: 14 },
  labels:     { flex: 1 },
  label:      { fontSize: 16, fontWeight: '600', color: COLORS.text },
  labelActive:{ color: COLORS.primary },
  sublabel:   { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
});
