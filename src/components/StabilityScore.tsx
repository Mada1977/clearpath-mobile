import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../constants';

type Props = { score: number; label: string };

// Gauge geometry — center sits near the bottom so the rainbow arc has
// full headroom above it inside the 200×120 viewBox.
const W  = 200;
const H  = 120;
const CX = 100;
const CY = 110;
const R  = 90;
const SW = 16;

// Map a math-convention angle (0°=right, 90°=up) to SVG pixel coords.
function pt(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: +(CX + R * Math.cos(rad)).toFixed(2),
    y: +(CY - R * Math.sin(rad)).toFixed(2),
  };
}

// Build an SVG arc path from startDeg→endDeg (both in math convention,
// decreasing from 180→0 sweeps left-to-right along the upper arc).
// We always split at 90° (the topmost point) so no single arc command
// ever spans the full 180° diameter — that degenerate case causes some
// renderers to draw the wrong semicircle.
function buildArc(startDeg: number, endDeg: number): string {
  if (Math.abs(startDeg - endDeg) < 0.5) return '';

  const s = pt(startDeg);
  const e = pt(endDeg);

  if (startDeg > 90 && endDeg < 90) {
    // Arc crosses the apex — split into two ≤90° segments.
    const apex = pt(90);
    return (
      `M ${s.x} ${s.y} A ${R} ${R} 0 0 0 ${apex.x} ${apex.y} ` +
      `A ${R} ${R} 0 0 0 ${e.x} ${e.y}`
    );
  }

  // Single arc, at most 90° — no degenerate case.
  return `M ${s.x} ${s.y} A ${R} ${R} 0 0 0 ${e.x} ${e.y}`;
}

// Full track: left (180°) → apex (90°) → right (0°).
const TRACK_D = buildArc(180, 0);

function scoreColor(score: number) {
  if (score >= 70) return COLORS.secondary; // green
  if (score >= 40) return '#F59E0B';        // amber
  return COLORS.danger;                      // red
}

export function StabilityScore({ score, label }: Props) {
  const [infoVisible, setInfoVisible] = useState(false);

  // Fill sweeps from the left endpoint toward the right, proportional to score.
  const fillEndDeg = 180 - (Math.min(score, 100) / 100) * 180;
  const fillD      = score > 0 ? buildArc(180, fillEndDeg) : '';
  const color      = scoreColor(score);

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={() => setInfoVisible(true)} activeOpacity={0.85}>
        <Text style={styles.heading}>Daily stability score</Text>

        {/* overflow:visible on the wrapper lets the arc escape any parent clip */}
        <View style={styles.svgWrap}>
          <Svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            overflow="visible"
          >
            {/* Grey track — full semicircle */}
            <Path
              d={TRACK_D}
              fill="none"
              stroke={COLORS.border}
              strokeWidth={SW}
              strokeLinecap="round"
            />

            {/* Coloured fill — proportional to score */}
            {fillD !== '' && (
              <Path
                d={fillD}
                fill="none"
                stroke={color}
                strokeWidth={SW}
                strokeLinecap="round"
              />
            )}

            {/* Score number — centred inside the arc */}
            <SvgText
              x={CX}
              y={CY - 18}
              textAnchor="middle"
              fontSize="34"
              fontWeight="900"
              fill={color}
            >
              {score}
            </SvgText>
          </Svg>
        </View>

        <Text style={[styles.label, { color }]}>{label}</Text>
        <Text style={styles.tapHint}>Tap to learn more</Text>
      </TouchableOpacity>

      <Modal
        visible={infoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoVisible(false)}
      >
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
  svgWrap:    { overflow: 'visible' },
  heading:    { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4 },
  label:      { fontSize: 15, fontWeight: '700', marginTop: 2 },
  tapHint:    { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 18 },
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  infoEmoji:  { fontSize: 18, width: 26 },
  infoText:   { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  sheetNote:  { fontSize: 12, color: COLORS.textMuted, marginTop: 8, lineHeight: 18 },
});
