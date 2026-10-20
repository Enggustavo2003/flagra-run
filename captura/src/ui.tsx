import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { C } from './config';

export function Logo({ size = 22 }: { size?: number }) {
  const box = size * 1.3;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: box, height: box, borderRadius: box * 0.23, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }}>
        <View style={{ width: box * 0.48, height: box * 0.48, borderRadius: box, borderWidth: box * 0.12, borderColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: box * 0.17, height: box * 0.17, borderRadius: box, backgroundColor: '#2340E8' }} />
        </View>
      </View>
      <Text style={{ color: C.text, fontSize: size, fontWeight: '800' }}>
        flagra<Text style={{ color: C.blue }}>capture</Text>
      </Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Btn(p: { title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; busy?: boolean; disabled?: boolean; style?: ViewStyle }) {
  const kind = p.kind ?? 'primary';
  const bg = kind === 'primary' ? C.yellow : kind === 'danger' ? '#2A1715' : C.card2;
  const fg = kind === 'primary' ? C.ink : kind === 'danger' ? C.red : C.text;
  return (
    <Pressable
      onPress={p.onPress}
      disabled={p.disabled || p.busy}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: p.disabled ? 0.45 : pressed ? 0.8 : 1 }, p.style]}
    >
      {p.busy ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{p.title}</Text>}
    </Pressable>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Stat(p: { label: string; value: string | number; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, p.color ? { color: p.color } : null]}>{p.value}</Text>
      <Text style={s.statLabel}>{p.label}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 18, gap: 14 },
  card: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnText: { fontSize: 17, fontWeight: '700' },
  label: { color: C.dim, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  h1: { color: C.text, fontSize: 26, fontWeight: '800' },
  p: { color: C.dim, fontSize: 15, lineHeight: 21 },
  input: { height: 52, borderRadius: 14, backgroundColor: C.card2, color: C.text, fontSize: 17, paddingHorizontal: 16, borderWidth: 1, borderColor: C.line },
  mono: { fontFamily: 'monospace', color: C.text },
  stat: { flex: 1, backgroundColor: C.card2, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 2 },
  statValue: { color: C.text, fontSize: 26, fontWeight: '700', fontFamily: 'monospace' },
  statLabel: { color: C.dim, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
