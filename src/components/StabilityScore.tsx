import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../constants';

type Props = { score: number; label: string };

const W = 160;
const CX = 80;
const CY = 80;
const R  = 58;
const SW = 14; // stroke width

function polarToXY(angleDeg: number) {
  const rad = angleDeg * (Math.PI / 180);
  return {
    x: +(CX + R * Math.cos(rad)).toFixed(3),
    y: +(CY - R * Math.sin(rad)).toFixed(3),
  };
}

// Counterclockwise arc in SVG screen space (sweep=0) from left to right = upper semicircle
function buildArc(startDeg: number, endDeg: number): string {
  if (Math.abs(startDeg - endDeg) < 0.5) return '';
  const s = polarToXY(startDeg);
  const e = polarToXY(endDeg);
  // Going counterclockwise from 180° toward 0° stays in the upper half
  return `M ${s.x} ${s.y} A ${R} ${R} 0 0 0 ${e.x} ${e.y}`;
}

const TRACK_D = buildArc(180, 0); // full semicircle track

function scoreColor(score: number) {
  if (score >= 70) return COLORS.secondary;  // green
  if (score >= 40) return '#F59E0B';          // amber
  return COLORS.danger;                        // red
}

export function StabilityScore({ score, label }: Props) {
  const [infoVisible, setInfoVisible] = useState(false);

  // Fill: 180° → (180 - score/100*180)°
  const fillEndDeg = 180 - (Math.min(score, 100) / 100) * 180;
  const fillD = score > 0 ? buildArc(180, fillEndDeg) : '';
  const color = scoreColor(score);

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={() => setInfoVisible(true)} activeOpacity={0.85}>
        <Text style={styles.heading}>Daily stability score</Text>
        <Svg width={W} height={94} viewBox={`0 0 ${W} 94`}>
          {/* Track */}
          <Path d={TRACK_D} fill="none" stroke={COLORS.border} strokeWidth={SW} strokeLinecap="round" />
          {/* Fill */}
          {fillD !== '' && (
            <Path d={fillD} fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" />
          )}
          {/* Score number */}
          <SvgText
            x={CX}
            y={CY + 4}
            textAnchor="middle"
            fontSize="28"
            fontWeight="900"
            fill={color}
          >
            {score}
          </SvgText>
        </Svg>
        <Text style={[styles.label, { color }]}>{label}</Text>
        <Text style={styles.tapHint}>Tap to learn more</Text>
      </TouchableOpacity>

      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setInfoVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>What affects your score?</Text>
              <InfoRow emoji="✅" text="Logging a check-in today keeps your score high." />
              <InfoRow emoji="📈" text="+10 for a streak over 30 days, +5 for over 7 days." />
              <InfoRow emoji="📉" text="−20 if you haven't checked in for 24 hours." />
              <InfoRow emoji="😔" text="−10 to −15 if your last check-ins show slips." />
              <InfoRow emoji="🔴" text="Score below 40 → high risk. The crisis button is always available." />
              <Text style={styles.sheetNote}>Your score resets and recalculates each time you open the app.</Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function InfoRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoEmoji}>{emoji}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  heading:    { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4 },
  label:      { fontSize: 15, fontWeight: '700', marginTop: -4 },
  tapHint:    { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 18 },
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  infoEmoji:  { fontSize: 18, width: 26 },
  infoText:   { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  sheetNote:  { fontSize: 12, color: COLORS.textMuted, marginTop: 8, lineHeight: 18 },
});
